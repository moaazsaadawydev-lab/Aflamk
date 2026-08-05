import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiGatewayController } from './ApiGateway.controller';
import { ApiGatewayService } from './ApiGateway.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
          url:
            process.env.NODE_ENV === 'development-docker'
              ? 'users-1:50051'
              : process.env.NODE_ENV === 'development'
                ? '0.0.0.0:50051'
                : 'users-1:50051',
          loader: {
            keepCase: true,
          },
        },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(process.cwd(), 'libs/protos/Notifications.proto'),
          url:
            process.env.NODE_ENV === 'development-docker'
              ? 'notifications-1:50052'
              : process.env.NODE_ENV === 'development'
                ? 'localhost:50052'
                : 'notifications-1:50052',
        },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.MQ_URL],
          queue: 'notification_queue',
          queueOptions: { durable: true },
        },
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
  providers: [ApiGatewayService, JwtAuthGuard],
})
export class ApiGatewayModule {}
