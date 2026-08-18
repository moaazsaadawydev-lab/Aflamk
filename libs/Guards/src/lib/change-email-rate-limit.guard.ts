import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService, RATE_LIMIT_PREFIX } from '@booking-ticket-system/Redis';

@Injectable()
export class ChangeEmailRateLimitGuard implements CanActivate {
  private readonly WINDOW_TTL_SECONDS = 900;
  private readonly MAX_ALLOWED_REQUESTS = 5;

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

    const rateLimitKey = `${RATE_LIMIT_PREFIX}change-email-gw:${clientIp}:${userId}`;

    const currentAttempts = await this.redisService.incrementCounter(
      rateLimitKey,
      this.WINDOW_TTL_SECONDS,
    );

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', this.MAX_ALLOWED_REQUESTS);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, this.MAX_ALLOWED_REQUESTS - currentAttempts),
      );
    }

    if (currentAttempts > this.MAX_ALLOWED_REQUESTS) {
      throw new HttpException(
        'Too many email change requests. Please try again after 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
