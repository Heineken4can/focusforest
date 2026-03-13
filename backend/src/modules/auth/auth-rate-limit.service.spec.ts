import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  const configServiceMock = {
    get: jest.fn(),
  };
  const redisClientMock = {
    status: 'wait',
    eval: jest.fn(),
  };
  const redisServiceMock = {
    getReadyClient: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    redisClientMock.status = 'wait';
    redisServiceMock.getReadyClient.mockResolvedValue(redisClientMock);
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'rateLimit.auth.max') {
        return 2;
      }

      if (key === 'rateLimit.auth.windowSec') {
        return 60;
      }

      return undefined;
    });
  });

  it('allows requests within configured limit', async () => {
    redisClientMock.eval.mockResolvedValue([1, 60]);
    const service = new AuthRateLimitService(
      configServiceMock as unknown as ConfigService,
      redisServiceMock as unknown as RedisService,
    );

    await expect(
      service.assertWithinLimit('login', '127.0.0.1'),
    ).resolves.toBeUndefined();
    expect(redisServiceMock.getReadyClient).toHaveBeenCalledTimes(1);
    expect(redisClientMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('INCR'),
      1,
      'rate-limit:auth:login:127.0.0.1',
      '60',
    );
  });

  it('throws AUTH_429_RATE_LIMIT after exceeding the limit', async () => {
    redisClientMock.status = 'ready';
    redisClientMock.eval.mockResolvedValue([3, 42]);
    const service = new AuthRateLimitService(
      configServiceMock as unknown as ConfigService,
      redisServiceMock as unknown as RedisService,
    );

    await expect(
      service.assertWithinLimit('refresh', '127.0.0.1'),
    ).rejects.toMatchObject({
      status: 429,
      response: {
        code: 'AUTH_429_RATE_LIMIT',
        data: {
          bucket: 'refresh',
          retryAfterSec: 42,
        },
      },
    });
    expect(redisServiceMock.getReadyClient).toHaveBeenCalledTimes(1);
  });
});
