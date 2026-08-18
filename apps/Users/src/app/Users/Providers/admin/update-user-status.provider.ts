import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UserStatus } from '@booking-ticket-system/Utils';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

export interface UpdateUserStatusPayload {
  targetUserId: string;
  status: UserStatus;
  reason?: string;
  suspendedUntil?: string;
}

@Injectable()
export class UpdateUserStatusProvider {
  private readonly logger = new Logger(UpdateUserStatusProvider.name);

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly redisService: RedisService,
  ) {}

  async execute(payload: UpdateUserStatusPayload): Promise<{
    success: boolean;
    message: string;
    status: UserStatus;
  }> {
    const { targetUserId, status: newStatus, reason, suspendedUntil } = payload;

    if (!targetUserId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Target user ID is required.',
      });
    }

    if (!newStatus || !Object.values(UserStatus).includes(newStatus)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Valid user status is required.',
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found.',
      });
    }

    const previousStatus = user.status;
    user.status = newStatus;
    user.statusChangedAt = new Date();

    if (
      newStatus === UserStatus.SUSPENDED ||
      newStatus === UserStatus.BLOCKED ||
      newStatus === UserStatus.DELETED
    ) {
      user.statusReason = reason?.trim() || null;
      user.suspendedUntil =
        newStatus === UserStatus.SUSPENDED && suspendedUntil
          ? new Date(suspendedUntil)
          : null;

      await this.userRepository.save(user);

      // Immediately revoke all active sessions across all devices
      await this.redisService.revokeAllUserSessions(user.id);

      this.logger.warn(
        `Admin updated user ${user.id} status from ${previousStatus} to ${newStatus}. All active sessions purged.`,
      );
    } else if (newStatus === UserStatus.ACTIVE) {
      user.statusReason = null;
      user.suspendedUntil = null;

      await this.userRepository.save(user);

      this.logger.log(
        `Admin updated user ${user.id} status from ${previousStatus} to ACTIVE.`,
      );
    } else {
      user.statusReason = reason?.trim() || null;
      await this.userRepository.save(user);
    }

    return {
      success: true,
      message: `User status updated to ${newStatus} successfully.`,
      status: user.status,
    };
  }
}
