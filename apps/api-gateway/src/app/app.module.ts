import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayModule } from './api-gateway-service/api-gateway.module';
import { StorageModule } from '@booking-ticket-system/Storage';
import { RedisModule } from '@booking-ticket-system/Redis';

@Module({
  imports: [
    ApiGatewayModule,
    StorageModule,
    RedisModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
  ],
})
export class AppModule {}

