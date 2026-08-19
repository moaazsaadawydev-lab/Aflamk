import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { RequestChangeEmailPayload } from '@booking-ticket-system/Interfaces';
import {
  BRUTE_FORCE_LOCKOUT_SECONDS,
  EMERGENCY_FREEZE_LOCKOUT_SECONDS,
  OTP_EXPIRY_SECONDS,
  RATE_LIMIT_COOLDOWN_SECONDS,
  UserOutboxEvent,
} from '@booking-ticket-system/Constants';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomBytes, createHash } from 'crypto';

@Injectable()
export class RequestChangeEmailProvider {
  private readonly logger = new Logger(RequestChangeEmailProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(
    payload: RequestChangeEmailPayload,
  ): Promise<{ success: boolean; message: string }> {
    const { userId, currentPassword, newEmail } = payload;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required',
      });
    }

    if (!newEmail) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New email is required',
      });
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();

    // 1. Lockout checks
    const freezeLockKey = `lock:change-email-frozen:${userId}`;
    const isFrozen = await this.redisService.exists(freezeLockKey);
    if (isFrozen) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Account security freeze is active. Email change is locked for 24 hours. Please reset your password to restore full access.',
      });
    }

    const attemptsLockKey = `lock:change-email-attempts:${userId}`;
    const isAttemptsLocked = await this.redisService.exists(attemptsLockKey);
    if (isAttemptsLocked) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message:
          'Too many incorrect verification attempts. Email change is temporarily locked for 15 minutes.',
      });
    }

    // 2. Fetch user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found',
      });
    }

    // 3. Re-authenticate with currentPassword if user has a password set
    if (
      user.password !== null &&
      user.password !== undefined &&
      user.password !== ''
    ) {
      if (!currentPassword) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Current password is required',
        });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'Invalid current password',
        });
      }
    }

    // 4. Validate new email is not current email
    if (normalizedNewEmail === user.email.trim().toLowerCase()) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New email cannot be the same as your current email.',
      });
    }

    // 5. Pre-check email uniqueness in database
    const emailExists = await this.userRepository.findOne({
      where: { email: normalizedNewEmail },
    });

    if (emailExists) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Unable to process your request',
      });
    }

    // 6. Service cooldown check
    const cooldownKey = `rate:change-email:${userId}`;
    const isCooldownActive = await this.redisService.exists(cooldownKey);
    if (isCooldownActive) {
      throw new RpcException({
        code: status.RESOURCE_EXHAUSTED,
        message:
          'Too many requests. Please wait 60 seconds before requesting another code.',
      });
    }

    // 7. Reset attempts counter and set cooldown
    const attemptsKey = `rate:change-email-attempts:${userId}`;
    await this.redisService.del(attemptsKey);
    await this.redisService.set(
      cooldownKey,
      '1',
      RATE_LIMIT_COOLDOWN_SECONDS,
    );

    // 8. Generate 6-digit numeric OTP and store in Redis
    const code = randomInt(100000, 1000000).toString();
    const otpKey = `otp:change-email:${userId}`;
    await this.redisService.set(
      otpKey,
      { code, newEmail: normalizedNewEmail },
      OTP_EXPIRY_SECONDS,
    );

    // 9. Generate Emergency In-Flight Freeze Token
    const freezeToken = randomBytes(32).toString('hex');
    const freezeTokenHash = createHash('sha256')
      .update(freezeToken)
      .digest('hex');
    await this.redisService.set(
      `freeze-token:${freezeTokenHash}`,
      { userId: user.id },
      OTP_EXPIRY_SECONDS,
    );

    // 10. Save Outbox Messages (Dual Notification)
    const outboxRepo = this.dataSource.getRepository(OutboxMessage);
    await outboxRepo.save([
      outboxRepo.create({
        eventType: UserOutboxEvent.EMAIL_CHANGE_OTP_REQUESTED,
        payload: {
          userId: user.id,
          oldEmail: user.email,
          newEmail: normalizedNewEmail,
          name: user.name,
          code,
        },
      }),
      outboxRepo.create({
        eventType: UserOutboxEvent.EMAIL_CHANGE_SECURITY_ALERT,
        payload: {
          userId: user.id,
          oldEmail: user.email,
          newEmail: normalizedNewEmail,
          name: user.name,
          requestedAt: new Date().toISOString(),
          freezeToken,
        },
      }),
    ]);

    this.outboxService.publishPendingMessages().catch((err) => {
      this.logger.error(
        `Immediate outbox publish attempt failed: ${err.message}`,
      );
    });

    return {
      success: true,
      message: 'Verification code sent to your new email.',
    };
  }
}
