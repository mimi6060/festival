import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  successUrl: string;
  cancelUrl: string;
  mode: 'payment' | 'subscription';
  metadata?: Record<string, string>;
  customerEmail?: string;
  clientReferenceId?: string;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number; // in cents, optional for full refund
  reason?: Stripe.RefundCreateParams.Reason;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private webhookSecret: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Stripe payments will not work.',
      );
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });

    this.logger.log('Stripe service initialized successfully');
  }

  /**
   * Ensures Stripe is properly configured before making API calls
   */
  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new InternalServerErrorException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }
  }

  /**
   * Creates a Stripe Checkout session for payment
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<Stripe.Checkout.Session> {
    this.ensureStripeConfigured();

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: params.lineItems,
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
        customer_email: params.customerEmail,
        client_reference_id: params.clientReferenceId,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes expiration
      });

      this.logger.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }

  /**
   * Constructs and verifies a Stripe webhook event
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    this.ensureStripeConfigured();

    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        'Stripe webhook secret is not configured.',
      );
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );

      this.logger.debug(`Webhook event constructed: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  /**
   * Creates a refund for a payment
   */
  async createRefund(params: RefundParams): Promise<Stripe.Refund> {
    this.ensureStripeConfigured();

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        metadata: params.metadata,
      };

      // Add amount if specified (partial refund)
      if (params.amount) {
        refundParams.amount = params.amount;
      }

      // Add reason if specified
      if (params.reason) {
        refundParams.reason = params.reason;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      this.logger.log(
        `Refund created: ${refund.id} for payment ${params.paymentIntentId}`,
      );
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Retrieves a checkout session by ID
   */
  async retrieveSession(
    sessionId: string,
    options?: { expandLineItems?: boolean },
  ): Promise<Stripe.Checkout.Session> {
    this.ensureStripeConfigured();

    try {
      const expand: string[] = [];
      if (options?.expandLineItems) {
        expand.push('line_items');
      }

      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: expand.length > 0 ? expand : undefined,
      });

      return session;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve session ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve session: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves a payment intent by ID
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.ensureStripeConfigured();

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );
      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve payment intent ${paymentIntentId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve payment intent: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves a refund by ID
   */
  async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
    this.ensureStripeConfigured();

    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return refund;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve refund ${refundId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve refund: ${error.message}`,
      );
    }
  }

  /**
   * Lists all refunds for a payment intent
   */
  async listRefunds(paymentIntentId: string): Promise<Stripe.Refund[]> {
    this.ensureStripeConfigured();

    try {
      const refunds = await this.stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 100,
      });
      return refunds.data;
    } catch (error) {
      this.logger.error(
        `Failed to list refunds for ${paymentIntentId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to list refunds: ${error.message}`,
      );
    }
  }

  /**
   * Cancels a payment intent if it's cancelable
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.ensureStripeConfigured();

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(
        paymentIntentId,
      );
      this.logger.log(`Payment intent cancelled: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to cancel payment intent ${paymentIntentId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to cancel payment intent: ${error.message}`,
      );
    }
  }
}
