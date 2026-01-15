/**
 * Payments Service
 *
 * Handles payment processing with Stripe including:
 * - Payment intent creation
 * - Webhook handling
 * - Refund processing
 * - Payment status management
 * - Multi-currency support with automatic conversion
 */

import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

// Import BusinessException pattern
import {
  NotFoundException,
  ValidationException,
  ServiceUnavailableException,
} from '../../common/exceptions/base.exception';
import {
  PaymentFailedException,
  RefundFailedException,
  AlreadyRefundedException,
  InvalidWebhookException,
} from '../../common/exceptions/business.exception';

// Currency service for multi-currency support
import { CurrencyService } from '../currency/currency.service';
import { SupportedCurrency } from '../currency/dto';

// Webhook event helper for dispatching webhook events
import { WebhookEventHelper } from '../webhooks/webhook-event.emitter';

// ============================================================================
// Types
// ============================================================================

export interface CreatePaymentDto {
  userId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  /** Festival ID for currency conversion to festival's base currency */
  festivalId?: string;
}

export interface CreateMultiCurrencyPaymentDto extends CreatePaymentDto {
  /** User's payment currency (what they pay in) */
  paymentCurrency: SupportedCurrency;
  /** Festival ID for determining base currency */
  festivalId: string;
}

export interface PaymentIntentResult {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  /** Original amount in user's currency (if converted) */
  originalAmount?: number;
  /** Original currency (if converted) */
  originalCurrency?: string;
  /** Exchange rate used (if converted) */
  exchangeRate?: number;
}

export interface RefundResult {
  paymentId: string;
  refundId: string;
  amount: number;
  status: string;
  /** Refund amount in original currency (if different from base) */
  originalAmount?: number;
  originalCurrency?: string;
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
  /** Multi-currency fields */
  originalAmount?: number | null;
  originalCurrency?: string | null;
  exchangeRate?: number | null;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;
  private readonly webhookSecret: string;

