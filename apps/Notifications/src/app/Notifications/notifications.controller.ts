import { Controller, Logger } from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationDto } from '@booking-ticket-system/DTOs';
import { NotificationType } from '@booking-ticket-system/Utils';


@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly NotificationsService: NotificationService) {}

  @EventPattern('user_created')
  async handleUserCreated(
    @Payload()
    data: {
      email: string;
      name: string;
      code: number;
      dto: NotificationDto;
      eventId?: string;
      sourceEventId?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const sourceEventId = data.eventId;

    try {
      await this.NotificationsService.createNotification(
        data.dto,
        {
          email: data.email,
          template: 'ActiveYourEmail',
          context: {
            name: data.name,
            activationCode: data.code,
          },
        },
        sourceEventId,
      );

      channel.ack(originalMsg);
    } catch (error: any) {
      if (error?.code === '23505') {
        this.logger.warn(
          `Unique constraint violation (23505) for event ${sourceEventId}. Treating as already processed.`,
        );
        channel.ack(originalMsg);
        return;
      }

      this.logger.error(
        `Failed to process user_created event for ${data.email}: ${error.message}`,
      );

      const isRedelivered = originalMsg.fields.redelivered;
      channel.nack(originalMsg, false, !isRedelivered);
    }
  }

  @EventPattern('send_notification')
  async handleSendNotification(
    @Payload()
    data: NotificationDto & { eventId?: string; sourceEventId?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const sourceEventId =
      data.sourceEventId ||
      data.eventId ||
      `send_notification_${data.UserId}_${data.title}`;

    try {
      await this.NotificationsService.createNotification(
        data,
        undefined,
        sourceEventId,
      );

      channel.ack(originalMsg);
    } catch (error: any) {
      if (error?.code === '23505') {
        this.logger.warn(
          `Unique constraint violation (23505) for send_notification event ${sourceEventId}. Treating as already processed.`,
        );
        channel.ack(originalMsg);
        return;
      }

      this.logger.error(
        `Failed to process send_notification event for user ${data.UserId}: ${error.message}`,
      );

      const isRedelivered = originalMsg.fields.redelivered;
      channel.nack(originalMsg, false, !isRedelivered);
    }
  }

  @EventPattern('USER_PASSWORD_CHANGED')
  async handleUserPasswordChanged(
    @Payload()
    data: {
      userId: string;
      email: string;
      changedAt: string;
      ipAddress: string;
      userAgent: string;
      eventId?: string;
      sourceEventId?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const sourceEventId = data.sourceEventId || data.eventId;

    const notificationDto: NotificationDto = {
      UserId: data.userId,
      title: 'Security Alert: Password Changed',
      body: 'Your account password was recently changed.',
      type: NotificationType.ALERT_MESSAGE,
    };


    try {
      await this.NotificationsService.createNotification(
        notificationDto,
        {
          email: data.email,
          template: 'PasswordChanged',
          context: {
            changedAt: data.changedAt,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        },
        sourceEventId,
      );

      channel.ack(originalMsg);
    } catch (error: any) {
      if (error?.code === '23505') {
        this.logger.warn(
          `Unique constraint violation (23505) for event ${sourceEventId}. Treating as already processed.`,
        );
        channel.ack(originalMsg);
        return;
      }

      this.logger.error(
        `Failed to process USER_PASSWORD_CHANGED event for ${data.email}: ${error.message}`,
      );

      const isRedelivered = originalMsg.fields.redelivered;
      channel.nack(originalMsg, false, !isRedelivered);
    }
  }
}

