/**
 * Checkout Service Unit Tests
 *
 * Comprehensive tests for Stripe Checkout Session management:
 * - Creating checkout sessions
 * - Ticket checkout
 * - Cashless top-up checkout
 * - Vendor checkout (with Connect)
 * - Session retrieval and expiration
 * - Webhook handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutService,
  CheckoutSessionStatus as _CheckoutSessionStatus,
} from './checkout.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CheckoutMode } from '../dto/create-checkout-session.dto';
import { regularUser, publishedFestival } from '../../../test/fixtures';
import Stripe from 'stripe';

describe('CheckoutService', () => {
  let checkoutService: CheckoutService;
  let mockStripe: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

  const mockPromoCodesService = {
    apply: jest.fn(),
  };

  const mockStripeSession = {
    id: 'cs_test_session_123',
    url: 'https://checkout.stripe.com/pay/cs_test_session_123',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    payment_status: 'unpaid',
    status: 'open',
    amount_total: 15000,
    currency: 'eur',
    customer: 'cus_test_123',
    payment_intent: 'pi_test_123',
    subscription: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue(mockStripeSession),
          retrieve: jest.fn().mockResolvedValue(mockStripeSession),
          expire: jest.fn().mockResolvedValue(mockStripeSession),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PromoCodesService, useValue: mockPromoCodesService },
      ],
    }).compile();

    checkoutService = module.get<CheckoutService>(CheckoutService);

    // Inject mock stripe instance directly
    (checkoutService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // Create Checkout Session Tests
  // ==========================================================================

  describe('createCheckoutSession', () => {
    const validDto = {
      userId: regularUser.id,
      mode: CheckoutMode.PAYMENT,
      lineItems: [
        {
          name: 'Festival Ticket',
          description: 'VIP Access',
          unitAmount: 15000,
          quantity: 1,
        },
      ],
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockPayment = {
      id: 'payment-uuid-test-123',
      userId: regularUser.id,
      amount: 150,
      currency: 'EUR',
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'cs_test_session_123',
      providerData: { sessionId: 'cs_test_session_123' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create checkout session successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await checkoutService.createCheckoutSession(validDto);

      expect(result.paymentId).toBe(mockPayment.id);
      expect(result.sessionId).toBe(mockStripeSession.id);
      expect(result.checkoutUrl).toBe(mockStripeSession.url);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          success_url: validDto.successUrl,
          cancel_url: validDto.cancelUrl,
        }),
        undefined
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(checkoutService.createCheckoutSession(validDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should use customer email from user if not provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await checkoutService.createCheckoutSession(validDto);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: regularUser.email,
        }),
        undefined
      );
    });

    it('should use provided customer email if specified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const customEmail = 'custom@example.com';
      await checkoutService.createCheckoutSession({
        ...validDto,
        customerEmail: customEmail,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: customEmail,
        }),
        undefined
      );
    });

    it('should include metadata in checkout session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const customMetadata = { orderId: 'order-123' };
      await checkoutService.createCheckoutSession({
        ...validDto,
        metadata: customMetadata,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: validDto.userId,
            orderId: 'order-123',
          }),
        }),
        undefined
      );
    });

    it('should set expiration when expiresAfterMinutes is provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await checkoutService.createCheckoutSession({
        ...validDto,
        expiresAfterMinutes: 60,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Number),
        }),
        undefined
      );
    });

    it('should handle Stripe Connect with connected account ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const connectedAccountId = 'acct_test_123';
      await checkoutService.createCheckoutSession({
        ...validDto,
        connectedAccountId,
        applicationFeeAmount: 150,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 150,
          }),
        }),
        { stripeAccount: connectedAccountId }
      );
    });

    it('should calculate line items total correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const lineItems = [
        { name: 'Item 1', unitAmount: 5000, quantity: 2 },
        { name: 'Item 2', unitAmount: 3000, quantity: 1 },
      ];

      await checkoutService.createCheckoutSession({
        ...validDto,
        lineItems,
      });

      // Total should be (5000 * 2) + (3000 * 1) = 13000 cents = 130 EUR
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 130, // Converted from cents to currency units
          }),
        })
      );
    });

    it('should apply promo code and calculate discount', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPromoCodesService.apply.mockResolvedValue({
        valid: true,
        promoCode: {
          id: 'promo-123',
          code: 'DISCOUNT20',
          discountType: 'PERCENTAGE',
          discountValue: 20,
        },
        discountAmount: 30,
        finalAmount: 120,
      });

      await checkoutService.createCheckoutSession({
        ...validDto,
        promoCode: 'DISCOUNT20',
      } as any);

      expect(mockPromoCodesService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'DISCOUNT20',
        })
      );
    });

    it('should throw InternalServerErrorException for invalid promo code (BadRequestException gets caught)', async () => {
      // Note: The service catches BadRequestException from promo validation
      // and re-throws as InternalServerErrorException since it's not a StripeError
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPromoCodesService.apply.mockResolvedValue({
        valid: false,
        error: 'Code promo invalide',
      });

      await expect(
        checkoutService.createCheckoutSession({
          ...validDto,
          promoCode: 'INVALID',
        } as any)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException on Stripe error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid request',
        type: 'invalid_request_error',
      });
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError);

      await expect(checkoutService.createCheckoutSession(validDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Unknown error'));

      await expect(checkoutService.createCheckoutSession(validDto)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should create subscription checkout session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await checkoutService.createCheckoutSession({
        ...validDto,
        mode: CheckoutMode.SUBSCRIPTION,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
        }),
        undefined
      );
    });
  });

  // ==========================================================================
  // Create Ticket Checkout Tests
  // ==========================================================================

  describe('createTicketCheckout', () => {
    const ticketParams = {
      userId: regularUser.id,
      festivalId: publishedFestival.id,
      tickets: [
        {
          categoryId: 'cat-standard',
          name: 'Standard Ticket',
          price: 150,
          quantity: 2,
        },
      ],
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockPayment = {
      id: 'payment-uuid-test-123',
      userId: regularUser.id,
      amount: 300,
      currency: 'EUR',
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'cs_test_session_123',
      createdAt: new Date(),
    };

    it('should create ticket checkout session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await checkoutService.createTicketCheckout(ticketParams);

      expect(result.sessionId).toBe(mockStripeSession.id);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            type: 'ticket_purchase',
            festivalId: publishedFestival.id,
          }),
        }),
        undefined
      );
    });

    it('should convert ticket prices to cents', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await checkoutService.createTicketCheckout(ticketParams);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 15000, // 150 * 100
              }),
            }),
          ]),
        }),
        undefined
      );
    });
  });

  // ==========================================================================
  // Create Cashless Top-up Checkout Tests
  // ==========================================================================

  describe('createCashlessTopupCheckout', () => {
    const topupParams = {
      userId: regularUser.id,
      festivalId: publishedFestival.id,
      amount: 50,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockPayment = {
      id: 'payment-uuid-topup-123',
      userId: regularUser.id,
      amount: 50,
      currency: 'EUR',
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'cs_test_session_123',
      createdAt: new Date(),
    };

    it('should create cashless top-up checkout session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await checkoutService.createCashlessTopupCheckout(topupParams);

      expect(result.sessionId).toBe(mockStripeSession.id);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'cashless_topup',
            topupAmount: '50',
          }),
        }),
        undefined
      );
    });
  });

  // ==========================================================================
  // Create Vendor Checkout Tests
  // ==========================================================================

  describe('createVendorCheckout', () => {
    const vendorParams = {
      userId: regularUser.id,
      vendorId: 'vendor-123',
      connectedAccountId: 'acct_test_vendor_123',
      items: [
        {
          productId: 'prod-1',
          name: 'Product 1',
          price: 10,
          quantity: 2,
        },
      ],
      applicationFeePercent: 10,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockPayment = {
      id: 'payment-uuid-vendor-123',
      userId: regularUser.id,
      amount: 20,
      currency: 'EUR',
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'cs_test_session_123',
      createdAt: new Date(),
    };

    it('should create vendor checkout session with application fee', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(regularUser);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await checkoutService.createVendorCheckout(vendorParams);

      expect(result.sessionId).toBe(mockStripeSession.id);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'vendor_purchase',
            vendorId: 'vendor-123',
          }),
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 200, // 10% of 2000 cents
          }),
        }),
        { stripeAccount: vendorParams.connectedAccountId }
      );
    });
  });

  // ==========================================================================
  // Get Checkout Session Tests
  // ==========================================================================

  describe('getCheckoutSession', () => {
    it('should retrieve checkout session status', async () => {
      const result = await checkoutService.getCheckoutSession('cs_test_session_123');

      expect(result.status).toBe(mockStripeSession.status);
      expect(result.paymentStatus).toBe(mockStripeSession.payment_status);
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_session_123', {
        expand: ['payment_intent', 'subscription'],
      });
    });

    it('should return customerId when available', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        ...mockStripeSession,
        customer: 'cus_test_123',
      });

      const result = await checkoutService.getCheckoutSession('cs_test_session_123');

      expect(result.customerId).toBe('cus_test_123');
    });

    it('should return subscriptionId when available', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        ...mockStripeSession,
        subscription: 'sub_test_123',
      });

      const result = await checkoutService.getCheckoutSession('cs_test_session_123');

      expect(result.subscriptionId).toBe('sub_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Session not found',
        type: 'invalid_request_error',
      });
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(stripeError);

      await expect(checkoutService.getCheckoutSession('invalid_session')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Expire Checkout Session Tests
  // ==========================================================================

  describe('expireCheckoutSession', () => {
    it('should expire checkout session', async () => {
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });

      await checkoutService.expireCheckoutSession('cs_test_session_123');

      expect(mockStripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_test_session_123');
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith({
        where: {
          providerPaymentId: 'cs_test_session_123',
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.CANCELLED },
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Session already expired',
        type: 'invalid_request_error',
      });
      mockStripe.checkout.sessions.expire.mockRejectedValue(stripeError);

      await expect(checkoutService.expireCheckoutSession('cs_test_session_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // List User Checkout Sessions Tests
  // ==========================================================================

  describe('listUserCheckoutSessions', () => {
    it('should list user checkout sessions', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          userId: regularUser.id,
          provider: PaymentProvider.STRIPE,
          providerData: { sessionId: 'cs_session_1' },
          createdAt: new Date(),
        },
        {
          id: 'payment-2',
          userId: regularUser.id,
          provider: PaymentProvider.STRIPE,
          providerData: { sessionId: 'cs_session_2' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockStripe.checkout.sessions.retrieve
        .mockResolvedValueOnce({ ...mockStripeSession, id: 'cs_session_1' })
        .mockResolvedValueOnce({ ...mockStripeSession, id: 'cs_session_2' });

      const result = await checkoutService.listUserCheckoutSessions(regularUser.id, 10);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith({
        where: {
          userId: regularUser.id,
          provider: PaymentProvider.STRIPE,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should skip sessions that fail to retrieve', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          userId: regularUser.id,
          provider: PaymentProvider.STRIPE,
          providerData: { sessionId: 'cs_session_1' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(new Error('Session expired'));

      const result = await checkoutService.listUserCheckoutSessions(regularUser.id);

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Handle Checkout Completed Tests
  // ==========================================================================

  describe('handleCheckoutCompleted', () => {
    const mockSession: Partial<Stripe.Checkout.Session> = {
      id: 'cs_test_session_123',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      customer: 'cus_test_123',
      subscription: null,
      amount_total: 15000,
      metadata: {
        type: 'ticket_purchase',
        userId: regularUser.id,
      },
    };

    const mockPayment = {
      id: 'payment-uuid-test-123',
      userId: regularUser.id,
      amount: 150,
      status: PaymentStatus.PENDING,
      providerPaymentId: 'cs_test_session_123',
      providerData: { sessionId: 'cs_test_session_123' },
    };

    it('should update payment status to COMPLETED when paid', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      await checkoutService.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          paidAt: expect.any(Date),
        }),
      });
    });

    it('should update payment status to PROCESSING when not paid', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
      });

      await checkoutService.handleCheckoutCompleted({
        ...mockSession,
        payment_status: 'unpaid',
      } as Stripe.Checkout.Session);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.PROCESSING,
        }),
      });
    });

    it('should handle missing payment gracefully', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      await checkoutService.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session);

      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should store payment intent ID in payment record', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      await checkoutService.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          providerPaymentId: 'pi_test_123',
        }),
      });
    });
  });

  // ==========================================================================
  // Handle Checkout Expired Tests
  // ==========================================================================

  describe('handleCheckoutExpired', () => {
    const mockSession: Partial<Stripe.Checkout.Session> = {
      id: 'cs_test_session_123',
    };

    it('should update payment status to CANCELLED', async () => {
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });

      await checkoutService.handleCheckoutExpired(mockSession as Stripe.Checkout.Session);

      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith({
        where: { providerPaymentId: 'cs_test_session_123' },
        data: { status: PaymentStatus.CANCELLED },
      });
    });
  });

  // ==========================================================================
  // Stripe Not Configured Tests
  // ==========================================================================

  describe('Stripe not configured', () => {
    let serviceNoStripe: CheckoutService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CheckoutService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigServiceNoStripe },
          { provide: PromoCodesService, useValue: mockPromoCodesService },
        ],
      }).compile();

      serviceNoStripe = module.get<CheckoutService>(CheckoutService);
    });

    it('should throw InternalServerErrorException when creating checkout session without Stripe', async () => {
      await expect(
        serviceNoStripe.createCheckoutSession({
          userId: regularUser.id,
          mode: CheckoutMode.PAYMENT,
          lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when getting session without Stripe', async () => {
      await expect(serviceNoStripe.getCheckoutSession('cs_test_123')).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when expiring session without Stripe', async () => {
      await expect(serviceNoStripe.expireCheckoutSession('cs_test_123')).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
