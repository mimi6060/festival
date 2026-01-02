/**
 * Payments Service
 *
 * Handles payment processing with Stripe including:
 * - Payment intent creation
 * - Webhook handling
 * - Refund processing
 * - Payment status management
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface CreatePaymentDto {
  userId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface RefundResult {
  paymentId: string;
  refundId: string;
  amount: number;
  status: string;
}

export interface PaymentEntity {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  description: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
      // Create a mock stripe instance for testing
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
  }

  /**
   * Create a payment intent for processing
   */
  async createPaymentIntent(dto: CreatePaymentDto): Promise<PaymentIntentResult> {
    const { userId, amount, currency = 'eur', description, metadata = {} } = dto;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    if (!this.stripe) {
      throw new InternalServerErrorException('Payment provider not configured');
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount,
          currency: currency.toUpperCase(),
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.STRIPE,
          providerPaymentId: paymentIntent.id,
          providerData: {
            clientSecret: paymentIntent.client_secret,
          },
          description,
          metadata,
        },
      });

      this.logger.log(`Payment intent created: ${payment.id} (Stripe: ${paymentIntent.id})`);

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret!,
        amount,
        currency: currency.toUpperCase(),
        status: PaymentStatus.PENDING,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${error}`);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    if (!this.stripe) {
      throw new InternalServerErrorException('Payment provider not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'refund.created':
        await this.handleRefundCreated(event.data.object as Stripe.Refund);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Process refund for a payment
   */
  async refundPayment(paymentId: string, reason?: string): Promise<RefundResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Payment has already been refunded');
    }

    if (!payment.providerPaymentId) {
      throw new BadRequestException('No provider payment ID available');
    }

    if (!this.stripe) {
      throw new InternalServerErrorException('Payment provider not configured');
    }

    try {
      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.providerPaymentId,
        reason: 'requested_by_customer',
        metadata: {
          paymentId: payment.id,
          reason: reason || 'Customer request',
        },
      });

      // Update payment status
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          providerData: {
            ...(payment.providerData as any),
            refundId: refund.id,
            refundStatus: refund.status,
          },
        },
      });

      this.logger.log(`Refund processed for payment ${paymentId}: ${refund.id}`);

      return {
        paymentId,
        refundId: refund.id,
        amount: Number(payment.amount),
        status: refund.status,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error}`);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToEntity(payment);
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return payments.map(this.mapToEntity);
  }

  /**
   * Get payment by provider payment ID
   */
  async getPaymentByProviderId(providerPaymentId: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });

    return payment ? this.mapToEntity(payment) : null;
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be cancelled');
    }

    // Cancel in Stripe if exists
    if (payment.providerPaymentId && this.stripe) {
      try {
        await this.stripe.paymentIntents.cancel(payment.providerPaymentId);
      } catch (error) {
        this.logger.warn(`Failed to cancel Stripe payment intent: ${error}`);
      }
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CANCELLED },
    });

    this.logger.log(`Payment cancelled: ${paymentId}`);

    return this.mapToEntity(updatedPayment);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        providerData: {
          ...(payment.providerData as any),
          paymentMethod: paymentIntent.payment_method,
          receiptUrl: (paymentIntent as any).receipt_url,
        },
      },
    });

    this.logger.log(`Payment completed: ${payment.id}`);

    // Emit event for other services (ticket creation, etc.)
    // This would typically use an event emitter or message queue
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for failed payment intent: ${paymentIntent.id}`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerData: {
          ...(payment.providerData as any),
          error: paymentIntent.last_payment_error,
        },
      },
    });

    this.logger.log(`Payment failed: ${payment.id}`);
  }

  /**
   * Handle refund created
   */
  private async handleRefundCreated(refund: Stripe.Refund): Promise<void> {
    if (!refund.payment_intent || typeof refund.payment_intent !== 'string') {
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: refund.payment_intent },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for refund: ${refund.id}`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        providerData: {
          ...(payment.providerData as any),
          refundId: refund.id,
          refundStatus: refund.status,
        },
      },
    });

    this.logger.log(`Refund processed via webhook: ${payment.id}`);
  }

  /**
   * Map Prisma payment to entity
   */
  private mapToEntity(payment: any): PaymentEntity {
    return {
      id: payment.id,
      userId: payment.userId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      description: payment.description,
      paidAt: payment.paidAt,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
