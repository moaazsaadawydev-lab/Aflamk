import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService, RATE_LIMIT_PREFIX } from '@booking-ticket-system/Redis';

@Injectable()
export class ChangePasswordRateLimitGuard implements CanActivate {
  private readonly WINDOW_TTL_SECONDS = 900; // 15 minutes
  private readonly MAX_FAILED_ATTEMPTS = 5;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const userId = request.user?.id || 'anonymous';
    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      'anonymous';

    const rateLimitKey = `${RATE_LIMIT_PREFIX}change-password:${userId}:${clientIp}`;

    const currentAttempts = await this.redisService.incrementCounter(
      rateLimitKey,
      this.WINDOW_TTL_SECONDS,
    );

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', this.MAX_FAILED_ATTEMPTS);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, this.MAX_FAILED_ATTEMPTS - currentAttempts),
      );
    }

    if (currentAttempts > this.MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        'Too many password change attempts. Please try again after 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  public static recordFailedAttempt(
    userId?: string,
    ipAddress?: string,
  ): void {}

  public static clearFailedAttempts(
    userId?: string,
    ipAddress?: string,
  ): void {}
}
