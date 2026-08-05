import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from 'process';
import { ApiGatewayModule } from './API/ApiGateway.module';

@Module({
  imports: [
    ApiGatewayModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
  ],
})
export class AppModule {}
