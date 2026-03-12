import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

type DependencyCheck = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type ReadinessStatus = {
  ok: boolean;
  timestamp: string;
  version: string;
  checks: {
    configuration: {
      ok: true;
    };
    database: DependencyCheck;
    redis: DependencyCheck;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  getLiveStatus(): { ok: true; timestamp: string; version: string } {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('app.version') ?? '0.1.0',
    };
  }

  async getReadinessStatus(): Promise<ReadinessStatus> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      ok: database.ok && redis.ok,
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('app.version') ?? '0.1.0',
      checks: {
        configuration: {
          ok: true,
        },
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    const startedAt = Date.now();

    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');

      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: this.errorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const startedAt = Date.now();

    try {
      const result = await this.redisService.ping();

      return {
        ok: result === 'PONG',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: this.errorMessage(error),
      };
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown dependency error';
  }
}
