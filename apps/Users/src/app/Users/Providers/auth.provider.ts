import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from '@booking-ticket-system/DTOs';
import { Users, Session } from '@booking-ticket-system/Entities';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AccessPayloadType,
  RefreshPayloadType,
} from '@booking-ticket-system/Types';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthProvider {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
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
    const expiresAt = new Date(
      Date.now() + this.parseDurationToMs(refreshExpireIn),
    );

    await this.sessionRepository.save({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!refreshTokenPayload.sessionId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.sessionRepository.findOne({
      where: {
        id: refreshTokenPayload.sessionId,
        userId: refreshTokenPayload.id,
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isMatch = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;

    const accessPayload: AccessPayloadType = { id: user.id, role: user.role };
    const refreshPayload: RefreshPayloadType = {
      id: user.id,
      sessionId: session.id,
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
    const refreshExpireIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRE_IN',
    );
    const newExpiresAt = new Date(
      Date.now() + this.parseDurationToMs(refreshExpireIn),
    );

    session.refreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
    session.expiresAt = newExpiresAt;
    session.lastUsedAt = new Date();

    await this.sessionRepository.save(session);

    return {
      message: 'Success',
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}

