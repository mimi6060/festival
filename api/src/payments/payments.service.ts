import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import {
  CreateCheckoutDto,
  CheckoutType,
  RefundRequestDto,
  RefundReason,
} from './dto';
import { PaymentStatus, PaymentProvider, TransactionType } from '@prisma/client';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';

export interface CheckoutResult {
  sessionId: string;
  sessionUrl: string;
  paymentId: string;
}

export interface PaymentWithDetails {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  description: string | null;
  createdAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
  tickets?: Array<{
    id: string;
    qrCode: string;
    category: {
      name: string;
      type: string;
    };
    festival: {
      name: string;
    };
  }>;
  cashlessTopup?: {
    amount: number;
    festival: {
      name: string;
    };
  } | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Creates a Stripe Checkout session for ticket purchase or cashless topup
   */
  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutResult> {
    const { type, items, successUrl, cancelUrl, festivalId, currency } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Create payment record first
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: 0, // Will be updated based on line items
        currency: currency || 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        description:
          type === CheckoutType.TICKET
            ? 'Ticket purchase'
            : 'Cashless account topup',
        metadata: {
          type,
          items: JSON.stringify(items),
          festivalId,
        },
      },
    });

    try {
      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      let totalAmount = 0;

      if (type === CheckoutType.TICKET) {
        const result = await this.buildTicketLineItems(items, festivalId);
        lineItems = result.lineItems;
        totalAmount = result.totalAmount;
      } else if (type === CheckoutType.CASHLESS) {
        const result = await this.buildCashlessLineItems(items, festivalId);
        lineItems = result.lineItems;
        totalAmount = result.totalAmount;
      } else {
        throw new BadRequestException(`Invalid checkout type: ${type}`);
      }

      // Update payment with calculated amount
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { amount: totalAmount / 100 }, // Convert from cents to currency units
      });

      // Create Stripe checkout session
      const session = await this.stripeService.createCheckoutSession({
        lineItems,
        successUrl:
          successUrl || `${this.frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${this.frontendUrl}/payments/cancel`,
        mode: 'payment',
        metadata: {
          paymentId: payment.id,
          type,
          userId,
          festivalId: festivalId || '',
        },
        clientReferenceId: payment.id,
      });

      // Update payment with Stripe session info
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: session.id,
          providerData: {
            sessionId: session.id,
            sessionUrl: session.url,
          },
        },
      });

      this.logger.log(
        `Checkout session created for user ${userId}: ${session.id}`,
      );

      return {
        sessionId: session.id,
        sessionUrl: session.url!,
        paymentId: payment.id,
      };
    } catch (error) {
      // Clean up payment record on failure
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      this.logger.error(
        `Failed to create checkout session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Builds line items for ticket purchases
   */
  private async buildTicketLineItems(
    items: CreateCheckoutDto['items'],
    festivalId?: string,
  ): Promise<{ lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]; totalAmount: number }> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const category = await this.prisma.ticketCategory.findUnique({
        where: { id: item.itemId },
        include: { festival: true },
      });

      if (!category) {
        throw new NotFoundException(
          `Ticket category not found: ${item.itemId}`,
        );
      }

      if (!category.isActive) {
        throw new BadRequestException(
          `Ticket category is not available: ${category.name}`,
        );
      }

      const now = new Date();
      if (now < category.saleStartDate || now > category.saleEndDate) {
        throw new BadRequestException(
          `Ticket sales are not open for: ${category.name}`,
        );
      }

      const availableTickets = category.quota - category.soldCount;
      if (item.quantity > availableTickets) {
        throw new BadRequestException(
          `Not enough tickets available for ${category.name}. Available: ${availableTickets}`,
        );
      }

      if (item.quantity > category.maxPerUser) {
        throw new BadRequestException(
          `Maximum ${category.maxPerUser} tickets per user for ${category.name}`,
        );
      }

      const priceInCents = Math.round(Number(category.price) * 100);
      totalAmount += priceInCents * item.quantity;

      lineItems.push({
        price_data: {
          currency: category.festival.currency.toLowerCase(),
          product_data: {
            name: `${category.festival.name} - ${category.name}`,
            description: category.description || undefined,
            metadata: {
              categoryId: category.id,
              festivalId: category.festivalId,
              ticketType: category.type,
            },
          },
          unit_amount: priceInCents,
        },
        quantity: item.quantity,
      });
    }

    return { lineItems, totalAmount };
  }

  /**
   * Builds line items for cashless account topup
   */
  private async buildCashlessLineItems(
    items: CreateCheckoutDto['items'],
    festivalId?: string,
  ): Promise<{ lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]; totalAmount: number }> {
    if (!festivalId) {
      throw new BadRequestException(
        'Festival ID is required for cashless topup',
      );
    }

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival not found: ${festivalId}`);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const amount = item.unitPrice || 0;
      if (amount < 100) {
        // Minimum 1 EUR/USD
        throw new BadRequestException(
          'Minimum topup amount is 1.00 in currency units',
        );
      }

      totalAmount += amount * item.quantity;

      lineItems.push({
        price_data: {
          currency: festival.currency.toLowerCase(),
          product_data: {
            name: `${festival.name} - Cashless Topup`,
            description: `Credit for cashless payments at ${festival.name}`,
            metadata: {
              festivalId: festival.id,
              type: 'cashless_topup',
            },
          },
          unit_amount: amount,
        },
        quantity: item.quantity,
      });
    }

    return { lineItems, totalAmount };
  }

  /**
   * Handles incoming Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handles successful checkout session completion
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const paymentId = session.metadata?.paymentId || session.client_reference_id;

    if (!paymentId) {
      this.logger.error('No payment ID found in session metadata');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      this.logger.error(`Payment not found: ${paymentId}`);
      return;
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.warn(`Payment already completed: ${paymentId}`);
      return;
    }

    await this.processSuccessfulPayment(payment.id, session);
  }

  /**
   * Processes a successful payment and creates tickets or credits cashless account
   */
  async processSuccessfulPayment(
    paymentId: string,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found: ${paymentId}`);
    }

    const metadata = payment.metadata as Record<string, unknown>;
    const type = (session.metadata?.type || metadata?.type) as CheckoutType;
    const userId = session.metadata?.userId || payment.userId;
    const festivalId = session.metadata?.festivalId || (metadata?.festivalId as string);

    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          providerData: {
            ...(payment.providerData as Record<string, unknown> || {}),
            paymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
            amountTotal: session.amount_total,
          } as object,
        },
      });

      if (type === CheckoutType.TICKET) {
        await this.createTicketsForPayment(tx, paymentId, metadata, userId);
      } else if (type === CheckoutType.CASHLESS) {
        await this.creditCashlessAccount(
          tx,
          paymentId,
          userId,
          festivalId,
          Number(payment.amount),
        );
      }
    });

    this.logger.log(`Payment processed successfully: ${paymentId}`);
  }

  /**
   * Creates tickets for a completed payment
   */
  private async createTicketsForPayment(
    tx: any,
    paymentId: string,
    metadata: Record<string, unknown>,
    userId: string,
  ): Promise<void> {
    const items = JSON.parse(metadata.items as string) as Array<{
      itemId: string;
      quantity: number;
    }>;

    for (const item of items) {
      const category = await tx.ticketCategory.findUnique({
        where: { id: item.itemId },
        include: { festival: true },
      });

      if (!category) {
        throw new NotFoundException(`Ticket category not found: ${item.itemId}`);
      }

      // Create tickets
      for (let i = 0; i < item.quantity; i++) {
        const qrCode = `TKT-${randomUUID().toUpperCase().slice(0, 8)}`;
        const qrCodeData = JSON.stringify({
          ticketId: randomUUID(),
          festivalId: category.festivalId,
          categoryId: category.id,
          userId,
          timestamp: Date.now(),
        });

        await tx.ticket.create({
          data: {
            festivalId: category.festivalId,
            categoryId: category.id,
            userId,
            qrCode,
            qrCodeData,
            purchasePrice: category.price,
            paymentId,
          },
        });
      }

      // Update sold count
      await tx.ticketCategory.update({
        where: { id: item.itemId },
        data: { soldCount: { increment: item.quantity } },
      });

      // Update festival attendees
      await tx.festival.update({
        where: { id: category.festivalId },
        data: { currentAttendees: { increment: item.quantity } },
      });
    }

    this.logger.log(`Tickets created for payment: ${paymentId}`);
  }

  /**
   * Credits cashless account for a completed topup payment
   */
  private async creditCashlessAccount(
    tx: any,
    paymentId: string,
    userId: string,
    festivalId: string,
    amount: number,
  ): Promise<void> {
    // Find or create cashless account
    let account = await tx.cashlessAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await tx.cashlessAccount.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    const balanceBefore = Number(account.balance);
    const balanceAfter = balanceBefore + amount;

    // Update account balance
    await tx.cashlessAccount.update({
      where: { id: account.id },
      data: { balance: balanceAfter },
    });

    // Create transaction record
    await tx.cashlessTransaction.create({
      data: {
        accountId: account.id,
        festivalId,
        type: TransactionType.TOPUP,
        amount,
        balanceBefore,
        balanceAfter,
        description: 'Online topup via Stripe',
        paymentId,
      },
    });

    this.logger.log(
      `Cashless account credited: ${account.id}, amount: ${amount}`,
    );
  }

  /**
   * Handles checkout session expiration
   */
  private async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const paymentId = session.metadata?.paymentId || session.client_reference_id;

    if (!paymentId) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        providerData: {
          expiredAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Checkout session expired, payment cancelled: ${paymentId}`);
  }

  /**
   * Handles charge refunded event
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      this.logger.warn('No payment intent ID in charge refunded event');
      return;
    }

    // Find payment by provider payment ID (session ID contains payment intent reference)
    const payment = await this.prisma.payment.findFirst({
      where: {
        providerData: {
          path: ['paymentIntentId'],
          equals: paymentIntentId,
        },
      },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for refunded charge: ${paymentIntentId}`,
      );
      return;
    }

    const refundedAmount = charge.amount_refunded / 100;
    const totalAmount = Number(payment.amount);

    // Determine if full or partial refund
    const newStatus =
      refundedAmount >= totalAmount
        ? PaymentStatus.REFUNDED
        : payment.status;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        refundedAt: new Date(),
        providerData: {
          ...(payment.providerData as object || {}),
          refundedAmount,
          lastRefundAt: new Date().toISOString(),
        },
      },
    });

    // If tickets were purchased, update their status
    if (newStatus === PaymentStatus.REFUNDED) {
      await this.prisma.ticket.updateMany({
        where: { paymentId: payment.id },
        data: { status: 'REFUNDED' },
      });
    }

    this.logger.log(`Charge refunded processed: ${payment.id}`);
  }

  /**
   * Handles payment failure
   */
  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        providerData: {
          path: ['paymentIntentId'],
          equals: paymentIntent.id,
        },
      },
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerData: {
          ...(payment.providerData as object || {}),
          failureMessage: paymentIntent.last_payment_error?.message,
          failureCode: paymentIntent.last_payment_error?.code,
        },
      },
    });

    this.logger.log(`Payment failed: ${payment.id}`);
  }

  /**
   * Processes a refund request
   */
  async processRefund(
    paymentId: string,
    userId: string,
    dto: RefundRequestDto,
    isAdmin: boolean = false,
  ): Promise<{ refundId: string; status: string }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { tickets: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found: ${paymentId}`);
    }

    // Check authorization
    if (!isAdmin && payment.userId !== userId) {
      throw new ForbiddenException('You can only refund your own payments');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot refund payment with status: ${payment.status}`,
      );
    }

    const providerData = payment.providerData as Record<string, unknown>;
    const paymentIntentId = providerData?.paymentIntentId as string;

    if (!paymentIntentId) {
      throw new BadRequestException(
        'Payment intent ID not found. Cannot process refund.',
      );
    }

    // Map refund reason
    const stripeReason = this.mapRefundReason(dto.reason);

    // Create refund via Stripe
    const refund = await this.stripeService.createRefund({
      paymentIntentId,
      amount: dto.amount, // Will be undefined for full refund
      reason: stripeReason,
      metadata: {
        paymentId,
        requestedBy: userId,
        reason: dto.reason,
        description: dto.description || '',
      },
    });

    this.logger.log(`Refund created: ${refund.id} for payment ${paymentId}`);

    return {
      refundId: refund.id,
      status: refund.status || 'pending',
    };
  }

  /**
   * Maps internal refund reason to Stripe reason
   */
  private mapRefundReason(
    reason: RefundReason,
  ): Stripe.RefundCreateParams.Reason | undefined {
    switch (reason) {
      case RefundReason.DUPLICATE:
        return 'duplicate';
      case RefundReason.FRAUDULENT:
        return 'fraudulent';
      case RefundReason.REQUESTED_BY_CUSTOMER:
        return 'requested_by_customer';
      default:
        return undefined;
    }
  }

  /**
   * Gets payment history for a user
   */
  async getPaymentHistory(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<PaymentWithDetails[]> {
    const { limit = 20, offset = 0 } = options || {};

    const payments = await this.prisma.payment.findMany({
      where: { userId },
      include: {
        tickets: {
          include: {
            category: true,
            festival: true,
          },
        },
        cashlessTopup: {
          include: {
            festival: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return payments.map((p) => this.mapPaymentToDetails(p));
  }

  /**
   * Gets a single payment by ID
   */
  async getPaymentById(
    paymentId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        tickets: {
          include: {
            category: true,
            festival: true,
          },
        },
        cashlessTopup: {
          include: {
            festival: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found: ${paymentId}`);
    }

    if (!isAdmin && payment.userId !== userId) {
      throw new ForbiddenException('You can only view your own payments');
    }

    return this.mapPaymentToDetails(payment);
  }

  /**
   * Gets all payments for a festival (admin only)
   */
  async getFestivalPayments(
    festivalId: string,
    options?: { limit?: number; offset?: number; status?: PaymentStatus },
  ): Promise<{ payments: PaymentWithDetails[]; total: number }> {
    const { limit = 50, offset = 0, status } = options || {};

    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival not found: ${festivalId}`);
    }

    const whereClause = {
      OR: [
        {
          tickets: {
            some: { festivalId },
          },
        },
        {
          cashlessTopup: {
            festivalId,
          },
        },
      ],
      ...(status && { status }),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          tickets: {
            include: {
              category: true,
              festival: true,
            },
          },
          cashlessTopup: {
            include: {
              festival: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.payment.count({ where: whereClause }),
    ]);

    return {
      payments: payments.map((p) => this.mapPaymentToDetails(p)),
      total,
    };
  }

  /**
   * Maps a Prisma payment to PaymentWithDetails
   */
  private mapPaymentToDetails(payment: any): PaymentWithDetails {
    return {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      description: payment.description,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      refundedAt: payment.refundedAt,
      tickets: payment.tickets?.map((t: any) => ({
        id: t.id,
        qrCode: t.qrCode,
        category: {
          name: t.category.name,
          type: t.category.type,
        },
        festival: {
          name: t.festival.name,
        },
      })),
      cashlessTopup: payment.cashlessTopup
        ? {
            amount: Number(payment.cashlessTopup.amount),
            festival: {
              name: payment.cashlessTopup.festival.name,
            },
          }
        : null,
    };
  }
}
