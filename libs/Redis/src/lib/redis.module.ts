import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port =
          Number(configService.get<number | string>('REDIS_PORT')) || 6379;
        const logger = new Logger('RedisModule');

        const client = new Redis({
          host,
          port,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        client.on('connect', () => {
          logger.log(`Connected to Redis server at ${host}:${port}`);
        });

        client.on('error', (err) => {
          logger.error(`Redis client error: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
