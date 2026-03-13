import { createHash, randomUUID } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';

type IdempotencyRecord<T> = {
  payloadHash: string;
  result: T;
};

type InFlightRecord = {
  payloadHash: string;
  promise: Promise<unknown>;
};

type MemoryRecord = {
  payloadHash: string;
  result: unknown;
  expiresAt: number;
};

const DEFAULT_TTL_SEC = 604800;
const EXECUTION_LOCK_TTL_SEC = 30;
const POLL_INTERVAL_MS = 100;
const POLL_ATTEMPTS = 20;

@Injectable()
export class SessionIdempotencyService {
  private readonly inFlight = new Map<string, InFlightRecord>();
  private readonly memoryCache = new Map<string, MemoryRecord>();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async execute<T>(input: {
    userId: string;
    sessionId: string;
    action:
      | 'give-up'
      | 'complete'
      | 'start-break'
      | 'complete-break'
      | 'skip-break';
    eventId: string;
    payload: unknown;
    handler: () => Promise<T>;
  }): Promise<T> {
    const key = this.buildKey(input);
    const payloadHash = this.hashPayload(input.payload);
    const ttlSec =
      this.configService.get<number>('observability.idempotencyTtlSec') ??
      DEFAULT_TTL_SEC;

    const memoryHit = this.readMemoryCache<T>(
      key,
      payloadHash,
      input.sessionId,
    );
    if (memoryHit !== null) {
      return memoryHit;
    }

    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      if (inFlight.payloadHash !== payloadHash) {
        this.throwPayloadConflict(input.sessionId);
      }

      return inFlight.promise as Promise<T>;
    }

    const client = await this.redisService.getReadyClient();
    const cached = await this.readRedisCache<T>(
      client,
      key,
      payloadHash,
      input.sessionId,
    );
    if (cached !== null) {
      this.storeMemoryCache(key, payloadHash, cached, ttlSec);
      return cached;
    }

    const lockKey = `${key}:lock`;
    const lockToken = randomUUID();
    const hasLock = await this.acquireLock(client, lockKey, lockToken);

    if (!hasLock) {
      const awaited = await this.waitForCompletedResult<T>(
        client,
        key,
        payloadHash,
        input.sessionId,
      );

      if (awaited !== null) {
        this.storeMemoryCache(key, payloadHash, awaited, ttlSec);
        return awaited;
      }

      throw new ConflictException({
        message: 'Idempotent event is already being processed.',
        code: 'SYNC_409_CONFLICT',
        data: {
          entityType: 'FOCUS_SESSION',
          entityId: input.sessionId,
          resolutionStrategy: 'RETRY_LATER',
          retryable: true,
        },
      });
    }

    const execution = input.handler();
    this.inFlight.set(key, {
      payloadHash,
      promise: execution,
    });

    try {
      const result = await execution;

      this.storeMemoryCache(key, payloadHash, result, ttlSec);
      await this.writeRedisCache(client, key, payloadHash, result, ttlSec);

      return result;
    } finally {
      this.inFlight.delete(key);
      await this.releaseLock(client, lockKey, lockToken);
    }
  }

  private buildKey(input: {
    userId: string;
    sessionId: string;
    action: string;
    eventId: string;
  }): string {
    return `idem:${input.userId}:focus_session:${input.sessionId}:${input.action}:${input.eventId}`;
  }

  private hashPayload(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private readMemoryCache<T>(
    key: string,
    payloadHash: string,
    sessionId: string,
  ): T | null {
    const cached = this.memoryCache.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    if (cached.payloadHash !== payloadHash) {
      this.throwPayloadConflict(sessionId);
    }

    return cached.result as T;
  }

  private async readRedisCache<T>(
    client: Awaited<ReturnType<RedisService['getReadyClient']>>,
    key: string,
    payloadHash: string,
    sessionId: string,
  ): Promise<T | null> {
    const cachedRaw = await client.get(key);

    if (!cachedRaw) {
      return null;
    }

    const cached = JSON.parse(cachedRaw) as IdempotencyRecord<T>;
    if (cached.payloadHash !== payloadHash) {
      this.throwPayloadConflict(sessionId);
    }

    return cached.result;
  }

  private async writeRedisCache<T>(
    client: Awaited<ReturnType<RedisService['getReadyClient']>>,
    key: string,
    payloadHash: string,
    result: T,
    ttlSec: number,
  ): Promise<void> {
    try {
      await client.set(
        key,
        JSON.stringify({
          payloadHash,
          result,
        } satisfies IdempotencyRecord<T>),
        'EX',
        ttlSec,
      );
    } catch {
      // In-memory fallback keeps replay stable on the same process.
    }
  }

  private async acquireLock(
    client: Awaited<ReturnType<RedisService['getReadyClient']>>,
    lockKey: string,
    lockToken: string,
  ): Promise<boolean> {
    try {
      const result = await client.set(
        lockKey,
        lockToken,
        'EX',
        EXECUTION_LOCK_TTL_SEC,
        'NX',
      );

      return result === 'OK';
    } catch {
      return false;
    }
  }

  private async releaseLock(
    client: Awaited<ReturnType<RedisService['getReadyClient']>>,
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      const current = await client.get(lockKey);
      if (current === lockToken) {
        await client.del(lockKey);
      }
    } catch {
      // Best effort cleanup only.
    }
  }

  private async waitForCompletedResult<T>(
    client: Awaited<ReturnType<RedisService['getReadyClient']>>,
    key: string,
    payloadHash: string,
    sessionId: string,
  ): Promise<T | null> {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const memoryHit = this.readMemoryCache<T>(key, payloadHash, sessionId);
      if (memoryHit !== null) {
        return memoryHit;
      }

      const redisHit = await this.readRedisCache<T>(
        client,
        key,
        payloadHash,
        sessionId,
      );
      if (redisHit !== null) {
        return redisHit;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }

    return null;
  }

  private storeMemoryCache<T>(
    key: string,
    payloadHash: string,
    result: T,
    ttlSec: number,
  ): void {
    this.memoryCache.set(key, {
      payloadHash,
      result,
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }

  private throwPayloadConflict(sessionId: string): never {
    throw new ConflictException({
      message: 'Idempotency key was reused with a different payload.',
      code: 'SYNC_409_CONFLICT',
      data: {
        entityType: 'FOCUS_SESSION',
        entityId: sessionId,
        resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
        retryable: false,
      },
    });
  }
}
