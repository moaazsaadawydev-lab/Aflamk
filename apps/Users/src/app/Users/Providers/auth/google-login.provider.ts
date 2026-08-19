import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '@booking-ticket-system/Entities';
import {
  RedisService,
  SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
} from '@booking-ticket-system/Redis';
import {
  AuthProviderType,
  UserRole,
  UserStatus,
} from '@booking-ticket-system/Utils';
import {
  AccessPayloadType,
  RefreshPayloadType,
} from '@booking-ticket-system/Types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface GoogleLoginPayload {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  birthDate?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class GoogleLoginProvider {
  private readonly logger = new Logger(GoogleLoginProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(payload: GoogleLoginPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const {
      googleId,
      email,
      name,
      avatarUrl,
      birthDate,
      userAgent,
      ipAddress,
    } = payload;

    if (!email || !googleId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Google ID and Email are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Search for existing user by googleId or email
    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email: normalizedEmail }],
    });

    if (!user) {
      // Scenario A: User does not exist, auto-provision
      const parsedBirthDate = birthDate ? new Date(birthDate) : null;

      user = this.userRepository.create({
        id: randomUUID(),
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        avatarUrl: avatarUrl || null,
        birthDate: parsedBirthDate,
        password: null,
        provider: AuthProviderType.GOOGLE,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        statusChangedAt: new Date(),
      });

      await this.userRepository.save(user);
      this.logger.log(
        `Auto-provisioned new Google user: ${user.email} (${user.id})`,
      );
    } else {
      // Scenario B & C: User exists
      let needsSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = AuthProviderType.GOOGLE;
        needsSave = true;
        this.logger.log(
          `Linked googleId to existing user: ${user.email} (${user.id})`,
        );
      }

      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        needsSave = true;
      }

      // Check status lifecycle
      if (user.status === UserStatus.UNVERIFIED) {
        user.status = UserStatus.ACTIVE;
        user.statusChangedAt = new Date();
        needsSave = true;
      } else if (user.status === UserStatus.SUSPENDED) {
        if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
          user.status = UserStatus.ACTIVE;
          user.statusReason = null;
          user.suspendedUntil = null;
          user.statusChangedAt = new Date();
          needsSave = true;
        } else {
          const reason = user.statusReason
            ? `: ${user.statusReason}`
            : ' due to security hold.';
          throw new RpcException({
            code: status.PERMISSION_DENIED,
            message: `Account is suspended${reason}`,
          });
        }
      } else if (user.status === UserStatus.BLOCKED) {
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message:
            'Account has been permanently blocked due to policy violations.',
        });
      } else if (user.status === UserStatus.DELETED) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'Account not found.',
        });
      }

      if (needsSave) {
        await this.userRepository.save(user);
      }
    }

    // 2. Create Session & Tokens
    const sessionId = randomUUID();

    const accessPayload: AccessPayloadType = {
      id: user.id,
      role: user.role,
      status: user.status,
      sessionId,
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

    const refreshExpireIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRE_IN') || '7d';
    const ttlSeconds = Math.floor(
      this.parseDurationToMs(refreshExpireIn) / 1000,
    );

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

  private parseDurationToMs(duration?: string): number {
    if (!duration) return 7 * 24 * 60 * 60 * 1000;
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
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
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
