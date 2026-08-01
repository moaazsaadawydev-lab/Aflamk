import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OutboxMessage, Users } from '@booking-ticket-system/Entities';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OutboxModule } from './outbox/outbox.module';
import { UsersModule } from './Users/Users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT')!,
        username: config.get<string>('DATABASE_USER'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('USERS_DATABASE_NAME'),
        entities: [Users, OutboxMessage],
        // migrationsRun: false,
        // migrations: ['apps/Users/src/migrations/*.ts'],
        synchronize: false,
      }),
    }),
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
    UsersModule,
    OutboxModule,
  ],
})
export class AppModule {}
