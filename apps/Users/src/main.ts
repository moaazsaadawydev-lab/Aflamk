import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
        url: '0.0.0.0:50051',
        // process.env.NODE_ENV === 'development-docker'
        //   ? `localhost:${process.env.USERS_GRPC_PORT}`
        //   : process.env.NODE_ENV === 'development'
        //     ? 'localhost:50051'
        //     : 'users-1:50051',
      },
    },
  );
  await app.listen();
  Logger.log(`🚀 Users microservice is running on port 50051`);
}

bootstrap();
