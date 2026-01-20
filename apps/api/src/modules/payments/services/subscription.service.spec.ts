/**
 * Subscription Service Unit Tests
 *
 * Comprehensive tests for Stripe Subscription management:
 * - Product and price management
 * - Customer management
 * - Subscription lifecycle (create, update, cancel, resume)
 * - Invoice management
 * - Webhook handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SubscriptionInterval, SubscriptionStatus } from '../dto/subscription.dto';
import { regularUser } from '../../../test/fixtures';
import Stripe from 'stripe';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockStripe: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
      };
      return config[key];
    }),
  };

  const mockUser = {
    ...regularUser,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+33612345678',
  };

  const mockStripeProduct: Partial<Stripe.Product> = {
    id: 'prod_test_123',
    name: 'Season Pass 2025',
    description: 'Annual festival pass',
    active: true,
    created: Math.floor(Date.now() / 1000),
  };

  const mockStripePrice: Partial<Stripe.Price> = {
    id: 'price_test_123',
    product: 'prod_test_123',
    unit_amount: 9900,
    currency: 'eur',
    recurring: {
      interval: 'month',
      interval_count: 1,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    active: true,
  };

  const mockStripeCustomer: Partial<Stripe.Customer> = {
    id: 'cus_test_123',
    email: mockUser.email,
    name: `${mockUser.firstName} ${mockUser.lastName}`,
  };

  const mockStripeSubscription: Partial<Stripe.Subscription> = {
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    cancel_at: null,
    canceled_at: null,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    created: Math.floor(Date.now() / 1000),
    items: {
      data: [
        {
          id: 'si_test_123',
          price: {
            ...mockStripePrice,
            product: mockStripeProduct,
          },
          quantity: 1,
        },
      ],
      has_more: false,
      object: 'list',
      url: '/v1/subscription_items',
    },
    metadata: {
      userId: mockUser.id,
      festivalId: 'festival-123',
    },
  };

  const mockStripeInvoice: Partial<Stripe.Invoice> = {
    id: 'in_test_123',
    number: 'INV-2024-001',
    status: 'paid',
    amount_due: 9900,
    amount_paid: 9900,
    amount_remaining: 0,
    currency: 'eur',
    hosted_invoice_url: 'https://invoice.stripe.com/test',
    invoice_pdf: 'https://invoice.stripe.com/test.pdf',
    due_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    created: Math.floor(Date.now() / 1000),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance
    mockStripe = {
      products: {
        create: jest.fn().mockResolvedValue(mockStripeProduct),
        list: jest.fn().mockResolvedValue({ data: [mockStripeProduct] }),
      },
      prices: {
        create: jest.fn().mockResolvedValue(mockStripePrice),
        list: jest.fn().mockResolvedValue({ data: [mockStripePrice] }),
      },
      customers: {
        create: jest.fn().mockResolvedValue(mockStripeCustomer),
        list: jest.fn().mockResolvedValue({ data: [] }),
      },
      subscriptions: {
        create: jest.fn().mockResolvedValue(mockStripeSubscription),
        retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        update: jest.fn().mockResolvedValue(mockStripeSubscription),
        cancel: jest.fn().mockResolvedValue({
          ...mockStripeSubscription,
          status: 'canceled',
        }),
        list: jest.fn().mockResolvedValue({ data: [mockStripeSubscription] }),
      },
      invoices: {
        list: jest.fn().mockResolvedValue({ data: [mockStripeInvoice] }),
        retrieveUpcoming: jest.fn().mockResolvedValue({
          ...mockStripeInvoice,
          id: 'upcoming',
        }),
        pay: jest.fn().mockResolvedValue(mockStripeInvoice),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    subscriptionService = module.get<SubscriptionService>(SubscriptionService);

    // Inject mock stripe instance directly
    (subscriptionService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // Product Management Tests
  // ==========================================================================

  describe('createProduct', () => {
    const validDto = {
      name: 'Season Pass 2025',
      description: 'Annual festival pass',
      images: ['https://example.com/image.jpg'],
      metadata: { festivalId: 'festival-123' },
      statementDescriptor: 'Festival Pass',
    };

    it('should create product successfully', async () => {
      const result = await subscriptionService.createProduct(validDto);

      expect(result.productId).toBe(mockStripeProduct.id);
      expect(result.name).toBe(mockStripeProduct.name);
      expect(result.active).toBe(true);
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: validDto.name,
        description: validDto.description,
        images: validDto.images,
        metadata: validDto.metadata,
        statement_descriptor: validDto.statementDescriptor,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid product',
        type: 'invalid_request_error',
      });
      mockStripe.products.create.mockRejectedValue(stripeError);

      await expect(subscriptionService.createProduct(validDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('createPrice', () => {
    const validDto = {
      productId: 'prod_test_123',
      unitAmount: 9900,
      currency: 'eur',
      interval: SubscriptionInterval.MONTH,
      intervalCount: 1,
      trialPeriodDays: 14,
      metadata: { tier: 'premium' },
    };

    it('should create price successfully', async () => {
      const result = await subscriptionService.createPrice(validDto);

      expect(result.priceId).toBe(mockStripePrice.id);
      expect(result.unitAmount).toBe(mockStripePrice.unit_amount);
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: validDto.productId,
        unit_amount: validDto.unitAmount,
        currency: validDto.currency,
        recurring: {
          interval: validDto.interval,
          interval_count: validDto.intervalCount,
          trial_period_days: validDto.trialPeriodDays,
        },
        metadata: validDto.metadata,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid price',
        type: 'invalid_request_error',
      });
      mockStripe.prices.create.mockRejectedValue(stripeError);

      await expect(subscriptionService.createPrice(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('listProducts', () => {
    it('should list products successfully', async () => {
      const result = await subscriptionService.listProducts(10, true);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(mockStripeProduct.id);
      expect(mockStripe.products.list).toHaveBeenCalledWith({
        limit: 10,
        active: true,
      });
    });

    it('should use default limit', async () => {
      await subscriptionService.listProducts();

      expect(mockStripe.products.list).toHaveBeenCalledWith({
        limit: 10,
      });
    });
  });

  describe('listPrices', () => {
    it('should list prices for a product', async () => {
      const result = await subscriptionService.listPrices('prod_test_123', true);

      expect(result).toHaveLength(1);
      expect(result[0].priceId).toBe(mockStripePrice.id);
      expect(mockStripe.prices.list).toHaveBeenCalledWith({
        product: 'prod_test_123',
        active: true,
      });
    });
  });

  // ==========================================================================
  // Customer Management Tests
  // ==========================================================================

  describe('getOrCreateCustomer', () => {
    it('should return existing customer', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.list.mockResolvedValue({
        data: [mockStripeCustomer],
      });

      const result = await subscriptionService.getOrCreateCustomer(mockUser.id);

      expect(result).toBe(mockStripeCustomer.id);
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('should create new customer if not exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.list.mockResolvedValue({ data: [] });

      const result = await subscriptionService.getOrCreateCustomer(mockUser.id);

      expect(result).toBe(mockStripeCustomer.id);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: mockUser.email,
        name: `${mockUser.firstName} ${mockUser.lastName}`,
        phone: mockUser.phone,
        metadata: { userId: mockUser.id },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(subscriptionService.getOrCreateCustomer('invalid-user')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Subscription Management Tests
  // ==========================================================================

  describe('createSubscription', () => {
    const validDto = {
      userId: mockUser.id,
      priceId: 'price_test_123',
      festivalId: 'festival-123',
      metadata: { season: '2025' },
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.list.mockResolvedValue({ data: [mockStripeCustomer] });
    });

    it('should create subscription successfully', async () => {
      const result = await subscriptionService.createSubscription(validDto);

      expect(result.subscriptionId).toBe(mockStripeSubscription.id);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: mockStripeCustomer.id,
          items: [{ price: validDto.priceId }],
          metadata: expect.objectContaining({
            userId: validDto.userId,
            festivalId: validDto.festivalId,
            season: '2025',
          }),
        })
      );
    });

    it('should set trial end when provided', async () => {
      const trialEnd = new Date(Date.now() + 14 * 24 * 3600 * 1000);
      await subscriptionService.createSubscription({
        ...validDto,
        trialEnd,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_end: Math.floor(trialEnd.getTime() / 1000),
        })
      );
    });

    it('should set cancel at period end when specified', async () => {
      await subscriptionService.createSubscription({
        ...validDto,
        cancelAtPeriodEnd: true,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_at_period_end: true,
        })
      );
    });

    it('should apply promotion code when provided', async () => {
      await subscriptionService.createSubscription({
        ...validDto,
        promotionCode: 'promo_test_123',
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          promotion_code: 'promo_test_123',
        })
      );
    });

    it('should apply coupon code when provided', async () => {
      await subscriptionService.createSubscription({
        ...validDto,
        couponCode: 'DISCOUNT20',
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coupon: 'DISCOUNT20',
        })
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid subscription',
        type: 'invalid_request_error',
      });
      mockStripe.subscriptions.create.mockRejectedValue(stripeError);

      await expect(subscriptionService.createSubscription(validDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription successfully', async () => {
      const result = await subscriptionService.getSubscription('sub_test_123');

      expect(result.subscriptionId).toBe(mockStripeSubscription.id);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123', {
        expand: ['items.data.price.product'],
      });
    });

    it('should throw NotFoundException for missing subscription', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such subscription',
        type: 'invalid_request_error',
        code: 'resource_missing',
      });
      mockStripe.subscriptions.retrieve.mockRejectedValue(stripeError);

      await expect(subscriptionService.getSubscription('invalid_sub')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listUserSubscriptions', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.list.mockResolvedValue({ data: [mockStripeCustomer] });
    });

    it('should list user subscriptions successfully', async () => {
      const result = await subscriptionService.listUserSubscriptions(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].subscriptionId).toBe(mockStripeSubscription.id);
      expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({
        customer: mockStripeCustomer.id,
        expand: ['data.items.data.price.product'],
      });
    });
  });

  describe('updateSubscription', () => {
    const updateDto = {
      priceId: 'price_new_123',
      cancelAtPeriodEnd: false,
      metadata: { updated: 'true' },
    };

    it('should update subscription price', async () => {
      await subscriptionService.updateSubscription('sub_test_123', updateDto);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalled();
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          items: [
            {
              id: 'si_test_123',
              price: 'price_new_123',
            },
          ],
        })
      );
    });

    it('should pause collection when specified', async () => {
      await subscriptionService.updateSubscription('sub_test_123', {
        pauseCollection: true,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          pause_collection: { behavior: 'void' },
        })
      );
    });

    it('should unpause collection when false', async () => {
      await subscriptionService.updateSubscription('sub_test_123', {
        pauseCollection: false,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          pause_collection: null,
        })
      );
    });

    it('should apply coupon code', async () => {
      await subscriptionService.updateSubscription('sub_test_123', {
        couponCode: 'DISCOUNT10',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          coupon: 'DISCOUNT10',
        })
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid update',
        type: 'invalid_request_error',
      });
      mockStripe.subscriptions.update.mockRejectedValue(stripeError);

      await expect(
        subscriptionService.updateSubscription('sub_test_123', updateDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const result = await subscriptionService.cancelSubscription('sub_test_123', {
        cancelImmediately: true,
        reason: 'Customer request',
        feedback: 'too_expensive',
      });

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test_123', {
        cancellation_details: {
          comment: 'Customer request',
          feedback: 'too_expensive',
        },
      });
    });

    it('should cancel at period end by default', async () => {
      await subscriptionService.cancelSubscription('sub_test_123', {
        reason: 'Customer request',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: 'Customer request',
          feedback: undefined,
        },
      });
    });

    it('should apply retention coupon instead of canceling', async () => {
      const _result = await subscriptionService.cancelSubscription('sub_test_123', {
        retentionCouponCode: 'RETENTION50',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        coupon: 'RETENTION50',
      });
      expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Cannot cancel',
        type: 'invalid_request_error',
      });
      mockStripe.subscriptions.cancel.mockRejectedValue(stripeError);

      await expect(
        subscriptionService.cancelSubscription('sub_test_123', {
          cancelImmediately: true,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume paused subscription', async () => {
      await subscriptionService.resumeSubscription('sub_test_123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        pause_collection: null,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Cannot resume',
        type: 'invalid_request_error',
      });
      mockStripe.subscriptions.update.mockRejectedValue(stripeError);

      await expect(subscriptionService.resumeSubscription('sub_test_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Invoice Management Tests
  // ==========================================================================

  describe('listUserInvoices', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.list.mockResolvedValue({ data: [mockStripeCustomer] });
    });

    it('should list user invoices successfully', async () => {
      const result = await subscriptionService.listUserInvoices(mockUser.id, 10);

      expect(result).toHaveLength(1);
      expect(result[0].invoiceId).toBe(mockStripeInvoice.id);
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: mockStripeCustomer.id,
        limit: 10,
      });
    });
  });

  describe('getUpcomingInvoice', () => {
    it('should retrieve upcoming invoice', async () => {
      const result = await subscriptionService.getUpcomingInvoice('sub_test_123');

      expect(result.invoiceId).toBe('upcoming');
      expect(result.status).toBe('draft');
      expect(mockStripe.invoices.retrieveUpcoming).toHaveBeenCalledWith({
        subscription: 'sub_test_123',
        customer: mockStripeSubscription.customer,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No upcoming invoice',
        type: 'invalid_request_error',
      });
      mockStripe.invoices.retrieveUpcoming.mockRejectedValue(stripeError);

      await expect(subscriptionService.getUpcomingInvoice('sub_test_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('payInvoice', () => {
    it('should pay invoice successfully', async () => {
      const result = await subscriptionService.payInvoice('in_test_123');

      expect(result.invoiceId).toBe(mockStripeInvoice.id);
      expect(result.status).toBe(mockStripeInvoice.status);
      expect(mockStripe.invoices.pay).toHaveBeenCalledWith('in_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Payment failed',
        type: 'invalid_request_error',
      });
      mockStripe.invoices.pay.mockRejectedValue(stripeError);

      await expect(subscriptionService.payInvoice('in_test_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Webhook Handlers Tests
  // ==========================================================================

  describe('handleSubscriptionEvent', () => {
    it('should handle subscription.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
      // Just verify no errors - this logs the event
    });

    it('should handle subscription.updated event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
    });

    it('should handle subscription.deleted event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.deleted',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
    });

    it('should handle subscription.paused event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.paused',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
    });

    it('should handle trial_will_end event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.trial_will_end',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
    });

    it('should handle unknown event types gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'unknown.event',
        data: { object: mockStripeSubscription },
      } as any;

      await subscriptionService.handleSubscriptionEvent(event);
    });
  });

  describe('handleInvoiceEvent', () => {
    it('should handle invoice.paid event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.paid',
        data: { object: mockStripeInvoice },
      } as any;

      await subscriptionService.handleInvoiceEvent(event);
    });

    it('should handle invoice.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.payment_failed',
        data: { object: mockStripeInvoice },
      } as any;

      await subscriptionService.handleInvoiceEvent(event);
    });

    it('should handle invoice.upcoming event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.upcoming',
        data: { object: mockStripeInvoice },
      } as any;

      await subscriptionService.handleInvoiceEvent(event);
    });

    it('should handle unknown invoice events gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.unknown',
        data: { object: mockStripeInvoice },
      } as any;

      await subscriptionService.handleInvoiceEvent(event);
    });
  });

  // ==========================================================================
  // Stripe Not Configured Tests
  // ==========================================================================

  describe('Stripe not configured', () => {
    let serviceNoStripe: SubscriptionService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigServiceNoStripe },
        ],
      }).compile();

      serviceNoStripe = module.get<SubscriptionService>(SubscriptionService);
    });

    it('should throw InternalServerErrorException when creating product without Stripe', async () => {
      await expect(serviceNoStripe.createProduct({ name: 'Test' })).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when creating price without Stripe', async () => {
      await expect(
        serviceNoStripe.createPrice({
          productId: 'prod_test',
          unitAmount: 1000,
          interval: SubscriptionInterval.MONTH,
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when creating subscription without Stripe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        serviceNoStripe.createSubscription({
          userId: mockUser.id,
          priceId: 'price_test',
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when listing invoices without Stripe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(serviceNoStripe.listUserInvoices(mockUser.id)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
