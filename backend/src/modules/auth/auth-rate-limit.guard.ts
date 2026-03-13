import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly authRateLimitService: AuthRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.route as { path?: string } | undefined;
    const bucket = route?.path ?? context.getHandler().name;
    const identity = this.resolveIdentity(request);

    await this.authRateLimitService.assertWithinLimit(bucket, identity);

    return true;
  }

  private resolveIdentity(request: Request): string {
    return (
      request.ip?.trim() || request.socket.remoteAddress?.trim() || 'unknown'
    );
  }
}
