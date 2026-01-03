import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'up',
        responseTime
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'PrismaHealthCheck failed',
        this.getStatus(key, false, {
          status: 'down',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
      );
    }
  }
}
