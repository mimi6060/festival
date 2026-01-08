/**
 * Payments Controller Unit Tests
 *
 * Tests for REST API endpoints:
 * - POST /payments/intent - Create payment intent
 * - POST /payments/webhook - Handle Stripe webhooks
 * - GET /payments/user/:userId - Get user payment history
 * - GET /payments/:paymentId - Get payment by ID
 * - POST /payments/:paymentId/cancel - Cancel payment
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CheckoutService } from './services/checkout.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { SubscriptionService } from './services/subscription.service';
import { RefundService } from './services/refund.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import {
  regularUser,
  completedPayment,
  pendingPayment,
  refundedPayment,
} from '../../test/fixtures';

// Custom exceptions
import {
  NotFoundException,
  ValidationException,
  ServiceUnavailableException,
} from '../../common/exceptions/base.exception';
import {
  PaymentFailedException,
  InvalidWebhookException,
  _AlreadyRefundedException,
} from '../../common/exceptions/business.exception';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let _paymentsService: jest.Mocked<PaymentsService>;
  let _checkoutService: jest.Mocked<CheckoutService>;
  let _refundService: jest.Mocked<RefundService>;

  const mockPaymentsService = {
    createPaymentIntent: jest.fn(),
    handleWebhook: jest.fn(),
    getPayment: jest.fn(),
    getUserPayments: jest.fn(),
    cancelPayment: jest.fn(),
    refundPayment: jest.fn(),
    getPaymentByProviderId: jest.fn(),
  };

  const mockCheckoutService = {
    createCheckoutSession: jest.fn(),
    getCheckoutSession: jest.fn(),
    expireCheckoutSession: jest.fn(),
    createTicketCheckout: jest.fn(),
    createCashlessTopupCheckout: jest.fn(),
  };

  const mockStripeConnectService = {
    createConnectAccount: jest.fn(),
    createAccountLink: jest.fn(),
    getAccount: jest.fn(),
    getAccountBalance: jest.fn(),
    createTransfer: jest.fn(),
    createPayout: jest.fn(),
  };

  const mockSubscriptionService = {
    createProduct: jest.fn(),
    createPrice: jest.fn(),
    listProducts: jest.fn(),
    listPrices: jest.fn(),
    createSubscription: jest.fn(),
    getSubscription: jest.fn(),
    listUserSubscriptions: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    listUserInvoices: jest.fn(),
  };

  const mockRefundService = {
    createRefund: jest.fn(),
    createPartialRefund: jest.fn(),
    createBulkRefund: jest.fn(),
    checkRefundEligibility: jest.fn(),
    getRefundHistory: jest.fn(),
    getRefund: jest.fn(),
    cancelRefund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: CheckoutService, useValue: mockCheckoutService },
        { provide: StripeConnectService, useValue: mockStripeConnectService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: RefundService, useValue: mockRefundService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    checkoutService = module.get(CheckoutService);
    refundService = module.get(RefundService);
  });

  // ==========================================================================
  // POST /payments/intent - Create Payment Intent
  // ==========================================================================

  describe('POST /payments/intent - createPaymentIntent', () => {
    const createIntentDto = {
      userId: regularUser.id,
      amount: 149.99,
      currency: 'eur',
      description: 'Ticket purchase',
      metadata: { ticketId: 'ticket-123' },
    };

    it('should create payment intent successfully', async () => {
      // Arrange
      const expectedResult = {
        paymentId: 'payment-id-123',
        clientSecret: 'pi_test_123_secret_abc',
        amount: 149.99,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
      };
      mockPaymentsService.createPaymentIntent.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createPaymentIntent(createIntentDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(createIntentDto);
    });

    it('should propagate ValidationException for invalid amount', async () => {
      // Arrange
      mockPaymentsService.createPaymentIntent.mockRejectedValue(
        new ValidationException('Amount must be positive', [
          { field: 'amount', message: 'Amount must be positive', value: 0 },
        ]),
      );

      // Act & Assert
      await expect(
        controller.createPaymentIntent({ ...createIntentDto, amount: 0 }),
      ).rejects.toThrow(ValidationException);
    });

    it('should propagate ServiceUnavailableException when Stripe is not configured', async () => {
      // Arrange
      mockPaymentsService.createPaymentIntent.mockRejectedValue(
        new ServiceUnavailableException('Stripe'),
      );

      // Act & Assert
      await expect(controller.createPaymentIntent(createIntentDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should propagate PaymentFailedException on Stripe error', async () => {
      // Arrange
      mockPaymentsService.createPaymentIntent.mockRejectedValue(
        new PaymentFailedException('Failed to create payment intent'),
      );

      // Act & Assert
      await expect(controller.createPaymentIntent(createIntentDto)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('should handle payment intent creation with minimal params', async () => {
      // Arrange
      const minimalDto = {
        userId: regularUser.id,
        amount: 50,
      };
      const expectedResult = {
        paymentId: 'payment-id-123',
        clientSecret: 'pi_test_123_secret_abc',
        amount: 50,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
      };
      mockPaymentsService.createPaymentIntent.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createPaymentIntent(minimalDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(minimalDto);
    });
  });

  // ==========================================================================
  // POST /payments/webhook - Handle Stripe Webhook
  // ==========================================================================

  describe('POST /payments/webhook - handleWebhook', () => {
    const mockRequest = {
      rawBody: Buffer.from('test-payload'),
    };

    it('should process webhook successfully', async () => {
      // Arrange
      mockPaymentsService.handleWebhook.mockResolvedValue(undefined);

      // Act
      await controller.handleWebhook('stripe-sig-123', mockRequest);

      // Assert
      expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith(
        'stripe-sig-123',
        mockRequest.rawBody,
      );
    });

    it('should propagate InvalidWebhookException for invalid signature', async () => {
      // Arrange
      mockPaymentsService.handleWebhook.mockRejectedValue(
        new InvalidWebhookException('Invalid webhook signature'),
      );

      // Act & Assert
      await expect(
        controller.handleWebhook('invalid-sig', mockRequest),
      ).rejects.toThrow(InvalidWebhookException);
    });

    it('should propagate ServiceUnavailableException when Stripe is not configured', async () => {
      // Arrange
      mockPaymentsService.handleWebhook.mockRejectedValue(
        new ServiceUnavailableException('Stripe'),
      );

      // Act & Assert
      await expect(
        controller.handleWebhook('stripe-sig-123', mockRequest),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw error when rawBody is not available', async () => {
      // Arrange
      const requestWithoutBody = { rawBody: undefined };

      // Act & Assert
      await expect(
        controller.handleWebhook('stripe-sig-123', requestWithoutBody),
      ).rejects.toThrow('Raw body not available');
    });

    it('should handle payment_intent.succeeded webhook', async () => {
      // Arrange
      mockPaymentsService.handleWebhook.mockResolvedValue(undefined);

      // Act
      await controller.handleWebhook('stripe-sig-succeeded', mockRequest);

      // Assert
      expect(mockPaymentsService.handleWebhook).toHaveBeenCalled();
    });

    it('should handle payment_intent.failed webhook', async () => {
      // Arrange
      mockPaymentsService.handleWebhook.mockResolvedValue(undefined);

      // Act
      await controller.handleWebhook('stripe-sig-failed', mockRequest);

      // Assert
      expect(mockPaymentsService.handleWebhook).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /payments/user/:userId - Get Payment History
  // ==========================================================================

  describe('GET /payments/user/:userId - getUserPayments', () => {
    it('should return user payment history', async () => {
      // Arrange
      const payments = [
        { ...completedPayment, amount: Number(completedPayment.amount) },
        { ...pendingPayment, amount: Number(pendingPayment.amount) },
      ];
      mockPaymentsService.getUserPayments.mockResolvedValue(payments);

      // Act
      const result = await controller.getUserPayments(regularUser.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPaymentsService.getUserPayments).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
        undefined,
      );
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      mockPaymentsService.getUserPayments.mockResolvedValue([]);

      // Act
      await controller.getUserPayments(regularUser.id, 20, 10);

      // Assert
      expect(mockPaymentsService.getUserPayments).toHaveBeenCalledWith(
        regularUser.id,
        20,
        10,
      );
    });

    it('should return empty array for user with no payments', async () => {
      // Arrange
      mockPaymentsService.getUserPayments.mockResolvedValue([]);

      // Act
      const result = await controller.getUserPayments('user-no-payments');

      // Assert
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle large offset values', async () => {
      // Arrange
      mockPaymentsService.getUserPayments.mockResolvedValue([]);

      // Act
      await controller.getUserPayments(regularUser.id, 10, 1000);

      // Assert
      expect(mockPaymentsService.getUserPayments).toHaveBeenCalledWith(
        regularUser.id,
        10,
        1000,
      );
    });
  });

  // ==========================================================================
  // GET /payments/:paymentId - Get Payment By ID
  // ==========================================================================

  describe('GET /payments/:paymentId - getPayment', () => {
    it('should return payment by ID', async () => {
      // Arrange
      const payment = { ...completedPayment, amount: Number(completedPayment.amount) };
      mockPaymentsService.getPayment.mockResolvedValue(payment);

      // Act
      const result = await controller.getPayment(completedPayment.id);

      // Assert
      expect(result.id).toBe(completedPayment.id);
      expect(result.status).toBe(completedPayment.status);
      expect(mockPaymentsService.getPayment).toHaveBeenCalledWith(completedPayment.id);
    });

    it('should propagate NotFoundException for non-existent payment', async () => {
      // Arrange
      mockPaymentsService.getPayment.mockRejectedValue(
        NotFoundException.payment('non-existent-id'),
      );

      // Act & Assert
      await expect(controller.getPayment('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return payment with all fields mapped', async () => {
      // Arrange
      const fullPayment = {
        id: completedPayment.id,
        userId: completedPayment.userId,
        amount: Number(completedPayment.amount),
        currency: completedPayment.currency,
        status: completedPayment.status,
        provider: completedPayment.provider,
        providerPaymentId: completedPayment.providerPaymentId,
        description: completedPayment.description,
        paidAt: completedPayment.paidAt,
        refundedAt: completedPayment.refundedAt,
        createdAt: completedPayment.createdAt,
        updatedAt: completedPayment.updatedAt,
      };
      mockPaymentsService.getPayment.mockResolvedValue(fullPayment);

      // Act
      const result = await controller.getPayment(completedPayment.id);

      // Assert
      expect(result).toMatchObject({
        id: completedPayment.id,
        status: PaymentStatus.COMPLETED,
        provider: PaymentProvider.STRIPE,
      });
    });
  });

  // ==========================================================================
  // POST /payments/:paymentId/cancel - Cancel Payment
  // ==========================================================================

  describe('POST /payments/:paymentId/cancel - cancelPayment', () => {
    it('should cancel pending payment successfully', async () => {
      // Arrange
      const cancelledPayment = {
        ...pendingPayment,
        amount: Number(pendingPayment.amount),
        status: PaymentStatus.CANCELLED,
      };
      mockPaymentsService.cancelPayment.mockResolvedValue(cancelledPayment);

      // Act
      const result = await controller.cancelPayment(pendingPayment.id);

      // Assert
      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockPaymentsService.cancelPayment).toHaveBeenCalledWith(pendingPayment.id);
    });

    it('should propagate NotFoundException for non-existent payment', async () => {
      // Arrange
      mockPaymentsService.cancelPayment.mockRejectedValue(
        NotFoundException.payment('non-existent-id'),
      );

      // Act & Assert
      await expect(controller.cancelPayment('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate PaymentFailedException for non-pending payment', async () => {
      // Arrange
      mockPaymentsService.cancelPayment.mockRejectedValue(
        new PaymentFailedException('Only pending payments can be cancelled'),
      );

      // Act & Assert
      await expect(controller.cancelPayment(completedPayment.id)).rejects.toThrow(
        PaymentFailedException,
      );
    });
  });

  // ==========================================================================
  // Checkout Endpoints
  // ==========================================================================

  describe('Checkout endpoints', () => {
    describe('POST /payments/checkout - createCheckoutSession', () => {
      it('should create checkout session successfully', async () => {
        // Arrange
        const dto = {
          userId: regularUser.id,
          lineItems: [{ name: 'Ticket', price: 5000, quantity: 1 }],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };
        const expectedResult = {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        };
        mockCheckoutService.createCheckoutSession.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createCheckoutSession(dto);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('GET /payments/checkout/:sessionId - getCheckoutSession', () => {
      it('should return checkout session status', async () => {
        // Arrange
        const expectedResult = {
          id: 'cs_test_123',
          status: 'complete',
          paymentStatus: 'paid',
        };
        mockCheckoutService.getCheckoutSession.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.getCheckoutSession('cs_test_123');

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('POST /payments/checkout/ticket - createTicketCheckout', () => {
      it('should create ticket checkout session', async () => {
        // Arrange
        const dto = {
          userId: regularUser.id,
          festivalId: 'festival-123',
          tickets: [
            { categoryId: 'cat-1', name: 'Standard', price: 50, quantity: 2 },
          ],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };
        const expectedResult = {
          sessionId: 'cs_test_ticket_123',
          url: 'https://checkout.stripe.com/pay/cs_test_ticket_123',
        };
        mockCheckoutService.createTicketCheckout.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createTicketCheckout(dto);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('POST /payments/checkout/cashless-topup - createCashlessTopupCheckout', () => {
      it('should create cashless topup checkout session', async () => {
        // Arrange
        const dto = {
          userId: regularUser.id,
          festivalId: 'festival-123',
          amount: 50,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };
        const expectedResult = {
          sessionId: 'cs_test_topup_123',
          url: 'https://checkout.stripe.com/pay/cs_test_topup_123',
        };
        mockCheckoutService.createCashlessTopupCheckout.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createCashlessTopupCheckout(dto);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });
  });

  // ==========================================================================
  // Refund Endpoints
  // ==========================================================================

  describe('Refund endpoints', () => {
    describe('POST /payments/refunds - createRefund', () => {
      it('should create refund successfully', async () => {
        // Arrange
        const dto = {
          paymentId: completedPayment.id,
          reason: 'REQUESTED_BY_CUSTOMER' as const,
        };
        const expectedResult = {
          refundId: completedPayment.id,
          stripeRefundId: 're_test_123',
          paymentId: completedPayment.id,
          amount: 14999,
          currency: 'eur',
          status: 'succeeded',
          reason: 'requested_by_customer',
          createdAt: new Date(),
        };
        mockRefundService.createRefund.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createRefund(dto);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('POST /payments/refunds/partial - createPartialRefund', () => {
      it('should create partial refund successfully', async () => {
        // Arrange
        const dto = {
          paymentId: completedPayment.id,
          amount: 5000, // Partial amount in cents
          reason: 'PARTIAL_ATTENDANCE' as const,
        };
        const expectedResult = {
          refundId: completedPayment.id,
          stripeRefundId: 're_test_partial_123',
          paymentId: completedPayment.id,
          amount: 5000,
          currency: 'eur',
          status: 'succeeded',
          reason: 'requested_by_customer',
          createdAt: new Date(),
        };
        mockRefundService.createPartialRefund.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createPartialRefund(dto);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('POST /payments/refunds/bulk - createBulkRefund', () => {
      it('should create bulk refunds for event cancellation', async () => {
        // Arrange
        const dto = {
          paymentIds: ['payment-1', 'payment-2', 'payment-3'],
          reason: 'EVENT_CANCELLED' as const,
          explanation: 'Festival cancelled due to weather',
        };
        const expectedResult = {
          totalRequested: 3,
          successCount: 3,
          failedCount: 0,
          totalAmountRefunded: 44997,
          results: [
            { paymentId: 'payment-1', success: true, refundId: 're_1', amount: 14999 },
            { paymentId: 'payment-2', success: true, refundId: 're_2', amount: 14999 },
            { paymentId: 'payment-3', success: true, refundId: 're_3', amount: 14999 },
          ],
        };
        mockRefundService.createBulkRefund.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.createBulkRefund(dto);

        // Assert
        expect(result.successCount).toBe(3);
        expect(result.failedCount).toBe(0);
      });
    });

    describe('GET /payments/refunds/eligibility/:paymentId - checkRefundEligibility', () => {
      it('should check refund eligibility', async () => {
        // Arrange
        const expectedResult = {
          eligible: true,
          maxRefundAmount: 14999,
          refundPercentage: 100,
          originalAmount: 14999,
          refundedAmount: 0,
          policy: {
            refundsAllowed: true,
            daysBeforeEventLimit: 7,
            fullRefundPercentage: 100,
            partialRefundPercentage: 50,
            minimumRefundAmount: 100,
            processingFeeRetained: 0,
            processingTimeDays: 5,
          },
        };
        mockRefundService.checkRefundEligibility.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.checkRefundEligibility(completedPayment.id);

        // Assert
        expect(result.eligible).toBe(true);
        expect(result.maxRefundAmount).toBe(14999);
      });

      it('should return ineligible for already refunded payment', async () => {
        // Arrange
        const expectedResult = {
          eligible: false,
          maxRefundAmount: 0,
          refundPercentage: 0,
          originalAmount: 14999,
          refundedAmount: 14999,
          ineligibilityReason: 'Payment has already been fully refunded',
          policy: {
            refundsAllowed: true,
            daysBeforeEventLimit: 7,
            fullRefundPercentage: 100,
            partialRefundPercentage: 50,
            minimumRefundAmount: 100,
            processingFeeRetained: 0,
            processingTimeDays: 5,
          },
        };
        mockRefundService.checkRefundEligibility.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.checkRefundEligibility(refundedPayment.id);

        // Assert
        expect(result.eligible).toBe(false);
        expect(result.ineligibilityReason).toContain('refunded');
      });
    });

    describe('GET /payments/refunds/history/:paymentId - getRefundHistory', () => {
      it('should return refund history', async () => {
        // Arrange
        const expectedResult = [
          {
            refundId: completedPayment.id,
            stripeRefundId: 're_test_123',
            paymentId: completedPayment.id,
            amount: 14999,
            currency: 'eur',
            status: 'succeeded',
            reason: 'requested_by_customer',
            createdAt: new Date(),
          },
        ];
        mockRefundService.getRefundHistory.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.getRefundHistory(completedPayment.id);

        // Assert
        expect(result).toHaveLength(1);
      });
    });

    describe('GET /payments/refunds/:refundId - getRefund', () => {
      it('should return refund by ID', async () => {
        // Arrange
        const expectedResult = {
          refundId: completedPayment.id,
          stripeRefundId: 're_test_123',
          paymentId: completedPayment.id,
          amount: 14999,
          currency: 'eur',
          status: 'succeeded',
          reason: 'requested_by_customer',
          createdAt: new Date(),
        };
        mockRefundService.getRefund.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.getRefund('re_test_123');

        // Assert
        expect(result.stripeRefundId).toBe('re_test_123');
      });
    });

    describe('POST /payments/refunds/:refundId/cancel - cancelRefund', () => {
      it('should cancel pending refund', async () => {
        // Arrange
        const expectedResult = {
          refundId: completedPayment.id,
          stripeRefundId: 're_test_123',
          paymentId: completedPayment.id,
          amount: 14999,
          currency: 'eur',
          status: 'canceled',
          reason: 'requested_by_customer',
          createdAt: new Date(),
        };
        mockRefundService.cancelRefund.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.cancelRefund('re_test_123');

        // Assert
        expect(result.status).toBe('canceled');
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      mockPaymentsService.getPayment.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(controller.getPayment('some-id')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should preserve error details from service exceptions', async () => {
      // Arrange
      const validationError = new ValidationException('Invalid input', [
        { field: 'amount', message: 'Amount must be positive' },
      ]);
      mockPaymentsService.createPaymentIntent.mockRejectedValue(validationError);

      // Act & Assert
      try {
        await controller.createPaymentIntent({ userId: 'test', amount: -100 });
        fail('Expected ValidationException');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const valError = error as ValidationException;
        expect(valError.validationErrors).toBeDefined();
      }
    });
  });
});
