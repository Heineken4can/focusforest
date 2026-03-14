import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SyncRateLimitService } from './sync-rate-limit.service';

@Injectable()
export class SyncRateLimitGuard implements CanActivate {
  constructor(private readonly syncRateLimitService: SyncRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true;
    }

    const bucket = request.path.split('/').pop() || 'unknown';
    await this.syncRateLimitService.assertWithinLimit(bucket, userId);

    return true;
  }
}
