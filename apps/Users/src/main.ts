import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const mqUrl = configService.get<string>('MQ_URL');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
      url:
        process.env.NODE_ENV === 'development-docker'
          ? `0.0.0.0:50051`
          : process.env.NODE_ENV === 'development'
            ? 'localhost:50051'
            : '0.0.0.0:50051',
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [mqUrl],
      queue: 'users_queue',
      queueOptions: {
        durable: true,
      },
      noAck: true,
    },
  });

  await app.startAllMicroservices();
  await app.init();

  Logger.log(`Users microservice is running on port 50051`);
}

bootstrap();
