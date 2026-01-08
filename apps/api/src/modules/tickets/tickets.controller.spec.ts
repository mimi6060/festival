/**
 * Tickets Controller Unit Tests
 *
 * Tests for TicketsController endpoints including:
 * - GET /api/tickets - Get user tickets
 * - GET /api/tickets/:id - Get ticket by ID
 * - GET /api/tickets/:id/qrcode - Get ticket QR code
 * - POST /api/tickets/purchase - Purchase tickets
 * - POST /api/tickets/guest-purchase - Guest purchase
 * - POST /api/tickets/validate - Validate ticket
 * - POST /api/tickets/:id/scan - Scan ticket
 * - DELETE /api/tickets/:id - Cancel ticket
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketStatus, TicketType } from '@prisma/client';
import {
  regularUser,
  staffUser,
  publishedFestival,
  _ongoingFestival,
  standardCategory,
  soldTicket,
  usedTicket,
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
} from '../../common/exceptions/business.exception';

describe('TicketsController', () => {
  let controller: TicketsController;
  let _ticketsService: jest.Mocked<TicketsService>;

  const mockTicketsService = {
    getUserTickets: jest.fn(),
    getTicketById: jest.fn(),
    getTicketQrCodeImage: jest.fn(),
    purchaseTickets: jest.fn(),
    guestPurchaseTickets: jest.fn(),
    validateTicket: jest.fn(),
    scanTicket: jest.fn(),
    cancelTicket: jest.fn(),
  };

  // Mock request object with user
  const mockRequest = {
    user: {
      id: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    },
  };

  const mockStaffRequest = {
    user: {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
    },
  };

  // Sample ticket entity response
  const mockTicketEntity = {
    id: soldTicket.id,
    festivalId: publishedFestival.id,
    categoryId: standardCategory.id,
    userId: regularUser.id,
    qrCode: soldTicket.qrCode,
    status: TicketStatus.SOLD,
    purchasePrice: 149.99,
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    festival: {
      id: publishedFestival.id,
      name: publishedFestival.name,
      startDate: publishedFestival.startDate,
      endDate: publishedFestival.endDate,
    },
    category: {
      id: standardCategory.id,
      name: standardCategory.name,
      type: TicketType.STANDARD,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<TicketsController>(TicketsController);
    _ticketsService = module.get(TicketsService);
  });

  describe('getUserTickets', () => {
    it('should return all tickets for authenticated user', async () => {
      // Arrange
      const tickets = [mockTicketEntity];
      mockTicketsService.getUserTickets.mockResolvedValue(tickets);

      // Act
      const result = await controller.getUserTickets(mockRequest);

      // Assert
      expect(result).toEqual(tickets);
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      const tickets = [mockTicketEntity];
      mockTicketsService.getUserTickets.mockResolvedValue(tickets);

      // Act
      const result = await controller.getUserTickets(
        mockRequest,
        publishedFestival.id,
      );

      // Assert
      expect(result).toEqual(tickets);
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        regularUser.id,
        publishedFestival.id,
      );
    });

    it('should return empty array when user has no tickets', async () => {
      // Arrange
      mockTicketsService.getUserTickets.mockResolvedValue([]);

      // Act
      const result = await controller.getUserTickets(mockRequest);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTicketById', () => {
    it('should return ticket by ID for authenticated user', async () => {
      // Arrange
      mockTicketsService.getTicketById.mockResolvedValue(mockTicketEntity);

      // Act
      const result = await controller.getTicketById(mockRequest, soldTicket.id);

      // Assert
      expect(result).toEqual(mockTicketEntity);
      expect(mockTicketsService.getTicketById).toHaveBeenCalledWith(
        soldTicket.id,
        regularUser.id,
      );
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      // Arrange
      mockTicketsService.getTicketById.mockRejectedValue(
        NotFoundException.ticket('non-existent-id'),
      );

      // Act & Assert
      await expect(
        controller.getTicketById(mockRequest, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      // Arrange
      mockTicketsService.getTicketById.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket'),
      );

      // Act & Assert
      await expect(
        controller.getTicketById(mockRequest, 'other-user-ticket'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTicketQrCode', () => {
    it('should return QR code for ticket', async () => {
      // Arrange
      const qrCodeImage = 'data:image/png;base64,mockQRCode';
      mockTicketsService.getTicketQrCodeImage.mockResolvedValue(qrCodeImage);

      // Act
      const result = await controller.getTicketQrCode(mockRequest, soldTicket.id);

      // Assert
      expect(result).toEqual({ qrCode: qrCodeImage });
      expect(mockTicketsService.getTicketQrCodeImage).toHaveBeenCalledWith(
        soldTicket.id,
        regularUser.id,
      );
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      // Arrange
      mockTicketsService.getTicketQrCodeImage.mockRejectedValue(
        NotFoundException.ticket('non-existent-id'),
      );

      // Act & Assert
      await expect(
        controller.getTicketQrCode(mockRequest, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      // Arrange
      mockTicketsService.getTicketQrCodeImage.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket'),
      );

      // Act & Assert
      await expect(
        controller.getTicketQrCode(mockRequest, 'other-user-ticket'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('purchaseTickets', () => {
    const validPurchaseDto = {
      festivalId: publishedFestival.id,
      categoryId: standardCategory.id,
      quantity: 2,
    };

    it('should purchase tickets successfully', async () => {
      // Arrange
      const purchasedTickets = [mockTicketEntity, mockTicketEntity];
      mockTicketsService.purchaseTickets.mockResolvedValue(purchasedTickets);

      // Act
      const result = await controller.purchaseTickets(
        mockRequest,
        validPurchaseDto,
      );

      // Assert
      expect(result).toEqual(purchasedTickets);
      expect(mockTicketsService.purchaseTickets).toHaveBeenCalledWith(
        regularUser.id,
        validPurchaseDto,
      );
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        NotFoundException.festival('non-existent'),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          festivalId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        NotFoundException.ticketCategory('non-existent'),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          categoryId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TicketSoldOutException when tickets are sold out', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSoldOutException(standardCategory.id, standardCategory.name),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, validPurchaseDto),
      ).rejects.toThrow(TicketSoldOutException);
    });

    it('should throw TicketQuotaExceededException when quota exceeded', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketQuotaExceededException(4, 10),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          quantity: 10,
        }),
      ).rejects.toThrow(TicketQuotaExceededException);
    });

    it('should throw TicketSaleNotStartedException when sale not started', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSaleNotStartedException(new Date('2099-01-01')),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, validPurchaseDto),
      ).rejects.toThrow(TicketSaleNotStartedException);
    });

    it('should throw TicketSaleEndedException when sale ended', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSaleEndedException(new Date('2020-01-01')),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, validPurchaseDto),
      ).rejects.toThrow(TicketSaleEndedException);
    });

    it('should throw FestivalCancelledException when festival is cancelled', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new FestivalCancelledException(publishedFestival.id),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, validPurchaseDto),
      ).rejects.toThrow(FestivalCancelledException);
    });

    it('should throw ValidationException for invalid quantity', async () => {
      // Arrange
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new ValidationException('Quantity must be at least 1'),
      );

      // Act & Assert
      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          quantity: 0,
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('guestPurchaseTickets', () => {
    const validGuestPurchaseDto = {
      festivalId: publishedFestival.id,
      categoryId: standardCategory.id,
      quantity: 1,
      email: 'guest@example.com',
      firstName: 'Guest',
      lastName: 'User',
    };

    it('should allow guest purchase without authentication', async () => {
      // Arrange
      const purchasedTickets = [mockTicketEntity];
      mockTicketsService.guestPurchaseTickets.mockResolvedValue(purchasedTickets);

      // Act
      const result = await controller.guestPurchaseTickets(validGuestPurchaseDto);

      // Assert
      expect(result).toEqual(purchasedTickets);
      expect(mockTicketsService.guestPurchaseTickets).toHaveBeenCalledWith(
        validGuestPurchaseDto,
      );
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockTicketsService.guestPurchaseTickets.mockRejectedValue(
        NotFoundException.festival('non-existent'),
      );

      // Act & Assert
      await expect(
        controller.guestPurchaseTickets({
          ...validGuestPurchaseDto,
          festivalId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TicketSoldOutException when tickets are sold out', async () => {
      // Arrange
      mockTicketsService.guestPurchaseTickets.mockRejectedValue(
        new TicketSoldOutException(standardCategory.id, standardCategory.name),
      );

      // Act & Assert
      await expect(
        controller.guestPurchaseTickets(validGuestPurchaseDto),
      ).rejects.toThrow(TicketSoldOutException);
    });
  });

  describe('validateTicket', () => {
    const validValidateDto = {
      qrCode: soldTicket.qrCode,
    };

    it('should validate a valid ticket', async () => {
      // Arrange
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Ticket is valid',
        accessGranted: true,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTicket(validValidateDto);

      // Assert
      expect(result).toEqual(validationResult);
      expect(mockTicketsService.validateTicket).toHaveBeenCalledWith(
        validValidateDto,
      );
    });

    it('should return invalid for non-existent QR code', async () => {
      // Arrange
      const validationResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTicket({
        qrCode: 'INVALID-QR',
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('QR code not found');
    });

    it('should return invalid for already used ticket', async () => {
      // Arrange
      const validationResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Ticket already used',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTicket({
        qrCode: usedTicket.qrCode,
      });

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should validate with zoneId when provided', async () => {
      // Arrange
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Ticket is valid',
        accessGranted: true,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);
      const validateDtoWithZone = {
        qrCode: soldTicket.qrCode,
        zoneId: 'zone-123',
      };

      // Act
      const result = await controller.validateTicket(validateDtoWithZone);

      // Assert
      expect(result).toEqual(validationResult);
      expect(mockTicketsService.validateTicket).toHaveBeenCalledWith(
        validateDtoWithZone,
      );
    });

    it('should deny access when zone capacity is reached', async () => {
      // Arrange
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Zone Main Stage is at full capacity',
        accessGranted: false,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: 'zone-123',
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
    });
  });

  describe('scanTicket', () => {
    it('should scan ticket and mark as used', async () => {
      // Arrange
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      // Act
      const result = await controller.scanTicket(
        mockStaffRequest,
        soldTicket.qrCode,
      );

      // Assert
      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        staffUser.id,
        undefined,
      );
    });

    it('should scan ticket with zoneId when provided', async () => {
      // Arrange
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      // Act
      const result = await controller.scanTicket(
        mockStaffRequest,
        soldTicket.qrCode,
        'zone-123',
      );

      // Assert
      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        staffUser.id,
        'zone-123',
      );
    });

    it('should return invalid for already used ticket', async () => {
      // Arrange
      const scanResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Ticket already used',
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      // Act
      const result = await controller.scanTicket(
        mockStaffRequest,
        usedTicket.qrCode,
      );

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-existent QR code', async () => {
      // Arrange
      const scanResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      // Act
      const result = await controller.scanTicket(
        mockStaffRequest,
        'INVALID-QR',
      );

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should deny access when ticket type not allowed in zone', async () => {
      // Arrange
      const scanResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Ticket type STANDARD does not have access to VIP Lounge',
        accessGranted: false,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      // Act
      const result = await controller.scanTicket(
        mockStaffRequest,
        soldTicket.qrCode,
        'vip-zone',
      );

      // Assert
      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
    });
  });

  describe('cancelTicket', () => {
    it('should cancel a valid ticket', async () => {
      // Arrange
      const cancelledTicket = {
        ...mockTicketEntity,
        status: TicketStatus.CANCELLED,
      };
      mockTicketsService.cancelTicket.mockResolvedValue(cancelledTicket);

      // Act
      const result = await controller.cancelTicket(mockRequest, soldTicket.id);

      // Assert
      expect(result.status).toBe(TicketStatus.CANCELLED);
      expect(mockTicketsService.cancelTicket).toHaveBeenCalledWith(
        soldTicket.id,
        regularUser.id,
      );
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      // Arrange
      mockTicketsService.cancelTicket.mockRejectedValue(
        NotFoundException.ticket('non-existent-id'),
      );

      // Act & Assert
      await expect(
        controller.cancelTicket(mockRequest, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      // Arrange
      mockTicketsService.cancelTicket.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket'),
      );

      // Act & Assert
      await expect(
        controller.cancelTicket(mockRequest, 'other-user-ticket'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw TicketAlreadyUsedException when ticket is already used', async () => {
      // Arrange
      mockTicketsService.cancelTicket.mockRejectedValue(
        new TicketAlreadyUsedException(usedTicket.id, new Date()),
      );

      // Act & Assert
      await expect(
        controller.cancelTicket(mockRequest, usedTicket.id),
      ).rejects.toThrow(TicketAlreadyUsedException);
    });

    it('should throw TicketSaleEndedException when festival has started', async () => {
      // Arrange
      mockTicketsService.cancelTicket.mockRejectedValue(
        new TicketSaleEndedException(new Date()),
      );

      // Act & Assert
      await expect(
        controller.cancelTicket(mockRequest, soldTicket.id),
      ).rejects.toThrow(TicketSaleEndedException);
    });
  });
});
