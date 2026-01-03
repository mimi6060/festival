import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type HealthIndicatorResult = Record<
  string,
  {
    status: string;
    responseTime?: number;
    error?: string;
  }
>;

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prismaService: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        [key]: {
          status: 'up',
          responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
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
