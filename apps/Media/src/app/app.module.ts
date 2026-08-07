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
  ],
})
export class AppModule {}
