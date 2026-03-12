import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(
    request: Request & { requestId?: string },
    response: Response,
    next: NextFunction,
  ): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      this.logger.log({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  }
}
