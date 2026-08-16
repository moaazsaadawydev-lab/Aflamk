import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService, RATE_LIMIT_PREFIX } from '@booking-ticket-system/Redis';

@Injectable()
export class ForgotPasswordRateLimitGuard implements CanActivate {
  private readonly WINDOW_TTL_SECONDS = 900; // 15 minutes
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const email = request.body?.email ? request.body.email.trim().toLowerCase() : 'anonymous';
    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      request.socket?.remoteAddress ||
      'anonymous';

    const rateLimitKey = `${RATE_LIMIT_PREFIX}forgot-password-gw:${clientIp}:${email}`;

    const currentAttempts = await this.redisService.incrementCounter(
      rateLimitKey,
      this.WINDOW_TTL_SECONDS,
    );

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', this.MAX_ATTEMPTS);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, this.MAX_ATTEMPTS - currentAttempts),
      );
    }

    if (currentAttempts > this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many password reset requests. Please try again after 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
