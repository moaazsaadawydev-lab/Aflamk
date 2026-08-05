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
        synchronize: false,
        migrationsRun: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'MEDIA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('MQ_URL')],
            queue: 'media_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        inject: [ConfigService],
        name: 'NOTIFICATION_SERVICE',
        useFactory: (config: ConfigService) => ({
          options: {
            urls: [config.get<string>('MQ_URL')],
            queue: 'notification_queue',
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
