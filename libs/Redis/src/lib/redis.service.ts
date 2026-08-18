import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
} from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('Redis client connection closed gracefully.');
    } catch (error) {
      this.logger.error(
        `Error closing Redis connection: ${(error as Error).message}`,
      );
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async set(
    key: string,
    value: string | object,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const serialized =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(
        `Redis SET error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (data === null) {
        return null;
      }
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (error) {
      this.logger.error(
        `Redis GET error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      if (Array.isArray(key)) {
        if (key.length === 0) return 0;
        return await this.client.del(...key);
      }
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `Redis DEL error for key(s) "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const count = await this.client.exists(key);
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Redis EXISTS error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Redis EXPIRE error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      if (members.length === 0) return 0;
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.logger.error(
        `Redis SADD error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      if (members.length === 0) return 0;
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.logger.error(
        `Redis SREM error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(
        `Redis SMEMBERS error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async scard(key: string): Promise<number> {
    try {
      return await this.client.scard(key);
    } catch (error) {
      this.logger.error(
        `Redis SCARD error for key "${key}": ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await this.smembers(userSessionsKey);

      const pipeline = this.client.pipeline();

      for (const sessionId of sessionIds) {
        if (sessionId.startsWith(SESSION_PREFIX)) {
          pipeline.del(sessionId);
        } else {
          pipeline.del(`${SESSION_PREFIX}${userId}:${sessionId}`);
          pipeline.del(`${SESSION_PREFIX}${sessionId}`);
        }
      }

      pipeline.del(userSessionsKey);
      await pipeline.exec();

      this.logger.log(
        `Revoked all ${sessionIds.length} active sessions for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke all sessions for user "${userId}": ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionKey = `${SESSION_PREFIX}${userId}:${sessionId}`;
      const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

      const pipeline = this.client.pipeline();
      pipeline.del(sessionKey);
      pipeline.del(`${SESSION_PREFIX}${sessionId}`);
      pipeline.srem(userSessionsKey, sessionId);
      await pipeline.exec();

      this.logger.log(`Revoked session "${sessionId}" for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke session "${sessionId}" for user "${userId}": ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1 && ttlSeconds > 0) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      this.logger.error(
        `Redis incrementCounter error for key "${key}": ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }
}
