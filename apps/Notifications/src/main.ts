/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'notification_queue',
      queueOptions: { durable: true },
    },
  });

  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.GRPC,
  //   options: {
  //     package: 'notification',
  //     protoPath: join(process.cwd(), 'libs/protos/Notifications.proto'),
  //     url:
  //       process.env.NODE_ENV === 'development-docker'
  //         ? '0.0.0.0:50052'
  //         : process.env.NODE_ENV === 'development'
  //           ? 'localhost:50052'
  //           : '0.0.0.0:50052',
  //   },
  // });

  await app.startAllMicroservices();

  await app.listen(3002);
}

bootstrap();
