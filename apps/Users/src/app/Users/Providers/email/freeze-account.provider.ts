import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@booking-ticket-system/Redis';
import { EMERGENCY_FREEZE_LOCKOUT_SECONDS } from '@booking-ticket-system/Constants';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { createHash } from 'crypto';

interface StoredFreezeToken {
  userId: string;
}

@Injectable()
export class FreezeAccountProvider {
  private readonly logger = new Logger(FreezeAccountProvider.name);

  constructor(private readonly redisService: RedisService) {}

  async execute(token: string): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== 'string') {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Account freeze token is required',
      });
    }

    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    const freezeKey = `freeze-token:${tokenHash}`;

    const storedData =
      await this.redisService.get<StoredFreezeToken>(freezeKey);

    if (!storedData || !storedData.userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid or expired account freeze token.',
      });
    }

    const userId = storedData.userId;

    // 1. Delete active OTP and rate limit counters
    await this.redisService.del(`otp:change-email:${userId}`);
    await this.redisService.del(`rate:change-email-attempts:${userId}`);
    await this.redisService.del(`rate:change-email:${userId}`);

    // 2. Set strict 24-hour lockout on email changes
    await this.redisService.set(
      `lock:change-email-frozen:${userId}`,
      'locked',
      EMERGENCY_FREEZE_LOCKOUT_SECONDS,
    );

    // 3. Atomically revoke all active user sessions across all devices
    await this.redisService.revokeAllUserSessions(userId);

    // 4. Invalidate the freeze token
    await this.redisService.del(freezeKey);

    this.logger.warn(
      `Emergency Account Freeze executed for user ${userId}. All sessions terminated.`,
    );

    return {
      success: true,
      message:
        'Account has been frozen and all active sessions revoked. Please reset your password.',
    };
  }
}
