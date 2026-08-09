import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsEntity } from '@booking-ticket-system/Entities';
import { NotificationGateway } from '../Gateway/notification.gateway';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NotificationEmailPublisherService } from './notification-email-publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationsEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationEmailPublisherService,
  ],
})
export class NotificationsModule {}
