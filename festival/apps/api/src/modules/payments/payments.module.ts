/**
 * Payments Module
 *
 * Provides comprehensive payment functionality:
 * - Stripe Checkout Sessions
 * - Payment Intents
 * - Stripe Connect for vendors
 * - Subscriptions for season passes
 * - Refund management
 * - Webhook handling
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CheckoutService } from './services/checkout.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { SubscriptionService } from './services/subscription.service';
import { RefundService } from './services/refund.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CheckoutService,
    StripeConnectService,
    SubscriptionService,
    RefundService,
  ],
  exports: [
    PaymentsService,
    CheckoutService,
    StripeConnectService,
    SubscriptionService,
    RefundService,
  ],
})
export class PaymentsModule {}
