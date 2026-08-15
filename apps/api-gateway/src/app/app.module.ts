import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayModule } from './api-gateway-service/api-gateway.module';
import { StorageModule } from '@booking-ticket-system/Storage';


@Module({
  imports: [
    ApiGatewayModule,
    StorageModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
  ],
})
export class AppModule {}
