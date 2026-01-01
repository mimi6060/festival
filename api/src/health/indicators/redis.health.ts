import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redisUrl: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let client: RedisClientType | null = null;

    try {
      client = createClient({ url: this.redisUrl });
      await client.connect();
      const pong = await client.ping();

      if (pong === 'PONG') {
        return this.getStatus(key, true);
      }

      throw new Error('Redis ping failed');
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    } finally {
      if (client) {
        try {
          await client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }
}
