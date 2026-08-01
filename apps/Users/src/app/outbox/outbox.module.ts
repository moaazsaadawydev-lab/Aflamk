// outbox.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OutboxMessage } from '@booking-ticket-system/Entities';
import { OutboxPublisherService } from './outbox-publisher.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forFeature([OutboxMessage]),
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'MEDIA_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://localhost:5672'],
            queue: 'media_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'notification_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
