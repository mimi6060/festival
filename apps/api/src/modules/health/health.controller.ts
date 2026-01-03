import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StripeHealthIndicator } from './indicators/stripe.health';

/**
 * Health check response DTO
 */
class HealthCheckResponseDto {
  status!: 'ok' | 'error';
  timestamp!: string;
  uptime!: number;
  checks!: {
    database: { status: string; responseTime?: number };
    redis: { status: string; responseTime?: number };
    stripe: { status: string };
    memory: { status: string; heapUsed?: number; heapTotal?: number };
  };
}

class LivenessResponseDto {
  status!: 'alive';
  timestamp!: string;
}

class ReadinessResponseDto {
  status!: 'ready' | 'not_ready';
  timestamp!: string;
  dependencies!: {
    database: boolean;
    redis: boolean;
    stripe: boolean;
  };
}

/**
 * Health Controller
 *
 * Provides health check endpoints for monitoring and orchestration.
 * These endpoints are typically used by:
 * - Kubernetes liveness/readiness probes
 * - Load balancers
 * - Monitoring systems (Prometheus, Datadog, etc.)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly stripeHealth: StripeHealthIndicator
  ) {}

  /**
   * Full health check
   *
   * Returns comprehensive health status including all dependencies.
   * Use this endpoint for detailed monitoring and debugging.
   */
  @Get()
  @ApiOperation({
    summary: 'Full health check',
    description: `
Returns a comprehensive health status of the API including:
- Overall system status
- Database connectivity
- Redis cache status
- Stripe API connectivity
- Response times for each service

**Use Cases:**
- Monitoring dashboards
- Debugging connectivity issues
- Pre-deployment verification
    `,
  })
  @ApiOkResponse({
    description: 'Health check completed successfully',
    type: HealthCheckResponseDto,
    example: {
      status: 'ok',
      timestamp: '2025-01-02T12:00:00.000Z',
      uptime: 3600,
      checks: {
        database: { status: 'up', responseTime: 5 },
        redis: { status: 'up', responseTime: 2 },
        stripe: { status: 'up' },
        memory: { status: 'up', heapUsed: 50000000, heapTotal: 150000000 },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'One or more services are unavailable',
    example: {
      status: 'error',
      timestamp: '2025-01-02T12:00:00.000Z',
      uptime: 3600,
      checks: {
        database: { status: 'down', error: 'Connection refused' },
        redis: { status: 'up', responseTime: 2 },
        stripe: { status: 'up' },
        memory: { status: 'up' },
      },
    },
  })
  async check(): Promise<HealthCheckResponseDto> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    try {
      // Run health checks with timeout (5s max for each)
      const [dbResult, redisResult, stripeResult] = await Promise.all([
        Promise.race([
          this.prismaHealth.isHealthy('database'),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Database health check timeout')), 5000)
          ),
        ]),
        Promise.race([
          this.redisHealth.isHealthy('redis'),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Redis health check timeout')), 5000)
          ),
        ]),
        Promise.race([
          this.stripeHealth.isHealthy('stripe'),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Stripe health check timeout')), 5000)
          ),
        ]),
      ]);

      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryOk = heapUsedMB < 150; // 150 MB threshold

      const dbStatus = dbResult.database;
      const redisStatus = redisResult.redis;
      const stripeStatus = stripeResult.stripe;

      // Check if critical services are up
      // Redis 'degraded' (fallback to in-memory) is acceptable
      // Stripe 'not_configured' (dev environment) is acceptable
      const isHealthy =
        dbStatus.status === 'up' &&
        (redisStatus.status === 'up' || redisStatus.status === 'degraded') &&
        (stripeStatus.status === 'up' || stripeStatus.status === 'not_configured') &&
        memoryOk;

      const response: HealthCheckResponseDto = {
        status: isHealthy ? 'ok' : 'error',
        timestamp,
        uptime,
        checks: {
          database: dbStatus as { status: string; responseTime?: number },
          redis: redisStatus as { status: string; responseTime?: number },
          stripe: stripeStatus as { status: string },
          memory: {
            status: memoryOk ? 'up' : 'warning',
            heapUsed: Math.round(heapUsedMB),
            heapTotal: Math.round(heapTotalMB),
          },
        },
      };

      if (!isHealthy) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Fallback error response
      const response: HealthCheckResponseDto = {
        status: 'error',
        timestamp,
        uptime,
        checks: {
          database: { status: 'down' },
          redis: { status: 'down' },
          stripe: { status: 'down' },
          memory: { status: 'unknown' },
        },
      };
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Liveness probe
   *
   * Simple endpoint that returns 200 if the process is running.
   * Used by Kubernetes to determine if the container should be restarted.
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: `
A simple liveness check that returns 200 if the process is running.

**Kubernetes Usage:**
\`\`\`yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
\`\`\`

This endpoint does NOT check dependencies - use \`/health/ready\` for that.
    `,
  })
  @ApiOkResponse({
    description: 'Process is alive',
    type: LivenessResponseDto,
    example: {
      status: 'alive',
      timestamp: '2025-01-02T12:00:00.000Z',
    },
  })
  live(): LivenessResponseDto {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe
   *
   * Returns 200 only if all dependencies are ready to accept traffic.
   * Used by Kubernetes to determine if traffic should be routed to this pod.
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: `
Checks if the application is ready to accept traffic.

Returns 200 if all dependencies are available:
- Database connection is established
- Redis cache is connected
- Stripe API is reachable

**Kubernetes Usage:**
\`\`\`yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
\`\`\`

If this endpoint returns 503, the pod will be removed from the load balancer.
    `,
  })
  @ApiOkResponse({
    description: 'Application is ready to accept traffic',
    type: ReadinessResponseDto,
    example: {
      status: 'ready',
      timestamp: '2025-01-02T12:00:00.000Z',
      dependencies: {
        database: true,
        redis: true,
        stripe: true,
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Application is not ready',
    example: {
      status: 'not_ready',
      timestamp: '2025-01-02T12:00:00.000Z',
      dependencies: {
        database: false,
        redis: true,
        stripe: true,
      },
    },
  })
  async ready(): Promise<ReadinessResponseDto> {
    const [database, redis, stripe] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStripe(),
    ]);

    const dependencies = {
      database,
      redis,
      stripe,
    };

    const isReady = Object.values(dependencies).every((v) => v);

    const response: ReadinessResponseDto = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies,
    };

    if (!isReady) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const result = await this.prismaHealth.isHealthy('database');
      return result.database.status === 'up';
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const result = await this.redisHealth.isHealthy('redis');
      // 'degraded' (in-memory fallback) is acceptable for readiness
      return result.redis.status === 'up' || result.redis.status === 'degraded';
    } catch {
      return false;
    }
  }

  private async checkStripe(): Promise<boolean> {
    try {
      const result = await this.stripeHealth.isHealthy('stripe');
      // 'not_configured' (dev environment) is acceptable for readiness
      return result.stripe.status === 'up' || result.stripe.status === 'not_configured';
    } catch {
      return false;
    }
  }
}
