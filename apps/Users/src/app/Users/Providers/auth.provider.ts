import { Injectable } from '@nestjs/common';
import { LoginDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AccessPayloadType,
  RefreshPayloadType,
} from '@booking-ticket-system/Types';
import {
  RedisService,
  SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
} from '@booking-ticket-system/Redis';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthProvider {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  private parseDurationToMs(duration?: string | number): number {
    if (typeof duration === 'number') {
      return duration * 1000;
    }
    if (!duration) return 7 * 24 * 60 * 60 * 1000;

    const match = /^(\d+)([smhd])?$/i.exec(duration.trim());
    if (!match) {
      const parsed = parseInt(duration, 10);
      return isNaN(parsed) ? 7 * 24 * 60 * 60 * 1000 : parsed * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 's').toLowerCase();

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password, userAgent, ipAddress } = loginDto;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid email or password',
      });
    }

    if (!user.isVerified) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'Please verify your email before logging in',
      });
    }

    const sessionId = randomUUID();

    const accessPayload: AccessPayloadType = {
      id: user.id,
      role: user.role,
    };

    const refreshPayload: RefreshPayloadType = {
      id: user.id,
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRE_IN',
        ) as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRE_IN',
        ) as any,
      }),
    ]);

    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);

    const refreshExpireIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRE_IN',
    );
    const ttlSeconds = Math.floor(this.parseDurationToMs(refreshExpireIn) / 1000);

    const sessionKey = `${SESSION_PREFIX}${user.id}:${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${user.id}`;

    await this.redisService.set(
      sessionKey,
      {
        refreshTokenHash,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        createdAt: new Date().toISOString(),
      },
      ttlSeconds,
    );

    await this.redisService.sadd(userSessionsKey, sessionId);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let refreshTokenPayload:
      | RefreshPayloadType
      | (RefreshPayloadType & { iat: number; exp: number });
    try {
      refreshTokenPayload =
        await this.jwtService.verifyAsync<RefreshPayloadType>(refreshToken, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        });
    } catch (error) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid or expired refresh token',
      });
    }

    if (!refreshTokenPayload.sessionId || !refreshTokenPayload.id) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid or expired refresh token',
      });
    }

    const userId = refreshTokenPayload.id;
    const sessionId = refreshTokenPayload.sessionId;
    const sessionKey = `${SESSION_PREFIX}${userId}:${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

    const sessionData = await this.redisService.get<{
      refreshTokenHash: string;
      userAgent?: string;
      ipAddress?: string;
      createdAt?: string;
    }>(sessionKey);

    if (!sessionData) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    const isMatch = await bcrypt.compare(
      refreshToken,
      sessionData.refreshTokenHash,
    );

    if (!isMatch) {
      await this.redisService.del(sessionKey);
      await this.redisService.srem(userSessionsKey, sessionId);
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    const accessPayload: AccessPayloadType = { id: user.id, role: user.role };
    const refreshPayload: RefreshPayloadType = {
      id: user.id,
      sessionId,
    };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRE_IN',
        ) as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRE_IN',
        ) as any,
      }),
    ]);

    const salt = await bcrypt.genSalt(10);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
    const refreshExpireIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRE_IN',
    );
    const ttlSeconds = Math.floor(this.parseDurationToMs(refreshExpireIn) / 1000);

    await this.redisService.set(
      sessionKey,
      {
        ...sessionData,
        refreshTokenHash: newRefreshTokenHash,
        updatedAt: new Date().toISOString(),
      },
      ttlSeconds,
    );

    return {
      message: 'Success',
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}


