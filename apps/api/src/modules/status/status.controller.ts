'use strict';

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface StatusCheck {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message?: string;
  responseTime?: number;
}

interface StatusResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: string;
  version: string;
  environment: string;
  checks: StatusCheck[];
  summary: string;
}

/**
 * Status Controller
 *
 * Simple status endpoint for quick verification during development.
 * Call this after any modification to ensure everything works.
 */
@ApiTags('Status')
@Controller('status')
export class StatusController {
  private readonly logger = new Logger(StatusController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  /**
   * Quick status check
   * Use this endpoint to verify all systems are operational.
   */
  @Get()
  @ApiOperation({
    summary: 'Quick status check',
    description:
      'Returns a simple status of all critical systems. Use after modifications to verify everything works.',
  })
  @ApiOkResponse({
    description: 'Status check result',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-09T21:00:00.000Z',
        uptime: '2h 15m 30s',
        version: '1.0.0',
        environment: 'development',
        checks: [
          { name: 'api', status: 'ok', message: 'API responding' },
          { name: 'database', status: 'ok', message: 'Connected', responseTime: 5 },
          { name: 'redis', status: 'ok', message: 'Connected', responseTime: 2 },
        ],
        summary: '✅ All systems operational',
      },
    },
  })
  async getStatus(): Promise<StatusResponse> {
    const checks: StatusCheck[] = [];
    let hasError = false;
    let hasWarning = false;

    // Check API (always ok if we're responding)
    checks.push({
      name: 'api',
      status: 'ok',
      message: 'API responding',
    });

    // Check Database
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);
    if (dbCheck.status === 'error') {
      hasError = true;
    }
    if (dbCheck.status === 'warning') {
      hasWarning = true;
    }

    // Check Redis
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);
    if (redisCheck.status === 'error') {
      hasError = true;
    }
    if (redisCheck.status === 'warning') {
      hasWarning = true;
    }

    // Check Memory
    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);
    if (memoryCheck.status === 'error') {
      hasError = true;
    }
    if (memoryCheck.status === 'warning') {
      hasWarning = true;
    }

    // Determine overall status
    const overallStatus = hasError ? 'error' : hasWarning ? 'degraded' : 'ok';

    // Build summary
    const okCount = checks.filter((c) => c.status === 'ok').length;
    const errorCount = checks.filter((c) => c.status === 'error').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;

    let summary: string;
    if (hasError) {
      summary = `❌ ${errorCount} error(s), ${warningCount} warning(s), ${okCount} ok`;
    } else if (hasWarning) {
      summary = `⚠️ ${warningCount} warning(s), ${okCount} ok`;
    } else {
      summary = '✅ All systems operational';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime((Date.now() - this.startTime) / 1000),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: this.config.get('NODE_ENV', 'development'),
      checks,
      summary,
    };
  }

  /**
   * Minimal ping endpoint
   */
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping', description: 'Returns pong if API is alive' })
  ping(): { pong: boolean; timestamp: string } {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<StatusCheck> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          name: 'database',
          status: 'warning',
          message: `Slow response (${responseTime}ms)`,
          responseTime,
        };
      }

      return {
        name: 'database',
        status: 'ok',
        message: 'Connected',
        responseTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      this.logger.error(`Database check failed: ${message}`);
      return {
        name: 'database',
        status: 'error',
        message: message.substring(0, 100),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkRedis(): Promise<StatusCheck> {
    const startTime = Date.now();
    try {
      const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
      const { Redis } = await import('ioredis');
      const redis = new Redis(redisUrl, {
        connectTimeout: 5000,
        lazyConnect: true,
      });

      await redis.connect();
      const pong = await redis.ping();
      await redis.quit();

      const responseTime = Date.now() - startTime;

      if (pong !== 'PONG') {
        return {
          name: 'redis',
          status: 'warning',
          message: 'Unexpected ping response',
          responseTime,
        };
      }

      if (responseTime > 500) {
        return {
          name: 'redis',
          status: 'warning',
          message: `Slow response (${responseTime}ms)`,
          responseTime,
        };
      }

      return {
        name: 'redis',
        status: 'ok',
        message: 'Connected',
        responseTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      this.logger.warn(`Redis check failed: ${message}`);
      return {
        name: 'redis',
        status: 'error',
        message: message.substring(0, 100),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private checkMemory(): StatusCheck {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    // Use absolute thresholds rather than percentage (Node adjusts heap dynamically)
    // Critical if using more than 1GB of RSS memory
    if (rssMB > 1024) {
      return {
        name: 'memory',
        status: 'error',
        message: `Critical: ${rssMB}MB RSS (heap: ${heapUsedMB}/${heapTotalMB}MB)`,
      };
    }

    // Warning if using more than 512MB of RSS memory
    if (rssMB > 512) {
      return {
        name: 'memory',
        status: 'warning',
        message: `High: ${rssMB}MB RSS (heap: ${heapUsedMB}/${heapTotalMB}MB)`,
      };
    }

    return {
      name: 'memory',
      status: 'ok',
      message: `${rssMB}MB RSS (heap: ${heapUsedMB}/${heapTotalMB}MB)`,
    };
  }

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
