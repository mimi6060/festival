import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentStatus, PaymentProvider, FestivalStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PaymentsService, CheckoutResult, PaymentWithDetails } from '../payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe.service';
import { CreateCheckoutDto, CheckoutType, RefundRequestDto, RefundReason } from '../dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let stripeService: jest.Mocked<StripeService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock data
  const mockUserId = 'user-123';
  const mockFestivalId = 'festival-123';
  const mockPaymentId = 'payment-123';
  const mockCategoryId = 'category-123';

  const mockFestival = {
    id: mockFestivalId,
    name: 'Summer Festival',
    status: FestivalStatus.PUBLISHED,
    currency: 'EUR',
  };

  const mockCategory = {
    id: mockCategoryId,
    festivalId: mockFestivalId,
    name: 'Regular',
    description: 'Regular ticket',
    type: 'STANDARD',
    price: 50,
    quota: 1000,
    soldCount: 100,
    maxPerUser: 4,
    isActive: true,
    saleStartDate: new Date('2025-01-01'),
    saleEndDate: new Date('2025-12-31'),
    festival: mockFestival,
  };

  const mockPayment = {
    id: mockPaymentId,
    userId: mockUserId,
    amount: 100,
    currency: 'EUR',
    status: PaymentStatus.PENDING,
    provider: PaymentProvider.STRIPE,
    description: 'Ticket purchase',
    providerPaymentId: 'session-123',
    providerData: {
      sessionId: 'session-123',
      sessionUrl: 'https://checkout.stripe.com/session-123',
    },
    metadata: {
      type: CheckoutType.TICKET,
      items: JSON.stringify([{ itemId: mockCategoryId, quantity: 2 }]),
      festivalId: mockFestivalId,
    },
    createdAt: new Date(),
    paidAt: null,
    refundedAt: null,
    tickets: [],
    cashlessTopup: null,
  };

  const mockStripeSession: Partial<Stripe.Checkout.Session> = {
    id: 'session-123',
    url: 'https://checkout.stripe.com/session-123',
    payment_intent: 'pi_123',
    amount_total: 10000,
    metadata: {
      paymentId: mockPaymentId,
      type: CheckoutType.TICKET,
      userId: mockUserId,
      festivalId: mockFestivalId,
    },
    client_reference_id: mockPaymentId,
  };

  const mockCheckoutDto: CreateCheckoutDto = {
    type: CheckoutType.TICKET,
    items: [
      { itemId: mockCategoryId, quantity: 2 },
    ],
    festivalId: mockFestivalId,
    currency: 'EUR',
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((callback) => callback({
      payment: { update: jest.fn().mockResolvedValue(mockPayment) },
      ticket: { create: jest.fn() },
      ticketCategory: { findUnique: jest.fn(), update: jest.fn() },
      festival: { update: jest.fn() },
      cashlessAccount: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      cashlessTransaction: { create: jest.fn() },
    }));

    const mockPrismaService = {
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      ticketCategory: {
        findUnique: jest.fn(),
      },
      festival: {
        findUnique: jest.fn(),
      },
      ticket: {
        updateMany: jest.fn(),
      },
      $transaction: mockTransaction,
    };

    const mockStripeService = {
      createCheckoutSession: jest.fn(),
      createRefund: jest.fn(),
      constructWebhookEvent: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    stripeService = module.get(StripeService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for ticket purchase', async () => {
      // Arrange
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);
      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockStripeSession);

      // Act
      const result = await service.createCheckoutSession(mockUserId, mockCheckoutDto);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-123',
        sessionUrl: 'https://checkout.stripe.com/session-123',
        paymentId: mockPaymentId,
      });
      expect(prismaService.payment.create).toHaveBeenCalled();
      expect(stripeService.createCheckoutSession).toHaveBeenCalled();
    });

    it('should throw BadRequestException when items are empty', async () => {
      // Arrange
      const emptyItemsDto = { ...mockCheckoutDto, items: [] };

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, emptyItemsDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, emptyItemsDto),
      ).rejects.toThrow('At least one item is required');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      // Arrange
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive category', async () => {
      // Arrange
      const inactiveCategory = { ...mockCategory, isActive: false };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(inactiveCategory);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(/not available/);
    });

    it('should throw BadRequestException for sales not open', async () => {
      // Arrange
      const futureCategory = {
        ...mockCategory,
        saleStartDate: new Date('2030-01-01'),
        saleEndDate: new Date('2030-12-31'),
      };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(futureCategory);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(/sales are not open/);
    });

    it('should throw BadRequestException when not enough tickets available', async () => {
      // Arrange
      const soldOutCategory = {
        ...mockCategory,
        soldCount: 999,
        quota: 1000,
      };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(soldOutCategory);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(/Not enough tickets available/);
    });

    it('should throw BadRequestException when exceeding max per user', async () => {
      // Arrange
      const lowMaxCategory = { ...mockCategory, maxPerUser: 1 };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(lowMaxCategory);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow(/Maximum 1 tickets per user/);
    });

    it('should create checkout session for cashless topup', async () => {
      // Arrange
      const cashlessDto: CreateCheckoutDto = {
        type: CheckoutType.CASHLESS,
        items: [{ itemId: 'topup', quantity: 1, unitPrice: 5000 }],
        festivalId: mockFestivalId,
        currency: 'EUR',
      };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);
      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockStripeSession);

      // Act
      const result = await service.createCheckoutSession(mockUserId, cashlessDto);

      // Assert
      expect(result.sessionId).toBe('session-123');
    });

    it('should throw BadRequestException for cashless without festivalId', async () => {
      // Arrange
      const invalidCashlessDto: CreateCheckoutDto = {
        type: CheckoutType.CASHLESS,
        items: [{ itemId: 'topup', quantity: 1, unitPrice: 5000 }],
      };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, invalidCashlessDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, invalidCashlessDto),
      ).rejects.toThrow('Festival ID is required for cashless topup');
    });

    it('should throw BadRequestException for minimum topup amount', async () => {
      // Arrange
      const lowAmountDto: CreateCheckoutDto = {
        type: CheckoutType.CASHLESS,
        items: [{ itemId: 'topup', quantity: 1, unitPrice: 50 }], // Less than 100 cents
        festivalId: mockFestivalId,
      };
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, lowAmountDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createCheckoutSession(mockUserId, lowAmountDto),
      ).rejects.toThrow(/Minimum topup amount/);
    });

    it('should mark payment as failed on Stripe error', async () => {
      // Arrange
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prismaService.ticketCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (stripeService.createCheckoutSession as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createCheckoutSession(mockUserId, mockCheckoutDto),
      ).rejects.toThrow();

      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPaymentId },
        data: { status: PaymentStatus.FAILED },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should process checkout.session.completed event', async () => {
      // Arrange
      const event: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: { object: mockStripeSession as Stripe.Checkout.Session },
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PENDING,
      });

      // Mock processSuccessfulPayment
      jest.spyOn(service, 'processSuccessfulPayment').mockResolvedValue();

      // Act
      await service.handleWebhook(event as Stripe.Event);

      // Assert
      expect(service.processSuccessfulPayment).toHaveBeenCalledWith(
        mockPaymentId,
        mockStripeSession,
      );
    });

    it('should skip already completed payments', async () => {
      // Arrange
      const event: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: { object: mockStripeSession as Stripe.Checkout.Session },
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      jest.spyOn(service, 'processSuccessfulPayment');

      // Act
      await service.handleWebhook(event as Stripe.Event);

      // Assert
      expect(service.processSuccessfulPayment).not.toHaveBeenCalled();
    });

    it('should handle checkout.session.expired event', async () => {
      // Arrange
      const event: Partial<Stripe.Event> = {
        type: 'checkout.session.expired',
        data: { object: mockStripeSession as Stripe.Checkout.Session },
      };
      (prismaService.payment.update as jest.Mock).mockResolvedValue(mockPayment);

      // Act
      await service.handleWebhook(event as Stripe.Event);

      // Assert
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPaymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          providerData: expect.objectContaining({
            expiredAt: expect.any(String),
          }),
        },
      });
    });

    it('should handle charge.refunded event', async () => {
      // Arrange
      const mockCharge: Partial<Stripe.Charge> = {
        payment_intent: 'pi_123',
        amount_refunded: 5000,
      };
      const event: Partial<Stripe.Event> = {
        type: 'charge.refunded',
        data: { object: mockCharge as Stripe.Charge },
      };

      const paymentWithIntent = {
        ...mockPayment,
        amount: 50,
        status: PaymentStatus.COMPLETED,
        providerData: { paymentIntentId: 'pi_123' },
      };

      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(paymentWithIntent);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(paymentWithIntent);
      (prismaService.ticket.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Act
      await service.handleWebhook(event as Stripe.Event);

      // Assert
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPaymentId },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('should handle payment_intent.payment_failed event', async () => {
      // Arrange
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        last_payment_error: {
          message: 'Card declined',
          code: 'card_declined',
        } as Stripe.PaymentIntent.LastPaymentError,
      };
      const event: Partial<Stripe.Event> = {
        type: 'payment_intent.payment_failed',
        data: { object: mockPaymentIntent as Stripe.PaymentIntent },
      };

      const paymentWithIntent = {
        ...mockPayment,
        providerData: { paymentIntentId: 'pi_123' },
      };

      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(paymentWithIntent);
      (prismaService.payment.update as jest.Mock).mockResolvedValue(paymentWithIntent);

      // Act
      await service.handleWebhook(event as Stripe.Event);

      // Assert
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPaymentId },
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
          providerData: expect.objectContaining({
            failureMessage: 'Card declined',
            failureCode: 'card_declined',
          }),
        }),
      });
    });

    it('should ignore unhandled event types', async () => {
      // Arrange
      const event: Partial<Stripe.Event> = {
        type: 'unknown.event' as any,
        data: { object: {} },
      };

      // Act & Assert
      await expect(service.handleWebhook(event as Stripe.Event)).resolves.not.toThrow();
    });
  });

  describe('processRefund', () => {
    it('should process refund for completed payment', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        providerData: { paymentIntentId: 'pi_123' },
        tickets: [],
      };
      const refundDto: RefundRequestDto = {
        reason: RefundReason.REQUESTED_BY_CUSTOMER,
        description: 'Customer requested refund',
      };
      const mockRefund: Partial<Stripe.Refund> = {
        id: 'refund-123',
        status: 'succeeded',
      };

      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(completedPayment);
      (stripeService.createRefund as jest.Mock).mockResolvedValue(mockRefund);

      // Act
      const result = await service.processRefund(
        mockPaymentId,
        mockUserId,
        refundDto,
        false,
      );

      // Assert
      expect(result).toEqual({
        refundId: 'refund-123',
        status: 'succeeded',
      });
      expect(stripeService.createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        amount: undefined, // Full refund
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          paymentId: mockPaymentId,
          requestedBy: mockUserId,
        }),
      });
    });

    it('should process partial refund with amount', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        providerData: { paymentIntentId: 'pi_123' },
        tickets: [],
      };
      const refundDto: RefundRequestDto = {
        reason: RefundReason.DUPLICATE,
        amount: 2500, // Partial refund
      };
      const mockRefund: Partial<Stripe.Refund> = {
        id: 'refund-123',
        status: 'pending',
      };

      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(completedPayment);
      (stripeService.createRefund as jest.Mock).mockResolvedValue(mockRefund);

      // Act
      const result = await service.processRefund(
        mockPaymentId,
        mockUserId,
        refundDto,
        true, // Admin
      );

      // Assert
      expect(stripeService.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2500,
          reason: 'duplicate',
        }),
      );
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      // Arrange
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.processRefund(
          'non-existent',
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner (non-admin)', async () => {
      // Arrange
      const otherUserPayment = {
        ...mockPayment,
        userId: 'other-user-id',
        status: PaymentStatus.COMPLETED,
        providerData: { paymentIntentId: 'pi_123' },
        tickets: [],
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(otherUserPayment);

      // Act & Assert
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow('You can only refund your own payments');
    });

    it('should allow admin to refund any payment', async () => {
      // Arrange
      const otherUserPayment = {
        ...mockPayment,
        userId: 'other-user-id',
        status: PaymentStatus.COMPLETED,
        providerData: { paymentIntentId: 'pi_123' },
        tickets: [],
      };
      const mockRefund: Partial<Stripe.Refund> = {
        id: 'refund-123',
        status: 'succeeded',
      };

      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(otherUserPayment);
      (stripeService.createRefund as jest.Mock).mockResolvedValue(mockRefund);

      // Act
      const result = await service.processRefund(
        mockPaymentId,
        mockUserId,
        { reason: RefundReason.FRAUDULENT },
        true, // Admin
      );

      // Assert
      expect(result.refundId).toBe('refund-123');
    });

    it('should throw BadRequestException for non-completed payment', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        tickets: [],
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(pendingPayment);

      // Act & Assert
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow(/Cannot refund payment with status/);
    });

    it('should throw BadRequestException when payment intent not found', async () => {
      // Arrange
      const paymentWithoutIntent = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        providerData: {},
        tickets: [],
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(paymentWithoutIntent);

      // Act & Assert
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processRefund(
          mockPaymentId,
          mockUserId,
          { reason: RefundReason.REQUESTED_BY_CUSTOMER },
          false,
        ),
      ).rejects.toThrow('Payment intent ID not found');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return user payment history', async () => {
      // Arrange
      const paymentsWithRelations = [
        {
          ...mockPayment,
          tickets: [
            {
              id: 'ticket-1',
              qrCode: 'TKT-ABC',
              category: { name: 'Regular', type: 'STANDARD' },
              festival: { name: 'Summer Festival' },
            },
          ],
          cashlessTopup: null,
        },
      ];
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue(paymentsWithRelations);

      // Act
      const result = await service.getPaymentHistory(mockUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPaymentId);
      expect(result[0].tickets).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      // Arrange
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getPaymentHistory(mockUserId, { limit: 10, offset: 20 });

      // Assert
      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return payment for owner', async () => {
      // Arrange
      const paymentWithRelations = {
        ...mockPayment,
        tickets: [],
        cashlessTopup: null,
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(paymentWithRelations);

      // Act
      const result = await service.getPaymentById(mockPaymentId, mockUserId, false);

      // Assert
      expect(result.id).toBe(mockPaymentId);
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      // Arrange
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getPaymentById('non-existent', mockUserId, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      // Arrange
      const otherUserPayment = {
        ...mockPayment,
        userId: 'other-user-id',
        tickets: [],
        cashlessTopup: null,
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(otherUserPayment);

      // Act & Assert
      await expect(
        service.getPaymentById(mockPaymentId, mockUserId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any payment', async () => {
      // Arrange
      const otherUserPayment = {
        ...mockPayment,
        userId: 'other-user-id',
        tickets: [],
        cashlessTopup: null,
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(otherUserPayment);

      // Act
      const result = await service.getPaymentById(mockPaymentId, mockUserId, true);

      // Assert
      expect(result.id).toBe(mockPaymentId);
    });
  });

  describe('getFestivalPayments', () => {
    it('should return festival payments for admin', async () => {
      // Arrange
      const paymentsWithRelations = [
        {
          ...mockPayment,
          user: { id: mockUserId, email: 'user@example.com', firstName: 'John', lastName: 'Doe' },
          tickets: [],
          cashlessTopup: null,
        },
      ];
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue(paymentsWithRelations);
      (prismaService.payment.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getFestivalPayments(mockFestivalId);

      // Assert
      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getFestivalPayments('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by payment status', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.payment.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getFestivalPayments(mockFestivalId, {
        status: PaymentStatus.COMPLETED,
      });

      // Assert
      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe('processSuccessfulPayment', () => {
    it('should process ticket purchase successfully', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(pendingPayment);

      // Act
      await service.processSuccessfulPayment(
        mockPaymentId,
        mockStripeSession as Stripe.Checkout.Session,
      );

      // Assert
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      // Arrange
      (prismaService.payment.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.processSuccessfulPayment(
          'non-existent',
          mockStripeSession as Stripe.Checkout.Session,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
