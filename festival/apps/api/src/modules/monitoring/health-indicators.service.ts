import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

/**
 * Health status enum for custom checks
 */
export enum HealthStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
}

/**
 * System health result interface
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, unknown>[];
}

/**
 * Database Health Indicator
 *
 * Checks PostgreSQL database connectivity using Prisma
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      return this.getStatus(key, true, {
        responseTime: Date.now() - startTime,
        type: 'postgresql',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Database health check failed: ${errorMessage}`);

      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          responseTime: Date.now() - startTime,
          error: errorMessage,
        }),
      );
    }
  }
}

/**
 * Redis Health Indicator
 *
 * Checks Redis cache connectivity using ioredis
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

      const { Redis } = await import('ioredis');
      const redis = new Redis(redisUrl);

      const pong = await Promise.race([
        redis.ping(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 5000),
        ),
      ]);

      await redis.quit();

      if (pong === 'PONG') {
        return this.getStatus(key, true, {
          responseTime: Date.now() - startTime,
          type: 'redis',
        });
      }

      throw new Error('Invalid PING response');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis health check failed: ${errorMessage}`);

      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          responseTime: Date.now() - startTime,
          error: errorMessage,
        }),
      );
    }
  }
}

/**
 * Custom Memory Health Indicator
 *
 * Extended memory checks with heap and RSS monitoring
 */
@Injectable()
export class CustomMemoryHealthIndicator extends HealthIndicator {
  private readonly warningThreshold = 80; // 80%
  private readonly criticalThreshold = 95; // 95%
  private readonly maxHeapMB = 2048; // 2GB

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const details = {
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      rssMB: Math.round(rssMB),
      heapUsagePercent: Math.round(heapUsagePercent),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
    };

    if (heapUsagePercent > this.criticalThreshold || heapUsedMB > this.maxHeapMB) {
      throw new HealthCheckError(
        `Heap usage critical: ${heapUsagePercent.toFixed(1)}%`,
        this.getStatus(key, false, {
          ...details,
          status: HealthStatus.DOWN,
          error: `Heap usage critical: ${heapUsagePercent.toFixed(1)}%`,
        }),
      );
    }

    if (heapUsagePercent > this.warningThreshold) {
      // Return degraded status but don't throw error
      return this.getStatus(key, true, {
        ...details,
        status: HealthStatus.DEGRADED,
        warning: `Heap usage high: ${heapUsagePercent.toFixed(1)}%`,
      });
    }

    return this.getStatus(key, true, {
      ...details,
      status: HealthStatus.UP,
    });
  }
}

/**
 * Custom Disk Health Indicator
 *
 * Cross-platform disk space monitoring
 */
@Injectable()
export class CustomDiskHealthIndicator extends HealthIndicator {
  private readonly warningThreshold = 85; // 85%
  private readonly criticalThreshold = 95; // 95%

  async isHealthy(key: string, path = '/'): Promise<HealthIndicatorResult> {
    try {
      const { execSync } = await import('child_process');

      // Get disk usage (works on Linux/macOS)
      const dfOutput = execSync(`df -P ${path} | tail -1`).toString();
      const parts = dfOutput.trim().split(/\s+/);

      if (parts.length >= 5) {
        const usedPercent = parseInt(parts[4]?.replace('%', '') || '0', 10);
        const availableKB = parseInt(parts[3] || '0', 10);
        const availableGB = availableKB / 1024 / 1024;

        const details = {
          usedPercent,
          availableGB: Math.round(availableGB * 100) / 100,
          path,
        };

        if (usedPercent > this.criticalThreshold) {
          throw new HealthCheckError(
            `Disk usage critical: ${usedPercent}%`,
            this.getStatus(key, false, {
              ...details,
              status: HealthStatus.DOWN,
              error: `Disk usage critical: ${usedPercent}%`,
            }),
          );
        }

        if (usedPercent > this.warningThreshold) {
          return this.getStatus(key, true, {
            ...details,
            status: HealthStatus.DEGRADED,
            warning: `Disk usage high: ${usedPercent}%`,
          });
        }

        return this.getStatus(key, true, {
          ...details,
          status: HealthStatus.UP,
        });
      }

      return this.getStatus(key, true, {
        path,
        message: 'Unable to parse disk usage',
        status: HealthStatus.UP,
      });
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      return this.getStatus(key, true, {
        path,
        message: 'Disk check not available on this platform',
        status: HealthStatus.UP,
      });
    }
  }
}

