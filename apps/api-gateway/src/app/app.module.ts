import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayModule } from './API/ApiGateway.module';
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
