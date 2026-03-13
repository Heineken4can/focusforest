import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import type { Response as SupertestResponse } from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { configureApp } from '../src/bootstrap';
import { AuthRateLimitService } from '../src/modules/auth/auth-rate-limit.service';
import { AuthService } from '../src/modules/auth/auth.service';

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

type SignupResponseBody = {
  status: string;
  data: {
    user: {
      email: string;
    };
  };
};

type LoginResponseBody = {
  status: string;
  data: {
    bootstrapRequired: boolean;
  };
};

type RefreshResponseBody = {
  status: string;
  data: {
    accessToken: string;
  };
};

type LogoutResponseBody = {
  status: string;
  data: {
    revoked: boolean;
  };
};

type ErrorResponseBody = {
  status: string;
  code?: string;
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authServiceMock = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const authRateLimitServiceMock = {
    assertWithinLimit: jest.fn(),
  };

  beforeAll(async () => {
    applyTestEnv();
    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(AuthRateLimitService)
      .useValue(authRateLimitServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    authRateLimitServiceMock.assertWithinLimit.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/auth/signup (POST)', async () => {
    authServiceMock.signup.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'Focus User',
          timezone: 'Asia/Seoul',
          createdAt: '2026-03-12T14:00:00.000Z',
        },
        accessToken: 'access-token',
        accessTokenExpiresAt: '2026-03-12T15:00:00.000Z',
      },
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      refreshTokenMaxAgeMs: 1000,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/signup')
      .send({
        email: 'user@example.com',
        password: 'password1234',
        displayName: 'Focus User',
      })
      .expect(201)
      .expect((response: SupertestResponse) => {
        const body = response.body as SignupResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.user.email).toBe('user@example.com');
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('refreshToken=refresh-token'),
            expect.stringContaining('csrfToken=csrf-token'),
          ]),
        );
      });
  });

  it('/api/v1/auth/login (POST)', async () => {
    authServiceMock.login.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'Focus User',
          timezone: 'Asia/Seoul',
        },
        accessToken: 'access-token',
        accessTokenExpiresAt: '2026-03-12T15:00:00.000Z',
        bootstrapRequired: true,
      },
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      refreshTokenMaxAgeMs: 1000,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password1234',
      })
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as LoginResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.bootstrapRequired).toBe(true);
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('refreshToken=refresh-token'),
            expect.stringContaining('csrfToken=csrf-token'),
          ]),
        );
      });
  });

  it('/api/v1/auth/signup (POST) rejects invalid payload', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/signup')
      .send({
        email: 'invalid-email',
        password: 'short',
        displayName: '',
      })
      .expect(400)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
      });
  });

  it('/api/v1/auth/refresh (POST)', async () => {
    authServiceMock.refresh.mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        accessTokenExpiresAt: '2026-03-12T15:30:00.000Z',
      },
      refreshToken: 'next-refresh-token',
      csrfToken: 'next-csrf-token',
      refreshTokenMaxAgeMs: 1000,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', 'csrf-token')
      .set('Cookie', ['refreshToken=refresh-token', 'csrfToken=csrf-token'])
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as RefreshResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.accessToken).toBe('new-access-token');
        expect(authServiceMock.refresh).toHaveBeenCalledWith({
          refreshToken: 'refresh-token',
          csrfToken: 'csrf-token',
          csrfHeader: 'csrf-token',
          deviceInfo: undefined,
        });
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('refreshToken=next-refresh-token'),
            expect.stringContaining('csrfToken=next-csrf-token'),
          ]),
        );
      });
  });

  it('/api/v1/auth/logout (POST)', async () => {
    authServiceMock.logout.mockResolvedValue({
      revoked: true,
    });

    const accessToken = jwt.sign(
      {
        sub: 'user-1',
        email: 'user@example.com',
        type: 'access',
      },
      'test-access-secret',
      { expiresIn: '15m' },
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', 'csrf-token')
      .set('Cookie', ['refreshToken=refresh-token', 'csrfToken=csrf-token'])
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as LogoutResponseBody;

        expect(body.status).toBe('success');
        expect(body.data.revoked).toBe(true);
        expect(authServiceMock.logout).toHaveBeenCalledWith({
          userId: 'user-1',
          refreshToken: 'refresh-token',
          csrfToken: 'csrf-token',
          csrfHeader: 'csrf-token',
        });
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('refreshToken=;'),
            expect.stringContaining('csrfToken=;'),
          ]),
        );
      });
  });

  it('/api/v1/auth/logout (POST) rejects missing bearer token', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', 'csrf-token')
      .set('Cookie', ['refreshToken=refresh-token', 'csrfToken=csrf-token'])
      .expect(401)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('AUTH_401_UNAUTHORIZED');
      });
  });

  it('/api/v1/auth/refresh (POST) rejects invalid csrf token', async () => {
    authServiceMock.refresh.mockRejectedValue(
      new HttpException(
        {
          message: 'CSRF token is invalid.',
          code: 'AUTH_403_CSRF_INVALID',
          data: null,
        },
        HttpStatus.FORBIDDEN,
      ),
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', 'wrong-token')
      .set('Cookie', ['refreshToken=refresh-token', 'csrfToken=csrf-token'])
      .expect(403)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('AUTH_403_CSRF_INVALID');
      });
  });

  it('/api/v1/auth/logout (POST) rejects revoked refresh token', async () => {
    authServiceMock.logout.mockRejectedValue(
      new HttpException(
        {
          message: 'Refresh token is invalid or revoked.',
          code: 'AUTH_401_REFRESH_REVOKED',
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      ),
    );
    const accessToken = jwt.sign(
      {
        sub: 'user-1',
        email: 'user@example.com',
        type: 'access',
      },
      'test-access-secret',
      { expiresIn: '15m' },
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', 'csrf-token')
      .set('Cookie', ['refreshToken=refresh-token', 'csrfToken=csrf-token'])
      .expect(401)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('AUTH_401_REFRESH_REVOKED');
        expect(response.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('refreshToken=;'),
            expect.stringContaining('csrfToken=;'),
          ]),
        );
      });
  });

  it('/api/v1/auth/login (POST) returns 429 when auth rate limit is exceeded', async () => {
    authRateLimitServiceMock.assertWithinLimit.mockRejectedValue(
      new HttpException(
        {
          message: 'Auth rate limit exceeded.',
          code: 'AUTH_429_RATE_LIMIT',
          data: {
            bucket: 'login',
            retryAfterSec: 60,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password1234',
      })
      .expect(429)
      .expect((response: SupertestResponse) => {
        const body = response.body as ErrorResponseBody;

        expect(body.status).toBe('error');
        expect(body.code).toBe('AUTH_429_RATE_LIMIT');
      });
  });

  it('/api/v1/auth/signup (POST) ignores spoofed x-forwarded-for for auth rate limiting', async () => {
    authServiceMock.signup.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'Focus User',
          timezone: 'Asia/Seoul',
          createdAt: '2026-03-12T14:00:00.000Z',
        },
        accessToken: 'access-token',
        accessTokenExpiresAt: '2026-03-12T15:00:00.000Z',
      },
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      refreshTokenMaxAgeMs: 1000,
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/auth/signup')
      .set('X-Forwarded-For', '8.8.8.8')
      .send({
        email: 'user@example.com',
        password: 'password1234',
        displayName: 'Focus User',
      })
      .expect(201);

    const rateLimitCalls = authRateLimitServiceMock.assertWithinLimit.mock
      .calls as [string, string][];
    const identity = rateLimitCalls[0]?.[1] ?? '';

    expect(identity).not.toBe('8.8.8.8');
  });
});
