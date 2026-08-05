import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsEntity } from '@booking-ticket-system/Entities';
import { NotificationGateway } from '../Gateway/notification.gateway';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forFeature([NotificationsEntity]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
})
export class NotificationsModule {}
