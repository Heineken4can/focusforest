import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response as SupertestResponse } from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { configureApp } from '../src/bootstrap';
import {
  HealthService,
  ReadinessStatus,
} from '../src/modules/health/health.service';

const applyTestEnv = (): void => {
  process.env.NODE_ENV = 'test';
  process.env.APP_VERSION = '0.1.0-test';
  process.env.PORT = '3000';
  process.env.DATABASE_URL =
    'postgresql://focus_forest:changeme@localhost:5432/focus_forest?schema=public';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.ACCESS_TOKEN_TTL = '15m';
  process.env.REFRESH_TOKEN_TTL = '30d';
  process.env.AUTH_RATE_LIMIT_MAX = '10';
  process.env.AUTH_RATE_LIMIT_WINDOW_SEC = '60';
  process.env.METRICS_RATE_LIMIT_MAX = '60';
  process.env.METRICS_RATE_LIMIT_WINDOW_SEC = '60';
  process.env.SYNC_RATE_LIMIT_MAX = '120';
  process.env.SYNC_RATE_LIMIT_WINDOW_SEC = '60';
  process.env.ARGON2_MEMORY_COST = '65536';
  process.env.ARGON2_TIME_COST = '3';
  process.env.ARGON2_PARALLELISM = '1';
  process.env.CORS_ORIGINS = 'http://localhost:5173';
  process.env.LOG_LEVEL = 'silent';
  process.env.IDEMPOTENCY_TTL_SEC = '604800';
  process.env.SENTRY_DSN = '';
};

const createReadinessStatus = (ok: boolean): ReadinessStatus => ({
  ok,
  timestamp: '2026-03-12T00:00:00.000Z',
  version: '0.1.0-test',
  checks: {
    configuration: { ok: true },
    database: ok
      ? { ok: true, latencyMs: 1 }
      : { ok: false, latencyMs: 1, error: 'database unavailable' },
    redis: ok
      ? { ok: true, latencyMs: 1 }
      : { ok: false, latencyMs: 1, error: 'redis unavailable' },
  },
});

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  const healthServiceMock = {
    getLiveStatus: jest.fn(() => ({
      ok: true,
      timestamp: '2026-03-12T00:00:00.000Z',
      version: '0.1.0-test',
    })),
    getReadinessStatus: jest.fn<Promise<ReadinessStatus>, []>(),
  };

  beforeAll(async () => {
    applyTestEnv();
    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HealthService)
      .useValue(healthServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    healthServiceMock.getLiveStatus.mockClear();
    healthServiceMock.getReadinessStatus.mockReset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health/live (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/health/live')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as {
          status: string;
          data: {
            ok: boolean;
          };
        };

        expect(body.status).toBe('success');
        expect(body.data.ok).toBe(true);
      });
  });

  it('/health/live (GET) allows local network frontend origins during development', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const localNetworkOrigin = 'http://192.168.88.78:5173';

    await request(server)
      .get('/health/live')
      .set('Origin', localNetworkOrigin)
      .expect(200)
      .expect('access-control-allow-origin', localNetworkOrigin);
  });

  it('/health/ready (GET) returns 200 when dependencies are ready', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    healthServiceMock.getReadinessStatus.mockResolvedValue(
      createReadinessStatus(true),
    );

    await request(server)
      .get('/health/ready')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as {
          status: string;
          data: {
            ok: boolean;
          };
        };

        expect(body.status).toBe('success');
        expect(body.data.ok).toBe(true);
      });
  });

  it('/health/ready (GET) returns 503 when dependencies are unavailable', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    healthServiceMock.getReadinessStatus.mockResolvedValue(
      createReadinessStatus(false),
    );

    await request(server)
      .get('/health/ready')
      .expect(503)
      .expect((response: SupertestResponse) => {
        const body = response.body as {
          status: string;
          message: string;
          code: string;
          data: {
            ok: boolean;
          };
        };

        expect(body.status).toBe('error');
        expect(body.code).toBe('APP_503_NOT_READY');
        expect(body.data.ok).toBe(false);
      });
  });

  it('/api-docs/ (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get('/api-docs/').expect(200);
  });
});