  // Supported currencies for Stripe
  private readonly STRIPE_SUPPORTED_CURRENCIES = ['eur', 'usd', 'gbp', 'chf'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CurrencyService))
    private readonly currencyService: CurrencyService,
    private readonly webhookEventHelper: WebhookEventHelper,
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
      throw new ValidationException('Amount must be positive', [
        { field: 'amount', message: 'Amount must be positive', value: amount },
      ]);
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe');
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
      throw new PaymentFailedException('Failed to create payment intent');
    }
  }

  /**
   * Create a multi-currency payment intent
   *
   * This method:
   * 1. Accepts payment in the user's preferred currency
   * 2. Converts to the festival's base currency for accounting
   * 3. Stores both original and converted amounts
   */
  async createMultiCurrencyPaymentIntent(
    dto: CreateMultiCurrencyPaymentDto,
  ): Promise<PaymentIntentResult> {
    const {
      userId,
      amount,
      paymentCurrency,
      festivalId,
      description,
      metadata = {},
    } = dto;

    // Validate amount
    if (amount <= 0) {
      throw new ValidationException('Amount must be positive', [
        { field: 'amount', message: 'Amount must be positive', value: amount },
      ]);
    }

    // Validate currency is supported
    if (!this.currencyService.isValidCurrency(paymentCurrency)) {
      throw new ValidationException('Invalid currency', [
        { field: 'paymentCurrency', message: 'Currency not supported', value: paymentCurrency },
      ]);
    }

    // Get festival currency settings
    const festivalSettings = await this.currencyService.getFestivalCurrencySettings(festivalId);
    const baseCurrency = festivalSettings.defaultCurrency;

    // Check if payment currency is supported by the festival
    if (!festivalSettings.supportedCurrencies.includes(paymentCurrency)) {
      throw new ValidationException('Currency not supported for this festival', [
        {
          field: 'paymentCurrency',
          message: `Festival only accepts: ${festivalSettings.supportedCurrencies.join(', ')}`,
          value: paymentCurrency,
        },
      ]);
    }

    // Convert to base currency if needed
    let convertedAmount = amount;
    let exchangeRate: number | undefined;
    let exchangeRateId: string | undefined;

    if (paymentCurrency !== baseCurrency) {
      const conversion = await this.currencyService.convert(
        amount,
        paymentCurrency,
        baseCurrency,
        { trackRate: true },
      );
      convertedAmount = conversion.convertedAmount;
      exchangeRate = conversion.exchangeRate;
      exchangeRateId = conversion.exchangeRateId;

      this.logger.log(
        `Currency conversion: ${amount} ${paymentCurrency} -> ${convertedAmount} ${baseCurrency} (rate: ${exchangeRate})`,
      );
    }

    // Convert to cents for Stripe (use payment currency for Stripe)
    const amountInCents = Math.round(amount * 100);

    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe');
    }

    try {
      // Create Stripe payment intent in user's currency
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: paymentCurrency.toLowerCase(),
        metadata: {
          ...metadata,
          userId,
          festivalId,
          baseCurrency,
          originalAmount: amount.toString(),
          originalCurrency: paymentCurrency,
          exchangeRate: exchangeRate?.toString() || '1',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database with both amounts
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          // Store converted amount in base currency for accounting
          amount: convertedAmount,
          currency: baseCurrency,
          // Store original payment details
          originalAmount: amount,
          originalCurrency: paymentCurrency,
          exchangeRate: exchangeRate || 1,
          exchangeRateId,
          convertedAt: exchangeRate ? new Date() : null,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.STRIPE,
          providerPaymentId: paymentIntent.id,
          providerData: {
            clientSecret: paymentIntent.client_secret,
            paymentCurrency,
            festivalId,
          },
          description,
          metadata: {
            ...metadata,
            festivalId,
          },
        },
      });

      this.logger.log(
        `Multi-currency payment intent created: ${payment.id} (${amount} ${paymentCurrency} -> ${convertedAmount} ${baseCurrency})`,
      );

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret!,
        amount: convertedAmount,
        currency: baseCurrency,
        status: PaymentStatus.PENDING,
        originalAmount: amount,
        originalCurrency: paymentCurrency,
        exchangeRate,
      };
    } catch (error) {
      this.logger.error(`Failed to create multi-currency payment intent: ${error}`);
      throw new PaymentFailedException('Failed to create payment intent');
    }
  }

  /**
   * Get supported currencies for a festival
   */
  async getFestivalSupportedCurrencies(festivalId: string): Promise<SupportedCurrency[]> {
    const settings = await this.currencyService.getFestivalCurrencySettings(festivalId);
    return settings.supportedCurrencies;
  }

  /**
   * Convert a payment amount to user's preferred currency for display
   */
  async convertPaymentForDisplay(
    paymentId: string,
    targetCurrency: SupportedCurrency,
  ): Promise<{
    originalAmount: number;
    originalCurrency: string;
    displayAmount: number;
    displayCurrency: string;
    exchangeRate: number;
  }> {
    const payment = await this.getPayment(paymentId);

    if (payment.currency === targetCurrency) {
      return {
        originalAmount: payment.amount,
        originalCurrency: payment.currency,
        displayAmount: payment.amount,
        displayCurrency: targetCurrency,
        exchangeRate: 1,
      };
    }

    const conversion = await this.currencyService.convert(
      payment.amount,
      payment.currency as SupportedCurrency,
      targetCurrency,
    );

    return {
      originalAmount: payment.amount,
      originalCurrency: payment.currency,
      displayAmount: conversion.convertedAmount,
      displayCurrency: targetCurrency,
      exchangeRate: conversion.exchangeRate,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe');
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
      throw new InvalidWebhookException('Invalid webhook signature');
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
      throw NotFoundException.payment(paymentId);
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new AlreadyRefundedException(paymentId);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new RefundFailedException(paymentId, 'Only completed payments can be refunded');
    }

    if (!payment.providerPaymentId) {
      throw new RefundFailedException(paymentId, 'No provider payment ID available');
    }

    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe');
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
        status: refund.status || 'pending',
      };
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error}`);
      throw new RefundFailedException(paymentId, 'Stripe refund request failed');
    }
  }

  /**
   * Get payment by ID
   *
   * Optimized: Includes user relation to prevent N+1 when accessing user data.
   */
  async getPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw NotFoundException.payment(paymentId);
    }

    return this.mapToEntity(payment);
  }

  /**
   * Get user's payment history
   *
   * Optimized: Includes user relation to prevent N+1 when accessing user data.
   */
  async getUserPayments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<PaymentEntity[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
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
      throw NotFoundException.payment(paymentId);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymentFailedException('Only pending payments can be cancelled');
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

    const updatedPayment = await this.prisma.payment.update({
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

    // Emit webhook event for payment completed
    const festivalId = (payment.metadata as any)?.festivalId;
    if (festivalId) {
      this.webhookEventHelper.emitPaymentCompleted({
        festivalId,
        paymentId: payment.id,
        userId: payment.userId,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId || undefined,
        completedAt: updatedPayment.paidAt!,
      });
    }
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

    // Emit webhook event for payment failed
    const festivalId = (payment.metadata as any)?.festivalId;
    if (festivalId) {
      this.webhookEventHelper.emitPaymentFailed({
        festivalId,
        paymentId: payment.id,
        userId: payment.userId,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        failedAt: new Date(),
        errorCode: paymentIntent.last_payment_error?.code,
        errorMessage: paymentIntent.last_payment_error?.message,
      });
    }
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

    const updatedPayment = await this.prisma.payment.update({
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

    // Emit webhook event for payment refunded
    const festivalId = (payment.metadata as any)?.festivalId;
    if (festivalId) {
      this.webhookEventHelper.emitPaymentRefunded({
        festivalId,
        paymentId: payment.id,
        userId: payment.userId,
        refundAmount: Number(payment.amount),
        currency: payment.currency,
        refundedAt: updatedPayment.refundedAt!,
        reason: refund.reason || undefined,
      });
    }
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
      // Multi-currency fields
      originalAmount: payment.originalAmount ? Number(payment.originalAmount) : null,
      originalCurrency: payment.originalCurrency,
      exchangeRate: payment.exchangeRate ? Number(payment.exchangeRate) : null,
    };
  }
}
