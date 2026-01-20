/**
 * Zones Service Unit Tests
 *
 * Comprehensive tests for zone management functionality including:
 * - Zone CRUD operations
 * - Access control and authorization
 * - Capacity tracking and alerts
 * - Access logging and statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ZonesService, AuthenticatedUser } from './zones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketType, TicketStatus, UserRole, ZoneAccessAction } from '@prisma/client';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  regularUser,
  adminUser,
  organizerUser,
  staffUser,
  publishedFestival,
  vipLounge,
  mainStageZone,
  backstageArea,
  vipCategory as _vipCategory,
  standardCategory as _standardCategory,
  soldTicket,
  usedTicket,
  vipTicket,
  cancelledTicket,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('ZonesService', () => {
  let zonesService: ZonesService;

  const mockPrismaService = {
    zone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    zoneAccessLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock user fixtures for testing
  const mockAdminUser: AuthenticatedUser = {
    id: adminUser.id,
    email: adminUser.email,
    role: UserRole.ADMIN,
  };

  const mockOrganizerUser: AuthenticatedUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: UserRole.ORGANIZER,
  };

  const mockRegularUser: AuthenticatedUser = {
    id: regularUser.id,
    email: regularUser.email,
    role: UserRole.USER,
  };

  const mockStaffUser: AuthenticatedUser = {
    id: staffUser.id,
    email: staffUser.email,
    role: UserRole.STAFF,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ZonesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    zonesService = module.get<ZonesService>(ZonesService);

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    });
  });

  // ==========================================================================
  // create() Tests
  // ==========================================================================

  describe('create', () => {
    const createZoneDto = {
      name: 'Test Zone',
      description: 'A test zone',
      capacity: 500,
      requiresTicketType: [TicketType.VIP],
      isActive: true,
    };

    it('should create a zone successfully when user is organizer', async () => {
      // Arrange
      const festivalId = publishedFestival.id;
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizerId: mockOrganizerUser.id,
      });
      mockPrismaService.zone.create.mockResolvedValue({
        id: 'new-zone-id',
        festivalId,
        ...createZoneDto,
        currentOccupancy: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await zonesService.create(festivalId, createZoneDto, mockOrganizerUser);

      // Assert
      expect(result.name).toBe(createZoneDto.name);
      expect(result.capacity).toBe(createZoneDto.capacity);
      expect(mockPrismaService.zone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          festivalId,
          name: createZoneDto.name,
          capacity: createZoneDto.capacity,
        }),
      });
    });

    it('should create a zone successfully when user is admin', async () => {
      // Arrange
      const festivalId = publishedFestival.id;
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizerId: 'different-organizer-id',
      });
      mockPrismaService.zone.create.mockResolvedValue({
        id: 'new-zone-id',
        festivalId,
        ...createZoneDto,
        currentOccupancy: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await zonesService.create(festivalId, createZoneDto, mockAdminUser);

      // Assert
      expect(result.name).toBe(createZoneDto.name);
      expect(mockPrismaService.zone.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if festival does not exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        zonesService.create('non-existent-festival', createZoneDto, mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not organizer or admin', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizerId: 'different-organizer-id',
      });

      // Act & Assert
      await expect(
        zonesService.create(publishedFestival.id, createZoneDto, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create zone with empty requiresTicketType when not provided', async () => {
      // Arrange
      const festivalId = publishedFestival.id;
      const dtoWithoutTicketType = { name: 'Open Zone' };
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizerId: mockOrganizerUser.id,
      });
      mockPrismaService.zone.create.mockResolvedValue({
        id: 'new-zone-id',
        festivalId,
        name: 'Open Zone',
        description: null,
        capacity: null,
        requiresTicketType: [],
        isActive: true,
        currentOccupancy: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await zonesService.create(festivalId, dtoWithoutTicketType, mockOrganizerUser);

      // Assert
      expect(result.requiresTicketType).toEqual([]);
    });
  });

  // ==========================================================================
  // findAllByFestival() Tests
  // ==========================================================================

  describe('findAllByFestival', () => {
    it('should return all zones for a festival', async () => {
      // Arrange
      const zones = [
        {
          ...mainStageZone,
          festival: {
            id: publishedFestival.id,
            name: publishedFestival.name,
            organizerId: organizerUser.id,
          },
          _count: { accessLogs: 100 },
        },
        {
          ...vipLounge,
          festival: {
            id: publishedFestival.id,
            name: publishedFestival.name,
            organizerId: organizerUser.id,
          },
          _count: { accessLogs: 50 },
        },
      ];
      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestival);
      mockPrismaService.zone.findMany.mockResolvedValue(zones);

      // Act
      const result = await zonesService.findAllByFestival(publishedFestival.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.zone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { festivalId: publishedFestival.id },
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should throw NotFoundException if festival does not exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.findAllByFestival('non-existent-festival')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return empty array if no zones exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestival);
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await zonesService.findAllByFestival(publishedFestival.id);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // findOne() Tests
  // ==========================================================================

  describe('findOne', () => {
    it('should return a zone by ID', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: organizerUser.id,
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act
      const result = await zonesService.findOne(vipLounge.id);

      // Assert
      expect(result.id).toBe(vipLounge.id);
      expect(result.name).toBe(vipLounge.name);
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.findOne('non-existent-zone')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // update() Tests
  // ==========================================================================

  describe('update', () => {
    const updateZoneDto = {
      name: 'Updated Zone Name',
      capacity: 750,
    };

    it('should update a zone successfully when user is organizer', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: mockOrganizerUser.id,
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        ...updateZoneDto,
      });

      // Act
      const result = await zonesService.update(vipLounge.id, updateZoneDto, mockOrganizerUser);

      // Assert
      expect(result.name).toBe(updateZoneDto.name);
      expect(result.capacity).toBe(updateZoneDto.capacity);
    });

    it('should update a zone successfully when user is admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: 'different-organizer',
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        ...updateZoneDto,
      });

      // Act
      const result = await zonesService.update(vipLounge.id, updateZoneDto, mockAdminUser);

      // Assert
      expect(result.name).toBe(updateZoneDto.name);
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: 'different-organizer',
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act & Assert
      await expect(
        zonesService.update(vipLounge.id, updateZoneDto, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        zonesService.update('non-existent-zone', updateZoneDto, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      // Arrange
      const partialUpdate = { isActive: false };
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: mockOrganizerUser.id,
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        isActive: false,
      });

      // Act
      await zonesService.update(vipLounge.id, partialUpdate, mockOrganizerUser);

      // Assert
      expect(mockPrismaService.zone.update).toHaveBeenCalledWith({
        where: { id: vipLounge.id },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });
  });

  // ==========================================================================
  // remove() Tests
  // ==========================================================================

  describe('remove', () => {
    it('should delete a zone when user is organizer', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: mockOrganizerUser.id,
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.delete.mockResolvedValue(vipLounge);

      // Act
      await zonesService.remove(vipLounge.id, mockOrganizerUser);

      // Assert
      expect(mockPrismaService.zone.delete).toHaveBeenCalledWith({
        where: { id: vipLounge.id },
      });
    });

    it('should delete a zone when user is admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: 'different-organizer',
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.delete.mockResolvedValue(vipLounge);

      // Act
      await zonesService.remove(vipLounge.id, mockAdminUser);

      // Assert
      expect(mockPrismaService.zone.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: 'different-organizer',
        },
        _count: { accessLogs: 50 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act & Assert
      await expect(zonesService.remove(vipLounge.id, mockRegularUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.remove('non-existent-zone', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // checkAccess() Tests
  // ==========================================================================

  describe('checkAccess', () => {
    const mockZone = {
      ...vipLounge,
      currentOccupancy: 500,
      capacity: 1000,
      requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
      isActive: true,
    };

    const mockTicket = {
      ...vipTicket,
      status: TicketStatus.SOLD,
      user: { firstName: 'John', lastName: 'Doe' },
      category: { name: 'VIP Pass', type: TicketType.VIP },
      festival: { id: publishedFestival.id },
    };

    it('should grant access for valid VIP ticket to VIP zone', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        festivalId: mockZone.festivalId,
      });

      // Act
      const result = await zonesService.checkAccess(mockZone.id, { ticketId: mockTicket.id });

      // Assert
      expect(result.granted).toBe(true);
      expect(result.message).toContain('Access granted');
      expect(result.ticketHolder).toBeDefined();
      expect(result.zone).toBeDefined();
    });

    it('should deny access for standard ticket to VIP zone', async () => {
      // Arrange
      const standardTicket = {
        ...soldTicket,
        status: TicketStatus.SOLD,
        user: { firstName: 'Jane', lastName: 'Doe' },
        category: { name: 'Standard Pass', type: TicketType.STANDARD },
        festival: { id: publishedFestival.id },
        festivalId: mockZone.festivalId,
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(standardTicket);

      // Act
      const result = await zonesService.checkAccess(mockZone.id, { ticketId: standardTicket.id });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toContain('requires one of the following ticket types');
    });

    it('should deny access if zone is inactive', async () => {
      // Arrange
      const inactiveZone = { ...mockZone, isActive: false };
      mockPrismaService.zone.findUnique.mockResolvedValue(inactiveZone);

      // Act
      const result = await zonesService.checkAccess(inactiveZone.id, { ticketId: mockTicket.id });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toBe('Zone is not active');
    });

    it('should deny access if zone is at full capacity', async () => {
      // Arrange
      const fullZone = { ...mockZone, currentOccupancy: 1000, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(fullZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        festivalId: fullZone.festivalId,
      });

      // Act
      const result = await zonesService.checkAccess(fullZone.id, { ticketId: mockTicket.id });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toBe('Zone is at full capacity');
      expect(result.alert?.type).toBe('CRITICAL');
    });

    it('should return warning when zone is near capacity (80%+)', async () => {
      // Arrange
      const nearCapacityZone = { ...mockZone, currentOccupancy: 850, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(nearCapacityZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        festivalId: nearCapacityZone.festivalId,
      });

      // Act
      const result = await zonesService.checkAccess(nearCapacityZone.id, {
        ticketId: mockTicket.id,
      });

      // Assert
      expect(result.granted).toBe(true);
      expect(result.alert?.type).toBe('WARNING');
    });

    it('should deny access if ticket is not SOLD or USED', async () => {
      // Arrange
      const cancelledTicketData = {
        ...cancelledTicket,
        status: TicketStatus.CANCELLED,
        user: { firstName: 'John', lastName: 'Doe' },
        category: { name: 'VIP Pass', type: TicketType.VIP },
        festival: { id: publishedFestival.id },
        festivalId: mockZone.festivalId,
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(cancelledTicketData);

      // Act
      const result = await zonesService.checkAccess(mockZone.id, {
        ticketId: cancelledTicketData.id,
      });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toContain('CANCELLED');
    });

    it('should deny access if ticket is from different festival', async () => {
      // Arrange
      const differentFestivalTicket = {
        ...mockTicket,
        festivalId: 'different-festival-id',
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(differentFestivalTicket);

      // Act
      const result = await zonesService.checkAccess(mockZone.id, {
        ticketId: differentFestivalTicket.id,
      });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toBe('Ticket is not valid for this festival');
    });

    it('should support QR code lookup', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        festivalId: mockZone.festivalId,
      });

      // Act
      const result = await zonesService.checkAccess(mockZone.id, { qrCode: mockTicket.qrCode });

      // Assert
      expect(result.granted).toBe(true);
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { qrCode: mockTicket.qrCode },
        })
      );
    });

    it('should return not found for non-existent ticket', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act
      const result = await zonesService.checkAccess(mockZone.id, { ticketId: 'non-existent' });

      // Assert
      expect(result.granted).toBe(false);
      expect(result.message).toBe('Ticket not found');
    });

    it('should throw BadRequestException if neither ticketId nor qrCode provided', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);

      // Act & Assert
      await expect(zonesService.checkAccess(mockZone.id, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        zonesService.checkAccess('non-existent-zone', { ticketId: mockTicket.id })
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow access for zones without ticket type restrictions', async () => {
      // Arrange
      const openZone = {
        ...mainStageZone,
        requiresTicketType: [],
        capacity: 25000,
        currentOccupancy: 5000,
        isActive: true,
      };
      const standardTicket = {
        ...soldTicket,
        status: TicketStatus.SOLD,
        user: { firstName: 'Jane', lastName: 'Doe' },
        category: { name: 'Standard Pass', type: TicketType.STANDARD },
        festival: { id: publishedFestival.id },
        festivalId: openZone.festivalId,
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(openZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(standardTicket);

      // Act
      const result = await zonesService.checkAccess(openZone.id, { ticketId: standardTicket.id });

      // Assert
      expect(result.granted).toBe(true);
    });

    it('should allow access with USED ticket status', async () => {
      // Arrange
      const usedTicketData = {
        ...usedTicket,
        status: TicketStatus.USED,
        user: { firstName: 'John', lastName: 'Doe' },
        category: { name: 'VIP Pass', type: TicketType.VIP },
        festival: { id: publishedFestival.id },
        festivalId: mockZone.festivalId,
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(usedTicketData);

      // Act
      const result = await zonesService.checkAccess(mockZone.id, { ticketId: usedTicketData.id });

      // Assert
      expect(result.granted).toBe(true);
    });
  });

  // ==========================================================================
  // logAccess() Tests
  // ==========================================================================

  describe('logAccess', () => {
    const mockZone = {
      ...vipLounge,
      currentOccupancy: 100,
      capacity: 1000,
      requiresTicketType: [TicketType.VIP],
      isActive: true,
    };

    const mockTicket = {
      ...vipTicket,
      status: TicketStatus.SOLD,
      user: { firstName: 'John', lastName: 'Doe' },
      category: { name: 'VIP Pass', type: TicketType.VIP },
      festival: { id: publishedFestival.id },
      festivalId: mockZone.festivalId,
    };

    it('should log entry and increment occupancy', async () => {
      // Arrange
      const updatedZone = { ...mockZone, currentOccupancy: 101 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.ENTRY,
        timestamp: new Date(),
        performedById: mockStaffUser.id,
      };

      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(updatedZone),
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.USED }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await zonesService.logAccess(
        mockZone.id,
        { ticketId: mockTicket.id, action: ZoneAccessAction.ENTRY },
        mockStaffUser.id
      );

      // Assert
      expect(result.zone.currentOccupancy).toBe(101);
      expect(result.log.action).toBe(ZoneAccessAction.ENTRY);
    });

    it('should log exit and decrement occupancy', async () => {
      // Arrange
      const updatedZone = { ...mockZone, currentOccupancy: 99 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.EXIT,
        timestamp: new Date(),
        performedById: mockStaffUser.id,
      };

      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(updatedZone),
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await zonesService.logAccess(
        mockZone.id,
        { ticketId: mockTicket.id, action: ZoneAccessAction.EXIT },
        mockStaffUser.id
      );

      // Assert
      expect(result.zone.currentOccupancy).toBe(99);
      expect(result.log.action).toBe(ZoneAccessAction.EXIT);
    });

    it('should throw BadRequestException for entry when access denied', async () => {
      // Arrange
      const standardTicket = {
        ...soldTicket,
        status: TicketStatus.SOLD,
        user: { firstName: 'Jane', lastName: 'Doe' },
        category: { name: 'Standard Pass', type: TicketType.STANDARD },
        festival: { id: publishedFestival.id },
        festivalId: mockZone.festivalId,
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(standardTicket);

      // Act & Assert
      await expect(
        zonesService.logAccess(
          mockZone.id,
          { ticketId: standardTicket.id, action: ZoneAccessAction.ENTRY },
          mockStaffUser.id
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent negative occupancy on exit', async () => {
      // Arrange
      const emptyZone = { ...mockZone, currentOccupancy: 0 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.EXIT,
        timestamp: new Date(),
        performedById: mockStaffUser.id,
      };

      mockPrismaService.zone.findUnique.mockResolvedValue(emptyZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(emptyZone), // Should not be called
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await zonesService.logAccess(
        mockZone.id,
        { ticketId: mockTicket.id, action: ZoneAccessAction.EXIT },
        mockStaffUser.id
      );

      // Assert
      expect(result.zone.currentOccupancy).toBe(0);
    });

    it('should resolve ticket from QR code', async () => {
      // Arrange
      const updatedZone = { ...mockZone, currentOccupancy: 101 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.ENTRY,
        timestamp: new Date(),
        performedById: null,
      };

      // Mock sequence:
      // 1. QR code to ticketId lookup
      // 2. checkAccess -> zone lookup
      // 3. checkAccess -> ticket lookup by id
      // 4. logAccess -> zone lookup
      // 5. logAccess -> ticket lookup by id
      mockPrismaService.ticket.findUnique
        .mockResolvedValueOnce({ id: mockTicket.id }) // QR code lookup (returns just id)
        .mockResolvedValueOnce(mockTicket) // checkAccess ticket lookup
        .mockResolvedValueOnce(mockTicket); // logAccess ticket lookup
      mockPrismaService.zone.findUnique
        .mockResolvedValueOnce(mockZone) // checkAccess zone lookup
        .mockResolvedValueOnce(mockZone); // logAccess zone lookup
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(updatedZone),
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.USED }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await zonesService.logAccess(mockZone.id, {
        qrCode: mockTicket.qrCode,
        action: ZoneAccessAction.ENTRY,
      });

      // Assert
      expect(result.log).toBeDefined();
    });

    it('should throw NotFoundException for invalid QR code', async () => {
      // Arrange
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        zonesService.logAccess(mockZone.id, {
          qrCode: 'invalid-qr',
          action: ZoneAccessAction.ENTRY,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no ticketId or qrCode provided', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);

      // Act & Assert
      await expect(
        zonesService.logAccess(mockZone.id, { action: ZoneAccessAction.ENTRY } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should return CRITICAL alert when zone reaches full capacity', async () => {
      // Arrange
      const almostFullZone = { ...mockZone, currentOccupancy: 999, capacity: 1000 };
      const fullZone = { ...mockZone, currentOccupancy: 1000, capacity: 1000 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.ENTRY,
        timestamp: new Date(),
        performedById: mockStaffUser.id,
      };

      mockPrismaService.zone.findUnique.mockResolvedValue(almostFullZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(fullZone),
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn().mockResolvedValue({ ...mockTicket, status: TicketStatus.USED }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await zonesService.logAccess(
        mockZone.id,
        { ticketId: mockTicket.id, action: ZoneAccessAction.ENTRY },
        mockStaffUser.id
      );

      // Assert
      expect(result.alert?.type).toBe('CRITICAL');
    });

    it('should update ticket status to USED on first entry', async () => {
      // Arrange
      const updatedZone = { ...mockZone, currentOccupancy: 101 };
      const mockLog = {
        id: 'log-id',
        zoneId: mockZone.id,
        ticketId: mockTicket.id,
        action: ZoneAccessAction.ENTRY,
        timestamp: new Date(),
        performedById: mockStaffUser.id,
      };

      let ticketUpdateCalled = false;

      mockPrismaService.zone.findUnique.mockResolvedValue(mockZone);
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          zone: {
            update: jest.fn().mockResolvedValue(updatedZone),
          },
          zoneAccessLog: {
            create: jest.fn().mockResolvedValue(mockLog),
          },
          ticket: {
            update: jest.fn().mockImplementation(() => {
              ticketUpdateCalled = true;
              return Promise.resolve({ ...mockTicket, status: TicketStatus.USED });
            }),
          },
        };
        return callback(tx);
      });

      // Act
      await zonesService.logAccess(
        mockZone.id,
        { ticketId: mockTicket.id, action: ZoneAccessAction.ENTRY },
        mockStaffUser.id
      );

      // Assert
      expect(ticketUpdateCalled).toBe(true);
    });
  });

  // ==========================================================================
  // getCapacityStatus() Tests
  // ==========================================================================

  describe('getCapacityStatus', () => {
    it('should return GREEN status when occupancy is low', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 300, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(zone);

      // Act
      const result = await zonesService.getCapacityStatus(zone.id);

      // Assert
      expect(result.status).toBe('GREEN');
      expect(result.occupancyPercentage).toBe(30);
      expect(result.isAtCapacity).toBe(false);
      expect(result.isNearCapacity).toBe(false);
      expect(result.availableSpots).toBe(700);
    });

    it('should return YELLOW status when occupancy is 70-89%', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 750, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(zone);

      // Act
      const result = await zonesService.getCapacityStatus(zone.id);

      // Assert
      expect(result.status).toBe('YELLOW');
      expect(result.occupancyPercentage).toBe(75);
    });

    it('should return ORANGE status when occupancy is 90-99%', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 950, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(zone);

      // Act
      const result = await zonesService.getCapacityStatus(zone.id);

      // Assert
      expect(result.status).toBe('ORANGE');
      expect(result.occupancyPercentage).toBe(95);
    });

    it('should return RED status when at or over capacity', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 1000, capacity: 1000 };
      mockPrismaService.zone.findUnique.mockResolvedValue(zone);

      // Act
      const result = await zonesService.getCapacityStatus(zone.id);

      // Assert
      expect(result.status).toBe('RED');
      expect(result.isAtCapacity).toBe(true);
      expect(result.availableSpots).toBe(0);
    });

    it('should return GREEN status for zone without capacity limit', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 5000, capacity: null };
      mockPrismaService.zone.findUnique.mockResolvedValue(zone);

      // Act
      const result = await zonesService.getCapacityStatus(zone.id);

      // Assert
      expect(result.status).toBe('GREEN');
      expect(result.occupancyPercentage).toBe(null);
      expect(result.availableSpots).toBe(null);
      expect(result.isAtCapacity).toBe(false);
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.getCapacityStatus('non-existent-zone')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // getAllZonesCapacityStatus() Tests
  // ==========================================================================

  describe('getAllZonesCapacityStatus', () => {
    it('should return capacity status for all zones of a festival', async () => {
      // Arrange
      const zones = [
        { ...mainStageZone, currentOccupancy: 5000, capacity: 25000 },
        { ...vipLounge, currentOccupancy: 800, capacity: 1000 },
        { ...backstageArea, currentOccupancy: 100, capacity: 200 },
      ];
      mockPrismaService.zone.findMany.mockResolvedValue(zones);

      // Act
      const result = await zonesService.getAllZonesCapacityStatus(publishedFestival.id);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.status).toBe('GREEN'); // 20%
      expect(result[1]?.status).toBe('YELLOW'); // 80%
      expect(result[2]?.status).toBe('GREEN'); // 50%
    });

    it('should return empty array if no zones exist', async () => {
      // Arrange
      mockPrismaService.zone.findMany.mockResolvedValue([]);

      // Act
      const result = await zonesService.getAllZonesCapacityStatus(publishedFestival.id);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getAccessLog() Tests
  // ==========================================================================

  describe('getAccessLog', () => {
    const mockLogs = [
      {
        id: 'log-1',
        zoneId: vipLounge.id,
        ticketId: vipTicket.id,
        action: ZoneAccessAction.ENTRY,
        timestamp: new Date('2024-07-15T10:00:00Z'),
        ticket: {
          id: vipTicket.id,
          qrCode: vipTicket.qrCode,
          status: TicketStatus.USED,
          user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
          category: { name: 'VIP', type: TicketType.VIP },
        },
      },
      {
        id: 'log-2',
        zoneId: vipLounge.id,
        ticketId: vipTicket.id,
        action: ZoneAccessAction.EXIT,
        timestamp: new Date('2024-07-15T14:00:00Z'),
        ticket: {
          id: vipTicket.id,
          qrCode: vipTicket.qrCode,
          status: TicketStatus.USED,
          user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
          category: { name: 'VIP', type: TicketType.VIP },
        },
      },
    ];

    it('should return access logs for a zone with pagination', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(vipLounge);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(2);

      // Act
      const result = await zonesService.getAccessLog(vipLounge.id, { page: 1, limit: 50 });

      // Assert
      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2024-07-15T00:00:00Z');
      const endDate = new Date('2024-07-15T23:59:59Z');
      mockPrismaService.zone.findUnique.mockResolvedValue(vipLounge);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(2);

      // Act
      await zonesService.getAccessLog(vipLounge.id, { startDate, endDate });

      // Assert
      expect(mockPrismaService.zoneAccessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('should filter by action type', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(vipLounge);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([mockLogs[0]]);
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(1);

      // Act
      await zonesService.getAccessLog(vipLounge.id, { action: ZoneAccessAction.ENTRY });

      // Assert
      expect(mockPrismaService.zoneAccessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: ZoneAccessAction.ENTRY,
          }),
        })
      );
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.getAccessLog('non-existent-zone')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should apply default pagination when not provided', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(vipLounge);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(0);

      // Act
      const result = await zonesService.getAccessLog(vipLounge.id);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  // ==========================================================================
  // getAccessStats() Tests
  // ==========================================================================

  describe('getAccessStats', () => {
    it('should return access statistics for a zone', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 100, capacity: 1000 };
      const logs = [
        {
          ticketId: 'ticket-1',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T10:00:00Z'),
        },
        {
          ticketId: 'ticket-2',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T11:00:00Z'),
        },
        {
          ticketId: 'ticket-1',
          action: ZoneAccessAction.EXIT,
          timestamp: new Date('2024-07-15T12:00:00Z'),
        },
        {
          ticketId: 'ticket-3',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T14:00:00Z'),
        },
      ];

      mockPrismaService.zone.findUnique.mockResolvedValue(zone);
      mockPrismaService.zoneAccessLog.count
        .mockResolvedValueOnce(3) // entries
        .mockResolvedValueOnce(1); // exits
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { ticketId: 'ticket-1' },
        { ticketId: 'ticket-2' },
        { ticketId: 'ticket-3' },
      ]);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue(logs);

      // Act
      const result = await zonesService.getAccessStats(zone.id);

      // Assert
      expect(result.zone.id).toBe(zone.id);
      expect(result.stats.totalEntries).toBe(3);
      expect(result.stats.totalExits).toBe(1);
      expect(result.stats.uniqueVisitors).toBe(3);
      expect(result.stats.peakOccupancy).toBeGreaterThanOrEqual(0);
      expect(result.hourlyDistribution).toHaveLength(24);
    });

    it('should filter statistics by date range', async () => {
      // Arrange
      const startDate = new Date('2024-07-15T00:00:00Z');
      const endDate = new Date('2024-07-15T23:59:59Z');
      mockPrismaService.zone.findUnique.mockResolvedValue(vipLounge);
      mockPrismaService.zoneAccessLog.count.mockResolvedValue(0);
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([]);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue([]);

      // Act
      await zonesService.getAccessStats(vipLounge.id, { startDate, endDate });

      // Assert
      expect(mockPrismaService.zoneAccessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.getAccessStats('non-existent-zone')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should calculate average stay duration correctly', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 50, capacity: 1000 };
      // Two entries and two exits with 1 hour stay each
      const logs = [
        {
          ticketId: 'ticket-1',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T10:00:00Z'),
        },
        {
          ticketId: 'ticket-1',
          action: ZoneAccessAction.EXIT,
          timestamp: new Date('2024-07-15T11:00:00Z'),
        },
        {
          ticketId: 'ticket-2',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T12:00:00Z'),
        },
        {
          ticketId: 'ticket-2',
          action: ZoneAccessAction.EXIT,
          timestamp: new Date('2024-07-15T13:00:00Z'),
        },
      ];

      mockPrismaService.zone.findUnique.mockResolvedValue(zone);
      mockPrismaService.zoneAccessLog.count
        .mockResolvedValueOnce(2) // entries
        .mockResolvedValueOnce(2); // exits
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { ticketId: 'ticket-1' },
        { ticketId: 'ticket-2' },
      ]);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue(logs);

      // Act
      const result = await zonesService.getAccessStats(zone.id);

      // Assert
      expect(result.stats.averageStayDurationMinutes).toBe(60); // 1 hour
    });

    it('should return null average stay duration when no completed visits', async () => {
      // Arrange
      const zone = { ...vipLounge, currentOccupancy: 100, capacity: 1000 };
      const logs = [
        {
          ticketId: 'ticket-1',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T10:00:00Z'),
        },
        {
          ticketId: 'ticket-2',
          action: ZoneAccessAction.ENTRY,
          timestamp: new Date('2024-07-15T11:00:00Z'),
        },
      ];

      mockPrismaService.zone.findUnique.mockResolvedValue(zone);
      mockPrismaService.zoneAccessLog.count
        .mockResolvedValueOnce(2) // entries
        .mockResolvedValueOnce(0); // exits
      mockPrismaService.zoneAccessLog.groupBy.mockResolvedValue([
        { ticketId: 'ticket-1' },
        { ticketId: 'ticket-2' },
      ]);
      mockPrismaService.zoneAccessLog.findMany.mockResolvedValue(logs);

      // Act
      const result = await zonesService.getAccessStats(zone.id);

      // Assert
      expect(result.stats.averageStayDurationMinutes).toBe(null);
    });
  });

  // ==========================================================================
  // resetOccupancy() Tests
  // ==========================================================================

  describe('resetOccupancy', () => {
    it('should reset occupancy to zero when user is admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        currentOccupancy: 500,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: organizerUser.id,
        },
        _count: { accessLogs: 1000 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        currentOccupancy: 0,
      });

      // Act
      const result = await zonesService.resetOccupancy(vipLounge.id, mockAdminUser);

      // Assert
      expect(result.currentOccupancy).toBe(0);
      expect(mockPrismaService.zone.update).toHaveBeenCalledWith({
        where: { id: vipLounge.id },
        data: { currentOccupancy: 0 },
      });
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      // Arrange
      const zoneWithRelations = {
        ...vipLounge,
        festival: {
          id: publishedFestival.id,
          name: publishedFestival.name,
          organizerId: organizerUser.id,
        },
        _count: { accessLogs: 500 },
      };
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act & Assert
      await expect(zonesService.resetOccupancy(vipLounge.id, mockOrganizerUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(zonesService.resetOccupancy('non-existent-zone', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // adjustOccupancy() Tests
  // ==========================================================================

  describe('adjustOccupancy', () => {
    const zoneWithRelations = {
      ...vipLounge,
      currentOccupancy: 500,
      festival: {
        id: publishedFestival.id,
        name: publishedFestival.name,
        organizerId: mockOrganizerUser.id,
      },
      _count: { accessLogs: 1000 },
    };

    it('should adjust occupancy when user is admin', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        currentOccupancy: 510,
      });

      // Act
      const result = await zonesService.adjustOccupancy(vipLounge.id, 10, mockAdminUser);

      // Assert
      expect(result.currentOccupancy).toBe(510);
    });

    it('should adjust occupancy when user is organizer', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        currentOccupancy: 480,
      });

      // Act
      const result = await zonesService.adjustOccupancy(vipLounge.id, -20, mockOrganizerUser);

      // Assert
      expect(result.currentOccupancy).toBe(480);
    });

    it('should throw ForbiddenException if user is regular user', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act & Assert
      await expect(zonesService.adjustOccupancy(vipLounge.id, 10, mockRegularUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user is staff', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(zoneWithRelations);

      // Act & Assert
      await expect(zonesService.adjustOccupancy(vipLounge.id, 10, mockStaffUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should prevent negative occupancy', async () => {
      // Arrange
      const lowOccupancyZone = { ...zoneWithRelations, currentOccupancy: 10 };
      mockPrismaService.zone.findUnique.mockResolvedValue(lowOccupancyZone);
      mockPrismaService.zone.update.mockResolvedValue({
        ...vipLounge,
        currentOccupancy: 0,
      });

      // Act
      const result = await zonesService.adjustOccupancy(vipLounge.id, -50, mockAdminUser);

      // Assert
      expect(result.currentOccupancy).toBe(0);
      expect(mockPrismaService.zone.update).toHaveBeenCalledWith({
        where: { id: vipLounge.id },
        data: { currentOccupancy: 0 },
      });
    });

    it('should throw NotFoundException if zone does not exist', async () => {
      // Arrange
      mockPrismaService.zone.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        zonesService.adjustOccupancy('non-existent-zone', 10, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
