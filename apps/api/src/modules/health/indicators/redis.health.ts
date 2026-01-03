import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';

export type HealthIndicatorResult = Record<
  string,
  {
    status: string;
    responseTime?: number;
    error?: string;
  }
>;

/**
 * Redis Health Indicator
 *
 * Checks Redis connectivity and response time.
 * Gracefully handles environments where Redis is not configured.
 */
@Injectable()
export class RedisHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Check Redis health
   *
   * @param key - The key to use in the response object
   * @returns Health indicator result with status and response time
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Use CacheService's stats to check Redis connectivity
      const stats = await this.cacheService.getStats();
      const responseTime = Date.now() - startTime;

      // If Redis is not connected, CacheService falls back to in-memory cache
      // This is acceptable in dev environments
      if (!stats.connected) {
        this.logger.warn('Redis not connected, using in-memory cache fallback');
        return {
          [key]: {
            status: 'degraded',
            responseTime,
          },
        };
      }

      return {
        [key]: {
          status: 'up',
          responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      return {
        [key]: {
          status: 'down',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
