import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TicketStatus, PaymentStatus, UserRole, UserStatus, FestivalStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { TicketsService } from '../tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketCategoriesService } from '../ticket-categories.service';
import { PurchaseTicketsDto, ValidateTicketDto } from '../dto';

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaService: jest.Mocked<PrismaService>;
  let categoriesService: jest.Mocked<TicketCategoriesService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock data
  const mockUserId = 'user-123';
  const mockFestivalId = 'festival-123';
  const mockCategoryId = 'category-123';
  const mockTicketId = 'ticket-123';
  const mockStaffId = 'staff-123';

  const mockFestival = {
    id: mockFestivalId,
    name: 'Summer Festival',
    slug: 'summer-festival',
    status: FestivalStatus.PUBLISHED,
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-03'),
    currency: 'EUR',
    maxCapacity: 10000,
    currentAttendees: 100,
  };

  const mockCategory = {
    id: mockCategoryId,
    festivalId: mockFestivalId,
    name: 'Regular',
    type: 'STANDARD',
    price: 50,
    quota: 1000,
    soldCount: 100,
    maxPerUser: 4,
    isActive: true,
    saleStartDate: new Date('2025-01-01'),
    saleEndDate: new Date('2025-06-30'),
  };

  const mockTicket = {
    id: mockTicketId,
    festivalId: mockFestivalId,
    categoryId: mockCategoryId,
    userId: mockUserId,
    qrCode: 'TKT-ABCD1234',
    qrCodeData: 'encoded-payload',
    status: TicketStatus.SOLD,
    purchasePrice: 50,
    paymentId: 'payment-123',
    createdAt: new Date(),
    usedAt: null,
    usedByStaffId: null,
    category: {
      name: 'Regular',
      type: 'STANDARD',
    },
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    festival: {
      id: mockFestivalId,
      name: 'Summer Festival',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-03'),
    },
  };

  const mockPurchaseDto: PurchaseTicketsDto = {
    festivalId: mockFestivalId,
    items: [
      { categoryId: mockCategoryId, quantity: 2 },
    ],
    paymentProvider: 'STRIPE',
  };

  beforeEach(async () => {
    // Create mock transaction function
    const mockTransaction = jest.fn((callback) => callback({
      payment: { create: jest.fn().mockResolvedValue({ id: 'payment-123' }) },
      ticket: { create: jest.fn().mockResolvedValue(mockTicket), update: jest.fn() },
      ticketCategory: { update: jest.fn() },
      festival: { update: jest.fn() },
    }));

    const mockPrismaService = {
      festival: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ticket: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      ticketCategory: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      zone: {
        findUnique: jest.fn(),
      },
      payment: {
        update: jest.fn(),
      },
      $transaction: mockTransaction,
    };

    const mockCategoriesService = {
      findOne: jest.fn(),
      canUserPurchase: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'QR_CODE_SECRET') return 'test-qr-secret';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TicketCategoriesService, useValue: mockCategoriesService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prismaService = module.get(PrismaService);
    categoriesService = module.get(TicketCategoriesService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('purchaseTickets', () => {
    it('should successfully purchase tickets', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (categoriesService.canUserPurchase as jest.Mock).mockResolvedValue({
        canPurchase: true,
      });
      (categoriesService.findOne as jest.Mock).mockResolvedValue(mockCategory);

      // Act
      const result = await service.purchaseTickets(mockUserId, mockPurchaseDto);

      // Assert
      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('totalAmount');
      expect(result.totalAmount).toBe(100); // 2 tickets * 50
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(`Festival with ID ${mockFestivalId} not found`);
    });

    it('should throw BadRequestException for non-published festival', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);

      // Act & Assert
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow('Tickets are not available for this festival');
    });

    it('should throw BadRequestException when quota exceeded', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (categoriesService.canUserPurchase as jest.Mock).mockResolvedValue({
        canPurchase: false,
        reason: 'Only 0 tickets available',
      });

      // Act & Assert
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow('Only 0 tickets available');
    });

    it('should throw BadRequestException when user max per category exceeded', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (categoriesService.canUserPurchase as jest.Mock).mockResolvedValue({
        canPurchase: false,
        reason: 'Maximum 4 tickets per user. You already have 3',
      });

      // Act & Assert
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(/Maximum 4 tickets per user/);
    });

    it('should throw BadRequestException when category does not belong to festival', async () => {
      // Arrange
      const wrongCategory = { ...mockCategory, festivalId: 'other-festival' };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (categoriesService.canUserPurchase as jest.Mock).mockResolvedValue({
        canPurchase: true,
      });
      (categoriesService.findOne as jest.Mock).mockResolvedValue(wrongCategory);

      // Act & Assert
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.purchaseTickets(mockUserId, mockPurchaseDto),
      ).rejects.toThrow(/does not belong to this festival/);
    });

    it('should calculate correct total for multiple items', async () => {
      // Arrange
      const multiItemDto: PurchaseTicketsDto = {
        festivalId: mockFestivalId,
        items: [
          { categoryId: mockCategoryId, quantity: 2 },
          { categoryId: 'vip-category', quantity: 1 },
        ],
        paymentProvider: 'STRIPE',
      };

      const vipCategory = { ...mockCategory, id: 'vip-category', price: 150 };

      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (categoriesService.canUserPurchase as jest.Mock).mockResolvedValue({
        canPurchase: true,
      });
      (categoriesService.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(vipCategory);

      // Act
      const result = await service.purchaseTickets(mockUserId, multiItemDto);

      // Assert
      expect(result.totalAmount).toBe(250); // (2 * 50) + (1 * 150)
    });
  });

  describe('validateTicket', () => {
    const createValidPayload = (ticketId: string) => {
      const timestamp = Date.now();
      const dataToSign = `${ticketId}:${mockFestivalId}:${mockCategoryId}:${mockUserId}:${timestamp}`;
      const signature = crypto
        .createHmac('sha256', 'test-qr-secret')
        .update(dataToSign)
        .digest('hex');

      const payload = {
        ticketId,
        festivalId: mockFestivalId,
        categoryId: mockCategoryId,
        userId: mockUserId,
        timestamp,
        signature,
      };

      return Buffer.from(JSON.stringify(payload)).toString('base64');
    };

    it('should validate ticket successfully', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (prismaService.ticket.update as jest.Mock).mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.USED,
        usedAt: new Date(),
      });

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Ticket validated successfully');
      expect(result.ticket?.status).toBe(TicketStatus.USED);
      expect(prismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId },
        data: {
          status: TicketStatus.USED,
          usedAt: expect.any(Date),
          usedByStaffId: mockStaffId,
        },
      });
    });

    it('should reject already used ticket', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData };
      const usedTicket = {
        ...mockTicket,
        status: TicketStatus.USED,
        usedAt: new Date('2025-07-01T10:00:00Z'),
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(usedTicket);

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Ticket already used');
      expect(prismaService.ticket.update).not.toHaveBeenCalled();
    });

    it('should reject cancelled ticket', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData };
      const cancelledTicket = { ...mockTicket, status: TicketStatus.CANCELLED };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(cancelledTicket);

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Ticket has been cancelled');
    });

    it('should reject refunded ticket', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData };
      const refundedTicket = { ...mockTicket, status: TicketStatus.REFUNDED };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(refundedTicket);

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Ticket has been refunded');
    });

    it('should reject ticket with invalid signature', async () => {
      // Arrange
      const invalidPayload = {
        ticketId: mockTicketId,
        festivalId: mockFestivalId,
        categoryId: mockCategoryId,
        userId: mockUserId,
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };
      const qrCodeData = Buffer.from(JSON.stringify(invalidPayload)).toString('base64');
      const validateDto: ValidateTicketDto = { qrCodeData };

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid signature');
    });

    it('should reject malformed QR code', async () => {
      // Arrange
      const validateDto: ValidateTicketDto = { qrCodeData: 'not-valid-base64!' };

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid QR code format');
    });

    it('should reject ticket not found in database', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Ticket not found');
    });

    it('should reject ticket for restricted zone', async () => {
      // Arrange
      const qrCodeData = createValidPayload(mockTicketId);
      const validateDto: ValidateTicketDto = { qrCodeData, zoneId: 'vip-zone' };
      const zone = {
        id: 'vip-zone',
        name: 'VIP Area',
        requiresTicketType: ['VIP'],
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (prismaService.zone.findUnique as jest.Mock).mockResolvedValue(zone);

      // Act
      const result = await service.validateTicket(validateDto, mockStaffId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not grant access to');
    });
  });

  describe('cancelTicket', () => {
    it('should cancel ticket with full refund (more than 30 days before)', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const ticketWithFutureFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: futureDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithFutureFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.REFUNDED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(50);
      expect(result.message).toContain('Full refund');
    });

    it('should cancel ticket with 75% refund (14-30 days before)', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);
      const ticketWithFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: futureDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.REFUNDED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.refundPercentage).toBe(75);
      expect(result.refundAmount).toBe(37.5);
      expect(result.message).toContain('75% refund');
    });

    it('should cancel ticket with 50% refund (7-14 days before)', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const ticketWithFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: futureDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.REFUNDED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.refundPercentage).toBe(50);
      expect(result.refundAmount).toBe(25);
    });

    it('should cancel ticket with 25% refund (less than 7 days before)', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const ticketWithFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: futureDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.REFUNDED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.refundPercentage).toBe(25);
      expect(result.refundAmount).toBe(12.5);
    });

    it('should cancel ticket with no refund (festival started)', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const ticketWithStartedFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: pastDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithStartedFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.CANCELLED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
      expect(result.message).toContain('No refund');
    });

    it('should throw NotFoundException for non-existent ticket', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelTicket('non-existent', mockUserId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue({
        ...mockTicket,
        festival: mockFestival,
        category: mockCategory,
        payment: null,
      });

      // Act & Assert
      await expect(
        service.cancelTicket(mockTicketId, 'other-user-id', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to cancel any ticket', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const ticketWithFestival = {
        ...mockTicket,
        festival: { ...mockTicket.festival, startDate: futureDate },
        category: mockCategory,
        payment: { id: 'payment-123', metadata: {} },
      };

      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(ticketWithFestival);

      const mockTx = {
        ticket: { update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.REFUNDED }) },
        ticketCategory: { update: jest.fn() },
        festival: { update: jest.fn() },
        payment: { update: jest.fn() },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.cancelTicket(mockTicketId, 'admin-id', UserRole.ADMIN);

      // Assert
      expect(result.refundPercentage).toBe(100);
    });

    it('should throw BadRequestException for already used ticket', async () => {
      // Arrange
      const usedTicket = {
        ...mockTicket,
        status: TicketStatus.USED,
        festival: mockFestival,
        category: mockCategory,
        payment: null,
      };
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(usedTicket);

      // Act & Assert
      await expect(
        service.cancelTicket(mockTicketId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelTicket(mockTicketId, mockUserId, UserRole.USER),
      ).rejects.toThrow('Cannot cancel a ticket that has already been used');
    });

    it('should throw BadRequestException for already cancelled ticket', async () => {
      // Arrange
      const cancelledTicket = {
        ...mockTicket,
        status: TicketStatus.CANCELLED,
        festival: mockFestival,
        category: mockCategory,
        payment: null,
      };
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(cancelledTicket);

      // Act & Assert
      await expect(
        service.cancelTicket(mockTicketId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelTicket(mockTicketId, mockUserId, UserRole.USER),
      ).rejects.toThrow('Ticket is already cancelled');
    });
  });

  describe('getTicketById', () => {
    it('should return ticket with QR code for owner', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await service.getTicketById(mockTicketId, mockUserId, UserRole.USER);

      // Assert
      expect(result.id).toBe(mockTicketId);
      expect(result.qrCodeImage).toBe('data:image/png;base64,mockQRCode');
    });

    it('should throw NotFoundException for non-existent ticket', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getTicketById('non-existent', mockUserId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner (non-staff)', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      // Act & Assert
      await expect(
        service.getTicketById(mockTicketId, 'other-user-id', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow staff to view any ticket', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await service.getTicketById(mockTicketId, 'staff-id', UserRole.STAFF);

      // Assert
      expect(result.id).toBe(mockTicketId);
    });

    it('should allow admin to view any ticket', async () => {
      // Arrange
      (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      // Act
      const result = await service.getTicketById(mockTicketId, 'admin-id', UserRole.ADMIN);

      // Assert
      expect(result.id).toBe(mockTicketId);
    });
  });

  describe('getMyTickets', () => {
    it('should return user tickets', async () => {
      // Arrange
      (prismaService.ticket.findMany as jest.Mock).mockResolvedValue([mockTicket]);

      // Act
      const result = await service.getMyTickets(mockUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockTicketId);
      expect(prismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code as base64 data URL', async () => {
      // Act
      const result = await service.generateQRCode('test-payload');

      // Assert
      expect(result).toBe('data:image/png;base64,mockQRCode');
    });
  });

  describe('getFestivalTickets', () => {
    it('should return paginated tickets for festival', async () => {
      // Arrange
      (prismaService.ticket.findMany as jest.Mock).mockResolvedValue([mockTicket]);
      (prismaService.ticket.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getFestivalTickets(mockFestivalId, {
        page: 1,
        limit: 50,
      });

      // Assert
      expect(result.tickets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter tickets by status', async () => {
      // Arrange
      (prismaService.ticket.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.ticket.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getFestivalTickets(mockFestivalId, {
        status: TicketStatus.USED,
      });

      // Assert
      expect(prismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: mockFestivalId,
            status: TicketStatus.USED,
          }),
        }),
      );
    });
  });

  describe('getTicketStats', () => {
    it('should return ticket statistics', async () => {
      // Arrange
      (prismaService.ticketCategory.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockCategory,
          tickets: [
            { status: TicketStatus.SOLD, purchasePrice: 50 },
            { status: TicketStatus.USED, purchasePrice: 50 },
          ],
        },
      ]);
      (prismaService.ticket.groupBy as jest.Mock).mockResolvedValue([
        { status: TicketStatus.SOLD, _count: 1 },
        { status: TicketStatus.USED, _count: 1 },
      ]);

      // Act
      const result = await service.getTicketStats(mockFestivalId);

      // Assert
      expect(result.totalSold).toBe(100); // From category.soldCount
      expect(result.totalRevenue).toBe(100); // 2 tickets * 50
      expect(result.byCategory).toHaveLength(1);
      expect(result.byStatus[TicketStatus.SOLD]).toBe(1);
      expect(result.byStatus[TicketStatus.USED]).toBe(1);
    });
  });
});
