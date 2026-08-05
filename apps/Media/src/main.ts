import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { config } from 'dotenv';

config({ path: 'libs/env/.env.development' });
console.log(process.env.MQ_URL);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.MQ_URL],
      queue: 'media_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();

  Logger.log('🚀 Media Microservice is running on RabbitMQ');
}

bootstrap();
