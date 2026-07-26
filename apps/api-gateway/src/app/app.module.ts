import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
        name: 'MEDIA_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'media_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
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
  controllers: [AppController],
  providers: [AppService, JwtAuthGuard],
})
export class AppModule {}
