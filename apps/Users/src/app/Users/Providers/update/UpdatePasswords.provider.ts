import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Users, Session, OutboxMessage } from '@booking-ticket-system/Entities';
import { OutboxPublisherService } from '../../../outbox/outbox-publisher.service';
import * as bcrypt from 'bcryptjs';

export interface ChangePasswordPayload {
  userId: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class UpdatePasswordsProvider {
  private readonly logger = new Logger(UpdatePasswordsProvider.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxPublisherService,
  ) {}

  async execute(
    payload: ChangePasswordPayload,
  ): Promise<{ success: boolean; message: string }> {
    const { userId, oldPassword, newPassword, userAgent, ipAddress } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(Users, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const isCurrentPasswordCorrect = await bcrypt.compare(
        oldPassword,
        user.password,
      );

      if (!isCurrentPasswordCorrect) {
        throw new BadRequestException('Current password is incorrect');
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException(
          'New password cannot be the same as current password',
        );
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
      user.passwordChangedAt = new Date();

      await queryRunner.manager.save(user);

      await queryRunner.manager.delete(Session, { userId: user.id });

      const changedAt = new Date().toISOString();
      await queryRunner.manager.save(
        queryRunner.manager.create(OutboxMessage, {
          eventType: 'USER_PASSWORD_CHANGED',
          payload: {
            userId: user.id,
            email: user.email,
            changedAt,
            ipAddress: ipAddress || '',
            userAgent: userAgent || '',
          },
        }),
      );

      await queryRunner.commitTransaction();

      this.outboxService.publishPendingMessages().catch((err) => {
        this.logger.error(
          `Immediate outbox publish attempt failed: ${err.message}`,
        );
      });

      return {
        success: true,
        message: 'Password updated successfully. Please log in again.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
