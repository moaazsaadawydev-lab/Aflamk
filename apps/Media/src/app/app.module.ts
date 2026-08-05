import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MediaModule } from './Media/Media.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MediaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    ClientsModule.registerAsync([
      {
        name: 'USERS_SERVICE',
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
})
export class AppModule {}
