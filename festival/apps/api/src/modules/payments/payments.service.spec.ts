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
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import {
  regularUser,
  pendingPayment,
  completedPayment,
  failedPayment,
  refundedPayment,
  stripeMockPaymentIntent,
  stripeWebhookPayloads,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Stripe
const mockStripePaymentIntents = {
  create: jest.fn(),
  cancel: jest.fn(),
};

const mockStripeRefunds = {
  create: jest.fn(),
};

const mockStripeWebhooks = {
  constructEvent: jest.fn(),
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: mockStripePaymentIntents,
    refunds: mockStripeRefunds,
    webhooks: mockStripeWebhooks,
  }));
});

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

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
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    // Inject the mock Stripe instance directly into the service
    (paymentsService as any).stripe = {
      paymentIntents: mockStripePaymentIntents,
      refunds: mockStripeRefunds,
      webhooks: mockStripeWebhooks,
    };
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
      mockStripePaymentIntents.create.mockResolvedValue({
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
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 14999, // Converted to cents
          currency: 'eur',
          metadata: expect.objectContaining({
            userId: validPaymentDto.userId,
          }),
        }),
      );
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      // Act & Assert
      await expect(paymentsService.createPaymentIntent({
        ...validPaymentDto,
        amount: 0,
      })).rejects.toThrow(BadRequestException);

      await expect(paymentsService.createPaymentIntent({
        ...validPaymentDto,
        amount: -50,
      })).rejects.toThrow(BadRequestException);
    });

    it('should use EUR as default currency', async () => {
      // Arrange
      mockStripePaymentIntents.create.mockResolvedValue({
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

      // Act
      const result = await paymentsService.createPaymentIntent({
        userId: regularUser.id,
        amount: 149.99,
        // No currency specified
      });

      // Assert
      expect(result.currency).toBe('EUR');
    });

    it('should throw InternalServerErrorException on Stripe error', async () => {
      // Arrange
      mockStripePaymentIntents.create.mockRejectedValue(new Error('Stripe error'));

      // Act & Assert
      await expect(paymentsService.createPaymentIntent(validPaymentDto))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  // ==========================================================================
  // Webhook Handling Tests
  // ==========================================================================

  describe('handleWebhook', () => {
    it('should process payment_intent.succeeded event', async () => {
      // Arrange
      const event = stripeWebhookPayloads.paymentIntentSucceeded;
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: stripeMockPaymentIntent.id,
        providerData: {},
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.COMPLETED,
      });

      // Act
      await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: completedPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          paidAt: expect.any(Date),
        }),
      });
    });

    it('should process payment_intent.payment_failed event', async () => {
      // Arrange
      const event = stripeWebhookPayloads.paymentIntentFailed;
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...pendingPayment,
        providerPaymentId: 'pi_test_failed_87654321',
        providerData: {},
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.FAILED,
      });

      // Act
      await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: pendingPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
        }),
      });
    });

    it('should process refund.created event', async () => {
      // Arrange
      const event = stripeWebhookPayloads.refundCreated;
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: stripeMockPaymentIntent.id,
        providerData: {},
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });

      // Act
      await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: completedPayment.id },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('should throw BadRequestException for invalid signature', async () => {
      // Arrange
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act & Assert
      await expect(paymentsService.handleWebhook('invalid_sig', Buffer.from('payload')))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle unrecognized event types gracefully', async () => {
      // Arrange
      const event = {
        type: 'unknown.event.type',
        data: { object: {} },
      };
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      // Act - should not throw
      await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should handle missing payment gracefully for succeeded event', async () => {
      // Arrange
      const event = stripeWebhookPayloads.paymentIntentSucceeded;
      mockStripeWebhooks.constructEvent.mockReturnValue(event);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act - should not throw
      await paymentsService.handleWebhook('sig_test', Buffer.from('payload'));

      // Assert
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Refund Payment Tests
  // ==========================================================================

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_test_refund_123',
        status: 'succeeded',
        amount: 14999,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      });

      // Act
      const result = await paymentsService.refundPayment(completedPayment.id, 'Customer request');

      // Assert
      expect(result.paymentId).toBe(completedPayment.id);
      expect(result.refundId).toBe('re_test_refund_123');
      expect(result.status).toBe('succeeded');
      expect(mockStripeRefunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: completedPayment.providerPaymentId,
        }),
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentsService.refundPayment('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-completed payment', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      // Act & Assert
      await expect(paymentsService.refundPayment(pendingPayment.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already refunded payment', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(refundedPayment);

      // Act & Assert
      await expect(paymentsService.refundPayment(refundedPayment.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no provider payment ID', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: null,
      });

      // Act & Assert
      await expect(paymentsService.refundPayment(completedPayment.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on Stripe error', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerData: {},
      });
      mockStripeRefunds.create.mockRejectedValue(new Error('Stripe error'));

      // Act & Assert
      await expect(paymentsService.refundPayment(completedPayment.id))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  // ==========================================================================
  // Get Payment Tests
  // ==========================================================================

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      // Act
      const result = await paymentsService.getPayment(completedPayment.id);

      // Assert
      expect(result.id).toBe(completedPayment.id);
      expect(result.status).toBe(completedPayment.status);
    });

    it('should throw NotFoundException if payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentsService.getPayment('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Get User Payments Tests
  // ==========================================================================

  describe('getUserPayments', () => {
    it('should return user payment history', async () => {
      // Arrange
      mockPrismaService.payment.findMany.mockResolvedValue([
        completedPayment,
        pendingPayment,
      ]);

      // Act
      const result = await paymentsService.getUserPayments(regularUser.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: regularUser.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      // Act
      await paymentsService.getUserPayments(regularUser.id, 20, 10);

      // Assert
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        }),
      );
    });
  });

  // ==========================================================================
  // Get Payment By Provider ID Tests
  // ==========================================================================

  describe('getPaymentByProviderId', () => {
    it('should return payment by provider ID', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue(completedPayment);

      // Act
      const result = await paymentsService.getPaymentByProviderId(completedPayment.providerPaymentId!);

      // Assert
      expect(result?.id).toBe(completedPayment.id);
    });

    it('should return null if not found', async () => {
      // Arrange
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      // Act
      const result = await paymentsService.getPaymentByProviderId('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Cancel Payment Tests
  // ==========================================================================

  describe('cancelPayment', () => {
    it('should cancel pending payment', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      mockStripePaymentIntents.cancel.mockResolvedValue({});
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.CANCELLED,
      });

      // Act
      const result = await paymentsService.cancelPayment(pendingPayment.id);

      // Assert
      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockStripePaymentIntents.cancel).toHaveBeenCalledWith(
        pendingPayment.providerPaymentId,
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentsService.cancelPayment('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending payment', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      // Act & Assert
      await expect(paymentsService.cancelPayment(completedPayment.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should cancel even if Stripe call fails', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);
      mockStripePaymentIntents.cancel.mockRejectedValue(new Error('Stripe error'));
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.CANCELLED,
      });

      // Act
      const result = await paymentsService.cancelPayment(pendingPayment.id);

      // Assert - should still cancel in DB
      expect(result.status).toBe(PaymentStatus.CANCELLED);
    });

    it('should handle payment without provider payment ID', async () => {
      // Arrange
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...pendingPayment,
        providerPaymentId: null,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...pendingPayment,
        providerPaymentId: null,
        status: PaymentStatus.CANCELLED,
      });

      // Act
      const result = await paymentsService.cancelPayment(pendingPayment.id);

      // Assert
      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockStripePaymentIntents.cancel).not.toHaveBeenCalled();
    });
  });
});
