import { Module } from '@nestjs/common';
import { UsersController } from './Users.controller';
import { UsersService } from './Users.Service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { Users } from '@booking-ticket-system/Entities';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forFeature([Users]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('MQ_URL')],
            queue: 'notification_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRE_IN') as any,
        },
      }),
    }),
    OutboxModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
