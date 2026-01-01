import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Stripe from 'stripe';

@Injectable()
export class StripeHealthIndicator extends HealthIndicator {
  private stripe: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      });
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.stripe) {
      return this.getStatus(key, true, { message: 'Stripe not configured' });
    }

    try {
      // Use balance.retrieve as a lightweight ping to Stripe API
      await this.stripe.balance.retrieve();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Stripe health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
