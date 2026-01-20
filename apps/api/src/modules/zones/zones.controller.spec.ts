/**
 * Zones Controller Unit Tests
 *
 * Comprehensive tests for zone controller endpoints including:
 * - FestivalZonesController: Festival-scoped zone operations
 * - ZonesController: Zone-specific operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ZonesController, FestivalZonesController } from './zones.controller';
import { ZonesService, AuthenticatedUser } from './zones.service';
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
  backstageArea as _backstageArea,
  vipTicket,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('ZonesController', () => {
  let zonesController: ZonesController;
  let festivalZonesController: FestivalZonesController;
  let _zonesService: jest.Mocked<ZonesService>;

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

  const mockStaffUser: AuthenticatedUser = {
    id: staffUser.id,
    email: staffUser.email,
    role: UserRole.STAFF,
  };

  const mockZonesService = {
    create: jest.fn(),
    findAllByFestival: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    checkAccess: jest.fn(),
    logAccess: jest.fn(),
    getCapacityStatus: jest.fn(),
    getAllZonesCapacityStatus: jest.fn(),
    getAccessLog: jest.fn(),
    getAccessStats: jest.fn(),
    resetOccupancy: jest.fn(),
    adjustOccupancy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZonesController, FestivalZonesController],
      providers: [{ provide: ZonesService, useValue: mockZonesService }],
    }).compile();

    zonesController = module.get<ZonesController>(ZonesController);
    festivalZonesController = module.get<FestivalZonesController>(FestivalZonesController);
    _zonesService = module.get(ZonesService);
  });

  // ==========================================================================
  // FestivalZonesController Tests
  // ==========================================================================

  describe('FestivalZonesController', () => {
    describe('POST /festivals/:festivalId/zones (create)', () => {
      const createZoneDto = {
        name: 'VIP Area',
        description: 'Exclusive VIP zone',
        capacity: 500,
        requiresTicketType: [TicketType.VIP],
        isActive: true,
      };

      it('should create a zone successfully', async () => {
        // Arrange
        const createdZone = {
          id: 'new-zone-id',
          festivalId: publishedFestival.id,
          ...createZoneDto,
          currentOccupancy: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockZonesService.create.mockResolvedValue(createdZone);

        // Act
        const result = await festivalZonesController.create(
          publishedFestival.id,
          createZoneDto,
          mockOrganizerUser
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Zone created successfully');
        expect(result.data).toEqual(createdZone);
        expect(mockZonesService.create).toHaveBeenCalledWith(
          publishedFestival.id,
          createZoneDto,
          mockOrganizerUser
        );
      });

      it('should throw NotFoundException when festival does not exist', async () => {
        // Arrange
        mockZonesService.create.mockRejectedValue(new NotFoundException('Festival not found'));

        // Act & Assert
        await expect(
          festivalZonesController.create('non-existent-festival', createZoneDto, mockOrganizerUser)
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user is not authorized', async () => {
        // Arrange
        const regularUserAuth: AuthenticatedUser = {
          id: regularUser.id,
          email: regularUser.email,
          role: UserRole.USER,
        };
        mockZonesService.create.mockRejectedValue(new ForbiddenException('Not authorized'));

        // Act & Assert
        await expect(
          festivalZonesController.create(publishedFestival.id, createZoneDto, regularUserAuth)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('GET /festivals/:festivalId/zones (findAll)', () => {
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
          },
          {
            ...vipLounge,
            festival: {
              id: publishedFestival.id,
              name: publishedFestival.name,
              organizerId: organizerUser.id,
            },
          },
        ];
        mockZonesService.findAllByFestival.mockResolvedValue(zones);

        // Act
        const result = await festivalZonesController.findAll(publishedFestival.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(zones);
        expect(result.count).toBe(2);
      });

      it('should return empty array when no zones exist', async () => {
        // Arrange
        mockZonesService.findAllByFestival.mockResolvedValue([]);

        // Act
        const result = await festivalZonesController.findAll(publishedFestival.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
        expect(result.count).toBe(0);
      });

      it('should throw NotFoundException when festival does not exist', async () => {
        // Arrange
        mockZonesService.findAllByFestival.mockRejectedValue(
          new NotFoundException('Festival not found')
        );

        // Act & Assert
        await expect(festivalZonesController.findAll('non-existent-festival')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('GET /festivals/:festivalId/zones/capacity (getAllZonesCapacity)', () => {
      it('should return capacity status for all zones', async () => {
        // Arrange
        const capacityStatus = [
          {
            zoneId: mainStageZone.id,
            zoneName: mainStageZone.name,
            currentOccupancy: 5000,
            capacity: 25000,
            occupancyPercentage: 20,
            status: 'GREEN',
            isActive: true,
          },
          {
            zoneId: vipLounge.id,
            zoneName: vipLounge.name,
            currentOccupancy: 800,
            capacity: 1000,
            occupancyPercentage: 80,
            status: 'YELLOW',
            isActive: true,
          },
        ];
        mockZonesService.getAllZonesCapacityStatus.mockResolvedValue(capacityStatus);

        // Act
        const result = await festivalZonesController.getAllZonesCapacity(publishedFestival.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(capacityStatus);
        expect(result.count).toBe(2);
      });

      it('should return empty array when no zones exist', async () => {
        // Arrange
        mockZonesService.getAllZonesCapacityStatus.mockResolvedValue([]);

        // Act
        const result = await festivalZonesController.getAllZonesCapacity(publishedFestival.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
        expect(result.count).toBe(0);
      });
    });
  });

  // ==========================================================================
  // ZonesController Tests
  // ==========================================================================

  describe('ZonesController', () => {
    describe('GET /zones/:id (findOne)', () => {
      it('should return a zone by ID', async () => {
        // Arrange
        const zone = {
          ...vipLounge,
          festival: {
            id: publishedFestival.id,
            name: publishedFestival.name,
            organizerId: organizerUser.id,
          },
          _count: { accessLogs: 100 },
        };
        mockZonesService.findOne.mockResolvedValue(zone);

        // Act
        const result = await zonesController.findOne(vipLounge.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(zone);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.findOne.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(zonesController.findOne('non-existent-zone')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('PATCH /zones/:id (update)', () => {
      const updateZoneDto = {
        name: 'Updated VIP Lounge',
        capacity: 1200,
      };

      it('should update a zone successfully', async () => {
        // Arrange
        const updatedZone = { ...vipLounge, ...updateZoneDto };
        mockZonesService.update.mockResolvedValue(updatedZone);

        // Act
        const result = await zonesController.update(vipLounge.id, updateZoneDto, mockOrganizerUser);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Zone updated successfully');
        expect(result.data).toEqual(updatedZone);
      });

      it('should throw ForbiddenException when user is not authorized', async () => {
        // Arrange
        mockZonesService.update.mockRejectedValue(new ForbiddenException('Not authorized'));

        // Act & Assert
        await expect(
          zonesController.update(vipLounge.id, updateZoneDto, mockStaffUser)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.update.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(
          zonesController.update('non-existent-zone', updateZoneDto, mockAdminUser)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('DELETE /zones/:id (remove)', () => {
      it('should delete a zone successfully', async () => {
        // Arrange
        mockZonesService.remove.mockResolvedValue(undefined);

        // Act
        await zonesController.remove(vipLounge.id, mockOrganizerUser);

        // Assert
        expect(mockZonesService.remove).toHaveBeenCalledWith(vipLounge.id, mockOrganizerUser);
      });

      it('should throw ForbiddenException when user is not authorized', async () => {
        // Arrange
        mockZonesService.remove.mockRejectedValue(new ForbiddenException('Not authorized'));

        // Act & Assert
        await expect(zonesController.remove(vipLounge.id, mockStaffUser)).rejects.toThrow(
          ForbiddenException
        );
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.remove.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(zonesController.remove('non-existent-zone', mockAdminUser)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('GET /zones/:id/capacity (getCapacity)', () => {
      it('should return zone capacity status', async () => {
        // Arrange
        const capacityStatus = {
          zoneId: vipLounge.id,
          zoneName: vipLounge.name,
          currentOccupancy: 500,
          capacity: 1000,
          occupancyPercentage: 50,
          isAtCapacity: false,
          isNearCapacity: false,
          availableSpots: 500,
          status: 'GREEN',
        };
        mockZonesService.getCapacityStatus.mockResolvedValue(capacityStatus);

        // Act
        const result = await zonesController.getCapacity(vipLounge.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(capacityStatus);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.getCapacityStatus.mockRejectedValue(
          new NotFoundException('Zone not found')
        );

        // Act & Assert
        await expect(zonesController.getCapacity('non-existent-zone')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('POST /zones/:id/check (checkAccess)', () => {
      it('should return access granted for valid ticket', async () => {
        // Arrange
        const accessResult = {
          granted: true,
          message: 'Access granted - VIP ticket verified',
          ticketHolder: {
            name: 'John Doe',
            ticketType: 'VIP',
            ticketStatus: 'SOLD',
            ticketId: vipTicket.id,
          },
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            currentOccupancy: 500,
            capacity: 1000,
            capacityPercentage: 50,
            isAtCapacity: false,
            isNearCapacity: false,
          },
        };
        mockZonesService.checkAccess.mockResolvedValue(accessResult);

        // Act
        const result = await zonesController.checkAccess(vipLounge.id, {
          ticketId: vipTicket.id,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(accessResult);
      });

      it('should return access denied for invalid ticket type', async () => {
        // Arrange
        const accessResult = {
          granted: false,
          message: 'This zone requires VIP ticket type',
          ticketHolder: {
            name: 'Jane Doe',
            ticketType: 'STANDARD',
            ticketStatus: 'SOLD',
            ticketId: 'standard-ticket-id',
          },
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            currentOccupancy: 500,
            capacity: 1000,
            capacityPercentage: 50,
            isAtCapacity: false,
            isNearCapacity: false,
          },
        };
        mockZonesService.checkAccess.mockResolvedValue(accessResult);

        // Act
        const result = await zonesController.checkAccess(vipLounge.id, {
          ticketId: 'standard-ticket-id',
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.granted).toBe(false);
      });

      it('should support QR code lookup', async () => {
        // Arrange
        const accessResult = {
          granted: true,
          message: 'Access granted',
          ticketHolder: {
            name: 'John Doe',
            ticketType: 'VIP',
            ticketStatus: 'SOLD',
            ticketId: vipTicket.id,
          },
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            currentOccupancy: 500,
            capacity: 1000,
            capacityPercentage: 50,
            isAtCapacity: false,
            isNearCapacity: false,
          },
        };
        mockZonesService.checkAccess.mockResolvedValue(accessResult);

        // Act
        const result = await zonesController.checkAccess(vipLounge.id, {
          qrCode: vipTicket.qrCode,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(mockZonesService.checkAccess).toHaveBeenCalledWith(vipLounge.id, {
          qrCode: vipTicket.qrCode,
        });
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.checkAccess.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(
          zonesController.checkAccess('non-existent-zone', { ticketId: vipTicket.id })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('POST /zones/:id/access (logAccess)', () => {
      it('should log entry successfully', async () => {
        // Arrange
        const logResult = {
          log: {
            id: 'log-id',
            zoneId: vipLounge.id,
            ticketId: vipTicket.id,
            action: ZoneAccessAction.ENTRY,
            timestamp: new Date(),
            performedById: mockStaffUser.id,
          },
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            currentOccupancy: 501,
            capacity: 1000,
            capacityPercentage: 50.1,
          },
        };
        mockZonesService.logAccess.mockResolvedValue(logResult);

        // Act
        const result = await zonesController.logAccess(
          vipLounge.id,
          { ticketId: vipTicket.id, action: ZoneAccessAction.ENTRY },
          mockStaffUser
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('ENTRY logged successfully');
        expect(result.data).toEqual(logResult);
      });

      it('should log exit successfully', async () => {
        // Arrange
        const logResult = {
          log: {
            id: 'log-id',
            zoneId: vipLounge.id,
            ticketId: vipTicket.id,
            action: ZoneAccessAction.EXIT,
            timestamp: new Date(),
            performedById: mockStaffUser.id,
          },
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            currentOccupancy: 499,
            capacity: 1000,
            capacityPercentage: 49.9,
          },
        };
        mockZonesService.logAccess.mockResolvedValue(logResult);

        // Act
        const result = await zonesController.logAccess(
          vipLounge.id,
          { ticketId: vipTicket.id, action: ZoneAccessAction.EXIT },
          mockStaffUser
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('EXIT logged successfully');
      });

      it('should throw BadRequestException when access is denied', async () => {
        // Arrange
        mockZonesService.logAccess.mockRejectedValue(new BadRequestException('Access denied'));

        // Act & Assert
        await expect(
          zonesController.logAccess(
            vipLounge.id,
            { ticketId: 'invalid-ticket', action: ZoneAccessAction.ENTRY },
            mockStaffUser
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.logAccess.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(
          zonesController.logAccess(
            'non-existent-zone',
            { ticketId: vipTicket.id, action: ZoneAccessAction.ENTRY },
            mockStaffUser
          )
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('POST /zones/:id/configure-access (configureAccess)', () => {
      it('should configure access rules successfully', async () => {
        // Arrange
        const updatedZone = { ...vipLounge };
        mockZonesService.update.mockResolvedValue(updatedZone);

        // Act
        const result = await zonesController.configureAccess(
          vipLounge.id,
          { ticketCategoryIds: ['cat-1', 'cat-2'], staffRoleIds: ['SECURITY'] },
          mockOrganizerUser
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Access rules configured successfully');
      });

      it('should throw ForbiddenException when user is not authorized', async () => {
        // Arrange
        mockZonesService.update.mockRejectedValue(new ForbiddenException('Not authorized'));

        // Act & Assert
        await expect(
          zonesController.configureAccess(
            vipLounge.id,
            { ticketCategoryIds: ['cat-1'] },
            mockStaffUser
          )
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('GET /zones/:id/access-log (getAccessLog)', () => {
      it('should return access log with pagination', async () => {
        // Arrange
        const logResult = {
          logs: [
            {
              id: 'log-1',
              zoneId: vipLounge.id,
              ticketId: vipTicket.id,
              action: ZoneAccessAction.ENTRY,
              timestamp: new Date(),
              ticket: {
                id: vipTicket.id,
                qrCode: vipTicket.qrCode,
                status: TicketStatus.USED,
                user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
                category: { name: 'VIP', type: TicketType.VIP },
              },
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
        };
        mockZonesService.getAccessLog.mockResolvedValue(logResult);

        // Act
        const result = await zonesController.getAccessLog(vipLounge.id, 1, 50);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(logResult.logs);
        expect(result.pagination).toEqual({
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        });
      });

      it('should filter by date range', async () => {
        // Arrange
        const startDate = '2024-07-15T00:00:00Z';
        const endDate = '2024-07-15T23:59:59Z';
        const logResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 50,
        };
        mockZonesService.getAccessLog.mockResolvedValue(logResult);

        // Act
        await zonesController.getAccessLog(vipLounge.id, 1, 50, startDate, endDate);

        // Assert
        expect(mockZonesService.getAccessLog).toHaveBeenCalledWith(
          vipLounge.id,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          })
        );
      });

      it('should filter by action type', async () => {
        // Arrange
        const logResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 50,
        };
        mockZonesService.getAccessLog.mockResolvedValue(logResult);

        // Act
        await zonesController.getAccessLog(
          vipLounge.id,
          1,
          50,
          undefined,
          undefined,
          ZoneAccessAction.ENTRY
        );

        // Assert
        expect(mockZonesService.getAccessLog).toHaveBeenCalledWith(
          vipLounge.id,
          expect.objectContaining({
            action: ZoneAccessAction.ENTRY,
          })
        );
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.getAccessLog.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(zonesController.getAccessLog('non-existent-zone', 1, 50)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('GET /zones/:id/stats (getStats)', () => {
      it('should return zone statistics', async () => {
        // Arrange
        const stats = {
          zone: {
            id: vipLounge.id,
            name: vipLounge.name,
            capacity: 1000,
            currentOccupancy: 500,
          },
          stats: {
            totalEntries: 1500,
            totalExits: 1000,
            uniqueVisitors: 800,
            peakOccupancy: 700,
            averageStayDurationMinutes: 45,
          },
          hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            entries: Math.floor(Math.random() * 100),
            exits: Math.floor(Math.random() * 80),
          })),
        };
        mockZonesService.getAccessStats.mockResolvedValue(stats);

        // Act
        const result = await zonesController.getStats(vipLounge.id);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(stats);
      });

      it('should filter by date range', async () => {
        // Arrange
        const startDate = '2024-07-15T00:00:00Z';
        const endDate = '2024-07-15T23:59:59Z';
        const stats = {
          zone: { id: vipLounge.id, name: vipLounge.name, capacity: 1000, currentOccupancy: 500 },
          stats: {
            totalEntries: 100,
            totalExits: 50,
            uniqueVisitors: 75,
            peakOccupancy: 60,
            averageStayDurationMinutes: 30,
          },
          hourlyDistribution: [],
        };
        mockZonesService.getAccessStats.mockResolvedValue(stats);

        // Act
        await zonesController.getStats(vipLounge.id, startDate, endDate);

        // Assert
        expect(mockZonesService.getAccessStats).toHaveBeenCalledWith(
          vipLounge.id,
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          })
        );
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.getAccessStats.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(zonesController.getStats('non-existent-zone')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('POST /zones/:id/reset-occupancy (resetOccupancy)', () => {
      it('should reset occupancy when user is admin', async () => {
        // Arrange
        const resetZone = { ...vipLounge, currentOccupancy: 0 };
        mockZonesService.resetOccupancy.mockResolvedValue(resetZone);

        // Act
        const result = await zonesController.resetOccupancy(vipLounge.id, mockAdminUser);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Zone occupancy reset to 0');
        expect(result.data.currentOccupancy).toBe(0);
      });

      it('should throw ForbiddenException when user is not admin', async () => {
        // Arrange
        mockZonesService.resetOccupancy.mockRejectedValue(
          new ForbiddenException('Only admins can reset occupancy')
        );

        // Act & Assert
        await expect(
          zonesController.resetOccupancy(vipLounge.id, mockOrganizerUser)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.resetOccupancy.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(
          zonesController.resetOccupancy('non-existent-zone', mockAdminUser)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('POST /zones/:id/adjust-occupancy (adjustOccupancy)', () => {
      it('should adjust occupancy when user is admin', async () => {
        // Arrange
        const adjustedZone = { ...vipLounge, currentOccupancy: 510 };
        mockZonesService.adjustOccupancy.mockResolvedValue(adjustedZone);

        // Act
        const result = await zonesController.adjustOccupancy(vipLounge.id, 10, mockAdminUser);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Zone occupancy adjusted by 10');
        expect(result.data.currentOccupancy).toBe(510);
      });

      it('should adjust occupancy when user is organizer', async () => {
        // Arrange
        const adjustedZone = { ...vipLounge, currentOccupancy: 490 };
        mockZonesService.adjustOccupancy.mockResolvedValue(adjustedZone);

        // Act
        const result = await zonesController.adjustOccupancy(vipLounge.id, -10, mockOrganizerUser);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Zone occupancy adjusted by -10');
      });

      it('should throw ForbiddenException when user is staff', async () => {
        // Arrange
        mockZonesService.adjustOccupancy.mockRejectedValue(
          new ForbiddenException('Only admins and organizers can adjust occupancy')
        );

        // Act & Assert
        await expect(
          zonesController.adjustOccupancy(vipLounge.id, 10, mockStaffUser)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when zone does not exist', async () => {
        // Arrange
        mockZonesService.adjustOccupancy.mockRejectedValue(new NotFoundException('Zone not found'));

        // Act & Assert
        await expect(
          zonesController.adjustOccupancy('non-existent-zone', 10, mockAdminUser)
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
