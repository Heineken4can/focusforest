import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import type { Response as SupertestResponse } from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { FocusSessionService } from '../src/modules/focus-sessions/focus-session.service';

type StartSessionResponseBody = {
  data: {
    activeSession: {
      status: string;
    };
  };
};

type ConflictResponseBody = {
  code: string;
};

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

describe('FocusSessionController (e2e)', () => {
  let app: INestApplication;
  const focusSessionServiceMock = {
    startSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    giveUpSession: jest.fn(),
    completeSession: jest.fn(),
    startBreak: jest.fn(),
    completeBreak: jest.fn(),
    skipBreak: jest.fn(),
  };
  const prismaServiceMock = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
  const redisServiceMock = {
    getStatus: jest.fn().mockReturnValue('ready'),
    ping: jest.fn().mockResolvedValue('PONG'),
    onModuleDestroy: jest.fn(),
  };
  const accessToken = jwt.sign(
    {
      sub: 'user-1',
      email: 'user@example.com',
      type: 'access',
    },
    'test-access-secret',
    { expiresIn: '15m' },
  );

  beforeAll(async () => {
    applyTestEnv();
    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FocusSessionService)
      .useValue(focusSessionServiceMock)
      .overrideProvider(PrismaService)
      .useValue(prismaServiceMock)
      .overrideProvider(RedisService)
      .useValue(redisServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  }, 15000);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/focus-sessions (POST)', async () => {
    focusSessionServiceMock.startSession.mockResolvedValue({
      status: 'success',
      message: 'Focus session started successfully.',
      data: {
        activeSession: {
          focusSessionId: 'session-1',
          taskId: '0195d7fe-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
          status: 'RUNNING',
          startedAt: '2026-03-13T00:00:00.000Z',
          plannedFocusSec: 1500,
          pauseCount: 0,
          pauseStartedAt: null,
          pauseDeadlineAt: null,
          focusEndedAt: null,
          givenUpAt: null,
          breakStartedAt: null,
          breakEndsAt: null,
          breakEndedAt: null,
          version: 1,
        },
        currentTask: {
          taskId: '0195d7fe-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
          title: 'Task title',
          status: 'PENDING',
          isCore: false,
          isLocked: true,
        },
        sidebarSummary: {
          completedFocusSessionCount: 0,
        },
        nextTaskCandidates: [],
        policy: {
          focusDurationSec: 1500,
          breakDurationSec: 300,
          pauseLimitSec: 300,
          maxPauseCount: 1,
        },
      },
      meta: {},
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/focus-sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        taskId: '0195d7fe-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
        taskVersion: 1,
        clientGeneratedId: '0195d7fe-7777-7777-8777-777777777777',
        startedAt: '2026-03-13T00:00:00.000Z',
      })
      .expect(201)
      .expect((response: SupertestResponse) => {
        const body = response.body as StartSessionResponseBody;
        expect(body.data.activeSession.status).toBe('RUNNING');
      });
  });

  it('/api/v1/focus-sessions/:id/pause (PATCH) validates payload', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/v1/focus-sessions/session-1/pause')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 0,
      })
      .expect(400);
  });

  it('/api/v1/focus-sessions/:id/complete (POST) returns conflict codes', async () => {
    focusSessionServiceMock.completeSession.mockRejectedValue(
      new HttpException(
        {
          message: 'Version conflict detected.',
          code: 'SYNC_409_CONFLICT',
          data: {
            entityType: 'FOCUS_SESSION',
            entityId: 'session-1',
            serverVersion: 2,
          },
        },
        HttpStatus.CONFLICT,
      ),
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/focus-sessions/session-1/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        eventId: '0195d7fe-8888-7888-8888-888888888888',
        occurredAt: '2026-03-13T00:25:00.000Z',
      })
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = response.body as ConflictResponseBody;
        expect(body.code).toBe('SYNC_409_CONFLICT');
      });
  });
});
