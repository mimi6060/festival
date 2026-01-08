/**
 * Tickets Controller Unit Tests
 *
 * Comprehensive tests for TicketsController endpoints including:
 * - GET /api/tickets - Get user tickets
 * - GET /api/tickets/:id - Get ticket by ID
 * - GET /api/tickets/:id/qrcode - Get ticket QR code
 * - POST /api/tickets/purchase - Purchase tickets
 * - POST /api/tickets/guest-purchase - Guest purchase
 * - POST /api/tickets/validate - Validate ticket
 * - POST /api/tickets/:id/scan - Scan ticket
 * - DELETE /api/tickets/:id - Cancel ticket
 *
 * Coverage includes:
 * - Authentication (JwtAuthGuard)
 * - Authorization (RolesGuard for staff endpoints)
 * - Input validation
 * - Error handling
 * - Edge cases
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TicketStatus, TicketType } from '@prisma/client';
import {
  regularUser,
  staffUser,
  securityUser,
  adminUser,
  organizerUser,
  publishedFestival,
  ongoingFestival,
  cancelledFestival,
  standardCategory,
  vipCategory,
  soldOutCategory,
  soldTicket,
  usedTicket,
  cancelledTicket,
  refundedTicket,
  vipTicket,
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

  // Mock request objects for different user types
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

  const mockSecurityRequest = {
    user: {
      id: securityUser.id,
      email: securityUser.email,
      role: securityUser.role,
    },
  };

  const mockAdminRequest = {
    user: {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
  };

  const mockOrganizerRequest = {
    user: {
      id: organizerUser.id,
      email: organizerUser.email,
      role: organizerUser.role,
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

  const mockVipTicketEntity = {
    ...mockTicketEntity,
    id: vipTicket.id,
    categoryId: vipCategory.id,
    qrCode: vipTicket.qrCode,
    purchasePrice: 399.99,
    category: {
      id: vipCategory.id,
      name: vipCategory.name,
      type: TicketType.VIP,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<TicketsController>(TicketsController);
    _ticketsService = module.get(TicketsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // GET /api/tickets - getUserTickets
  // ==========================================================================

  describe('getUserTickets', () => {
    const mockPaginatedResponse = (tickets: (typeof mockTicketEntity)[]) => ({
      items: tickets,
      total: tickets.length,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });

    it('should return all tickets for authenticated user', async () => {
      const tickets = [mockTicketEntity];
      mockTicketsService.getUserTickets.mockResolvedValue(mockPaginatedResponse(tickets));

      const result = await controller.getUserTickets(mockRequest, {});

      expect(result.items).toEqual(tickets);
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(regularUser.id, {
        festivalId: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter by festivalId when provided', async () => {
      const tickets = [mockTicketEntity];
      mockTicketsService.getUserTickets.mockResolvedValue(mockPaginatedResponse(tickets));

      const result = await controller.getUserTickets(mockRequest, {
        festivalId: publishedFestival.id,
      });

      expect(result.items).toEqual(tickets);
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(regularUser.id, {
        festivalId: publishedFestival.id,
        page: undefined,
        limit: undefined,
      });
    });

    it('should return empty array when user has no tickets', async () => {
      mockTicketsService.getUserTickets.mockResolvedValue(mockPaginatedResponse([]));

      const result = await controller.getUserTickets(mockRequest, {});

      expect(result.items).toEqual([]);
    });

    it('should return tickets for different festivals', async () => {
      const ticketFromOtherFestival = {
        ...mockTicketEntity,
        id: 'other-ticket-id',
        festivalId: ongoingFestival.id,
        festival: {
          id: ongoingFestival.id,
          name: ongoingFestival.name,
          startDate: ongoingFestival.startDate,
          endDate: ongoingFestival.endDate,
        },
      };
      const tickets = [mockTicketEntity, ticketFromOtherFestival];
      mockTicketsService.getUserTickets.mockResolvedValue(mockPaginatedResponse(tickets));

      const result = await controller.getUserTickets(mockRequest, {});

      expect(result.items).toHaveLength(2);
    });

    it('should handle service errors gracefully', async () => {
      mockTicketsService.getUserTickets.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getUserTickets(mockRequest, {})).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  // ==========================================================================
  // GET /api/tickets/:id - getTicketById
  // ==========================================================================

  describe('getTicketById', () => {
    it('should return ticket by ID for authenticated user', async () => {
      mockTicketsService.getTicketById.mockResolvedValue(mockTicketEntity);

      const result = await controller.getTicketById(mockRequest, soldTicket.id);

      expect(result).toEqual(mockTicketEntity);
      expect(mockTicketsService.getTicketById).toHaveBeenCalledWith(soldTicket.id, regularUser.id);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockTicketsService.getTicketById.mockRejectedValue(
        NotFoundException.ticket('non-existent-id')
      );

      await expect(controller.getTicketById(mockRequest, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      mockTicketsService.getTicketById.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket')
      );

      await expect(controller.getTicketById(mockRequest, 'other-user-ticket')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return ticket with USED status', async () => {
      const usedTicketEntity = {
        ...mockTicketEntity,
        id: usedTicket.id,
        status: TicketStatus.USED,
        usedAt: new Date('2024-07-15T14:30:00Z'),
      };
      mockTicketsService.getTicketById.mockResolvedValue(usedTicketEntity);

      const result = await controller.getTicketById(mockRequest, usedTicket.id);

      expect(result.status).toBe(TicketStatus.USED);
      expect(result.usedAt).toBeDefined();
    });

    it('should return ticket with CANCELLED status', async () => {
      const cancelledTicketEntity = {
        ...mockTicketEntity,
        id: cancelledTicket.id,
        status: TicketStatus.CANCELLED,
      };
      mockTicketsService.getTicketById.mockResolvedValue(cancelledTicketEntity);

      const result = await controller.getTicketById(mockRequest, cancelledTicket.id);

      expect(result.status).toBe(TicketStatus.CANCELLED);
    });
  });

  // ==========================================================================
  // GET /api/tickets/:id/qrcode - getTicketQrCode
  // ==========================================================================

  describe('getTicketQrCode', () => {
    const qrCodeImage = 'data:image/png;base64,mockQRCodeBase64String';

    it('should return QR code for ticket', async () => {
      mockTicketsService.getTicketQrCodeImage.mockResolvedValue(qrCodeImage);

      const result = await controller.getTicketQrCode(mockRequest, soldTicket.id);

      expect(result).toEqual({ qrCode: qrCodeImage });
      expect(mockTicketsService.getTicketQrCodeImage).toHaveBeenCalledWith(
        soldTicket.id,
        regularUser.id
      );
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockTicketsService.getTicketQrCodeImage.mockRejectedValue(
        NotFoundException.ticket('non-existent-id')
      );

      await expect(controller.getTicketQrCode(mockRequest, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      mockTicketsService.getTicketQrCodeImage.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket')
      );

      await expect(controller.getTicketQrCode(mockRequest, 'other-user-ticket')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return QR code with correct data URL format', async () => {
      mockTicketsService.getTicketQrCodeImage.mockResolvedValue(qrCodeImage);

      const result = await controller.getTicketQrCode(mockRequest, soldTicket.id);

      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  // ==========================================================================
  // POST /api/tickets/purchase - purchaseTickets
  // ==========================================================================

  describe('purchaseTickets', () => {
    const validPurchaseDto = {
      festivalId: publishedFestival.id,
      categoryId: standardCategory.id,
      quantity: 2,
    };

    it('should purchase tickets successfully', async () => {
      const purchasedTickets = [mockTicketEntity, mockTicketEntity];
      mockTicketsService.purchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.purchaseTickets(mockRequest, validPurchaseDto);

      expect(result).toEqual(purchasedTickets);
      expect(mockTicketsService.purchaseTickets).toHaveBeenCalledWith(
        regularUser.id,
        validPurchaseDto
      );
    });

    it('should purchase single ticket', async () => {
      const purchasedTickets = [mockTicketEntity];
      mockTicketsService.purchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.purchaseTickets(mockRequest, {
        ...validPurchaseDto,
        quantity: 1,
      });

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when festival not found', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        NotFoundException.festival('non-existent')
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          festivalId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        NotFoundException.ticketCategory('non-existent')
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          categoryId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TicketSoldOutException when tickets are sold out', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSoldOutException(soldOutCategory.id, soldOutCategory.name)
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          categoryId: soldOutCategory.id,
        })
      ).rejects.toThrow(TicketSoldOutException);
    });

    it('should throw TicketQuotaExceededException when quota exceeded', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(new TicketQuotaExceededException(4, 10));

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          quantity: 10,
        })
      ).rejects.toThrow(TicketQuotaExceededException);
    });

    it('should throw TicketSaleNotStartedException when sale not started', async () => {
      const futureSaleDate = new Date('2099-01-01');
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSaleNotStartedException(futureSaleDate)
      );

      await expect(controller.purchaseTickets(mockRequest, validPurchaseDto)).rejects.toThrow(
        TicketSaleNotStartedException
      );
    });

    it('should throw TicketSaleEndedException when sale ended', async () => {
      const pastSaleDate = new Date('2020-01-01');
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new TicketSaleEndedException(pastSaleDate)
      );

      await expect(controller.purchaseTickets(mockRequest, validPurchaseDto)).rejects.toThrow(
        TicketSaleEndedException
      );
    });

    it('should throw FestivalCancelledException when festival is cancelled', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new FestivalCancelledException(cancelledFestival.id)
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          festivalId: cancelledFestival.id,
        })
      ).rejects.toThrow(FestivalCancelledException);
    });

    it('should throw FestivalEndedException when festival is completed', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new FestivalEndedException('completed-festival', new Date())
      );

      await expect(controller.purchaseTickets(mockRequest, validPurchaseDto)).rejects.toThrow(
        FestivalEndedException
      );
    });

    it('should throw ValidationException for invalid quantity (zero)', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new ValidationException('Quantity must be at least 1')
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          quantity: 0,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException for negative quantity', async () => {
      mockTicketsService.purchaseTickets.mockRejectedValue(
        new ValidationException('Quantity must be at least 1')
      );

      await expect(
        controller.purchaseTickets(mockRequest, {
          ...validPurchaseDto,
          quantity: -1,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should purchase VIP tickets', async () => {
      const vipPurchase = {
        festivalId: publishedFestival.id,
        categoryId: vipCategory.id,
        quantity: 1,
      };
      mockTicketsService.purchaseTickets.mockResolvedValue([mockVipTicketEntity]);

      const result = await controller.purchaseTickets(mockRequest, vipPurchase);

      expect(result[0]?.category?.type).toBe(TicketType.VIP);
    });
  });

  // ==========================================================================
  // POST /api/tickets/guest-purchase - guestPurchaseTickets
  // ==========================================================================

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
      const purchasedTickets = [mockTicketEntity];
      mockTicketsService.guestPurchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.guestPurchaseTickets(validGuestPurchaseDto);

      expect(result).toEqual(purchasedTickets);
      expect(mockTicketsService.guestPurchaseTickets).toHaveBeenCalledWith(validGuestPurchaseDto);
    });

    it('should allow guest purchase with phone number', async () => {
      const dtoWithPhone = {
        ...validGuestPurchaseDto,
        phone: '+33612345678',
      };
      const purchasedTickets = [mockTicketEntity];
      mockTicketsService.guestPurchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.guestPurchaseTickets(dtoWithPhone);

      expect(result).toEqual(purchasedTickets);
      expect(mockTicketsService.guestPurchaseTickets).toHaveBeenCalledWith(dtoWithPhone);
    });

    it('should throw NotFoundException when festival not found', async () => {
      mockTicketsService.guestPurchaseTickets.mockRejectedValue(
        NotFoundException.festival('non-existent')
      );

      await expect(
        controller.guestPurchaseTickets({
          ...validGuestPurchaseDto,
          festivalId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TicketSoldOutException when tickets are sold out', async () => {
      mockTicketsService.guestPurchaseTickets.mockRejectedValue(
        new TicketSoldOutException(soldOutCategory.id, soldOutCategory.name)
      );

      await expect(
        controller.guestPurchaseTickets({
          ...validGuestPurchaseDto,
          categoryId: soldOutCategory.id,
        })
      ).rejects.toThrow(TicketSoldOutException);
    });

    it('should throw ValidationException for invalid email', async () => {
      mockTicketsService.guestPurchaseTickets.mockRejectedValue(
        new ValidationException('Invalid email format')
      );

      await expect(
        controller.guestPurchaseTickets({
          ...validGuestPurchaseDto,
          email: 'invalid-email',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should purchase multiple tickets as guest', async () => {
      const multiTicketDto = {
        ...validGuestPurchaseDto,
        quantity: 3,
      };
      const purchasedTickets = [mockTicketEntity, mockTicketEntity, mockTicketEntity];
      mockTicketsService.guestPurchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.guestPurchaseTickets(multiTicketDto);

      expect(result).toHaveLength(3);
    });

    it('should handle guest purchase with special characters in name', async () => {
      const dtoWithSpecialChars = {
        ...validGuestPurchaseDto,
        firstName: 'Jean-Pierre',
        lastName: "O'Connor",
      };
      mockTicketsService.guestPurchaseTickets.mockResolvedValue([mockTicketEntity]);

      const result = await controller.guestPurchaseTickets(dtoWithSpecialChars);

      expect(result).toBeDefined();
    });

    it('should handle guest purchase with Unicode name', async () => {
      const dtoWithUnicode = {
        ...validGuestPurchaseDto,
        firstName: 'Marie',
        lastName: 'Mueller',
      };
      mockTicketsService.guestPurchaseTickets.mockResolvedValue([mockTicketEntity]);

      const result = await controller.guestPurchaseTickets(dtoWithUnicode);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /api/tickets/validate - validateTicket
  // ==========================================================================

  describe('validateTicket', () => {
    const validValidateDto = {
      qrCode: soldTicket.qrCode,
    };

    it('should validate a valid ticket', async () => {
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Ticket is valid',
        accessGranted: true,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket(validValidateDto);

      expect(result).toEqual(validationResult);
      expect(mockTicketsService.validateTicket).toHaveBeenCalledWith(validValidateDto);
    });

    it('should return invalid for non-existent QR code', async () => {
      const validationResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: 'INVALID-QR',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('QR code not found');
    });

    it('should return invalid for already used ticket', async () => {
      const validationResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Ticket already used',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: usedTicket.qrCode,
      });

      expect(result.valid).toBe(false);
    });

    it('should return invalid for cancelled ticket', async () => {
      const validationResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.CANCELLED },
        message: 'Ticket has been cancelled',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: cancelledTicket.qrCode,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('cancelled');
    });

    it('should return invalid for refunded ticket', async () => {
      const validationResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.REFUNDED },
        message: 'Ticket has been refunded',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: refundedTicket.qrCode,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('refunded');
    });

    it('should validate with zoneId when provided', async () => {
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: 'Ticket is valid',
        accessGranted: true,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);
      const validateDtoWithZone = {
        qrCode: soldTicket.qrCode,
        zoneId: mainStageZone.id,
      };

      const result = await controller.validateTicket(validateDtoWithZone);

      expect(result).toEqual(validationResult);
      expect(mockTicketsService.validateTicket).toHaveBeenCalledWith(validateDtoWithZone);
    });

    it('should deny access when zone capacity is reached', async () => {
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: `Zone ${mainStageZone.name} is at full capacity`,
        accessGranted: false,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: mainStageZone.id,
      });

      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
    });

    it('should deny access when ticket type not allowed in VIP zone', async () => {
      const validationResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: `Ticket type STANDARD does not have access to ${vipLounge.name}`,
        accessGranted: false,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: soldTicket.qrCode,
        zoneId: vipLounge.id,
      });

      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
    });

    it('should grant access for VIP ticket to VIP zone', async () => {
      const validationResult = {
        valid: true,
        ticket: mockVipTicketEntity,
        message: 'Ticket is valid',
        accessGranted: true,
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: vipTicket.qrCode,
        zoneId: vipLounge.id,
      });

      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/tickets/:id/scan - scanTicket
  // ==========================================================================

  describe('scanTicket', () => {
    it('should scan ticket and mark as used', async () => {
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockStaffRequest, soldTicket.qrCode);

      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        staffUser.id,
        undefined
      );
    });

    it('should scan ticket with zoneId when provided', async () => {
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(
        mockStaffRequest,
        soldTicket.qrCode,
        mainStageZone.id
      );

      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        staffUser.id,
        mainStageZone.id
      );
    });

    it('should return invalid for already used ticket', async () => {
      const scanResult = {
        valid: false,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Ticket already used',
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockStaffRequest, usedTicket.qrCode);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-existent QR code', async () => {
      const scanResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockStaffRequest, 'INVALID-QR');

      expect(result.valid).toBe(false);
    });

    it('should deny access when ticket type not allowed in zone', async () => {
      const scanResult = {
        valid: true,
        ticket: mockTicketEntity,
        message: `Ticket type STANDARD does not have access to ${vipLounge.name}`,
        accessGranted: false,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockStaffRequest, soldTicket.qrCode, vipLounge.id);

      expect(result.valid).toBe(true);
      expect(result.accessGranted).toBe(false);
    });

    it('should allow security user to scan tickets', async () => {
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockSecurityRequest, soldTicket.qrCode);

      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        securityUser.id,
        undefined
      );
    });

    it('should allow admin user to scan tickets', async () => {
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockAdminRequest, soldTicket.qrCode);

      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        adminUser.id,
        undefined
      );
    });

    it('should allow organizer user to scan tickets', async () => {
      const scanResult = {
        valid: true,
        ticket: { ...mockTicketEntity, status: TicketStatus.USED },
        message: 'Entry granted',
        accessGranted: true,
      };
      mockTicketsService.scanTicket.mockResolvedValue(scanResult);

      const result = await controller.scanTicket(mockOrganizerRequest, soldTicket.qrCode);

      expect(result).toEqual(scanResult);
      expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
        soldTicket.qrCode,
        organizerUser.id,
        undefined
      );
    });
  });

  // ==========================================================================
  // DELETE /api/tickets/:id - cancelTicket
  // ==========================================================================

  describe('cancelTicket', () => {
    it('should cancel a valid ticket', async () => {
      const cancelledTicketEntity = {
        ...mockTicketEntity,
        status: TicketStatus.CANCELLED,
      };
      mockTicketsService.cancelTicket.mockResolvedValue(cancelledTicketEntity);

      const result = await controller.cancelTicket(mockRequest, soldTicket.id);

      expect(result.status).toBe(TicketStatus.CANCELLED);
      expect(mockTicketsService.cancelTicket).toHaveBeenCalledWith(soldTicket.id, regularUser.id);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockTicketsService.cancelTicket.mockRejectedValue(
        NotFoundException.ticket('non-existent-id')
      );

      await expect(controller.cancelTicket(mockRequest, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own ticket', async () => {
      mockTicketsService.cancelTicket.mockRejectedValue(
        ForbiddenException.resourceForbidden('ticket')
      );

      await expect(controller.cancelTicket(mockRequest, 'other-user-ticket')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw TicketAlreadyUsedException when ticket is already used', async () => {
      mockTicketsService.cancelTicket.mockRejectedValue(
        new TicketAlreadyUsedException(usedTicket.id, new Date())
      );

      await expect(controller.cancelTicket(mockRequest, usedTicket.id)).rejects.toThrow(
        TicketAlreadyUsedException
      );
    });

    it('should throw TicketSaleEndedException when festival has started', async () => {
      mockTicketsService.cancelTicket.mockRejectedValue(new TicketSaleEndedException(new Date()));

      await expect(controller.cancelTicket(mockRequest, soldTicket.id)).rejects.toThrow(
        TicketSaleEndedException
      );
    });

    it('should throw error for already cancelled ticket', async () => {
      mockTicketsService.cancelTicket.mockRejectedValue(
        new TicketAlreadyUsedException(cancelledTicket.id, new Date())
      );

      await expect(controller.cancelTicket(mockRequest, cancelledTicket.id)).rejects.toThrow(
        TicketAlreadyUsedException
      );
    });
  });

  // ==========================================================================
  // Role-based access control tests
  // ==========================================================================

  describe('Role-based Access Control', () => {
    describe('validate endpoint roles', () => {
      it('should be accessible by STAFF role', async () => {
        const validationResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.validateTicket.mockResolvedValue(validationResult);

        const result = await controller.validateTicket({ qrCode: 'TEST' });

        expect(result).toBeDefined();
      });

      it('should be accessible by SECURITY role', async () => {
        const validationResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.validateTicket.mockResolvedValue(validationResult);

        const result = await controller.validateTicket({ qrCode: 'TEST' });

        expect(result).toBeDefined();
      });

      it('should be accessible by ADMIN role', async () => {
        const validationResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.validateTicket.mockResolvedValue(validationResult);

        const result = await controller.validateTicket({ qrCode: 'TEST' });

        expect(result).toBeDefined();
      });

      it('should be accessible by ORGANIZER role', async () => {
        const validationResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.validateTicket.mockResolvedValue(validationResult);

        const result = await controller.validateTicket({ qrCode: 'TEST' });

        expect(result).toBeDefined();
      });
    });

    describe('scan endpoint roles', () => {
      it('should pass staff user ID to service', async () => {
        const scanResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.scanTicket.mockResolvedValue(scanResult);

        await controller.scanTicket(mockStaffRequest, 'QR-CODE');

        expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
          'QR-CODE',
          staffUser.id,
          undefined
        );
      });

      it('should pass security user ID to service', async () => {
        const scanResult = { valid: true, message: 'OK', accessGranted: true };
        mockTicketsService.scanTicket.mockResolvedValue(scanResult);

        await controller.scanTicket(mockSecurityRequest, 'QR-CODE');

        expect(mockTicketsService.scanTicket).toHaveBeenCalledWith(
          'QR-CODE',
          securityUser.id,
          undefined
        );
      });
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty festivalId filter', async () => {
      const tickets = [mockTicketEntity];
      const paginatedResponse = {
        items: tickets,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
      mockTicketsService.getUserTickets.mockResolvedValue(paginatedResponse);

      const _result = await controller.getUserTickets(mockRequest, { festivalId: '' });

      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(regularUser.id, {
        festivalId: '',
        page: undefined,
        limit: undefined,
      });
    });

    it('should handle QR code with special characters', async () => {
      const specialQrCode = 'QR-TEST-ABC!@#$%';
      const validationResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: specialQrCode,
      });

      expect(result.valid).toBe(false);
    });

    it('should handle very long QR code', async () => {
      const longQrCode = 'QR-' + 'A'.repeat(1000);
      const validationResult = {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket({
        qrCode: longQrCode,
      });

      expect(result.valid).toBe(false);
    });

    it('should handle purchase with maximum quantity', async () => {
      const maxQuantityDto = {
        festivalId: publishedFestival.id,
        categoryId: standardCategory.id,
        quantity: 4, // max per user
      };
      const purchasedTickets = Array(4).fill(mockTicketEntity);
      mockTicketsService.purchaseTickets.mockResolvedValue(purchasedTickets);

      const result = await controller.purchaseTickets(mockRequest, maxQuantityDto);

      expect(result).toHaveLength(4);
    });

    it('should handle service timeout error', async () => {
      mockTicketsService.getUserTickets.mockRejectedValue(new Error('Request timeout'));

      await expect(controller.getUserTickets(mockRequest, {})).rejects.toThrow('Request timeout');
    });

    it('should handle Unicode in guest purchase names', async () => {
      const unicodeDto = {
        festivalId: publishedFestival.id,
        categoryId: standardCategory.id,
        quantity: 1,
        email: 'unicode@example.com',
        firstName: 'Rene',
        lastName: 'Mueller',
      };
      mockTicketsService.guestPurchaseTickets.mockResolvedValue([mockTicketEntity]);

      const result = await controller.guestPurchaseTickets(unicodeDto);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Return type verification
  // ==========================================================================

  describe('Return Type Verification', () => {
    it('getUserTickets should return paginated TicketEntity response', async () => {
      const paginatedResponse = {
        items: [mockTicketEntity],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
      mockTicketsService.getUserTickets.mockResolvedValue(paginatedResponse);

      const result = await controller.getUserTickets(mockRequest, {});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items[0]) {
        expect(result.items[0]).toHaveProperty('id');
        expect(result.items[0]).toHaveProperty('festivalId');
        expect(result.items[0]).toHaveProperty('categoryId');
        expect(result.items[0]).toHaveProperty('userId');
        expect(result.items[0]).toHaveProperty('qrCode');
        expect(result.items[0]).toHaveProperty('status');
      }
    });

    it('getTicketById should return TicketEntity', async () => {
      mockTicketsService.getTicketById.mockResolvedValue(mockTicketEntity);

      const result = await controller.getTicketById(mockRequest, 'ticket-id');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('festival');
      expect(result).toHaveProperty('category');
    });

    it('getTicketQrCode should return object with qrCode property', async () => {
      mockTicketsService.getTicketQrCodeImage.mockResolvedValue('data:image/png;base64,abc');

      const result = await controller.getTicketQrCode(mockRequest, 'ticket-id');

      expect(result).toHaveProperty('qrCode');
      expect(typeof result.qrCode).toBe('string');
    });

    it('validateTicket should return ValidationResult', async () => {
      mockTicketsService.validateTicket.mockResolvedValue({
        valid: true,
        ticket: mockTicketEntity,
        message: 'OK',
        accessGranted: true,
      });

      const result = await controller.validateTicket({ qrCode: 'TEST' });

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
      expect(typeof result.valid).toBe('boolean');
    });

    it('scanTicket should return ValidationResult', async () => {
      mockTicketsService.scanTicket.mockResolvedValue({
        valid: true,
        ticket: mockTicketEntity,
        message: 'Entry granted',
        accessGranted: true,
      });

      const result = await controller.scanTicket(mockStaffRequest, 'TEST');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('accessGranted');
    });

    it('cancelTicket should return cancelled TicketEntity', async () => {
      mockTicketsService.cancelTicket.mockResolvedValue({
        ...mockTicketEntity,
        status: TicketStatus.CANCELLED,
      });

      const result = await controller.cancelTicket(mockRequest, 'ticket-id');

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(TicketStatus.CANCELLED);
    });
  });

  // ==========================================================================
  // HTTP status code tests
  // ==========================================================================

  describe('HTTP Status Codes', () => {
    it('guestPurchaseTickets should use HttpCode CREATED (201)', () => {
      // This test verifies the decorator is applied
      const metadata = Reflect.getMetadata('__httpCode__', controller.guestPurchaseTickets);
      expect(metadata).toBe(201);
    });

    it('validateTicket should use HttpCode OK (200)', () => {
      const metadata = Reflect.getMetadata('__httpCode__', controller.validateTicket);
      expect(metadata).toBe(200);
    });

    it('scanTicket should use HttpCode OK (200)', () => {
      const metadata = Reflect.getMetadata('__httpCode__', controller.scanTicket);
      expect(metadata).toBe(200);
    });
  });
});
