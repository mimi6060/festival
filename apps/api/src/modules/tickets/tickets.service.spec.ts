/**
 * Tickets Service Unit Tests
 *
 * Comprehensive tests for ticket functionality including:
 * - Ticket purchase
 * - QR code validation
 * - Ticket scanning
 * - Access control
 * - Edge cases and error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TicketsService, PurchaseTicketDto } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TicketType, FestivalStatus } from '@prisma/client';
import {
  regularUser,
  staffUser,
  publishedFestival,
  ongoingFestival,
  completedFestival,
  cancelledFestival,
  standardCategory,
  soldOutCategory,
  expiredSaleCategory,
  inactiveCategory,
  soldTicket,
  usedTicket,
  cancelledTicket,
  refundedTicket,
  mainStageZone,
  vipLounge,
} from '../../test/fixtures';
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/exceptions/base.exception';
import {
  TicketSoldOutException,
  TicketQuotaExceededException,
  TicketSaleNotStartedException,
  TicketSaleEndedException,
  TicketAlreadyUsedException,
  FestivalCancelledException,
  FestivalEndedException,
} from '../../common/exceptions/business.exception';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock QRCode - need to require the mock to reset in beforeEach
jest.mock('qrcode');
const QRCode = require('qrcode');

// Mock uuid
jest.mock('uuid');
const uuid = require('uuid');

// Mock crypto
const crypto = require('crypto');
const mockHmac = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mockedsignature12345678'),
};
jest.spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);

describe('TicketsService', () => {
  let ticketsService: TicketsService;
  let _prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    festival: {
      findUnique: jest.fn(),
    },
    ticketCategory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    zone: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    zoneAccessLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const QR_CODE_SECRET = 'this-is-a-very-secure-qr-code-secret-key-32chars';

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue(QR_CODE_SECRET),
  };

  beforeEach(async () => {
    // Reset mocks but restore the config service return value
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue(QR_CODE_SECRET);

    // Reset QRCode mock
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode');

    // Reset uuid mock
    uuid.v4.mockReturnValue('mocked-uuid-ticket-123');

    // Reset crypto mock
    mockHmac.update.mockReturnThis();
    mockHmac.digest.mockReturnValue('mockedsignature12345678');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    ticketsService = module.get<TicketsService>(TicketsService);
    _prismaService = module.get(PrismaService);

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return callback;
    });
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should throw error if QR_CODE_SECRET is less than 32 characters', async () => {
      const shortSecretConfigService = {
        getOrThrow: jest.fn().mockReturnValue('short-secret'),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            TicketsService,
            { provide: PrismaService, useValue: mockPrismaService },
            { provide: ConfigService, useValue: shortSecretConfigService },
          ],
        }).compile()
      ).rejects.toThrow('QR_CODE_SECRET must be at least 32 characters for security');
    });
  });

  // ==========================================================================
  // Purchase Tickets Tests
  // ==========================================================================

  describe('purchaseTickets', () => {
    const validPurchaseDto: PurchaseTicketDto = {
      festivalId: publishedFestival.id,
      categoryId: standardCategory.id,
      quantity: 1,
    };

    it('should successfully purchase a ticket', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(standardCategory);
      mockPrismaService.ticket.count.mockResolvedValue(0);
      mockPrismaService.ticketCategory.update.mockResolvedValue(standardCategory);
      mockPrismaService.ticket.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.ticket.findMany.mockResolvedValue([{
        id: 'mocked-uuid-ticket-123',
        festivalId: publishedFestival.id,
        categoryId: standardCategory.id,
        userId: regularUser.id,
        qrCode: 'QR-MOCKED-UUID-MOCKEDSIG',
        qrCodeData: '{}',
        status: TicketStatus.SOLD,
        purchasePrice: standardCategory.price,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      }]);

      // Act
      const result = await ticketsService.purchaseTickets(regularUser.id, validPurchaseDto);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].festivalId).toBe(publishedFestival.id);
      expect(result[0].categoryId).toBe(standardCategory.id);
      expect(result[0].userId).toBe(regularUser.id);
      expect(result[0].status).toBe(TicketStatus.SOLD);
    });

    it('should purchase multiple tickets', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(standardCategory);
      mockPrismaService.ticket.count.mockResolvedValue(0);
      mockPrismaService.ticketCategory.update.mockResolvedValue(standardCategory);
      mockPrismaService.ticket.createMany.mockResolvedValue({ count: 3 });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          festivalId: publishedFestival.id,
          categoryId: standardCategory.id,
          userId: regularUser.id,
          qrCode: 'QR-CODE-1',
          qrCodeData: '{}',
          status: TicketStatus.SOLD,
          purchasePrice: standardCategory.price,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
        {
          id: 'ticket-2',
          festivalId: publishedFestival.id,
          categoryId: standardCategory.id,
          userId: regularUser.id,
          qrCode: 'QR-CODE-2',
          qrCodeData: '{}',
          status: TicketStatus.SOLD,
          purchasePrice: standardCategory.price,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
        {
          id: 'ticket-3',
          festivalId: publishedFestival.id,
          categoryId: standardCategory.id,
          userId: regularUser.id,
          qrCode: 'QR-CODE-3',
          qrCodeData: '{}',
          status: TicketStatus.SOLD,
          purchasePrice: standardCategory.price,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
      ]);

      // Act
      const result = await ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: 3,
      });

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrismaService.ticket.createMany).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationException for quantity less than 1', async () => {
      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: 0,
      })).rejects.toThrow(ValidationException);

      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: -1,
      })).rejects.toThrow(ValidationException);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw FestivalCancelledException if festival is deleted', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: true,
      });

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(FestivalCancelledException);
    });

    it('should throw FestivalCancelledException if festival is cancelled', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...cancelledFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(standardCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(FestivalCancelledException);
    });

    it('should throw FestivalEndedException if festival has ended', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...completedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(standardCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(FestivalEndedException);
    });

    it('should throw NotFoundException if category not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ValidationException if category belongs to different festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue({
        ...standardCategory,
        festivalId: 'different-festival-id',
      });

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(ValidationException);
    });

    it('should throw TicketSoldOutException if category is inactive', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(inactiveCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        categoryId: inactiveCategory.id,
      })).rejects.toThrow(TicketSoldOutException);
    });

    it('should throw TicketSaleNotStartedException if sale has not started', async () => {
      // Arrange
      const futureCategory = {
        ...standardCategory,
        saleStartDate: new Date(Date.now() + 86400000), // Tomorrow
      };
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(futureCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, validPurchaseDto))
        .rejects.toThrow(TicketSaleNotStartedException);
    });

    it('should throw TicketSaleEndedException if sale has ended', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(expiredSaleCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        categoryId: expiredSaleCategory.id,
      })).rejects.toThrow(TicketSaleEndedException);
    });

    it('should throw TicketSoldOutException if tickets are sold out', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(soldOutCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        categoryId: soldOutCategory.id,
      })).rejects.toThrow(TicketSoldOutException);
    });

    it('should throw TicketQuotaExceededException if not enough tickets available', async () => {
      // Arrange
      const limitedCategory = {
        ...standardCategory,
        quota: 100,
        soldCount: 99,
      };
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue(limitedCategory);

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: 2,
      })).rejects.toThrow(TicketQuotaExceededException);
    });

    it('should throw TicketQuotaExceededException if exceeds max per user', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue({
        ...standardCategory,
        maxPerUser: 4,
      });
      mockPrismaService.ticket.count.mockResolvedValue(3); // Already has 3 tickets

      // Act & Assert
      await expect(ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: 2, // Would exceed limit of 4
      })).rejects.toThrow(TicketQuotaExceededException);
    });

    it('should correctly calculate remaining user quota', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        isDeleted: false,
      });
      mockPrismaService.ticketCategory.findUnique.mockResolvedValue({
        ...standardCategory,
        maxPerUser: 4,
      });
      mockPrismaService.ticket.count.mockResolvedValue(2); // Already has 2 tickets, can buy 2 more
      mockPrismaService.ticketCategory.update.mockResolvedValue(standardCategory);
      mockPrismaService.ticket.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          festivalId: publishedFestival.id,
          categoryId: standardCategory.id,
          userId: regularUser.id,
          qrCode: 'QR-CODE-1',
          qrCodeData: '{}',
          status: TicketStatus.SOLD,
          purchasePrice: standardCategory.price,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
        {
          id: 'ticket-2',
          festivalId: publishedFestival.id,
          categoryId: standardCategory.id,
          userId: regularUser.id,
          qrCode: 'QR-CODE-2',
          qrCodeData: '{}',
          status: TicketStatus.SOLD,
          purchasePrice: standardCategory.price,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
      ]);

      // Act
      const result = await ticketsService.purchaseTickets(regularUser.id, {
        ...validPurchaseDto,
        quantity: 2,
      });

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Validate Ticket Tests
  // ==========================================================================

  describe('validateTicket', () => {
    it('should validate a valid ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: { id: regularUser.id, email: regularUser.email, firstName: regularUser.firstName, lastName: regularUser.lastName },
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: soldTicket.qrCode });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(true);
      expect(result.message).toBe('Ticket is valid');
    });

    it('should return invalid for non-existent QR code', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act
      const result = await ticketsService.validateTicket({ qrCode: 'INVALID-QR-CODE' });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('QR code not found');
    });

    it('should return invalid for cancelled ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...cancelledTicket,
        festival: ongoingFestival,
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: cancelledTicket.qrCode });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cancelled');
    });

    it('should return invalid for refunded ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...refundedTicket,
        festival: ongoingFestival,
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: refundedTicket.qrCode });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('refunded');
    });

    it('should return invalid for already used ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...usedTicket,
        festival: ongoingFestival,
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: usedTicket.qrCode });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already used');
    });

    it('should validate but deny access if festival has not started', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...publishedFestival, status: FestivalStatus.PUBLISHED, startDate: futureDate },
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: soldTicket.qrCode });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
      expect(result.message).toContain('not started yet');
    });

    it('should return invalid if festival has ended', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...completedFestival, endDate: pastDate },
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.validateTicket({ qrCode: soldTicket.qrCode });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('ended');
    });

    it('should check zone access when zoneId provided', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: { ...standardCategory, type: TicketType.STANDARD },
      });
      mockPrismaService.zone.findUnique.mockResolvedValue(mainStageZone);

      // Act
      const result = await ticketsService.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: mainStageZone.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(true);
    });

    it('should deny access if ticket type not allowed in zone', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: { ...standardCategory, type: TicketType.STANDARD },
      });
      mockPrismaService.zone.findUnique.mockResolvedValue({
        ...vipLounge,
        requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
      });

      // Act
      const result = await ticketsService.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: vipLounge.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
      expect(result.message).toContain('does not have access');
    });

    it('should deny access if zone is at capacity', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
      });
      mockPrismaService.zone.findUnique.mockResolvedValue({
        ...mainStageZone,
        capacity: 100,
        currentOccupancy: 100,
      });

      // Act
      const result = await ticketsService.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: mainStageZone.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
      expect(result.message).toContain('full capacity');
    });

    it('should return invalid if zone not found', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
      });
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act
      const result = await ticketsService.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: 'non-existent-zone',
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid zone');
    });

    it('should allow VIP ticket type to access VIP zone', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: { ...standardCategory, type: TicketType.VIP },
      });
      mockPrismaService.zone.findUnique.mockResolvedValue({
        ...vipLounge,
        requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
      });

      // Act
      const result = await ticketsService.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: vipLounge.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(true);
    });
  });

  // ==========================================================================
  // Scan Ticket Tests
  // ==========================================================================

  describe('scanTicket', () => {
    it('should mark ticket as used when scanned', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        ...soldTicket,
        status: TicketStatus.USED,
        usedAt: new Date(),
        usedByStaffId: staffUser.id,
        festival: { id: ongoingFestival.id, name: ongoingFestival.name, startDate: ongoingFestival.startDate, endDate: ongoingFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act
      const result = await ticketsService.scanTicket(soldTicket.qrCode, staffUser.id);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(true);
      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { qrCode: soldTicket.qrCode },
          data: expect.objectContaining({
            status: TicketStatus.USED,
            usedByStaffId: staffUser.id,
          }),
        }),
      );
    });

    it('should create zone access log when zoneId provided', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: standardCategory,
        user: regularUser,
      });
      mockPrismaService.zone.findUnique.mockResolvedValue(mainStageZone);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...soldTicket,
        id: soldTicket.id,
        status: TicketStatus.USED,
        usedAt: new Date(),
        festival: { id: ongoingFestival.id, name: ongoingFestival.name, startDate: ongoingFestival.startDate, endDate: ongoingFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });
      mockPrismaService.zoneAccessLog.create.mockResolvedValue({});
      mockPrismaService.zone.update.mockResolvedValue({});

      // Act
      await ticketsService.scanTicket(soldTicket.qrCode, staffUser.id, mainStageZone.id);

      // Assert
      expect(mockPrismaService.zoneAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          zoneId: mainStageZone.id,
          ticketId: soldTicket.id,
          action: 'ENTRY',
          performedById: staffUser.id,
        }),
      });
      expect(mockPrismaService.zone.update).toHaveBeenCalledWith({
        where: { id: mainStageZone.id },
        data: { currentOccupancy: { increment: 1 } },
      });
    });

    it('should not mark ticket as used if validation fails', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...usedTicket,
        festival: ongoingFestival,
        category: standardCategory,
      });

      // Act
      const result = await ticketsService.scanTicket(usedTicket.qrCode, staffUser.id);

      // Assert
      expect(result.valid).toBe(false);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });

    it('should not mark ticket as used if access is not granted', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { ...ongoingFestival, status: FestivalStatus.ONGOING },
        category: { ...standardCategory, type: TicketType.STANDARD },
        user: regularUser,
      });
      mockPrismaService.zone.findUnique.mockResolvedValue({
        ...vipLounge,
        requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
      });

      // Act
      const result = await ticketsService.scanTicket(soldTicket.qrCode, staffUser.id, vipLounge.id);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Get User Tickets Tests
  // ==========================================================================

  describe('getUserTickets', () => {
    it('should return all tickets for a user', async () => {
      // Arrange
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          ...soldTicket,
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
      ]);

      // Act
      const result = await ticketsService.getUserTickets(regularUser.id);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: regularUser.id },
        }),
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      // Act
      await ticketsService.getUserTickets(regularUser.id, publishedFestival.id);

      // Assert
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: regularUser.id,
            festivalId: publishedFestival.id,
          },
        }),
      );
    });

    it('should return empty array if user has no tickets', async () => {
      // Arrange
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      // Act
      const result = await ticketsService.getUserTickets('user-with-no-tickets');

      // Assert
      expect(result).toEqual([]);
    });

    it('should include festival and category information', async () => {
      // Arrange
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          ...soldTicket,
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
      ]);

      // Act
      const result = await ticketsService.getUserTickets(regularUser.id);

      // Assert
      expect(result[0].festival).toBeDefined();
      expect(result[0].festival?.name).toBe(publishedFestival.name);
      expect(result[0].category).toBeDefined();
      expect(result[0].category?.name).toBe(standardCategory.name);
    });
  });

  // ==========================================================================
  // Get Ticket By ID Tests
  // ==========================================================================

  describe('getTicketById', () => {
    it('should return ticket by ID', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act
      const result = await ticketsService.getTicketById(soldTicket.id);

      // Assert
      expect(result.id).toBe(soldTicket.id);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(ticketsService.getTicketById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if userId does not match', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: 'different-user-id',
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act & Assert
      await expect(ticketsService.getTicketById(soldTicket.id, regularUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow access if userId matches', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: regularUser.id,
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act
      const result = await ticketsService.getTicketById(soldTicket.id, regularUser.id);

      // Assert
      expect(result.id).toBe(soldTicket.id);
    });

    it('should allow access without userId check if no userId provided', async () => {
      // Arrange - ticket belongs to different user, but no userId provided
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: 'some-other-user',
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act - no userId provided
      const result = await ticketsService.getTicketById(soldTicket.id);

      // Assert
      expect(result.id).toBe(soldTicket.id);
    });
  });

  // ==========================================================================
  // Cancel Ticket Tests
  // ==========================================================================

  describe('cancelTicket', () => {
    it('should cancel a valid ticket', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: regularUser.id,
        festival: { ...publishedFestival, startDate: futureDate },
        category: standardCategory,
      });
      mockPrismaService.$transaction.mockResolvedValue([
        {
          ...soldTicket,
          status: TicketStatus.CANCELLED,
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: futureDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
        standardCategory,
      ]);

      // Act
      const result = await ticketsService.cancelTicket(soldTicket.id, regularUser.id);

      // Assert
      expect(result.status).toBe(TicketStatus.CANCELLED);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(ticketsService.cancelTicket('non-existent-id', regularUser.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: 'different-user-id',
        festival: publishedFestival,
        category: standardCategory,
      });

      // Act & Assert
      await expect(ticketsService.cancelTicket(soldTicket.id, regularUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw TicketAlreadyUsedException if ticket already used', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...usedTicket,
        userId: regularUser.id,
        festival: publishedFestival,
        category: standardCategory,
      });

      // Act & Assert
      await expect(ticketsService.cancelTicket(usedTicket.id, regularUser.id))
        .rejects.toThrow(TicketAlreadyUsedException);
    });

    it('should throw TicketSaleEndedException if festival has started', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: regularUser.id,
        festival: { ...ongoingFestival, startDate: pastDate },
        category: standardCategory,
      });

      // Act & Assert
      await expect(ticketsService.cancelTicket(soldTicket.id, regularUser.id))
        .rejects.toThrow(TicketSaleEndedException);
    });

    it('should decrement category soldCount on cancellation', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: regularUser.id,
        festival: { ...publishedFestival, startDate: futureDate },
        category: standardCategory,
      });
      // Mock $transaction to return array with cancelled ticket as first element
      mockPrismaService.$transaction.mockResolvedValue([
        {
          ...soldTicket,
          status: TicketStatus.CANCELLED,
          festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: futureDate, endDate: publishedFestival.endDate },
          category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
        },
        { ...standardCategory, soldCount: standardCategory.soldCount - 1 },
      ]);

      // Act
      await ticketsService.cancelTicket(soldTicket.id, regularUser.id);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Get Ticket QR Code Image Tests
  // ==========================================================================

  describe('getTicketQrCodeImage', () => {
    it('should return QR code as data URL', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: regularUser.id,
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act
      const result = await ticketsService.getTicketQrCodeImage(soldTicket.id, regularUser.id);

      // Assert
      expect(result).toContain('data:image/png;base64');
    });

    it('should throw NotFoundException if ticket not found', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(ticketsService.getTicketQrCodeImage('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the ticket', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...soldTicket,
        userId: 'different-user-id',
        festival: { id: publishedFestival.id, name: publishedFestival.name, startDate: publishedFestival.startDate, endDate: publishedFestival.endDate },
        category: { id: standardCategory.id, name: standardCategory.name, type: standardCategory.type },
      });

      // Act & Assert
      await expect(ticketsService.getTicketQrCodeImage(soldTicket.id, regularUser.id))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
