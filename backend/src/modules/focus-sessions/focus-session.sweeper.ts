import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FocusSessionRepository } from './focus-session.repository';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class FocusSessionSweeper {
  private readonly logger = new Logger(FocusSessionSweeper.name);
  private readonly LOCK_KEY = 'lock:focus-session-timeout-sweeper';
  private readonly LOCK_TTL = 50; // seconds, slightly less than 1 min to avoid overlap but ensure it releases

  constructor(
    private readonly repository: FocusSessionRepository,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const redis = await this.redisService.getReadyClient();
    
    // Acquire distributed lock
    const lockAcquired = await redis.set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL, 'NX');
    if (!lockAcquired) {
      return;
    }

    this.logger.debug('Starting pause timeout sweeper...');
    const now = new Date();
    
    try {
      const timedOutSessions = await this.repository.findTimedOutSessions(now);
      
      if (timedOutSessions.length === 0) {
        return;
      }

      this.logger.log(`Found ${timedOutSessions.length} timed out sessions.`);

      for (const session of timedOutSessions) {
        await this.repository.markTimedOut(this.repository.prisma, {
          userId: session.userId,
          sessionId: session.id,
          version: session.version,
          givenUpAt: now,
        });
      }
      
      this.logger.log(`Successfully processed ${timedOutSessions.length} timed out sessions.`);
    } catch (error) {
      this.logger.error('Error during pause timeout sweeping:', error);
    }
  }
}
