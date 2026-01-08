/**
 * Payments Service Unit Tests
 *
 * Comprehensive tests for Stripe payment processing including:
 * - Payment intent creation
 * - Webhook handling
 * - Refund processing
 * - Payment status management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import {
  regularUser,
  pendingPayment,
  completedPayment,
  refundedPayment,
  stripeMockPaymentIntent,
  stripeWebhookPayloads,
} from '../../test/fixtures';

// Custom exceptions used by the service
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

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let mockStripe: any;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      };
      return key in config ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance
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

    // Inject mock stripe instance directly
    (paymentsService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // Create Payment Intent Tests
  // ==========================================================================

  describe('createPaymentIntent', () => {
    const validPaymentDto: CreatePaymentDto = {
      userId: regularUser.id,
      amount: 149.99,
      currency: 'eur',
      description: 'Ticket purchase',
      metadata: { ticketCategoryId: 'category-123' },
    };

    it('should create payment intent successfully', async () => {
      // Arrange
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 14999,
        currency: 'eur',
        status: 'requires_payment_method',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-id-123',
        userId: validPaymentDto.userId,
        amount: validPaymentDto.amount,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'pi_test_123',
        providerData: { clientSecret: 'pi_test_123_secret_abc' },
        description: validPaymentDto.description,
        metadata: validPaymentDto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await paymentsService.createPaymentIntent(validPaymentDto);

      // Assert
      expect(result.paymentId).toBe('payment-id-123');
      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.amount).toBe(validPaymentDto.amount);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 14999,
          currency: 'eur',
          metadata: expect.objectContaining({
            userId: validPaymentDto.userId,
          }),
        }),
      );
    });

    it('should throw ValidationException for zero amount', async () => {
      await expect(
        paymentsService.createPaymentIntent({
          ...validPaymentDto,
          amount: 0,
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException for negative amount', async () => {
      await expect(
        paymentsService.createPaymentIntent({
          ...validPaymentDto,
          amount: -50,
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException with correct validation error details', async () => {
      try {
        await paymentsService.createPaymentIntent({
          ...validPaymentDto,
          amount: -100,
        });
        fail('Expected ValidationException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(validationError.validationErrors).toBeDefined();
        expect(validationError.validationErrors?.[0].field).toBe('amount');
      }
    });

    it('should use EUR as default currency', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 14999,
        currency: 'eur',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-id-123',
        userId: validPaymentDto.userId,
        amount: 149.99,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'pi_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await paymentsService.createPaymentIntent({
        userId: regularUser.id,
        amount: 149.99,
      });

      expect(result.currency).toBe('EUR');
    });

    it('should convert amount to cents correctly', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 9999,
        currency: 'eur',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-id-123',
        userId: regularUser.id,
        amount: 99.99,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'pi_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await paymentsService.createPaymentIntent({
        userId: regularUser.id,
        amount: 99.99,
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9999,
        }),
      );
    });

    it('should handle decimal rounding correctly', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 1050,
        currency: 'eur',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-id-123',
        userId: regularUser.id,
        amount: 10.499,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'pi_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await paymentsService.createPaymentIntent({
        userId: regularUser.id,
        amount: 10.499,
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1050,
        }),
      );
    });

    it('should throw PaymentFailedException on Stripe error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe error'));

      await expect(paymentsService.createPaymentIntent(validPaymentDto)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('should include metadata in payment intent', async () => {
      const customMetadata = { ticketId: 'ticket-123', festivalId: 'festival-456' };
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 14999,
        currency: 'eur',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-id-123',
        userId: validPaymentDto.userId,
        amount: 149.99,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: 'pi_test_123',
        metadata: customMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await paymentsService.createPaymentIntent({
        ...validPaymentDto,
        metadata: customMetadata,
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            ...customMetadata,
            userId: validPaymentDto.userId,
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Webhook Handling Tests
  // ==========================================================================

  describe('handleWebhook', () => {
    describe('payment_intent.succeeded', () => {
      it('should process payment_intent.succeeded event and update payment to COMPLETED', async () => {
        const event = stripeWebhookPayloads.paymentIntentSucceeded;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          ...completedPayment,
          providerPaymentId: stripeMockPaymentIntent.id,
          providerData: {},
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...completedPayment,
          status: PaymentStatus.COMPLETED,
        });

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
          where: { id: completedPayment.id },
          data: expect.objectContaining({
            status: PaymentStatus.COMPLETED,
            paidAt: expect.any(Date),
          }),
        });
      });

      it('should handle missing payment gracefully for succeeded event', async () => {
        const event = stripeWebhookPayloads.paymentIntentSucceeded;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue(null);

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      });
    });

    describe('payment_intent.payment_failed', () => {
      it('should process payment_intent.payment_failed event and update payment to FAILED', async () => {
        const event = stripeWebhookPayloads.paymentIntentFailed;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          ...pendingPayment,
          providerPaymentId: 'pi_test_failed_87654321',
          providerData: {},
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...pendingPayment,
          status: PaymentStatus.FAILED,
        });

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
          where: { id: pendingPayment.id },
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
          }),
        });
      });

      it('should store error information for failed payments', async () => {
        const event = stripeWebhookPayloads.paymentIntentFailed;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          ...pendingPayment,
          providerPaymentId: 'pi_test_failed_87654321',
          providerData: {},
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...pendingPayment,
          status: PaymentStatus.FAILED,
        });

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
          where: { id: pendingPayment.id },
          data: expect.objectContaining({
            providerData: expect.objectContaining({
              error: expect.any(Object),
            }),
          }),
        });
      });
    });

    describe('refund.created', () => {
      it('should process refund.created event and update payment to REFUNDED', async () => {
        const event = stripeWebhookPayloads.refundCreated;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          ...completedPayment,
          providerPaymentId: stripeMockPaymentIntent.id,
          providerData: {},
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...completedPayment,
          status: PaymentStatus.REFUNDED,
        });

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
          where: { id: completedPayment.id },
          data: expect.objectContaining({
            status: PaymentStatus.REFUNDED,
            refundedAt: expect.any(Date),
          }),
        });
      });

      it('should store refund information in providerData', async () => {
        const event = stripeWebhookPayloads.refundCreated;
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        mockPrismaService.payment.findFirst.mockResolvedValue({
          ...completedPayment,
          providerPaymentId: stripeMockPaymentIntent.id,
          providerData: { existingData: 'value' },
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...completedPayment,
          status: PaymentStatus.REFUNDED,
        });

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
          where: { id: completedPayment.id },
          data: expect.objectContaining({
            providerData: expect.objectContaining({
              existingData: 'value',
              refundId: expect.any(String),
              refundStatus: expect.any(String),
            }),
          }),
        });
      });
    });

    describe('webhook signature validation', () => {
      it('should throw InvalidWebhookException for invalid signature', async () => {
        mockStripe.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await expect(
          paymentsService.handleWebhook('invalid_sig', Buffer.from('payload')),
        ).rejects.toThrow(InvalidWebhookException);
      });

      it('should handle unrecognized event types gracefully', async () => {
        const event = {
          type: 'unknown.event.type',
          data: { object: {} },
        };
        mockStripe.webhooks.constructEvent.mockReturnValue(event);

        await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

        expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Refund Payment Tests
  // ==========================================================================

  describe('refundPayment', () => {
    it('should process full refund successfully', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_refund_123',
        status: 'succeeded',
        amount: 14999,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      });

      const result = await paymentsService.refundPayment(
        completedPayment.id,
        'Customer request',
      );

      expect(result.paymentId).toBe(completedPayment.id);
      expect(result.refundId).toBe('re_test_refund_123');
      expect(result.status).toBe('succeeded');
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: completedPayment.providerPaymentId,
        }),
      );
    });

    it('should update payment status to REFUNDED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_refund_123',
        status: 'succeeded',
        amount: 14999,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      });

      await paymentsService.refundPayment(completedPayment.id);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: completedPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(paymentsService.refundPayment('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw AlreadyRefundedException for already refunded payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(refundedPayment);

      await expect(paymentsService.refundPayment(refundedPayment.id)).rejects.toThrow(
        AlreadyRefundedException,
      );
    });

    it('should throw RefundFailedException for non-completed payment (pending)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      await expect(paymentsService.refundPayment(pendingPayment.id)).rejects.toThrow(
        RefundFailedException,
      );
    });

    it('should throw RefundFailedException if no provider payment ID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: null,
      });

      await expect(paymentsService.refundPayment(completedPayment.id)).rejects.toThrow(
        RefundFailedException,
      );
    });

    it('should throw RefundFailedException on Stripe error', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripe.refunds.create.mockRejectedValue(new Error('Stripe error'));

      await expect(paymentsService.refundPayment(completedPayment.id)).rejects.toThrow(
        RefundFailedException,
      );
    });

    it('should include reason in refund metadata', async () => {
      const refundReason = 'Event cancelled by organizer';
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_refund_123',
        status: 'succeeded',
        amount: 14999,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });

      await paymentsService.refundPayment(completedPayment.id, refundReason);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: refundReason,
          }),
        }),
      );
    });

    it('should return correct amount in refund result', async () => {
      const paymentAmount = 299.99;
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        amount: paymentAmount,
        providerData: {},
      });
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_refund_123',
        status: 'succeeded',
        amount: 29999,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        amount: paymentAmount,
        status: PaymentStatus.REFUNDED,
      });

      const result = await paymentsService.refundPayment(completedPayment.id);

      expect(result.amount).toBe(paymentAmount);
    });
  });

  // ==========================================================================
  // Get Payment Tests
  // ==========================================================================

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      const result = await paymentsService.getPayment(completedPayment.id);

      expect(result.id).toBe(completedPayment.id);
      expect(result.status).toBe(completedPayment.status);
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(paymentsService.getPayment('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should map all payment fields correctly', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      const result = await paymentsService.getPayment(completedPayment.id);

      expect(result).toMatchObject({
        id: completedPayment.id,
        userId: completedPayment.userId,
        amount: Number(completedPayment.amount),
        currency: completedPayment.currency,
        status: completedPayment.status,
        provider: completedPayment.provider,
        providerPaymentId: completedPayment.providerPaymentId,
      });
    });
  });

  // ==========================================================================
  // Get User Payments (Payment History) Tests
  // ==========================================================================

  describe('getUserPayments', () => {
    it('should return user payment history', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([
        completedPayment,
        pendingPayment,
      ]);

      const result = await paymentsService.getUserPayments(regularUser.id);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: regularUser.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply pagination parameters', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      await paymentsService.getUserPayments(regularUser.id, 20, 10);

      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      await paymentsService.getUserPayments(regularUser.id);

      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should return empty array for user with no payments', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await paymentsService.getUserPayments('user-no-payments');

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should order payments by createdAt descending', async () => {
      const olderPayment = { ...completedPayment, createdAt: new Date('2024-01-01') };
      const newerPayment = { ...pendingPayment, createdAt: new Date('2024-03-01') };
      mockPrismaService.payment.findMany.mockResolvedValue([newerPayment, olderPayment]);

      await paymentsService.getUserPayments(regularUser.id);

      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ==========================================================================
  // Get Payment By Provider ID Tests
  // ==========================================================================

  describe('getPaymentByProviderId', () => {
    it('should return payment by provider ID', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(completedPayment);

      const result = await paymentsService.getPaymentByProviderId(
        completedPayment.providerPaymentId!,
      );

      expect(result?.id).toBe(completedPayment.id);
    });

    it('should return null if not found', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const result = await paymentsService.getPaymentByProviderId('non-existent');

      expect(result).toBeNull();
    });

    it('should search by providerPaymentId field', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(completedPayment);

      await paymentsService.getPaymentByProviderId('pi_test_123');

      expect(mockPrismaService.payment.findFirst).toHaveBeenCalledWith({
        where: { providerPaymentId: 'pi_test_123' },
      });
    });
  });

  // ==========================================================================
  // Cancel Payment Tests
  // ==========================================================================

  describe('cancelPayment', () => {
    it('should cancel pending payment successfully', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      mockStripe.paymentIntents.cancel.mockResolvedValue({});
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.CANCELLED,
      });

      const result = await paymentsService.cancelPayment(pendingPayment.id);

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(
        pendingPayment.providerPaymentId,
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(paymentsService.cancelPayment('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw PaymentFailedException for non-pending payment (completed)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      await expect(paymentsService.cancelPayment(completedPayment.id)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('should throw PaymentFailedException for non-pending payment (refunded)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(refundedPayment);

      await expect(paymentsService.cancelPayment(refundedPayment.id)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('should still cancel in DB even if Stripe call fails', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      mockStripe.paymentIntents.cancel.mockRejectedValue(new Error('Stripe error'));
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.CANCELLED,
      });

      const result = await paymentsService.cancelPayment(pendingPayment.id);

      expect(result.status).toBe(PaymentStatus.CANCELLED);
    });

    it('should handle payment without provider payment ID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...pendingPayment,
        providerPaymentId: null,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        providerPaymentId: null,
        status: PaymentStatus.CANCELLED,
      });

      const result = await paymentsService.cancelPayment(pendingPayment.id);

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockStripe.paymentIntents.cancel).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Service Unavailable Tests
  // ==========================================================================

  describe('Stripe service unavailable', () => {
    let paymentsServiceNoStripe: PaymentsService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'STRIPE_SECRET_KEY') {return undefined;}
          if (key === 'STRIPE_WEBHOOK_SECRET') {return '';}
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

    it('should throw ServiceUnavailableException when creating payment intent without Stripe', async () => {
      await expect(
        paymentsServiceNoStripe.createPaymentIntent({
          userId: regularUser.id,
          amount: 100,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when handling webhook without Stripe', async () => {
      await expect(
        paymentsServiceNoStripe.handleWebhook('sig', Buffer.from('payload')),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when refunding without Stripe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      await expect(
        paymentsServiceNoStripe.refundPayment(completedPayment.id),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
