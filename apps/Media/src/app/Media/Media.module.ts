import { Module } from '@nestjs/common';
import { MediaController } from './Media.controller';
import { MediaService } from './Media.service';
import { ImageProcessorService } from './image-processor.service';
import { LocalStorageDriver } from '../Storage/local-storage.driver';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    ClientsModule.registerAsync([
      {
        name: 'USERS_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('MQ_URL')],
            queue: 'users_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [MediaController],
  providers: [MediaService, ImageProcessorService, LocalStorageDriver],
})
export class MediaModule {}
