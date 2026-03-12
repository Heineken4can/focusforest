import { APP_NAME } from './app.config';

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCsv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default () => ({
  app: {
    name: APP_NAME,
    version: process.env.APP_VERSION ?? '0.1.0',
    port: parseNumber(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
    argon2: {
      memoryCost: parseNumber(process.env.ARGON2_MEMORY_COST, 65536),
      timeCost: parseNumber(process.env.ARGON2_TIME_COST, 3),
      parallelism: parseNumber(process.env.ARGON2_PARALLELISM, 1),
    },
  },
  rateLimit: {
    auth: {
      max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
      windowSec: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_SEC, 60),
    },
    metrics: {
      max: parseNumber(process.env.METRICS_RATE_LIMIT_MAX, 60),
      windowSec: parseNumber(process.env.METRICS_RATE_LIMIT_WINDOW_SEC, 60),
    },
    sync: {
      max: parseNumber(process.env.SYNC_RATE_LIMIT_MAX, 120),
      windowSec: parseNumber(process.env.SYNC_RATE_LIMIT_WINDOW_SEC, 60),
    },
  },
  cors: {
    origins: parseCsv(process.env.CORS_ORIGINS),
  },
  observability: {
    logLevel: process.env.LOG_LEVEL ?? 'info',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    idempotencyTtlSec: parseNumber(process.env.IDEMPOTENCY_TTL_SEC, 604800),
  },
});
