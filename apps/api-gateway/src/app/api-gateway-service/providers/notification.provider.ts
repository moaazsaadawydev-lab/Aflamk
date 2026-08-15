import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';

@Injectable()
export class NotificationProvider {
  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationRmqClient: ClientProxy,
  ) {}

  async sendNotification(user: Users, dto: NotificationDto) {
    const { UserId, title, body, type } = dto;

    return this.notificationRmqClient.emit('send_notification', {
      UserId,
      title,
      body,
      type,
    });
  }
}
