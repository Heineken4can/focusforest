import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

type ErrorPayload = {
  status: 'error';
  message: string;
  code: string;
  data: unknown;
  meta: {
    requestId?: string;
    path: string;
    timestamp: string;
  };
};

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, code, data } = this.parseException(exception, statusCode);
    const payload: ErrorPayload = {
      status: 'error',
      message,
      code,
      data,
      meta: {
        requestId: request.requestId,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      },
    };

    if (statusCode >= 500) {
      this.logger.error(
        payload,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(payload);
    }

    response.status(statusCode).json(payload);
  }

  private parseException(
    exception: unknown,
    statusCode: number,
  ): { message: string; code: string; data: unknown } {
    if (!(exception instanceof HttpException)) {
      return {
        message: 'Unexpected server error.',
        code: 'INTERNAL_SERVER_ERROR',
        data: null,
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        message: response,
        code: this.defaultCode(statusCode),
        data: null,
      };
    }

    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      const responseMessage = body.message;

      return {
        message: this.normalizeMessage(responseMessage, exception.message),
        code:
          typeof body.code === 'string'
            ? body.code
            : this.defaultCode(statusCode),
        data: body.data ?? null,
      };
    }

    return {
      message: exception.message,
      code: this.defaultCode(statusCode),
      data: null,
    };
  }

  private defaultCode(statusCode: number): string {
    if (statusCode === 400) {
      return 'BAD_REQUEST';
    }

    if (statusCode === 503) {
      return 'APP_503_NOT_READY';
    }

    if (statusCode === 401) {
      return 'AUTH_401_UNAUTHORIZED';
    }

    return 'HTTP_ERROR';
  }

  private normalizeMessage(responseMessage: unknown, fallback: string): string {
    if (Array.isArray(responseMessage)) {
      return responseMessage
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join(', ');
    }

    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (responseMessage && typeof responseMessage === 'object') {
      return JSON.stringify(responseMessage);
    }

    return fallback;
  }
}
