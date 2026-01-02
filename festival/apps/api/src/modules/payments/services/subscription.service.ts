/**
 * Subscription Service
 *
 * Handles subscription management for season passes and recurring payments:
 * - Product and price management
 * - Subscription lifecycle (create, update, cancel, pause)
 * - Invoice management
 * - Webhook handling for subscription events
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
import {
  CreateProductDto,
  CreatePriceDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  ProductResponseDto,
  PriceResponseDto,
  SubscriptionResponseDto,
  SubscriptionStatus,
  InvoiceResponseDto,
} from '../dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Subscription features disabled');
    }
  }

  // ============================================================================
  // Product Management
  // ============================================================================

  /**
   * Create a product (e.g., Season Pass)
   */
  async createProduct(dto: CreateProductDto): Promise<ProductResponseDto> {
    this.ensureStripeConfigured();

    try {
      const product = await this.stripe!.products.create({
        name: dto.name,
        description: dto.description,
        images: dto.images,
        metadata: dto.metadata,
        statement_descriptor: dto.statementDescriptor,
      });

      this.logger.log(`Created product ${product.id}: ${dto.name}`);

      return {
        productId: product.id,
        name: product.name,
        description: product.description || undefined,
        active: product.active,
        createdAt: new Date(product.created * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to create product: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  /**
   * Create a price for a product
   */
  async createPrice(dto: CreatePriceDto): Promise<PriceResponseDto> {
    this.ensureStripeConfigured();

    try {
      const price = await this.stripe!.prices.create({
        product: dto.productId,
        unit_amount: dto.unitAmount,
        currency: dto.currency || 'eur',
        recurring: {
          interval: dto.interval,
          interval_count: dto.intervalCount || 1,
          trial_period_days: dto.trialPeriodDays,
        },
        metadata: dto.metadata,
      });

      this.logger.log(`Created price ${price.id} for product ${dto.productId}`);

      return {
        priceId: price.id,
        productId: dto.productId,
        unitAmount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || 'month',
        intervalCount: price.recurring?.interval_count || 1,
        trialPeriodDays: price.recurring?.trial_period_days || undefined,
        active: price.active,
      };
    } catch (error) {
      this.logger.error(`Failed to create price: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create price');
    }
  }

  /**
   * List products
   */
  async listProducts(
    limit: number = 10,
    active?: boolean,
  ): Promise<ProductResponseDto[]> {
    this.ensureStripeConfigured();

    try {
      const params: Stripe.ProductListParams = { limit };
      if (active !== undefined) {
        params.active = active;
      }

      const products = await this.stripe!.products.list(params);

      return products.data.map((p) => ({
        productId: p.id,
        name: p.name,
        description: p.description || undefined,
        active: p.active,
        createdAt: new Date(p.created * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to list products: ${error}`);
      throw new InternalServerErrorException('Failed to list products');
    }
  }

  /**
   * List prices for a product
   */
  async listPrices(
    productId: string,
    active?: boolean,
  ): Promise<PriceResponseDto[]> {
    this.ensureStripeConfigured();

    try {
      const params: Stripe.PriceListParams = { product: productId };
      if (active !== undefined) {
        params.active = active;
      }

      const prices = await this.stripe!.prices.list(params);

      return prices.data.map((p) => ({
        priceId: p.id,
        productId: productId,
        unitAmount: p.unit_amount || 0,
        currency: p.currency,
        interval: p.recurring?.interval || 'month',
        intervalCount: p.recurring?.interval_count || 1,
        trialPeriodDays: p.recurring?.trial_period_days || undefined,
        active: p.active,
      }));
    } catch (error) {
      this.logger.error(`Failed to list prices: ${error}`);
      throw new InternalServerErrorException('Failed to list prices');
    }
  }

  // ============================================================================
  // Customer Management
  // ============================================================================

  /**
   * Get or create a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    this.ensureStripeConfigured();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if customer already exists (stored in user metadata or separate table)
    // For now, we'll search by email
    try {
      const existingCustomers = await this.stripe!.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }

      // Create new customer
      const customer = await this.stripe!.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone || undefined,
        metadata: {
          userId: user.id,
        },
      });

      this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);

      return customer.id;
    } catch (error) {
      this.logger.error(`Failed to get or create customer: ${error}`);
      throw new InternalServerErrorException('Failed to manage customer');
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Create a subscription
   */
  async createSubscription(
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.ensureStripeConfigured();

    try {
      // Get or create customer
      const customerId = await this.getOrCreateCustomer(dto.userId);

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: dto.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent', 'items.data.price.product'],
        metadata: {
          userId: dto.userId,
          festivalId: dto.festivalId || '',
          ...dto.metadata,
        },
      };

      if (dto.trialEnd) {
        subscriptionParams.trial_end = Math.floor(dto.trialEnd.getTime() / 1000);
      }

      if (dto.cancelAtPeriodEnd) {
        subscriptionParams.cancel_at_period_end = dto.cancelAtPeriodEnd;
      }

      if (dto.promotionCode) {
        subscriptionParams.promotion_code = dto.promotionCode;
      }

      if (dto.couponCode) {
        subscriptionParams.coupon = dto.couponCode;
      }

      if (dto.collectionMethod) {
        subscriptionParams.collection_method = dto.collectionMethod as Stripe.SubscriptionCreateParams.CollectionMethod;
      }

      if (dto.daysUntilDue) {
        subscriptionParams.days_until_due = dto.daysUntilDue;
      }

      const subscription = await this.stripe!.subscriptions.create(subscriptionParams);

      this.logger.log(`Created subscription ${subscription.id} for user ${dto.userId}`);

      return this.mapSubscriptionToResponse(subscription, dto.userId);
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResponseDto> {
    this.ensureStripeConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.retrieve(
        subscriptionId,
        {
          expand: ['items.data.price.product'],
        },
      );

      const userId = subscription.metadata?.userId || '';

      return this.mapSubscriptionToResponse(subscription, userId);
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'resource_missing') {
          throw new NotFoundException('Subscription not found');
        }
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve subscription');
    }
  }

  /**
   * List subscriptions for a user
   */
  async listUserSubscriptions(userId: string): Promise<SubscriptionResponseDto[]> {
    this.ensureStripeConfigured();

    try {
      const customerId = await this.getOrCreateCustomer(userId);

      const subscriptions = await this.stripe!.subscriptions.list({
        customer: customerId,
        expand: ['data.items.data.price.product'],
      });

      return subscriptions.data.map((s) =>
        this.mapSubscriptionToResponse(s, userId),
      );
    } catch (error) {
      this.logger.error(`Failed to list subscriptions: ${error}`);
      throw new InternalServerErrorException('Failed to list subscriptions');
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.ensureStripeConfigured();

    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      if (dto.priceId) {
        // Get current subscription to find item ID
        const currentSub = await this.stripe!.subscriptions.retrieve(subscriptionId);
        const itemId = currentSub.items.data[0]?.id;

        if (itemId) {
          updateParams.items = [
            {
              id: itemId,
              price: dto.priceId,
            },
          ];
        }
      }

      if (dto.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = dto.cancelAtPeriodEnd;
      }

      if (dto.pauseCollection !== undefined) {
        updateParams.pause_collection = dto.pauseCollection
          ? { behavior: 'void' }
          : null;
      }

      if (dto.couponCode) {
        updateParams.coupon = dto.couponCode;
      }

      if (dto.prorationBehavior) {
        updateParams.proration_behavior = dto.prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior;
      }

      if (dto.metadata) {
        updateParams.metadata = dto.metadata;
      }

      const subscription = await this.stripe!.subscriptions.update(
        subscriptionId,
        updateParams,
      );

      this.logger.log(`Updated subscription ${subscriptionId}`);

      const userId = subscription.metadata?.userId || '';
      return this.mapSubscriptionToResponse(subscription, userId);
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.ensureStripeConfigured();

    try {
      // Option to offer retention coupon
      if (dto.retentionCouponCode) {
        const subscription = await this.stripe!.subscriptions.update(
          subscriptionId,
          {
            coupon: dto.retentionCouponCode,
          },
        );

        this.logger.log(
          `Applied retention coupon ${dto.retentionCouponCode} to ${subscriptionId}`,
        );

        const userId = subscription.metadata?.userId || '';
        return this.mapSubscriptionToResponse(subscription, userId);
      }

      let subscription: Stripe.Subscription;

      if (dto.cancelImmediately) {
        subscription = await this.stripe!.subscriptions.cancel(subscriptionId, {
          cancellation_details: {
            comment: dto.reason,
            feedback: dto.feedback as Stripe.SubscriptionCancelParams.CancellationDetails.Feedback,
          },
        });
      } else {
        subscription = await this.stripe!.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: dto.reason,
            feedback: dto.feedback as Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback,
          },
        });
      }

      this.logger.log(
        `Cancelled subscription ${subscriptionId} (immediate: ${dto.cancelImmediately})`,
      );

      const userId = subscription.metadata?.userId || '';
      return this.mapSubscriptionToResponse(subscription, userId);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResponseDto> {
    this.ensureStripeConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.update(
        subscriptionId,
        {
          pause_collection: null,
        },
      );

      this.logger.log(`Resumed subscription ${subscriptionId}`);

      const userId = subscription.metadata?.userId || '';
      return this.mapSubscriptionToResponse(subscription, userId);
    } catch (error) {
      this.logger.error(`Failed to resume subscription: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to resume subscription');
    }
  }

  // ============================================================================
  // Invoice Management
  // ============================================================================

  /**
   * List invoices for a user
   */
  async listUserInvoices(
    userId: string,
    limit: number = 10,
  ): Promise<InvoiceResponseDto[]> {
    this.ensureStripeConfigured();

    try {
      const customerId = await this.getOrCreateCustomer(userId);

      const invoices = await this.stripe!.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data.map((i) => this.mapInvoiceToResponse(i));
    } catch (error) {
      this.logger.error(`Failed to list invoices: ${error}`);
      throw new InternalServerErrorException('Failed to list invoices');
    }
  }

  /**
   * Get upcoming invoice for a subscription
   */
  async getUpcomingInvoice(subscriptionId: string): Promise<InvoiceResponseDto> {
    this.ensureStripeConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);

      const upcomingInvoice = await this.stripe!.invoices.retrieveUpcoming({
        subscription: subscriptionId,
        customer: subscription.customer as string,
      });

      return {
        invoiceId: 'upcoming',
        number: 'upcoming',
        status: 'draft',
        amountDue: upcomingInvoice.amount_due,
        amountPaid: upcomingInvoice.amount_paid,
        amountRemaining: upcomingInvoice.amount_remaining,
        currency: upcomingInvoice.currency,
        dueDate: upcomingInvoice.due_date
          ? new Date(upcomingInvoice.due_date * 1000)
          : undefined,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get upcoming invoice: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to get upcoming invoice');
    }
  }

  /**
   * Pay an invoice manually
   */
  async payInvoice(invoiceId: string): Promise<InvoiceResponseDto> {
    this.ensureStripeConfigured();

    try {
      const invoice = await this.stripe!.invoices.pay(invoiceId);

      this.logger.log(`Paid invoice ${invoiceId}`);

      return this.mapInvoiceToResponse(invoice);
    } catch (error) {
      this.logger.error(`Failed to pay invoice: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to pay invoice');
    }
  }

  // ============================================================================
  // Webhook Handlers
  // ============================================================================

  /**
   * Handle subscription events from webhooks
   */
  async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    switch (event.type) {
      case 'customer.subscription.created':
        this.logger.log(`Subscription created: ${subscription.id} for user ${userId}`);
        // Could emit event for notifications, analytics, etc.
        break;

      case 'customer.subscription.updated':
        this.logger.log(`Subscription updated: ${subscription.id}`);
        break;

      case 'customer.subscription.deleted':
        this.logger.log(`Subscription deleted: ${subscription.id}`);
        break;

      case 'customer.subscription.paused':
        this.logger.log(`Subscription paused: ${subscription.id}`);
        break;

      case 'customer.subscription.resumed':
        this.logger.log(`Subscription resumed: ${subscription.id}`);
        break;

      case 'customer.subscription.trial_will_end':
        this.logger.log(`Trial ending soon for subscription: ${subscription.id}`);
        // Send notification to user
        break;

      default:
        this.logger.log(`Unhandled subscription event: ${event.type}`);
    }
  }

  /**
   * Handle invoice events from webhooks
   */
  async handleInvoiceEvent(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    switch (event.type) {
      case 'invoice.paid':
        this.logger.log(`Invoice paid: ${invoice.id}`);
        // Update user's subscription status, send confirmation
        break;

      case 'invoice.payment_failed':
        this.logger.log(`Invoice payment failed: ${invoice.id}`);
        // Notify user, update status
        break;

      case 'invoice.upcoming':
        this.logger.log(`Upcoming invoice: ${invoice.id}`);
        // Send reminder
        break;

      default:
        this.logger.log(`Unhandled invoice event: ${event.type}`);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
  }

  private mapSubscriptionToResponse(
    subscription: Stripe.Subscription,
    userId: string,
  ): SubscriptionResponseDto {
    return {
      subscriptionId: subscription.id,
      status: subscription.status as SubscriptionStatus,
      userId,
      customerId: subscription.customer as string,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : undefined,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
      items: subscription.items.data.map((item) => {
        const price = item.price;
        const product = price.product as Stripe.Product;

        return {
          id: item.id,
          priceId: price.id,
          quantity: item.quantity || 1,
          productName: typeof product === 'object' ? product.name : 'Unknown',
          unitAmount: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
        };
      }),
      createdAt: new Date(subscription.created * 1000),
    };
  }

  private mapInvoiceToResponse(invoice: Stripe.Invoice): InvoiceResponseDto {
    return {
      invoiceId: invoice.id,
      number: invoice.number || '',
      status: invoice.status || 'draft',
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
      invoicePdf: invoice.invoice_pdf || undefined,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      createdAt: new Date(invoice.created * 1000),
    };
  }
}
