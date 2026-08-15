import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { status } from '@grpc/grpc-js';

@Catch()
export class GrpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcToHttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'object' && res !== null && (res as any).message
          ? (res as any).message
          : exception.message;
    } else {
      const grpcCode =
        exception?.code ?? exception?.error?.code ?? exception?.status;

      message =
        exception?.details ||
        (typeof exception?.message === 'string'
          ? exception.message.replace(/^\d+\s+[A-Z_]+:\s*/, '')
          : 'Internal server error');

      switch (grpcCode) {
        case status.INVALID_ARGUMENT:
          httpStatus = HttpStatus.BAD_REQUEST;
          break;
        case status.UNAUTHENTICATED:
          httpStatus = HttpStatus.UNAUTHORIZED;
          break;
        case status.PERMISSION_DENIED:
          httpStatus = HttpStatus.FORBIDDEN;
          break;
        case status.NOT_FOUND:
          httpStatus = HttpStatus.NOT_FOUND;
          break;
        case status.ALREADY_EXISTS:
          httpStatus = HttpStatus.CONFLICT;
          break;
        case status.RESOURCE_EXHAUSTED:
          httpStatus = HttpStatus.TOO_MANY_REQUESTS;
          break;
        case status.FAILED_PRECONDITION:
          httpStatus = HttpStatus.PRECONDITION_FAILED;
          break;
        case status.UNAVAILABLE:
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        default:
          httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
      }
    }

    const httpStatusName = HttpStatus[httpStatus] || 'UNKNOWN_ERROR';

    this.logger.error(
      `[GrpcToHttpExceptionFilter] HTTP ${httpStatus} (${httpStatusName}): ${
        Array.isArray(message) ? message.join(', ') : message
      }`,
    );

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message,
      error: httpStatusName,
      timestamp: new Date().toISOString(),
    });
  }
}
