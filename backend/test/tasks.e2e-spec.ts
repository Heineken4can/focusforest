import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import type { Response as SupertestResponse } from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { TaskService } from '../src/modules/tasks/task.service';

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

type ErrorResponseBody = {
  status: string;
  code?: string;
  data?: Record<string, unknown>;
};

type CreateTaskResponseBody = {
  status: string;
  data: {
    task: {
      isCore: boolean;
    };
  };
};

type GetTasksResponseBody = {
  status: string;
  data: {
    items: unknown[];
  };
};

describe('TaskController (e2e)', () => {
  let app: INestApplication;
  const taskServiceMock = {
    getTasks: jest.fn(),
    getTask: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
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
      .overrideProvider(TaskService)
      .useValue(taskServiceMock)
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
    redisServiceMock.getStatus.mockReturnValue('ready');
    redisServiceMock.ping.mockResolvedValue('PONG');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/tasks (POST)', async () => {
    taskServiceMock.createTask.mockResolvedValue({
      status: 'success',
      message: 'Task created successfully.',
      data: {
        task: {
          id: 'task-1',
          clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
          title: 'Write backend task module',
          description: 'Task service implementation',
          status: 'PENDING',
          isCore: true,
          version: 1,
          createdAt: '2026-03-13T00:00:00.000Z',
          updatedAt: '2026-03-13T00:00:00.000Z',
        },
      },
      meta: {},
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
        title: 'Write backend task module',
        description: 'Task service implementation',
        isCore: true,
      })
      .expect(201)
      .expect((response: SupertestResponse) => {
        const body = response.body as CreateTaskResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.task.isCore).toBe(true);
      });
  });

  it('/api/v1/tasks (GET)', async () => {
    taskServiceMock.getTasks.mockResolvedValue({
      status: 'success',
      message: 'Tasks fetched successfully.',
      data: {
        items: [
          {
            id: 'task-1',
            clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
            title: 'Write backend task module',
            description: null,
            status: 'PENDING',
            isCore: false,
            version: 1,
            createdAt: '2026-03-13T00:00:00.000Z',
            updatedAt: '2026-03-13T00:00:00.000Z',
          },
        ],
      },
      meta: {},
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/v1/tasks?status=PENDING&isCore=false&limit=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as GetTasksResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.items).toHaveLength(1);
      });
  });

  it('/api/v1/tasks/:taskId (PATCH) returns 409 conflict payload', async () => {
    taskServiceMock.updateTask.mockRejectedValue(
      new HttpException(
        {
          message: 'Version conflict detected.',
          code: 'SYNC_409_CONFLICT',
          data: {
            entityType: 'TASK',
            entityId: 'task-1',
            clientVersion: 1,
            serverVersion: 2,
            serverSnapshot: {
              id: 'task-1',
              title: 'Server title',
            },
            resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
            retryable: false,
          },
        },
        HttpStatus.CONFLICT,
      ),
    );

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/v1/tasks/task-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        title: 'Client title',
      })
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('SYNC_409_CONFLICT');
        expect(body.data?.serverSnapshot).toBeDefined();
      });
  });

  it('/api/v1/tasks/:taskId (DELETE) returns active lock error', async () => {
    taskServiceMock.deleteTask.mockRejectedValue(
      new HttpException(
        {
          message: 'Task is locked by an active focus session.',
          code: 'TASK_409_ACTIVE_LOCK',
          data: null,
        },
        HttpStatus.CONFLICT,
      ),
    );

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .delete('/api/v1/tasks/task-1?version=3')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('TASK_409_ACTIVE_LOCK');
      });
  });

  it('/api/v1/tasks/:taskId (GET) requires auth', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/v1/tasks/task-1')
      .expect(401)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.code).toBe('AUTH_401_UNAUTHORIZED');
      });
  });
});
