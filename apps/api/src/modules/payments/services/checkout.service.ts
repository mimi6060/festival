/**
 * Checkout Service
 *
 * Handles Stripe Checkout Sessions for seamless hosted payments:
 * - One-time payments
 * - Subscription payments
 * - Setup mode for saving payment methods
 * - Support for Stripe Connect (vendor payments)
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
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentProvider, Prisma } from '@prisma/client';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
  CheckoutMode,
} from '../dto/create-checkout-session.dto';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';

export interface CheckoutSessionStatus {
  status: string;
  paymentStatus: string;
  customerId?: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly promoCodesService: PromoCodesService
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Checkout features disabled');
    }
  }

  /**
   * Create a Stripe Checkout Session for seamless hosted payments
   * Supports one-time payments, subscriptions, and setup mode
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<CheckoutSessionResponseDto> {
    this.ensureStripeConfigured();

    const user = await this.validateUser(dto.userId);

    try {
      const { totalAmount, discountAmount, promoCodeData } = await this.calculateTotalsWithPromo(
        dto.lineItems,
        dto.promoCode,
        dto.festivalId,
        dto.currency
      );

      const stripeLineItems = this.buildStripeLineItems(dto.lineItems, dto.currency, dto.mode);
      const sessionParams = this.buildSessionParams(dto, user.email, stripeLineItems);
      const stripeOptions = this.buildConnectOptions(dto, sessionParams);

      const session = await this.stripe!.checkout.sessions.create(sessionParams, stripeOptions);

      const payment = await this.createPaymentRecord(
        dto,
        session,
        totalAmount,
        discountAmount,
        promoCodeData
      );

      this.logger.log(`Checkout session created: ${session.id} for user ${dto.userId}`);

      return {
        paymentId: payment.id,
        sessionId: session.id,
        checkoutUrl: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create checkout session');
    }
  }

  /**
   * Create a checkout session for ticket purchase
   */
  async createTicketCheckout(params: {
    userId: string;
    festivalId: string;
    tickets: {
      categoryId: string;
      name: string;
      price: number;
      quantity: number;
    }[];
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<CheckoutSessionResponseDto> {
    const lineItems = params.tickets.map((ticket) => ({
      name: ticket.name,
      description: `Festival ticket - ${ticket.name}`,
      unitAmount: Math.round(ticket.price * 100),
      quantity: ticket.quantity,
      metadata: {
        categoryId: ticket.categoryId,
        festivalId: params.festivalId,
      },
    }));

    return this.createCheckoutSession({
      userId: params.userId,
      festivalId: params.festivalId,
      mode: CheckoutMode.PAYMENT,
      lineItems,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      customerEmail: params.customerEmail,
      metadata: {
        type: 'ticket_purchase',
        festivalId: params.festivalId,
        ticketCategories: params.tickets.map((t) => t.categoryId).join(','),
      },
    });
  }

  /**
   * Create a checkout session for cashless top-up
   */
  async createCashlessTopupCheckout(params: {
    userId: string;
    festivalId: string;
    amount: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResponseDto> {
    return this.createCheckoutSession({
      userId: params.userId,
      festivalId: params.festivalId,
      mode: CheckoutMode.PAYMENT,
      lineItems: [
        {
          name: 'Cashless Top-up',
          description: `Add ${params.amount} EUR to your festival wallet`,
          unitAmount: Math.round(params.amount * 100),
          quantity: 1,
        },
      ],
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        type: 'cashless_topup',
        festivalId: params.festivalId,
        topupAmount: String(params.amount),
      },
    });
  }

  /**
   * Create a checkout session for vendor purchase (with Connect)
   */
  async createVendorCheckout(params: {
    userId: string;
    vendorId: string;
    connectedAccountId: string;
    items: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }[];
    applicationFeePercent: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResponseDto> {
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.price * item.quantity * 100,
      0
    );

    const applicationFeeAmount = Math.round((totalAmount * params.applicationFeePercent) / 100);

    const lineItems = params.items.map((item) => ({
      name: item.name,
      unitAmount: Math.round(item.price * 100),
      quantity: item.quantity,
      metadata: {
        productId: item.productId,
      },
    }));

    return this.createCheckoutSession({
      userId: params.userId,
      mode: CheckoutMode.PAYMENT,
      lineItems,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      connectedAccountId: params.connectedAccountId,
      applicationFeeAmount,
      metadata: {
        type: 'vendor_purchase',
        vendorId: params.vendorId,
        productIds: params.items.map((i) => i.productId).join(','),
      },
    });
  }

  /**
   * Retrieve a checkout session status
   */
  async getCheckoutSession(sessionId: string): Promise<CheckoutSessionStatus> {
    this.ensureStripeConfigured();

    try {
      const session = await this.stripe!.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription'],
      });

      return {
        status: session.status || 'unknown',
        paymentStatus: session.payment_status,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        subscriptionId:
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
        amountTotal: session.amount_total || undefined,
        currency: session.currency || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve checkout session: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve checkout session');
    }
  }

  /**
   * Expire a checkout session
   */
  async expireCheckoutSession(sessionId: string): Promise<void> {
    this.ensureStripeConfigured();

    try {
      await this.stripe!.checkout.sessions.expire(sessionId);
      this.logger.log(`Checkout session expired: ${sessionId}`);

      // Update payment status
      await this.prisma.payment.updateMany({
        where: {
          providerPaymentId: sessionId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to expire checkout session: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to expire checkout session');
    }
  }

  /**
   * List checkout sessions for a user
   */
  async listUserCheckoutSessions(userId: string, limit = 10): Promise<CheckoutSessionStatus[]> {
    this.ensureStripeConfigured();

    // Get payment records to find session IDs
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        provider: PaymentProvider.STRIPE,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const sessions: CheckoutSessionStatus[] = [];

    for (const payment of payments) {
      const providerData = payment.providerData as Record<string, unknown>;
      const sessionId = providerData?.sessionId as string;

      if (sessionId) {
        try {
          const status = await this.getCheckoutSession(sessionId);
          sessions.push(status);
        } catch {
          // Session may have expired or been deleted
        }
      }
    }

    return sessions;
  }

  /**
   * Handle checkout session completed webhook
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: session.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for checkout session: ${session.id}`);
      return;
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:
          session.payment_status === 'paid' ? PaymentStatus.COMPLETED : PaymentStatus.PROCESSING,
        paidAt: session.payment_status === 'paid' ? new Date() : null,
        providerPaymentId: paymentIntentId || session.id,
        providerData: {
          ...(payment.providerData as Record<string, unknown>),
          sessionId: session.id,
          paymentIntentId,
          customerId:
            typeof session.customer === 'string' ? session.customer : session.customer?.id,
          subscriptionId,
          amountTotal: session.amount_total,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Checkout completed: ${session.id} - Status: ${session.payment_status}`);

    // Handle post-payment actions based on metadata
    const metadata = session.metadata || {};
    await this.handlePostPaymentActions(payment.id, metadata);
  }

  /**
   * Handle checkout session expired webhook
   */
  async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { providerPaymentId: session.id },
      data: { status: PaymentStatus.CANCELLED },
    });
    this.logger.log(`Checkout expired: ${session.id}`);
  }

  /**
   * Handle post-payment actions based on payment type
   */
  private async handlePostPaymentActions(
    paymentId: string,
    metadata: Record<string, string>
  ): Promise<void> {
    const type = metadata.type;

    switch (type) {
      case 'ticket_purchase':
        this.logger.log(`Processing ticket purchase for payment ${paymentId}`);
        // Trigger ticket creation via event or direct call
        break;

      case 'cashless_topup':
        this.logger.log(`Processing cashless top-up for payment ${paymentId}`);
        // Trigger cashless balance update
        break;

      case 'vendor_purchase':
        this.logger.log(`Processing vendor purchase for payment ${paymentId}`);
        // Trigger vendor order creation
        break;

      default:
        this.logger.log(`Unknown payment type: ${type}`);
    }
  }

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
  }

  // ============================================================================
  // Checkout Session Helper Methods
  // ============================================================================

  /**
   * Validate user exists
   */
  private async validateUser(userId: string): Promise<{ email: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Calculate total amount and apply promo code if provided
   */
  private async calculateTotalsWithPromo(
    lineItems: { unitAmount: number; quantity: number }[],
    promoCode: string | undefined,
    festivalId: string | undefined,
    currency: string | undefined
  ): Promise<{
    totalAmount: number;
    discountAmount: number;
    promoCodeData: any;
  }> {
    let totalAmount = lineItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);

    let promoCodeData = null;
    let discountAmount = 0;

    if (promoCode) {
      const promoValidation = await this.promoCodesService.apply({
        code: promoCode,
        amount: totalAmount / 100,
        festivalId,
      });

      if (!promoValidation.valid) {
        throw new BadRequestException(promoValidation.error || 'Code promo invalide');
      }

      discountAmount = Math.round((promoValidation.discountAmount || 0) * 100);
      totalAmount = Math.round((promoValidation.finalAmount || 0) * 100);
      promoCodeData = promoValidation.promoCode;

      this.logger.log(
        `Promo code ${promoCode} applied: -${discountAmount / 100} ${currency || 'EUR'}`
      );
    }

    return { totalAmount, discountAmount, promoCodeData };
  }

  /**
   * Build Stripe line items from DTO
   */
  private buildStripeLineItems(
    lineItems: {
      name: string;
      description?: string;
      images?: string[];
      metadata?: Record<string, string>;
      unitAmount: number;
      quantity: number;
    }[],
    currency: string | undefined,
    mode: CheckoutMode
  ): Stripe.Checkout.SessionCreateParams.LineItem[] {
    return lineItems.map((item) => ({
      price_data: {
        currency: currency || 'eur',
        product_data: {
          name: item.name,
          description: item.description,
          images: item.images,
          metadata: item.metadata,
        },
        unit_amount: item.unitAmount,
        ...(mode === CheckoutMode.SUBSCRIPTION && {
          recurring: { interval: 'month' as const },
        }),
      },
      quantity: item.quantity,
    }));
  }

  /**
   * Build session parameters for Stripe
   */
  private buildSessionParams(
    dto: CreateCheckoutSessionDto,
    userEmail: string,
    stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
  ): Stripe.Checkout.SessionCreateParams {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: dto.mode,
      line_items: stripeLineItems,
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      customer_email: dto.customerEmail || userEmail,
      allow_promotion_codes: dto.allowPromotionCodes ?? true,
      metadata: {
        userId: dto.userId,
        festivalId: dto.festivalId || '',
        ...dto.metadata,
      },
      payment_intent_data:
        dto.mode === CheckoutMode.PAYMENT
          ? {
              metadata: {
                userId: dto.userId,
                festivalId: dto.festivalId || '',
              },
            }
          : undefined,
    };

    if (dto.expiresAfterMinutes) {
      sessionParams.expires_at = Math.floor(Date.now() / 1000) + dto.expiresAfterMinutes * 60;
    }

    return sessionParams;
  }

  /**
   * Build Stripe Connect options if applicable
   */
  private buildConnectOptions(
    dto: CreateCheckoutSessionDto,
    sessionParams: Stripe.Checkout.SessionCreateParams
  ): Stripe.RequestOptions | undefined {
    if (!dto.connectedAccountId) {
      return undefined;
    }

    if (dto.applicationFeeAmount && dto.mode === CheckoutMode.PAYMENT) {
      sessionParams.payment_intent_data = {
        ...sessionParams.payment_intent_data,
        application_fee_amount: dto.applicationFeeAmount,
      };
    }

    return { stripeAccount: dto.connectedAccountId };
  }

  /**
   * Create payment record in database
   */
  private async createPaymentRecord(
    dto: CreateCheckoutSessionDto,
    session: Stripe.Checkout.Session,
    totalAmount: number,
    discountAmount: number,
    promoCodeData: any
  ): Promise<{ id: string }> {
    return this.prisma.payment.create({
      data: {
        userId: dto.userId,
        amount: totalAmount / 100,
        currency: (dto.currency || 'eur').toUpperCase(),
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: session.id,
        providerData: {
          sessionId: session.id,
          mode: dto.mode,
          checkoutUrl: session.url,
          expiresAt: session.expires_at,
          connectedAccountId: dto.connectedAccountId,
          applicationFeeAmount: dto.applicationFeeAmount,
          ...(promoCodeData && {
            promoCode: promoCodeData.code,
            promoCodeId: promoCodeData.id,
            originalAmount: (totalAmount + discountAmount) / 100,
            discountAmount: discountAmount / 100,
          }),
        },
        description: `Checkout: ${dto.lineItems.map((i) => i.name).join(', ')}${
          promoCodeData ? ` (Promo: ${promoCodeData.code})` : ''
        }`,
        metadata: {
          ...dto.metadata,
          ...(promoCodeData && {
            promoCode: promoCodeData.code,
            promoCodeId: promoCodeData.id,
          }),
        },
      },
    });
  }
}
