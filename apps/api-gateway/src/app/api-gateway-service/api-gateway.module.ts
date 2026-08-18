import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import {
  JwtAuthGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ChangeEmailRateLimitGuard,
} from '@booking-ticket-system/Guards';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@booking-ticket-system/Redis';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '@booking-ticket-system/Storage';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import {
  AuthProvider,
  RegistrationProvider,
  UserProfileProvider,
  NotificationProvider,
} from './providers';

@Module({
  imports: [
    StorageModule,
    RedisModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
            url:
              process.env.NODE_ENV === 'docker-development'
                ? config.get<string>('USERS_GRPC_DEV_DOC_URL')
                : process.env.NODE_ENV === 'development'
                  ? config.get<string>('USERS_GRPC_DEV_URL')
                  : config.get<string>('USERS_GRPC_DEV_DOC_URL'),
            loader: {
              keepCase: true,
            },
          },
        }),
      },
      {
        name: 'NOTIFICATION_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('MQ_URL')],
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
  ],
  controllers: [ApiGatewayController],
  providers: [
    ApiGatewayService,
    JwtAuthGuard,
    ChangePasswordRateLimitGuard,
    ForgotPasswordRateLimitGuard,
    ChangeEmailRateLimitGuard,
    AuthProvider,
    RegistrationProvider,
    UserProfileProvider,
    NotificationProvider,
  ],
})
export class ApiGatewayModule {}
