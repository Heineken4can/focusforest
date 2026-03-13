import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async ping(): Promise<string> {
    const client = await this.getReadyClient();

    return client.ping();
  }

  getStatus(): string {
    return this.client.status;
  }

  async getReadyClient(): Promise<Redis> {
    const status = this.client.status;

    if (status === 'ready') {
      return this.client;
    }

    if (status === 'wait' || status === 'close' || status === 'end') {
      await this.client.connect();
    }

    await this.waitUntilReady();

    return this.client;
  }

  getClient(): Redis {
    return this.client;
  }

  private waitUntilReady(): Promise<void> {
    if (this.client.status === 'ready') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        this.client.off('ready', handleReady);
        this.client.off('error', handleError);
        this.client.off('end', handleEnd);
      };

      const handleReady = (): void => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error): void => {
        cleanup();
        reject(error);
      };
      const handleEnd = (): void => {
        cleanup();
        reject(new Error('Redis connection ended before becoming ready.'));
      };

      this.client.on('ready', handleReady);
      this.client.on('error', handleError);
      this.client.on('end', handleEnd);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }

    if (this.client.status === 'wait') {
      this.client.disconnect();
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