/**
 * Event Loop Health Indicator
 *
 * Monitors Node.js event loop lag to detect blocking operations
 */
@Injectable()
export class EventLoopHealthIndicator extends HealthIndicator {
  private readonly warningThresholdMs = 100;
  private readonly criticalThresholdMs = 500;

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const lagMs = await this.measureEventLoopLag();

    const details = {
      lagMs,
    };

    if (lagMs > this.criticalThresholdMs) {
      throw new HealthCheckError(
        `Event loop lag critical: ${lagMs}ms`,
        this.getStatus(key, false, {
          ...details,
          status: HealthStatus.DOWN,
          error: `Event loop lag critical: ${lagMs}ms`,
        }),
      );
    }

    if (lagMs > this.warningThresholdMs) {
      return this.getStatus(key, true, {
        ...details,
        status: HealthStatus.DEGRADED,
        warning: `Event loop lag high: ${lagMs}ms`,
      });
    }

    return this.getStatus(key, true, {
      ...details,
      status: HealthStatus.UP,
    });
  }

  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }
}

/**
 * External Service Health Indicator
 *
 * Checks connectivity to external HTTP services
 */
@Injectable()
export class ExternalServiceHealthIndicator extends HealthIndicator {
  async isHealthy(
    key: string,
    url: string,
    timeoutMs = 5000,
  ): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return this.getStatus(key, true, {
          responseTime: Date.now() - startTime,
          statusCode: response.status,
          url,
        });
      }

      throw new HealthCheckError(
        `External service returned status ${response.status}`,
        this.getStatus(key, false, {
          responseTime: Date.now() - startTime,
          statusCode: response.status,
          url,
        }),
      );
    } catch (error: unknown) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        `External service check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          responseTime: Date.now() - startTime,
          error: errorMessage,
          url,
        }),
      );
    }
  }
}

/**
 * Health Indicators Service
 *
 * Aggregates all health indicators and provides comprehensive health checking
 * using @nestjs/terminus HealthIndicator pattern for:
 * - Database connectivity (PostgreSQL via Prisma)
 * - Redis cache connectivity
 * - Memory usage monitoring
 * - Disk space monitoring
 * - Event loop lag detection
 * - External service connectivity
 */
@Injectable()
export class HealthIndicatorsService {
  private readonly logger = new Logger(HealthIndicatorsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly memoryHealthIndicator: CustomMemoryHealthIndicator,
    private readonly diskHealthIndicator: CustomDiskHealthIndicator,
    private readonly eventLoopHealthIndicator: EventLoopHealthIndicator,
    private readonly externalServiceHealthIndicator: ExternalServiceHealthIndicator,
  ) {}

  /**
   * Check overall system health
   */
  async checkHealth(): Promise<SystemHealth> {
    const checks: Record<string, unknown>[] = [];
    let overallStatus = HealthStatus.UP;

    // Database check
    try {
      const dbResult = await this.databaseHealthIndicator.isHealthy('database');
      checks.push({
        name: 'database',
        status: HealthStatus.UP,
        ...dbResult['database'],
      });
    } catch (error) {
      overallStatus = HealthStatus.DOWN;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'database',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['database'],
      });
    }

    // Redis check
    try {
      const redisResult = await this.redisHealthIndicator.isHealthy('redis');
      checks.push({
        name: 'redis',
        status: HealthStatus.UP,
        ...redisResult['redis'],
      });
    } catch (error) {
      overallStatus = HealthStatus.DOWN;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'redis',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['redis'],
      });
    }

    // Memory check
    try {
      const memResult = await this.memoryHealthIndicator.isHealthy('memory');
      const memStatus = memResult['memory']?.['status'] || HealthStatus.UP;
      checks.push({
        name: 'memory',
        ...memResult['memory'],
      });
      if (memStatus === HealthStatus.DEGRADED && overallStatus === HealthStatus.UP) {
        overallStatus = HealthStatus.DEGRADED;
      }
    } catch (error) {
      overallStatus = HealthStatus.DOWN;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'memory',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['memory'],
      });
    }

    // Disk check
    try {
      const diskResult = await this.diskHealthIndicator.isHealthy('disk');
      const diskStatus = diskResult['disk']?.['status'] || HealthStatus.UP;
      checks.push({
        name: 'disk',
        ...diskResult['disk'],
      });
      if (diskStatus === HealthStatus.DEGRADED && overallStatus === HealthStatus.UP) {
        overallStatus = HealthStatus.DEGRADED;
      }
    } catch (error) {
      overallStatus = HealthStatus.DOWN;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'disk',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['disk'],
      });
    }

    // Event loop check
    try {
      const eventLoopResult = await this.eventLoopHealthIndicator.isHealthy('eventLoop');
      const eventLoopStatus = eventLoopResult['eventLoop']?.['status'] || HealthStatus.UP;
      checks.push({
        name: 'eventLoop',
        ...eventLoopResult['eventLoop'],
      });
      if (eventLoopStatus === HealthStatus.DEGRADED && overallStatus === HealthStatus.UP) {
        overallStatus = HealthStatus.DEGRADED;
      }
    } catch (error) {
      overallStatus = HealthStatus.DOWN;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'eventLoop',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['eventLoop'],
      });
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] || '1.0.0',
      checks,
    };
  }

  /**
   * Check liveness (is the service alive?)
   */
  async checkLiveness(): Promise<{ status: HealthStatus; uptime: number }> {
    return {
      status: HealthStatus.UP,
      uptime: process.uptime(),
    };
  }

  /**
   * Check readiness (is the service ready to accept traffic?)
   */
  async checkReadiness(): Promise<{
    status: HealthStatus;
    checks: Record<string, unknown>[];
  }> {
    const checks: Record<string, unknown>[] = [];
    let allUp = true;

    // Database check
    try {
      const dbResult = await this.databaseHealthIndicator.isHealthy('database');
      checks.push({
        name: 'database',
        status: HealthStatus.UP,
        ...dbResult['database'],
      });
    } catch (error) {
      allUp = false;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'database',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['database'],
      });
    }

    // Redis check
    try {
      const redisResult = await this.redisHealthIndicator.isHealthy('redis');
      checks.push({
        name: 'redis',
        status: HealthStatus.UP,
        ...redisResult['redis'],
      });
    } catch (error) {
      allUp = false;
      const healthError = error as HealthCheckError;
      checks.push({
        name: 'redis',
        status: HealthStatus.DOWN,
        ...healthError.causes?.['redis'],
      });
    }

    return {
      status: allUp ? HealthStatus.UP : HealthStatus.DOWN,
      checks,
    };
  }

  /**
   * Check database connectivity (direct access for backwards compatibility)
   */
  async checkDatabase(): Promise<HealthIndicatorResult> {
    return this.databaseHealthIndicator.isHealthy('database');
  }

  /**
   * Check Redis connectivity (direct access for backwards compatibility)
   */
  async checkRedis(): Promise<HealthIndicatorResult> {
    return this.redisHealthIndicator.isHealthy('redis');
  }

  /**
   * Check memory usage (direct access for backwards compatibility)
   */
  async checkMemory(): Promise<HealthIndicatorResult> {
    return this.memoryHealthIndicator.isHealthy('memory');
  }

  /**
   * Check disk space (direct access for backwards compatibility)
   */
  async checkDiskSpace(): Promise<HealthIndicatorResult> {
    return this.diskHealthIndicator.isHealthy('disk');
  }

  /**
   * Check event loop (direct access for backwards compatibility)
   */
  async checkEventLoop(): Promise<HealthIndicatorResult> {
    return this.eventLoopHealthIndicator.isHealthy('eventLoop');
  }

  /**
   * Check external service (direct access for backwards compatibility)
   */
  async checkExternalService(
    name: string,
    url: string,
    timeoutMs = 5000,
  ): Promise<HealthIndicatorResult> {
    return this.externalServiceHealthIndicator.isHealthy(name, url, timeoutMs);
  }

  /**
   * Get health check summary for monitoring
   */
  async getHealthSummary(): Promise<Record<string, unknown>> {
    const health = await this.checkHealth();

    return {
      healthy: health.status === HealthStatus.UP,
      status: health.status,
      timestamp: health.timestamp,
      uptime: Math.floor(health.uptime),
      uptimeFormatted: this.formatUptime(health.uptime),
      checks: health.checks.reduce(
        (acc, check) => {
          const checkName = check['name'] as string;
          acc[checkName] = {
            status: check['status'],
            responseTime: check['responseTime'],
            error: check['error'],
            warning: check['warning'],
          };
          return acc;
        },
        {} as Record<string, unknown>,
      ),
    };
  }

  /**
   * Format uptime to human-readable string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
