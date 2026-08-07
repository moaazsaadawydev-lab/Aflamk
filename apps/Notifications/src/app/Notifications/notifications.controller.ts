import { Controller, Get, Logger } from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDto } from '@booking-ticket-system/DTOs';

@Controller()
export class NotificationController {
  constructor(private readonly appService: NotificationService) {}

  @EventPattern('user_created')
  handleUserCreated(
    @Payload()
    data: {
      email: string;
      name: string;
      code: number;
      dto: NotificationDto;
    },
  ) {
    return this.appService.sendActivationEmail(
      data.email,
      data.name,
      data.code,
      data.dto,
    );
  }

  @EventPattern('send_notification')
  handleSendNotification(@Payload() data: NotificationDto) {
    return this.appService.sendNotification(data);
  }
}
