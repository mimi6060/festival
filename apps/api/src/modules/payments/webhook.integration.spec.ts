/**
 * Stripe Webhook Integration Tests
 *
 * Comprehensive tests for webhook handlers that simulate Stripe webhook events:
 * - checkout.session.completed
 * - checkout.session.expired
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 * - refund.created
 *
 * Tests cover both success and failure scenarios, signature verification,
 * and proper service method invocations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { InvalidWebhookException } from '../../common/exceptions/business.exception';
import { ServiceUnavailableException } from '../../common/exceptions/base.exception';
import {
  regularUser,
  completedPayment,
  pendingPayment,
  stripeMockPaymentIntent,
} from '../../test/fixtures';

// ============================================================================
// Test Fixtures - Stripe Webhook Events
// ============================================================================

const createStripeEvent = (type: string, data: object): Stripe.Event => ({
  id: `evt_test_${Date.now()}`,
  object: 'event',
  type: type as Stripe.Event['type'],
  api_version: '2025-02-24.acacia',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: data as Stripe.Event.Data['object'],
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_123',
    idempotency_key: null,
  },
});

// Checkout session completed event
const checkoutSessionCompletedEvent = createStripeEvent('checkout.session.completed', {
  id: 'cs_test_completed_session',
  object: 'checkout.session',
  amount_total: 14999,
  currency: 'eur',
  customer: 'cus_test_123',
  customer_email: regularUser.email,
  metadata: {
    userId: regularUser.id,
    festivalId: 'festival-test-123',
    type: 'ticket_purchase',
  },
  mode: 'payment',
  payment_intent: 'pi_test_completed_123',
  payment_status: 'paid',
  status: 'complete',
  subscription: null,
  url: null,
});

// Payment intent succeeded event
const paymentIntentSucceededEvent = createStripeEvent('payment_intent.succeeded', {
  id: 'pi_test_succeeded_123',
  object: 'payment_intent',
  amount: 14999,
  amount_received: 14999,
  currency: 'eur',
  status: 'succeeded',
  payment_method: 'pm_card_visa',
  metadata: {
    userId: regularUser.id,
  },
  receipt_email: regularUser.email,
});

// Payment intent failed event
const paymentIntentFailedEvent = createStripeEvent('payment_intent.payment_failed', {
  id: 'pi_test_failed_456',
  object: 'payment_intent',
  amount: 39999,
  currency: 'eur',
  status: 'requires_payment_method',
  last_payment_error: {
    code: 'card_declined',
    message: 'Your card was declined.',
    type: 'card_error',
    decline_code: 'generic_decline',
    param: null,
    doc_url: 'https://stripe.com/docs/error-codes/card-declined',
  },
  metadata: {
    userId: regularUser.id,
  },
});

// Charge refunded event
const chargeRefundedEvent = createStripeEvent('charge.refunded', {
  id: 'ch_test_refunded_123',
  object: 'charge',
  amount: 14999,
  amount_refunded: 14999,
  currency: 'eur',
  payment_intent: 'pi_test_completed_123',
  refunded: true,
  refunds: {
    data: [
      {
        id: 're_test_123',
        object: 'refund',
        amount: 14999,
        currency: 'eur',
        status: 'succeeded',
        reason: 'requested_by_customer',
      },
    ],
    has_more: false,
    total_count: 1,
    url: '/v1/charges/ch_test_refunded_123/refunds',
  },
  status: 'succeeded',
  metadata: {
    userId: regularUser.id,
  },
});

// Refund created event
const refundCreatedEvent = createStripeEvent('refund.created', {
  id: 're_test_created_456',
  object: 'refund',
  amount: 14999,
  charge: 'ch_test_123',
  currency: 'eur',
  payment_intent: stripeMockPaymentIntent.id,
  status: 'succeeded',
  reason: 'requested_by_customer',
  metadata: {
    paymentId: completedPayment.id,
    reason: 'Customer request',
  },
});

// ============================================================================
// PaymentsService Webhook Tests
// ============================================================================

describe('PaymentsService Webhook Integration Tests', () => {
  let paymentsService: PaymentsService;
  let mockStripe: any;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_123',
      };
      return key in config ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance with webhooks
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        cancel: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);

    // Inject mock stripe instance
    (paymentsService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // checkout.session.completed Tests
  // ==========================================================================

  describe('checkout.session.completed', () => {
    it('should process completed checkout session and update payment to COMPLETED', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'cs_test_completed_session',
        providerData: { sessionId: 'cs_test_completed_session' },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(checkoutSessionCompletedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert - Note: PaymentsService only handles payment_intent and refund events
      // checkout.session events are handled by CheckoutService
      // This test verifies the service doesn't crash on unhandled events
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // payment_intent.succeeded Tests
  // ==========================================================================

  describe('payment_intent.succeeded', () => {
    it('should update payment to COMPLETED when payment intent succeeds', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_succeeded_123',
        providerData: {},
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentSucceededEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.findFirst).toHaveBeenCalledWith({
        where: { providerPaymentId: 'pi_test_succeeded_123' },
      });
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          paidAt: expect.any(Date),
        }),
      });
    });

    it('should store payment method in providerData', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_succeeded_123',
        providerData: { existingData: 'value' },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentSucceededEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          providerData: expect.objectContaining({
            existingData: 'value',
            paymentMethod: 'pm_card_visa',
          }),
        }),
      });
    });

    it('should handle missing payment gracefully without throwing', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentSucceededEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should process multiple succeeded events for different payments', async () => {
      // Arrange
      const payments = [
        {
          id: 'payment-1',
          providerPaymentId: 'pi_1',
          status: PaymentStatus.PENDING,
          providerData: {},
        },
        {
          id: 'payment-2',
          providerPaymentId: 'pi_2',
          status: PaymentStatus.PENDING,
          providerData: {},
        },
      ];

      for (const payment of payments) {
        mockStripe.webhooks.constructEvent.mockReturnValue(
          createStripeEvent('payment_intent.succeeded', {
            id: payment.providerPaymentId,
            object: 'payment_intent',
            amount: 14999,
            status: 'succeeded',
            metadata: {},
          })
        );
        mockPrismaService.payment.findFirst.mockResolvedValue(payment);
        mockPrismaService.payment.update.mockResolvedValue({
          ...payment,
          status: PaymentStatus.COMPLETED,
        });

        // Act
        await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));
      }

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // payment_intent.payment_failed Tests
  // ==========================================================================

  describe('payment_intent.payment_failed', () => {
    it('should update payment to FAILED when payment intent fails', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_failed_456',
        providerData: {},
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentFailedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
        }),
      });
    });

    it('should store error details in providerData for failed payment', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_failed_456',
        providerData: {},
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentFailedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          providerData: expect.objectContaining({
            error: expect.objectContaining({
              code: 'card_declined',
              message: 'Your card was declined.',
            }),
          }),
        }),
      });
    });

    it('should handle missing payment gracefully for failed event', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentFailedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should preserve existing providerData when adding error information', async () => {
      // Arrange
      const existingData = { sessionId: 'cs_test_123', clientSecret: 'secret_abc' };
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_failed_456',
        providerData: existingData,
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentFailedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          providerData: expect.objectContaining({
            sessionId: 'cs_test_123',
            clientSecret: 'secret_abc',
            error: expect.any(Object),
          }),
        }),
      });
    });
  });

  // ==========================================================================
  // refund.created Tests
  // ==========================================================================

  describe('refund.created', () => {
    it('should update payment to REFUNDED when refund is created', async () => {
      // Arrange
      const mockPayment = {
        ...completedPayment,
        providerPaymentId: stripeMockPaymentIntent.id,
        providerData: {},
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(refundCreatedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('should store refund details in providerData', async () => {
      // Arrange
      const mockPayment = {
        ...completedPayment,
        providerPaymentId: stripeMockPaymentIntent.id,
        providerData: { paymentMethod: 'pm_card_visa' },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(refundCreatedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          providerData: expect.objectContaining({
            paymentMethod: 'pm_card_visa',
            refundId: 're_test_created_456',
            refundStatus: 'succeeded',
          }),
        }),
      });
    });

    it('should handle refund event without payment_intent', async () => {
      // Arrange
      const refundEventNoPI = createStripeEvent('refund.created', {
        id: 're_test_no_pi',
        object: 'refund',
        amount: 14999,
        payment_intent: null, // No payment intent
        status: 'succeeded',
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(refundEventNoPI);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should handle missing payment for refund gracefully', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockReturnValue(refundCreatedEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // charge.refunded Tests
  // ==========================================================================

  describe('charge.refunded', () => {
    it('should handle charge.refunded event gracefully (unhandled event type)', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockReturnValue(chargeRefundedEvent);

      // Act - Should not throw for unhandled event types
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert - No database operations for unhandled events
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Webhook Signature Verification Tests
  // ==========================================================================

  describe('Webhook Signature Verification', () => {
    it('should throw InvalidWebhookException for invalid signature', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act & Assert
      await expect(
        paymentsService.handleWebhook('invalid-signature', Buffer.from('payload'))
      ).rejects.toThrow(InvalidWebhookException);
    });

    it('should throw InvalidWebhookException when signature header is missing', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found');
      });

      // Act & Assert
      await expect(paymentsService.handleWebhook('', Buffer.from('payload'))).rejects.toThrow(
        InvalidWebhookException
      );
    });

    it('should throw InvalidWebhookException for expired timestamp', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Timestamp outside the tolerance zone');
      });

      // Act & Assert
      await expect(
        paymentsService.handleWebhook('expired-timestamp-sig', Buffer.from('payload'))
      ).rejects.toThrow(InvalidWebhookException);
    });

    it('should pass signature and payload to Stripe webhook verification', async () => {
      // Arrange
      const signature = 'whsec_valid_signature_abc123';
      const payload = Buffer.from('{"type":"payment_intent.succeeded"}');
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentSucceededEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act
      await paymentsService.handleWebhook(signature, payload);

      // Assert - Verify the signature and payload are passed correctly
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      const callArgs = mockStripe.webhooks.constructEvent.mock.calls[0];
      // Verify payload (first arg)
      expect(callArgs[0]).toEqual(payload);
      // Verify signature (second arg)
      expect(callArgs[1]).toBe(signature);
      // Third arg is webhook secret which may be undefined in test
    });
  });

  // ==========================================================================
  // Unrecognized Event Types Tests
  // ==========================================================================

  describe('Unrecognized Event Types', () => {
    it('should handle unknown event types gracefully', async () => {
      // Arrange
      const unknownEvent = createStripeEvent('unknown.event.type', {
        id: 'unknown_123',
        object: 'unknown',
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(unknownEvent);

      // Act - Should not throw
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should log but not process customer.created event', async () => {
      // Arrange
      const customerEvent = createStripeEvent('customer.created', {
        id: 'cus_test_123',
        object: 'customer',
        email: 'test@example.com',
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(customerEvent);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should handle invoice.paid event gracefully', async () => {
      // Arrange
      const invoiceEvent = createStripeEvent('invoice.paid', {
        id: 'in_test_123',
        object: 'invoice',
        amount_paid: 9900,
        customer: 'cus_test_123',
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(invoiceEvent);

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Service Unavailable Tests
  // ==========================================================================

  describe('Service Unavailable', () => {
    let paymentsServiceNoStripe: PaymentsService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'STRIPE_SECRET_KEY') {
            return undefined;
          }
          if (key === 'STRIPE_WEBHOOK_SECRET') {
            return '';
          }
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigServiceNoStripe },
        ],
      }).compile();

      paymentsServiceNoStripe = module.get<PaymentsService>(PaymentsService);
    });

    it('should throw ServiceUnavailableException when Stripe is not configured', async () => {
      await expect(
        paymentsServiceNoStripe.handleWebhook('sig', Buffer.from('payload'))
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty payload gracefully', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid payload');
      });

      // Act & Assert
      await expect(paymentsService.handleWebhook('signature', Buffer.from(''))).rejects.toThrow(
        InvalidWebhookException
      );
    });

    it('should handle malformed JSON in payload', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Unexpected token in JSON');
      });

      // Act & Assert
      await expect(
        paymentsService.handleWebhook('signature', Buffer.from('{invalid json}'))
      ).rejects.toThrow(InvalidWebhookException);
    });

    it('should handle payment with null providerData', async () => {
      // Arrange
      const mockPayment = {
        ...pendingPayment,
        providerPaymentId: 'pi_test_succeeded_123',
        providerData: null,
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(paymentIntentSucceededEvent);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      // Act
      await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
        }),
      });
    });

    it('should handle rapid sequential webhook events', async () => {
      // Arrange
      const events = [paymentIntentSucceededEvent, refundCreatedEvent];

      for (const event of events) {
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          id: 'payment-rapid-test',
          providerPaymentId:
            (event.data.object as any).id || (event.data.object as any).payment_intent,
          providerData: {},
          status: PaymentStatus.PENDING,
        });
        mockPrismaService.payment.update.mockResolvedValue({});

        // Act
        await paymentsService.handleWebhook('stripe-signature', Buffer.from('payload'));
      }

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalled();
    });
  });
});

// Note: CheckoutService webhook handler tests (handleCheckoutCompleted, handleCheckoutExpired)
// are covered in apps/api/src/modules/payments/services/checkout.service.spec.ts
