import { Injectable, Logger } from '@nestjs/common';
import { NotificationDto } from '@booking-ticket-system/DTOs';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationsEntity } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { NotificationGateway } from '../Gateway/notification.gateway';
import { EmailStatus } from '@booking-ticket-system/Utils';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationsEntity)
    private readonly notificationRepository: Repository<NotificationsEntity>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createNotification(
    data: NotificationDto,
    emailInfo?: {
      email: string;
      template: string;
      context: Record<string, any>;
    },
    sourceEventId?: string,
  ): Promise<boolean> {
    if (sourceEventId) {
      const existing = await this.notificationRepository.findOne({
        where: { sourceEventId },
      });

      if (existing) {
        Logger.warn(
          `[NotificationService] Duplicate event detected for sourceEventId: ${sourceEventId}. Skipping insert.`,
        );
        return false;
      }
    }

    const { UserId, title, body, type } = data;

    const notification = this.notificationRepository.create({
      sourceEventId: sourceEventId || null,
      userId: UserId,
      title,
      body,
      type,
      email: emailInfo?.email || null,
      emailTemplate: emailInfo?.template || null,
      emailContext: emailInfo?.context || null,
      emailStatus: emailInfo ? EmailStatus.PENDING : EmailStatus.SENT,
      emailRetryCount: 0,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    this.notificationGateway.sendNotificationToUser({
      UserId: savedNotification.userId,
      title: savedNotification.title,
      body: savedNotification.body,
      type: savedNotification.type,
    });

    return true;
  }
}
