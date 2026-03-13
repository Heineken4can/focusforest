import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';

type RateLimitEvalResult = [number | string, number | string];

@Injectable()
export class AuthRateLimitService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async assertWithinLimit(bucket: string, identity: string): Promise<void> {
    const max = this.configService.get<number>('rateLimit.auth.max') ?? 10;
    const windowSec =
      this.configService.get<number>('rateLimit.auth.windowSec') ?? 60;
    const redisClient = await this.redisService.getReadyClient();

    const redisKey = this.buildKey(bucket, identity);
    const evalResult = (await redisClient.eval(
      `
        local current = redis.call("INCR", KEYS[1])
        if current == 1 then
          redis.call("EXPIRE", KEYS[1], ARGV[1])
        end
        local ttl = redis.call("TTL", KEYS[1])
        return { current, ttl }
      `,
      1,
      redisKey,
      String(windowSec),
    )) as RateLimitEvalResult;
    const currentCount = Number(evalResult[0]);
    const retryAfterSec = Math.max(Number(evalResult[1]), 0);

    if (currentCount <= max) {
      return;
    }

    throw new HttpException(
      {
        message: 'Auth rate limit exceeded.',
        code: 'AUTH_429_RATE_LIMIT',
        data: {
          bucket,
          retryAfterSec,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private buildKey(bucket: string, identity: string): string {
    return `rate-limit:auth:${bucket}:${identity}`;
  }
}
