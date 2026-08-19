import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { ResetPasswordPayload } from '@booking-ticket-system/Interfaces';
import {
  BCRYPT_SALT_ROUNDS,
  BRUTE_FORCE_LOCKOUT_SECONDS,
  MAX_OTP_ATTEMPTS,
  PASSWORD_RESET_OTP_EXPIRY_SECONDS,
  UserOutboxEvent,
} from '@booking-ticket-system/Constants';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ResetPasswordProvider {
  private readonly logger = new Logger(ResetPasswordProvider.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(
    payload: ResetPasswordPayload,
  ): Promise<{ success: boolean; message: string }> {
    const { email, otp, newPassword, confirmPassword } = payload;

    if (confirmPassword && newPassword !== confirmPassword) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New password and confirm password do not match',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const lockoutKey = `lock:reset-password:${normalizedEmail}`;
    const attemptsKey = `rate:otp-attempts:${normalizedEmail}`;
    const otpKey = `otp:reset-password:${normalizedEmail}`;

    // Check if user is currently locked out
    const isLocked = await this.redisService.exists(lockoutKey);
    if (isLocked) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Account recovery is temporarily locked due to excessive failed attempts. Please try again after 15 minutes.',
      });
    }

    // Brute-force protection: Increment attempt counter
    const attempts = await this.redisService.incrementCounter(
      attemptsKey,
      PASSWORD_RESET_OTP_EXPIRY_SECONDS,
    );

    if (attempts > MAX_OTP_ATTEMPTS) {
      await this.redisService.del(otpKey);
      await this.redisService.del(attemptsKey);
      await this.redisService.set(
        lockoutKey,
        'locked',
        BRUTE_FORCE_LOCKOUT_SECONDS,
      );

      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Account recovery is temporarily locked due to excessive failed attempts. Please try again after 15 minutes.',
      });
    }

    // Retrieve and validate OTP from Redis
    const storedOtp = await this.redisService.get<string>(otpKey);

    if (!storedOtp || String(storedOtp).trim() !== String(otp).trim()) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid or expired verification code.',
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let user: Users | null = null;

    try {
      user = await queryRunner.manager.findOne(Users, {
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'User not found',
        });
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        BCRYPT_SALT_ROUNDS,
      );
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      user.mustChangePassword = false;

      await queryRunner.manager.save(user);

      const changedAt = new Date().toISOString();
      await queryRunner.manager.save(
        queryRunner.manager.create(OutboxMessage, {
          eventType: UserOutboxEvent.USER_PASSWORD_RESET_SUCCESS,
          payload: {
            userId: user.id,
            email: user.email,
            name: user.name,
            changedAt,
          },
        }),
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Post-transaction cleanup & security invalidations
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);

    if (user) {
      // Auto-unlock emergency security freeze and attempts lock upon legitimate password reset
      await this.redisService.del(`lock:change-email-frozen:${user.id}`);
      await this.redisService.del(`lock:change-email-attempts:${user.id}`);

      // Atomically revoke all active user sessions across all devices
      await this.redisService.revokeAllUserSessions(user.id);
    }

    this.outboxService.publishPendingMessages().catch((err) => {
      this.logger.error(
        `Immediate outbox publish attempt failed: ${err.message}`,
      );
    });

    return {
      success: true,
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
