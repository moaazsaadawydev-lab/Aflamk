import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class ChangePasswordRateLimitGuard implements CanActivate {
  private static failedAttemptsMap = new Map<string, number[]>();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_FAILED_ATTEMPTS = 5;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || 'anonymous';
    const ipAddress =
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      '';
    const key = `${userId}:${ipAddress}`;

    const now = Date.now();
    const attempts =
      ChangePasswordRateLimitGuard.failedAttemptsMap.get(key) || [];
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.WINDOW_MS,
    );

    ChangePasswordRateLimitGuard.failedAttemptsMap.set(key, validAttempts);

    if (validAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        'Too many failed password change attempts. Please try again after 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  public static recordFailedAttempt(userId?: string, ipAddress?: string): void {
    const key = `${userId || 'anonymous'}:${ipAddress || ''}`;
    const now = Date.now();
    const attempts =
      ChangePasswordRateLimitGuard.failedAttemptsMap.get(key) || [];
    attempts.push(now);
    ChangePasswordRateLimitGuard.failedAttemptsMap.set(key, attempts);
  }

  public static clearFailedAttempts(userId?: string, ipAddress?: string): void {
    const key = `${userId || 'anonymous'}:${ipAddress || ''}`;
    ChangePasswordRateLimitGuard.failedAttemptsMap.delete(key);
  }
}
