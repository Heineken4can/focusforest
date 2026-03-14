import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncRepository } from './sync.repository';
import { SyncRateLimitService } from './sync-rate-limit.service';
import { SyncRateLimitGuard } from './sync-rate-limit.guard';
import { TaskModule } from '../tasks/task.module';
import { FocusSessionModule } from '../focus-sessions/focus-session.module';

@Module({
  imports: [TaskModule, FocusSessionModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncRepository,
    SyncRateLimitService,
    SyncRateLimitGuard,
  ],
  exports: [SyncService],
})
export class SyncModule {}
