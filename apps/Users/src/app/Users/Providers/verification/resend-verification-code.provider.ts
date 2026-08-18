import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { NotificationType, UserStatus } from '@booking-ticket-system/Utils';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { randomInt } from 'crypto';

export interface ResendVerificationCodePayload {
  email: string;
}

@Injectable()
export class ResendVerificationCodeProvider {
  private readonly logger = new Logger(ResendVerificationCodeProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(
    payload: ResendVerificationCodePayload,
  ): Promise<{ success: boolean; message: string }> {
    const { email } = payload;

    if (!email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch user from DB
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found.',
      });
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'Account is already verified.',
      });
    }

    if (user.status !== UserStatus.UNVERIFIED) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'Cannot send verification code for non-unverified account.',
      });
    }

    // 2. Check Resend Cooldown in Redis (60s)
    const cooldownKey = `cooldown:resend-verification:${normalizedEmail}`;
    const isCooldownActive = await this.redisService.exists(cooldownKey);
    if (isCooldownActive) {
      throw new RpcException({
        code: status.RESOURCE_EXHAUSTED,
        message:
          'Please wait 60 seconds before requesting a new verification code.',
      });
    }

    // 3. Generate a fresh 6-digit OTP
    const code = randomInt(100000, 1000000).toString();

    // 4. Atomic Redis operations
    const otpKey = `otp:verify-email:${normalizedEmail}`;
    const attemptsKey = `rate:verify-email-attempts:${normalizedEmail}`;

    await this.redisService.set(otpKey, code, 600); // 10 minutes
    await this.redisService.del(attemptsKey); // Reset failed attempts
    await this.redisService.set(cooldownKey, 'active', 60); // 60s cooldown

    // 5. Save Outbox Event
    const outboxRepo = this.dataSource.getRepository(OutboxMessage);
    await outboxRepo.save(
      outboxRepo.create({
        eventType: 'user.account-verification.resend',
        payload: {
          userId: user.id,
          email: user.email,
          name: user.name,
          code,
          dto: {
            UserId: user.id,
            title: 'Activate Your Account - Aflamak',
            body: `Hi ${user.name}, your new verification code is ${code}`,
            type: NotificationType.ALERT_MESSAGE,
          },
        },
      }),
    );

    this.outboxService.publishPendingMessages().catch((err) => {
      this.logger.error(
        `Immediate outbox publish attempt failed: ${err.message}`,
      );
    });

    return {
      success: true,
      message:
        'Verification code resent successfully. Please check your inbox.',
    };
  }
}
