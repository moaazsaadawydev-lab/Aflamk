import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';
import {
  Users,
  OutboxMessage,
  UserEmailHistory,
} from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { createHash } from 'crypto';

@Injectable()
export class RollbackEmailProvider {
  private readonly logger = new Logger(RollbackEmailProvider.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(token: string): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== 'string') {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Rollback token is required',
      });
    }

    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');

    // 1. Locate valid history record
    const historyRepo = this.dataSource.getRepository(UserEmailHistory);
    const history = await historyRepo.findOne({
      where: {
        rollbackTokenHash: tokenHash,
        isReverted: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!history) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid or expired email rollback token.',
      });
    }

    // 2. Database Transaction to revert email and flag mandatory password change
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let userId = '';
    let restoredEmail = '';
    let userName = '';

    try {
      const user = await queryRunner.manager.findOne(Users, {
        where: { id: history.userId },
      });

      if (!user) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'User account not found',
        });
      }

      // Check if previous email is currently used by another account
      const previousEmailNormalized = history.previousEmail
        .trim()
        .toLowerCase();
      const existingUser = await queryRunner.manager.findOne(Users, {
        where: { email: previousEmailNormalized },
      });

      if (existingUser && existingUser.id !== history.userId) {
        throw new RpcException({
          code: status.ALREADY_EXISTS,
          message:
            'Previous email address is currently in use by another account.',
        });
      }

      userId = user.id;
      userName = user.name;
      restoredEmail = previousEmailNormalized;

      user.email = previousEmailNormalized;
      user.mustChangePassword = true;
      user.isVerified = true;

      await queryRunner.manager.save(user);

      const revertedAt = new Date();
      history.isReverted = true;
      history.revertedAt = revertedAt;

      await queryRunner.manager.save(history);

      await queryRunner.manager.save(
        queryRunner.manager.create(OutboxMessage, {
          eventType: 'user.email-change.reverted',
          payload: {
            userId: user.id,
            email: restoredEmail,
            name: userName,
            revertedAt: revertedAt.toISOString(),
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

    // 3. Atomically revoke all active user sessions across all devices & clean up OTP keys
    await this.redisService.del(`otp:change-email:${userId}`);
    await this.redisService.del(`rate:change-email-attempts:${userId}`);
    await this.redisService.del(`rate:change-email:${userId}`);
    await this.redisService.del(`lock:change-email-attempts:${userId}`);
    await this.redisService.revokeAllUserSessions(userId);

    this.outboxService.publishPendingMessages().catch((err) => {
      this.logger.error(
        `Immediate outbox publish attempt failed: ${err.message}`,
      );
    });

    this.logger.log(
      `🛡️ 30-Day Email Rollback executed successfully for user ${userId}. Email restored to ${restoredEmail}.`,
    );

    return {
      success: true,
      message:
        'Account email has been rolled back successfully. All sessions revoked. Please reset your password.',
    };
  }
}
