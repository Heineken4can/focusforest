import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(
    request: Request & { requestId?: string },
    response: Response,
    next: NextFunction,
  ): void {
    const requestId = request.header('x-request-id') ?? randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    this.requestContextService.run(requestId, next);
  }
}
