import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Health indicator status
 */
export enum HealthStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
}

/**
 * Health indicator result
 */
export interface HealthIndicatorResult {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * System health result
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthIndicatorResult[];
}

/**
 * Health Indicators Service
 *
 * Provides comprehensive health checking for all dependencies:
 * - Database connectivity
 * - Redis cache
 * - External services
 * - System resources
 */
@Injectable()
export class HealthIndicatorsService {
  private readonly logger = new Logger(HealthIndicatorsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check overall system health
   */
  async checkHealth(): Promise<SystemHealth> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDiskSpace(),
      this.checkEventLoop(),
    ]);

    // Determine overall status
    const hasDown = checks.some((c) => c.status === HealthStatus.DOWN);
    const hasDegraded = checks.some((c) => c.status === HealthStatus.DEGRADED);

    const status = hasDown
      ? HealthStatus.DOWN
      : hasDegraded
        ? HealthStatus.DEGRADED
        : HealthStatus.UP;

    return {
      status,
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
  async checkReadiness(): Promise<{ status: HealthStatus; checks: HealthIndicatorResult[] }> {
    const checks = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const allUp = checks.every((c) => c.status === HealthStatus.UP);

    return {
      status: allUp ? HealthStatus.UP : HealthStatus.DOWN,
      checks,
    };
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Try to import PrismaClient dynamically
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      return {
        name: 'database',
        status: HealthStatus.UP,
        responseTime: Date.now() - startTime,
        details: {
          type: 'postgresql',
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Database health check failed: ${errorMessage}`);

      return {
        name: 'database',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

      // Try to import Redis dynamically
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
        return {
          name: 'redis',
          status: HealthStatus.UP,
          responseTime: Date.now() - startTime,
          details: {
            type: 'redis',
          },
        };
      }

      return {
        name: 'redis',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: 'Invalid PING response',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis health check failed: ${errorMessage}`);

      return {
        name: 'redis',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory(): Promise<HealthIndicatorResult> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Thresholds
    const warningThreshold = 80; // 80%
    const criticalThreshold = 95; // 95%
    const maxHeapMB = 2048; // 2GB

    let status = HealthStatus.UP;
    let error: string | undefined;

    if (heapUsagePercent > criticalThreshold || heapUsedMB > maxHeapMB) {
      status = HealthStatus.DOWN;
      error = `Heap usage critical: ${heapUsagePercent.toFixed(1)}%`;
    } else if (heapUsagePercent > warningThreshold) {
      status = HealthStatus.DEGRADED;
      error = `Heap usage high: ${heapUsagePercent.toFixed(1)}%`;
    }

    return {
      name: 'memory',
      status,
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        rssMB: Math.round(rssMB),
        heapUsagePercent: Math.round(heapUsagePercent),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
      error,
    };
  }

  /**
   * Check disk space
   */
  async checkDiskSpace(): Promise<HealthIndicatorResult> {
    try {
      const { execSync } = await import('child_process');

      // Get disk usage (works on Linux/macOS)
      const dfOutput = execSync('df -P / | tail -1').toString();
      const parts = dfOutput.trim().split(/\s+/);

      if (parts.length >= 5) {
        const usedPercent = parseInt(parts[4]?.replace('%', '') || '0', 10);
        const availableKB = parseInt(parts[3] || '0', 10);
        const availableGB = availableKB / 1024 / 1024;

        let status = HealthStatus.UP;
        let error: string | undefined;

        if (usedPercent > 95) {
          status = HealthStatus.DOWN;
          error = `Disk usage critical: ${usedPercent}%`;
        } else if (usedPercent > 85) {
          status = HealthStatus.DEGRADED;
          error = `Disk usage high: ${usedPercent}%`;
        }

        return {
          name: 'disk',
          status,
          details: {
            usedPercent,
            availableGB: Math.round(availableGB * 100) / 100,
            path: '/',
          },
          error,
        };
      }

      return {
        name: 'disk',
        status: HealthStatus.UP,
        details: { message: 'Unable to parse disk usage' },
      };
    } catch {
      return {
        name: 'disk',
        status: HealthStatus.UP,
        details: { message: 'Disk check not available' },
      };
    }
  }

  /**
   * Check event loop lag
   */
  async checkEventLoop(): Promise<HealthIndicatorResult> {
    const lagMs = await this.measureEventLoopLag();

    let status = HealthStatus.UP;
    let error: string | undefined;

    if (lagMs > 500) {
      status = HealthStatus.DOWN;
      error = `Event loop lag critical: ${lagMs}ms`;
    } else if (lagMs > 100) {
      status = HealthStatus.DEGRADED;
      error = `Event loop lag high: ${lagMs}ms`;
    }

    return {
      name: 'eventLoop',
      status,
      details: {
        lagMs,
      },
      error,
    };
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }

  /**
   * Check external service
   */
  async checkExternalService(
    name: string,
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

      return {
        name,
        status: response.ok ? HealthStatus.UP : HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        details: {
          statusCode: response.status,
          url,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        name,
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
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
          acc[check.name] = {
            status: check.status,
            responseTime: check.responseTime,
            error: check.error,
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
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
