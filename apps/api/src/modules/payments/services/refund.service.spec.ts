/**
 * Refund Service Unit Tests
 *
 * Comprehensive tests for refund management:
 * - Full and partial refunds
 * - Bulk refunds (event cancellation)
 * - Refund eligibility checking
 * - Refund policy enforcement
 * - Webhook handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefundService } from './refund.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RefundReason, RefundStatus } from '../dto/refund.dto';
import {
  regularUser,
  completedPayment,
  pendingPayment,
  refundedPayment,
  publishedFestival,
} from '../../../test/fixtures';
import Stripe from 'stripe';

describe('RefundService', () => {
  let refundService: RefundService;
  let mockStripe: any;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
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

  const mockStripeRefund: Partial<Stripe.Refund> = {
    id: 're_test_123',
    amount: 15000,
    currency: 'eur',
    status: 'succeeded',
    reason: 'requested_by_customer',
    created: Math.floor(Date.now() / 1000),
    metadata: {
      paymentId: completedPayment.id,
      reason: RefundReason.REQUESTED_BY_CUSTOMER,
    },
  };

  const mockPaymentWithTickets = {
    ...completedPayment,
    amount: 150,
    tickets: [
      {
        id: 'ticket-1',
        festival: {
          id: publishedFestival.id,
          startDate: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days from now
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance
    mockStripe = {
      refunds: {
        create: jest.fn().mockResolvedValue(mockStripeRefund),
        retrieve: jest.fn().mockResolvedValue(mockStripeRefund),
        list: jest.fn().mockResolvedValue({ data: [mockStripeRefund] }),
        cancel: jest.fn().mockResolvedValue({
          ...mockStripeRefund,
          status: 'canceled',
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    refundService = module.get<RefundService>(RefundService);

    // Inject mock stripe instance directly
    (refundService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // Create Refund Tests
  // ==========================================================================

  describe('createRefund', () => {
    const validDto = {
      paymentId: completedPayment.id,
      reason: RefundReason.REQUESTED_BY_CUSTOMER,
      explanation: 'Customer requested refund',
    };

    beforeEach(() => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPaymentWithTickets);
      mockStripe.refunds.list.mockResolvedValue({ data: [] }); // No prior refunds
    });

    it('should create full refund successfully', async () => {
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });

      const result = await refundService.createRefund(validDto);

      expect(result.stripeRefundId).toBe(mockStripeRefund.id);
      expect(result.amount).toBe(mockStripeRefund.amount);
      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: completedPayment.providerPaymentId,
          reason: 'requested_by_customer',
          metadata: expect.objectContaining({
            paymentId: validDto.paymentId,
            reason: validDto.reason,
          }),
        }),
        {}
      );
    });

    it('should create partial refund with specified amount', async () => {
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      await refundService.createRefund({
        ...validDto,
        amount: 5000,
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
        }),
        {}
      );
    });

    it('should throw BadRequestException when payment not eligible', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...pendingPayment,
        tickets: [],
      });

      await expect(refundService.createRefund(validDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when amount exceeds maximum', async () => {
      await expect(
        refundService.createRefund({
          ...validDto,
          amount: 999999, // Way more than original amount
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount below minimum', async () => {
      await expect(
        refundService.createRefund({
          ...validDto,
          amount: 50, // Below minimum of 100 cents
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should include refund application fee when specified', async () => {
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      await refundService.createRefund({
        ...validDto,
        refundApplicationFee: true,
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          refund_application_fee: true,
        }),
        {}
      );
    });

    it('should include reverse transfer when specified', async () => {
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      await refundService.createRefund({
        ...validDto,
        reverseTransfer: true,
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reverse_transfer: true,
        }),
        {}
      );
    });

    it('should use idempotency key when provided', async () => {
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      await refundService.createRefund({
        ...validDto,
        idempotencyKey: 'unique-key-123',
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: 'unique-key-123' }
      );
    });

    it('should update payment status to REFUNDED for full refund', async () => {
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });

      await refundService.createRefund(validDto);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: validDto.paymentId },
          data: expect.objectContaining({
            status: PaymentStatus.REFUNDED,
          }),
        })
      );
    });

    it('should update ticket status to REFUNDED for full refund', async () => {
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });
      mockPrismaService.ticket.updateMany.mockResolvedValue({ count: 1 });

      await refundService.createRefund(validDto);

      expect(mockPrismaService.ticket.updateMany).toHaveBeenCalledWith({
        where: { paymentId: validDto.paymentId },
        data: { status: 'REFUNDED' },
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Refund failed',
        type: 'invalid_request_error',
      });
      mockStripe.refunds.create.mockRejectedValue(stripeError);

      await expect(refundService.createRefund(validDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should map refund reasons correctly', async () => {
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      const reasons = [
        { reason: RefundReason.DUPLICATE, expected: 'duplicate' },
        { reason: RefundReason.FRAUDULENT, expected: 'fraudulent' },
        { reason: RefundReason.EVENT_CANCELLED, expected: 'requested_by_customer' },
        { reason: RefundReason.OTHER, expected: 'requested_by_customer' },
      ];

      for (const { reason, expected } of reasons) {
        mockStripe.refunds.create.mockClear();
        await refundService.createRefund({ ...validDto, reason });

        expect(mockStripe.refunds.create).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: expected,
          }),
          expect.any(Object)
        );
      }
    });
  });

  // ==========================================================================
  // Create Partial Refund Tests
  // ==========================================================================

  describe('createPartialRefund', () => {
    beforeEach(() => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPaymentWithTickets);
      mockStripe.refunds.list.mockResolvedValue({ data: [] });
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);
    });

    it('should create partial refund with line items metadata', async () => {
      await refundService.createPartialRefund({
        paymentId: completedPayment.id,
        amount: 5000,
        reason: RefundReason.PARTIAL_ATTENDANCE,
        lineItemIds: ['item-1', 'item-2'],
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          metadata: expect.objectContaining({
            lineItemIds: 'item-1,item-2',
            partialRefund: 'true',
          }),
        }),
        {}
      );
    });
  });

  // ==========================================================================
  // Create Bulk Refund Tests
  // ==========================================================================

  describe('createBulkRefund', () => {
    const paymentIds = ['payment-1', 'payment-2', 'payment-3'];

    it('should process bulk refunds successfully', async () => {
      // For each payment, we need to set up mocks for:
      // 1. getPaymentForRefund (findUnique)
      // 2. checkRefundEligibility (findUnique with tickets)
      // 3. getRefundedAmount (findUnique + refunds.list)
      // 4. updatePaymentAfterRefund (findUnique + update)

      // Each createRefund call needs multiple findUnique calls
      mockPrismaService.payment.findUnique.mockImplementation(({ where }) => {
        const id = where.id;
        if (paymentIds.includes(id)) {
          return Promise.resolve({
            ...mockPaymentWithTickets,
            id,
            amount: 100,
          });
        }
        return Promise.resolve(null);
      });

      mockStripe.refunds.list.mockResolvedValue({ data: [] });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });
      mockPrismaService.ticket.updateMany.mockResolvedValue({ count: 1 });

      const result = await refundService.createBulkRefund({
        paymentIds,
        reason: RefundReason.EVENT_CANCELLED,
        explanation: 'Event cancelled',
      });

      expect(result.totalRequested).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial failures in bulk refund', async () => {
      mockPrismaService.payment.findUnique.mockImplementation(({ where }) => {
        const id = where.id;
        if (id === 'payment-2') {
          // Second payment fails (not found)
          return Promise.resolve(null);
        }
        if (id === 'payment-1' || id === 'payment-3') {
          return Promise.resolve({
            ...mockPaymentWithTickets,
            id,
            amount: 100,
          });
        }
        return Promise.resolve(null);
      });

      mockStripe.refunds.list.mockResolvedValue({ data: [] });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });
      mockPrismaService.ticket.updateMany.mockResolvedValue({ count: 1 });

      const result = await refundService.createBulkRefund({
        paymentIds,
        reason: RefundReason.EVENT_CANCELLED,
      });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.results.find((r) => !r.success)?.error).toBeDefined();
    });

    it('should apply percentage to refund when specified', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithTickets,
        amount: 100, // 100 EUR
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });
      mockPrismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
      });
      mockPrismaService.ticket.updateMany.mockResolvedValue({ count: 1 });

      await refundService.createBulkRefund({
        paymentIds: ['payment-1'],
        reason: RefundReason.EVENT_CANCELLED,
        percentageToRefund: 50, // 50%
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000, // 50% of 10000 cents
        }),
        {}
      );
    });
  });

  // ==========================================================================
  // Check Refund Eligibility Tests
  // ==========================================================================

  describe('checkRefundEligibility', () => {
    it('should return eligible for completed payment with no prior refunds', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPaymentWithTickets);
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.eligible).toBe(true);
      expect(result.maxRefundAmount).toBeGreaterThan(0);
      expect(result.refundPercentage).toBe(100);
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        refundService.checkRefundEligibility('non-existent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should return ineligible for pending payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...pendingPayment,
        tickets: [],
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(pendingPayment.id);

      expect(result.eligible).toBe(false);
      expect(result.ineligibilityReason).toContain('completed');
    });

    it('should return ineligible for fully refunded payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithTickets,
        amount: 150,
      });
      mockStripe.refunds.list.mockResolvedValue({
        data: [{ ...mockStripeRefund, amount: 15000, status: 'succeeded' }],
      });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.eligible).toBe(false);
      expect(result.ineligibilityReason).toContain('fully refunded');
    });

    it('should apply partial refund percentage when close to event', async () => {
      const closeFestival = {
        startDate: new Date(Date.now() + 3 * 24 * 3600 * 1000), // 3 days from now
      };
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithTickets,
        tickets: [{ id: 'ticket-1', festival: closeFestival }],
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.refundPercentage).toBe(50); // Default partial percentage
    });

    it('should return ineligible for past event', async () => {
      const pastFestival = {
        startDate: new Date(Date.now() - 24 * 3600 * 1000), // Yesterday
      };
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithTickets,
        tickets: [{ id: 'ticket-1', festival: pastFestival }],
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.eligible).toBe(false);
      expect(result.ineligibilityReason).toContain('started or passed');
    });

    it('should calculate max refund amount correctly with prior partial refunds', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithTickets,
        amount: 150, // 150 EUR = 15000 cents
      });
      mockStripe.refunds.list.mockResolvedValue({
        data: [{ ...mockStripeRefund, amount: 5000, status: 'succeeded' }], // Already refunded 50 EUR
      });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.originalAmount).toBe(15000);
      expect(result.refundedAmount).toBe(5000);
      expect(result.maxRefundAmount).toBe(10000); // Remaining amount
    });
  });

  // ==========================================================================
  // Get Refund History Tests
  // ==========================================================================

  describe('getRefundHistory', () => {
    it('should return refund history for payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      const result = await refundService.getRefundHistory(completedPayment.id);

      expect(result).toHaveLength(1);
      expect(result[0].stripeRefundId).toBe(mockStripeRefund.id);
      expect(mockStripe.refunds.list).toHaveBeenCalledWith({
        payment_intent: completedPayment.providerPaymentId,
      });
    });

    it('should throw NotFoundException for payment without provider ID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: null,
      });

      await expect(
        refundService.getRefundHistory(completedPayment.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Get Refund Tests
  // ==========================================================================

  describe('getRefund', () => {
    it('should retrieve refund by ID', async () => {
      const result = await refundService.getRefund('re_test_123');

      expect(result.stripeRefundId).toBe(mockStripeRefund.id);
      expect(mockStripe.refunds.retrieve).toHaveBeenCalledWith('re_test_123');
    });

    it('should throw NotFoundException for missing refund', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such refund',
        type: 'invalid_request_error',
        code: 'resource_missing',
      });
      mockStripe.refunds.retrieve.mockRejectedValue(stripeError);

      await expect(refundService.getRefund('invalid_refund')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for other Stripe errors', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Other error',
        type: 'invalid_request_error',
      });
      mockStripe.refunds.retrieve.mockRejectedValue(stripeError);

      await expect(refundService.getRefund('re_test_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Cancel Refund Tests
  // ==========================================================================

  describe('cancelRefund', () => {
    it('should cancel pending refund', async () => {
      const result = await refundService.cancelRefund('re_test_123');

      expect(result.status).toBe(RefundStatus.CANCELED);
      expect(mockStripe.refunds.cancel).toHaveBeenCalledWith('re_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Cannot cancel refund',
        type: 'invalid_request_error',
      });
      mockStripe.refunds.cancel.mockRejectedValue(stripeError);

      await expect(refundService.cancelRefund('re_test_123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // Handle Refund Webhook Tests
  // ==========================================================================

  describe('handleRefundWebhook', () => {
    it('should handle refund.created event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'refund.created',
        data: { object: mockStripeRefund },
      } as any;

      await refundService.handleRefundWebhook(event);
      // Just verify no errors - this logs the event
    });

    it('should handle refund.updated event with succeeded status', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'refund.updated',
        data: { object: { ...mockStripeRefund, status: 'succeeded' } },
      } as any;

      await refundService.handleRefundWebhook(event);

      expect(mockPrismaService.payment.update).toHaveBeenCalled();
    });

    it('should handle refund.failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'refund.failed',
        data: {
          object: {
            ...mockStripeRefund,
            status: 'failed',
            failure_reason: 'insufficient_funds',
          },
        },
      } as any;

      await refundService.handleRefundWebhook(event);
      // Just verify no errors - this logs the failure
    });

    it('should handle unknown event types gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'refund.unknown',
        data: { object: mockStripeRefund },
      } as any;

      await refundService.handleRefundWebhook(event);
    });
  });

  // ==========================================================================
  // Stripe Not Configured Tests
  // ==========================================================================

  describe('Stripe not configured', () => {
    let serviceNoStripe: RefundService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RefundService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigServiceNoStripe },
        ],
      }).compile();

      serviceNoStripe = module.get<RefundService>(RefundService);
    });

    it('should throw InternalServerErrorException when creating refund without Stripe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPaymentWithTickets);

      await expect(
        serviceNoStripe.createRefund({
          paymentId: completedPayment.id,
          reason: RefundReason.REQUESTED_BY_CUSTOMER,
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when getting refund history without Stripe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(completedPayment);

      await expect(
        serviceNoStripe.getRefundHistory(completedPayment.id)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when getting refund without Stripe', async () => {
      await expect(serviceNoStripe.getRefund('re_test_123')).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when canceling refund without Stripe', async () => {
      await expect(serviceNoStripe.cancelRefund('re_test_123')).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle payment without tickets correctly', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        amount: 100,
        tickets: [],
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      expect(result.eligible).toBe(true);
      expect(result.daysUntilEvent).toBeUndefined();
    });

    it('should handle payment with null providerPaymentId for getPaymentForRefund', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        providerPaymentId: null,
      });

      await expect(
        refundService.createRefund({
          paymentId: completedPayment.id,
          reason: RefundReason.REQUESTED_BY_CUSTOMER,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle multiple festivals and use earliest date', async () => {
      const earlierFestival = {
        startDate: new Date(Date.now() + 5 * 24 * 3600 * 1000), // 5 days
      };
      const laterFestival = {
        startDate: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
      };

      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        amount: 150,
        tickets: [
          { id: 'ticket-1', festival: laterFestival },
          { id: 'ticket-2', festival: earlierFestival },
        ],
      });
      mockStripe.refunds.list.mockResolvedValue({ data: [] });

      const result = await refundService.checkRefundEligibility(completedPayment.id);

      // Should use earlier festival for days calculation (5 days)
      // This means partial refund percentage since < 7 days
      expect(result.refundPercentage).toBe(50);
    });
  });
});
