import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Users,
  OutboxMessage,
  UserEmailHistory,
} from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { randomBytes, createHash } from 'crypto';

export interface ConfirmChangeEmailPayload {
  userId: string;
  code: string;
}

interface StoredEmailChangeOtp {
  code: string;
  newEmail: string;
}

@Injectable()
export class ConfirmChangeEmailProvider {
  private readonly logger = new Logger(ConfirmChangeEmailProvider.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(
    payload: ConfirmChangeEmailPayload,
  ): Promise<{ success: boolean; message: string }> {
    const { userId, code } = payload;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required',
      });
    }

    if (!code) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Verification code is required',
      });
    }

    const freezeLockKey = `lock:change-email-frozen:${userId}`;
    const attemptsLockKey = `lock:change-email-attempts:${userId}`;
    const attemptsKey = `rate:change-email-attempts:${userId}`;
    const otpKey = `otp:change-email:${userId}`;

    // 1. Lockout checks
    const isFrozen = await this.redisService.exists(freezeLockKey);
    if (isFrozen) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Account security freeze is active. Email change is locked for 24 hours. Please reset your password to restore full access.',
      });
    }

    const isAttemptsLocked = await this.redisService.exists(attemptsLockKey);
    if (isAttemptsLocked) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Too many incorrect verification attempts. Email change is temporarily locked for 15 minutes.',
      });
    }

    // 2. Retrieve OTP data from Redis
    const otpData = await this.redisService.get<StoredEmailChangeOtp>(otpKey);

    if (!otpData || String(otpData.code).trim() !== String(code).trim()) {
      // Increment attempt counter with 600s TTL
      const attempts = await this.redisService.incrementCounter(
        attemptsKey,
        600,
      );

      if (attempts >= 6) {
        await this.redisService.del(otpKey);
        await this.redisService.del(attemptsKey);
        await this.redisService.set(attemptsLockKey, 'locked', 900); // 15-minute TTL

        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message:
            'Too many incorrect verification attempts. Email change is temporarily locked for 15 minutes.',
        });
      }

      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid or expired verification code.',
      });
    }

    // 3. PostgreSQL Transaction with Race Condition Check & UserEmailHistory
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let oldEmail = '';
    let userName = '';

    try {
      const user = await queryRunner.manager.findOne(Users, {
        where: { id: userId },
      });

      if (!user) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'User not found',
        });
      }

      // Race condition check: verify newEmail wasn't claimed by another user in the interim
      const normalizedNewEmail = otpData.newEmail.trim().toLowerCase();
      const existingUserWithEmail = await queryRunner.manager.findOne(Users, {
        where: { email: normalizedNewEmail },
      });

      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        throw new RpcException({
          code: status.ALREADY_EXISTS,
          message: 'Email address is already in use by another account.',
        });
      }

      oldEmail = user.email;
      userName = user.name;
      user.email = normalizedNewEmail;
      user.isVerified = true;

      await queryRunner.manager.save(user);

      // Generate 32-byte secure rollback token and hash with SHA-256 (Valid for 30 days)
      const rollbackToken = randomBytes(32).toString('hex');
      const rollbackTokenHash = createHash('sha256')
        .update(rollbackToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await queryRunner.manager.save(
        queryRunner.manager.create(UserEmailHistory, {
          userId: user.id,
          previousEmail: oldEmail,
          newEmail: user.email,
          rollbackTokenHash,
          expiresAt,
          isReverted: false,
        }),
      );

      const changedAt = new Date().toISOString();
      await queryRunner.manager.save([
        queryRunner.manager.create(OutboxMessage, {
          eventType: 'user.email-change.success',
          payload: {
            userId: user.id,
            oldEmail,
            newEmail: user.email,
            name: userName,
            rawRollbackToken: rollbackToken,
            changedAt,
          },
        }),
        queryRunner.manager.create(OutboxMessage, {
          eventType: 'user.email-change.success-alert',
          payload: {
            userId: user.id,
            oldEmail,
            newEmail: user.email,
            name: userName,
            rollbackToken,
            changedAt,
          },
        }),
      ]);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 4. Post-transaction Cleanup & Atomic Session Revocation
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);
    await this.redisService.revokeAllUserSessions(userId);

    this.outboxService.publishPendingMessages().catch((err) => {
      this.logger.error(
        `Immediate outbox publish attempt failed: ${err.message}`,
      );
    });

    return {
      success: true,
      message:
        'Email changed successfully. Please log in again with your new email.',
    };
  }
}
