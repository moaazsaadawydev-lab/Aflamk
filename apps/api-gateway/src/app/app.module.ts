import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
          url: '0.0.0.0:50051',
          // process.env.NODE_ENV === 'development-docker'
          //   ? 'users-1:50051'
          //   : process.env.NODE_ENV === 'development'
          //     ? 'localhost:50051'
          //     : 'users-1:50051',
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
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
