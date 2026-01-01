import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
  StripeHealthIndicator,
} from './indicators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private stripeHealth: StripeHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Global health check' })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: { type: 'object', properties: { status: { type: 'string' } } },
            redis: { type: 'object', properties: { status: { type: 'string' } } },
            disk: { type: 'object', properties: { status: { type: 'string' }, used: { type: 'string' } } },
            memory: { type: 'object', properties: { status: { type: 'string' }, used: { type: 'string' } } },
            stripe: { type: 'object', properties: { status: { type: 'string' } } },
          },
        },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database health check
      () => this.prismaHealth.isHealthy('database'),

      // Redis health check
      () => this.redisHealth.isHealthy('redis'),

      // Disk storage health check (threshold: 90% usage)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),

      // Memory heap health check (threshold: 500MB)
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

      // Memory RSS health check (threshold: 500MB)
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Stripe API health check
      () => this.stripeHealth.isHealthy('stripe'),
    ]);
  }

  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is not responding' })
  async liveness(): Promise<HealthCheckResult> {
    // Liveness probe: checks if the application is running
    // Only checks memory to ensure the process is healthy
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    // Readiness probe: checks if the application can serve traffic
    // Checks database and Redis connectivity
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }
}
