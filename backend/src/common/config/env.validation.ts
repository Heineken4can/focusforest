type EnvValue = Record<string, unknown>;

const allowedLogLevels = new Set([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]);

const getString = (
  config: EnvValue,
  key: string,
  errors: string[],
): string | undefined => {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${key} is required.`);
    return undefined;
  }

  return value.trim();
};

const getNumber = (
  config: EnvValue,
  key: string,
  errors: string[],
): number | undefined => {
  const raw = getString(config, key, errors);

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    errors.push(`${key} must be a valid number.`);
    return undefined;
  }

  return parsed;
};

export function validateEnv(config: EnvValue): EnvValue {
  const errors: string[] = [];

  const nodeEnv = getString(config, 'NODE_ENV', errors);
  const appVersion = getString(config, 'APP_VERSION', errors);
  const port = getNumber(config, 'PORT', errors);
  const databaseUrl = getString(config, 'DATABASE_URL', errors);
  const redisUrl = getString(config, 'REDIS_URL', errors);
  const jwtAccessSecret = getString(config, 'JWT_ACCESS_SECRET', errors);
  const jwtRefreshSecret = getString(config, 'JWT_REFRESH_SECRET', errors);
  const accessTokenTtl = getString(config, 'ACCESS_TOKEN_TTL', errors);
  const refreshTokenTtl = getString(config, 'REFRESH_TOKEN_TTL', errors);
  const authRateLimitMax = getNumber(config, 'AUTH_RATE_LIMIT_MAX', errors);
  const authRateLimitWindowSec = getNumber(
    config,
    'AUTH_RATE_LIMIT_WINDOW_SEC',
    errors,
  );
  const metricsRateLimitMax = getNumber(
    config,
    'METRICS_RATE_LIMIT_MAX',
    errors,
  );
  const metricsRateLimitWindowSec = getNumber(
    config,
    'METRICS_RATE_LIMIT_WINDOW_SEC',
    errors,
  );
  const syncRateLimitMax = getNumber(config, 'SYNC_RATE_LIMIT_MAX', errors);
  const syncRateLimitWindowSec = getNumber(
    config,
    'SYNC_RATE_LIMIT_WINDOW_SEC',
    errors,
  );
  const argon2MemoryCost = getNumber(config, 'ARGON2_MEMORY_COST', errors);
  const argon2TimeCost = getNumber(config, 'ARGON2_TIME_COST', errors);
  const argon2Parallelism = getNumber(config, 'ARGON2_PARALLELISM', errors);
  const corsOrigins = getString(config, 'CORS_ORIGINS', errors);
  const logLevel = getString(config, 'LOG_LEVEL', errors);
  const idempotencyTtlSec = getNumber(config, 'IDEMPOTENCY_TTL_SEC', errors);
  const sentryDsn =
    typeof config.SENTRY_DSN === 'string' ? config.SENTRY_DSN.trim() : '';

  if (logLevel && !allowedLogLevels.has(logLevel)) {
    errors.push(
      'LOG_LEVEL must be one of fatal,error,warn,info,debug,trace,silent.',
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join(' ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    APP_VERSION: appVersion,
    PORT: port,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    ACCESS_TOKEN_TTL: accessTokenTtl,
    REFRESH_TOKEN_TTL: refreshTokenTtl,
    AUTH_RATE_LIMIT_MAX: authRateLimitMax,
    AUTH_RATE_LIMIT_WINDOW_SEC: authRateLimitWindowSec,
    METRICS_RATE_LIMIT_MAX: metricsRateLimitMax,
    METRICS_RATE_LIMIT_WINDOW_SEC: metricsRateLimitWindowSec,
    SYNC_RATE_LIMIT_MAX: syncRateLimitMax,
    SYNC_RATE_LIMIT_WINDOW_SEC: syncRateLimitWindowSec,
    ARGON2_MEMORY_COST: argon2MemoryCost,
    ARGON2_TIME_COST: argon2TimeCost,
    ARGON2_PARALLELISM: argon2Parallelism,
    CORS_ORIGINS: corsOrigins,
    LOG_LEVEL: logLevel,
    IDEMPOTENCY_TTL_SEC: idempotencyTtlSec,
    SENTRY_DSN: sentryDsn,
  };
}
