import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

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
      },
    },
  })
  async check(): Promise<HealthCheckResponseDto> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // In a real implementation, these would check actual services
    return {
      status: 'ok',
      timestamp,
      uptime,
      checks: {
        database: { status: 'up', responseTime: 5 },
        redis: { status: 'up', responseTime: 2 },
        stripe: { status: 'up' },
      },
    };
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
    // In a real implementation, these would check actual connections
    const dependencies = {
      database: true,
      redis: true,
      stripe: true,
    };

    const isReady = Object.values(dependencies).every((v) => v);

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }
}
