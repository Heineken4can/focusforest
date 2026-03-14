import { Injectable } from '@nestjs/common';
import { MetricsRepository } from './metrics.repository';
import { RedisService } from '../../common/redis/redis.service';
import { MetricEventName } from '@prisma/client';

export interface MetricEventInput {
  eventId: string;
  eventName: MetricEventName;
  occurredAt: string;
  deviceId: string;
  userId?: string;
  focusSessionId?: string;
  rewardLedgerId?: string;
  dedupeKey?: string;
  payload?: any;
}

@Injectable()
export class MetricsService {
  private readonly DEDUPE_TTL = 86400; // 24 hours

  constructor(
    private readonly metricsRepository: MetricsRepository,
    private readonly redisService: RedisService,
  ) {}

  async collectEvents(userId: string | undefined, deviceId: string, events: MetricEventInput[]) {
    const redis = await this.redisService.getReadyClient();
    const acceptedEventIds: string[] = [];
    const deduplicatedEventIds: string[] = [];
    const eventsToSave: any[] = [];

    for (const event of events) {
      const eventIdKey = `metrics:id:${event.eventId}`;
      const dedupeKey = event.dedupeKey 
        ? `metrics:dedupe:${event.eventName}:${event.dedupeKey}`
        : null;

      // Check eventId uniqueness in Redis
      const isNewId = await redis.set(eventIdKey, '1', 'EX', this.DEDUPE_TTL, 'NX');
      
      let isNewDedupe = true;
      if (dedupeKey) {
        const result = await redis.set(dedupeKey, '1', 'EX', this.DEDUPE_TTL, 'NX');
        isNewDedupe = !!result;
      }

      if (isNewId && isNewDedupe) {
        acceptedEventIds.push(event.eventId);
        eventsToSave.push({
          eventId: event.eventId,
          userId: userId || event.userId,
          deviceId: deviceId || event.deviceId,
          eventName: event.eventName,
          occurredAt: new Date(event.occurredAt),
          focusSessionId: event.focusSessionId,
          rewardLedgerId: event.rewardLedgerId,
          dedupeKey: event.dedupeKey,
          payload: event.payload || {},
        });
      } else {
        deduplicatedEventIds.push(event.eventId);
      }
    }

    if (eventsToSave.length > 0) {
      await this.metricsRepository.createMany(eventsToSave);
    }

    return {
      acceptedEventIds,
      deduplicatedEventIds,
    };
  }
}
