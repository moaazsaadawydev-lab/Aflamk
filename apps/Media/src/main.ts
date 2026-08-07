import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { config } from 'dotenv';

config({ path: `libs/env/.env.${process.env.NODE_ENV}` });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const mqUrl = process.env.MQ_URL || 'amqp://localhost:5672';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [mqUrl],
      queue: 'media_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();

  Logger.log('Media Microservice is running on RabbitMQ');
}

bootstrap().catch((err) => {
  Logger.error(`Media Microservice failed to start: ${err.message}`, err.stack);
  process.exit(1);
});
