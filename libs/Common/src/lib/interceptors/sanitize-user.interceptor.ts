import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_KEYS = [
  'password',
  'verificationCode',
  'verification_code',
  'verificationCodeExpiresAt',
  'verification_code_expires_at',
  'passwordResetCode',
  'password_reset_code',
  'passwordResetCodeExpiresAt',
  'password_reset_code_expires_at',
  'lastBlockedAt',
  'last_blocked_at',
  'blockReason',
  'block_reason',
];

export function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object') {
    if (data instanceof Date || Buffer.isBuffer(data)) {
      return data;
    }

    const sanitized: Record<string, any> = {};

    for (const key of Object.keys(data)) {
      if (!SENSITIVE_KEYS.includes(key)) {
        sanitized[key] = sanitizeData(data[key]);
      }
    }

    return sanitized;
  }

  return data;
}

@Injectable()
export class SanitizeUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => sanitizeData(data)));
  }
}
