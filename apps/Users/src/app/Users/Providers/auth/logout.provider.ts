import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@booking-ticket-system/Redis';
import { LogoutPayload } from '@booking-ticket-system/Interfaces';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

@Injectable()
export class LogoutProvider {
  private readonly logger = new Logger(LogoutProvider.name);

  constructor(private readonly redisService: RedisService) {}

  async execute(payload: LogoutPayload): Promise<{
    success: boolean;
    message: string;
  }> {
    const { userId, sessionId } = payload;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required.',
      });
    }

    if (sessionId) {
      // Revoke only the single device session from Redis
      await this.redisService.revokeUserSession(userId, sessionId);
      this.logger.log(
        `User ${userId} logged out from session ${sessionId} successfully.`,
      );
    } else {
      this.logger.log(
        `User ${userId} logout requested without sessionId. Client cookie cleared.`,
      );
    }

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }
}
