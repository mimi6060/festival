import { Injectable, Logger } from '@nestjs/common';
import { FcmService } from '../../notifications/services/fcm.service';

export type HealthIndicatorResult = Record<
  string,
  {
    status: string;
    responseTime?: number;
    error?: string;
  }
>;

/**
 * FCM Health Indicator
 *
 * Checks Firebase Cloud Messaging configuration and connectivity.
 * Gracefully handles environments where FCM is not configured (dev/test).
 */
@Injectable()
export class FcmHealthIndicator {
  private readonly logger = new Logger(FcmHealthIndicator.name);

  constructor(private readonly fcmService: FcmService) {}

  /**
   * Check FCM health
   *
   * @param key - The key to use in the response object
   * @returns Health indicator result with status
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check if FCM is enabled (configured and initialized)
      const isEnabled = this.fcmService.isEnabled();
      const responseTime = Date.now() - startTime;

      if (!isEnabled) {
        // FCM not configured is acceptable in dev/test environments
        return {
          [key]: {
            status: 'not_configured',
            responseTime,
          },
        };
      }

      // FCM is configured and initialized
      return {
        [key]: {
          status: 'up',
          responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `FCM health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
