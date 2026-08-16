import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { randomInt } from 'crypto';

@Injectable()
export class ForgotPasswordProvider {
  private readonly logger = new Logger(ForgotPasswordProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const lockoutKey = `lock:reset-password:${normalizedEmail}`;

    const isLocked = await this.redisService.exists(lockoutKey);
    if (isLocked) {
      throw new RpcException({
        code: status.RESOURCE_EXHAUSTED,
        message:
          'Account recovery is temporarily locked due to excessive failed attempts. Please try again after 15 minutes.',
      });
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        `Forgot password requested for non-existent email: ${normalizedEmail}`,
      );
      return {
        success: true,
        message: 'If the email exists, a reset code has been sent.',
      };
    }

    const rateLimitKey = `rate:forgot-password:${normalizedEmail}`;
    const isRateLimited = await this.redisService.exists(rateLimitKey);

    if (isRateLimited) {
      throw new RpcException({
        code: status.RESOURCE_EXHAUSTED,
        message:
          'Too many requests. Please wait 60 seconds before requesting another code.',
      });
    }

    const otpCode = randomInt(100000, 1000000).toString();
    const otpKey = `otp:reset-password:${normalizedEmail}`;
    const attemptsKey = `rate:otp-attempts:${normalizedEmail}`;

    await this.redisService.set(otpKey, otpCode, 300);

    await this.redisService.del(attemptsKey);

    await this.redisService.set(rateLimitKey, '1', 60);

    const outboxRepo = this.dataSource.getRepository(OutboxMessage);
    await outboxRepo.save(
      outboxRepo.create({
        eventType: 'USER_FORGOT_PASSWORD',
        payload: {
          userId: user.id,
          email: user.email,
          name: user.name,
          otp: otpCode,
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
      message: 'Password reset code has been sent to your email.',
    };
  }
}
