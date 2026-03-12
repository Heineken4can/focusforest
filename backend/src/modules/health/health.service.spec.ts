import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'app.version') {
        return '0.1.0-test';
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns live status with version metadata', () => {
    const prismaService = {
      $queryRawUnsafe: jest.fn(),
    } as unknown as PrismaService;
    const redisService = {
      ping: jest.fn(),
    } as unknown as RedisService;

    const service = new HealthService(
      configService,
      prismaService,
      redisService,
    );

    expect(service.getLiveStatus()).toMatchObject({
      ok: true,
      version: '0.1.0-test',
    });
  });

  it('reports readiness failure when a dependency is unavailable', async () => {
    const prismaService = {
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('db unavailable')),
    } as unknown as PrismaService;
    const redisService = {
      ping: jest.fn().mockResolvedValue('PONG'),
    } as unknown as RedisService;

    const service = new HealthService(
      configService,
      prismaService,
      redisService,
    );
    const readiness = await service.getReadinessStatus();

    expect(readiness.ok).toBe(false);
    expect(readiness.checks.database.ok).toBe(false);
    expect(readiness.checks.redis.ok).toBe(true);
  });
});
