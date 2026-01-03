import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type HealthIndicatorResult = Record<
  string,
  {
    status: string;
    responseTime?: number;
    error?: string;
  }
>;

/**
 * Stripe Health Indicator
 *
 * Checks Stripe API connectivity.
 * Gracefully handles environments where Stripe is not configured (dev/test).
 */
@Injectable()
export class StripeHealthIndicator {
  private readonly logger = new Logger(StripeHealthIndicator.name);
  private stripe: Stripe | null = null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe health checks will be skipped');
      this.isConfigured = false;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
      this.isConfigured = true;
    }
  }

  /**
   * Check Stripe API health
   *
   * @param key - The key to use in the response object
   * @returns Health indicator result with status
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    // In dev/test environments, Stripe might not be configured
    // This is acceptable and should not fail the health check
    if (!this.isConfigured || !this.stripe) {
      return {
        [key]: {
          status: 'not_configured',
        },
      };
    }

    const startTime = Date.now();

    try {
      // Simple API call to verify connectivity
      // Balance retrieve is a lightweight operation
      await Promise.race([
        this.stripe.balance.retrieve(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stripe API timeout (5s)')), 5000)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      return {
        [key]: {
          status: 'up',
          responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Stripe health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
