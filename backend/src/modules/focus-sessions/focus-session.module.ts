import { Module } from '@nestjs/common';
import { RewardModule } from '../rewards/reward.module';
import { FocusSessionController } from './focus-session.controller';
import { FocusSessionRepository } from './focus-session.repository';
import { FocusSessionService } from './focus-session.service';
import { SessionIdempotencyService } from './session-idempotency.service';
import { FocusSessionSweeper } from './focus-session.sweeper';

@Module({
  imports: [RewardModule],
  controllers: [FocusSessionController],
  providers: [
    FocusSessionRepository,
    FocusSessionService,
    SessionIdempotencyService,
    FocusSessionSweeper,
  ],
  exports: [FocusSessionService, FocusSessionRepository],
})
export class FocusSessionModule {}
