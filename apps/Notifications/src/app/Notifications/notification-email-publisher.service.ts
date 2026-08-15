import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationsEntity } from '@booking-ticket-system/Entities';
import { EmailStatus } from '@booking-ticket-system/Utils';
import { IsNull, Not, Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { MAX_RETRIES } from '@booking-ticket-system/Constants';

@Injectable()
export class NotificationEmailPublisherService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEmailPublisherService.name);

  constructor(
    @InjectRepository(NotificationsEntity)
    private readonly notificationRepository: Repository<NotificationsEntity>,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit() {
    this.publishPendingEmails().catch((err) => {
      this.logger.error(
        `Failed to run immediate email publisher on init: ${err.message}`,
      );
    });
  }

  @Cron('0/15 * * * * *')
  async publishPendingEmails() {
    const pendingNotifications = await this.notificationRepository.find({
      where: {
        emailStatus: EmailStatus.PENDING,
        email: Not(IsNull()),
      },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    if (pendingNotifications.length === 0) return;

    for (const notification of pendingNotifications) {
      try {
        const subject =
          notification.emailTemplate === 'PasswordChanged'
            ? notification.title || 'Security Alert: Password Changed'
            : notification.title || 'Activate Your Account - Aflamak';

        await this.mailerService.sendMail({
          to: notification.email!,
          subject,
          template: notification.emailTemplate || 'ActiveYourEmail',
          context: notification.emailContext || {},
        });


        notification.emailStatus = EmailStatus.SENT;
        await this.notificationRepository.save(notification);
        this.logger.log(
          `✅ Email sent successfully for notification ${notification.id} to ${notification.email}`,
        );
      } catch (error: any) {
        notification.emailRetryCount += 1;
        if (notification.emailRetryCount >= MAX_RETRIES) {
          notification.emailStatus = EmailStatus.FAILED;
        }

        await this.notificationRepository.save(notification);
        this.logger.error(
          `❌ Failed to send email for notification ${notification.id} (attempt ${notification.emailRetryCount}/${MAX_RETRIES}): ${error.message}`,
        );
      }
    }
  }
}
