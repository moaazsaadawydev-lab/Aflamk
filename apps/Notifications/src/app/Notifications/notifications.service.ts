import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationDto } from '@booking-ticket-system/DTOs';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationsEntity } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { NotificationGateway } from '../Gateway/notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly mailerService: MailerService,
    @InjectRepository(NotificationsEntity)
    private readonly notificationRepository: Repository<NotificationsEntity>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async sendActivationEmail(
    email: string,
    name: string,
    activationCode: number,
    data: NotificationDto,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Activate Your Account - Aflamak',
        template: 'ActiveYourEmail',
        context: {
          name,
          activationCode,
        },
      });

      await this.sendNotification(data);

      Logger.log(`✅ Activation email sent to ${email}`);
    } catch (error) {
      Logger.error('❌ Failed to send activation email:', error);
      throw error;
    }
  }

  async sendNotification(data: NotificationDto): Promise<void> {
    try {
      const { UserId, title, body, type } = data;

      const notification = this.notificationRepository.create({
        userId: UserId,
        title,
        body,
        type,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      this.notificationGateway.sendNotificationToUser({
        UserId: savedNotification.userId,
        title: savedNotification.title,
        body: savedNotification.body,
        type: savedNotification.type,
      });
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      throw error;
    }
  }
}
