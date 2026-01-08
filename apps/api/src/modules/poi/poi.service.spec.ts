/**
 * POI Service Unit Tests
 *
 * Comprehensive tests for Point of Interest management functionality including:
 * - POI CRUD operations
 * - Festival-scoped queries
 * - Category filtering and counts
 * - Proximity search
 * - Authorization and access control
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PoiService, AuthenticatedUser } from './poi.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoiType, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  regularUser,
  adminUser,
  organizerUser,
  staffUser,
} from '../../test/fixtures';

// ============================================================================
// Mock Data
// ============================================================================

const mockFestivalId = 'festival-uuid-00000000-0000-0000-0000-000000000001';
const mockPoiId = 'poi-uuid-00000000-0000-0000-0000-000000000001';

const mockFestival = {
  id: mockFestivalId,
  name: 'Summer Festival 2024',
  organizerId: organizerUser.id,
  status: 'PUBLISHED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPoi = {
  id: mockPoiId,
  festivalId: mockFestivalId,
  name: 'Main Stage',
  type: PoiType.STAGE,
  description: 'The main stage for headliner performances',
  latitude: 48.8566,
  longitude: 2.3522,
  iconUrl: 'https://example.com/icons/stage.png',
  metadata: { openingHours: '10:00-02:00' },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPoiWithFestival = {
  ...mockPoi,
  festival: {
    id: mockFestivalId,
    name: 'Summer Festival 2024',
    organizerId: organizerUser.id,
  },
};

// ============================================================================
// Mock Setup
// ============================================================================

describe('PoiService', () => {
  let poiService: PoiService;

  const mockPrismaService = {
    mapPoi: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
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
      providers: [
        PoiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    poiService = module.get<PoiService>(PoiService);
  });

  // ==========================================================================
  // create() Tests
  // ==========================================================================

  describe('create', () => {
    const createPoiDto = {
      name: 'Test POI',
      type: PoiType.STAGE,
      description: 'A test POI',
      latitude: 48.8566,
      longitude: 2.3522,
      iconUrl: 'https://example.com/icon.png',
      isActive: true,
    };

    it('should create a POI successfully when user is organizer', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createPoiDto,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createPoiDto, mockOrganizerUser);

      expect(result.name).toBe(createPoiDto.name);
      expect(result.type).toBe(createPoiDto.type);
      expect(mockPrismaService.mapPoi.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          festivalId: mockFestivalId,
          name: createPoiDto.name,
          type: createPoiDto.type,
        }),
      });
    });

    it('should create a POI successfully when user is admin', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createPoiDto,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createPoiDto, mockAdminUser);

      expect(result.name).toBe(createPoiDto.name);
      expect(mockPrismaService.mapPoi.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.create(mockFestivalId, createPoiDto, mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not organizer or admin', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);

      await expect(
        poiService.create(mockFestivalId, createPoiDto, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when organizer is not the festival owner', async () => {
      const otherFestival = { ...mockFestival, organizerId: 'other-organizer-id' };
      mockPrismaService.festival.findUnique.mockResolvedValue(otherFestival);

      await expect(
        poiService.create(mockFestivalId, createPoiDto, mockOrganizerUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create POI with metadata', async () => {
      const dtoWithMetadata = {
        ...createPoiDto,
        metadata: { openingHours: '10:00-22:00', accessibility: true },
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...dtoWithMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await poiService.create(mockFestivalId, dtoWithMetadata, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: dtoWithMetadata.metadata,
        }),
      });
    });

    it('should default isActive to true when not provided', async () => {
      const dtoWithoutIsActive = {
        name: 'Test POI',
        type: PoiType.FOOD,
        latitude: 48.8566,
        longitude: 2.3522,
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...dtoWithoutIsActive,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await poiService.create(mockFestivalId, dtoWithoutIsActive, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });

    it('should create POI for each POI type', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);

      for (const type of Object.values(PoiType)) {
        const dto = { ...createPoiDto, type };
        mockPrismaService.mapPoi.create.mockResolvedValue({
          id: `poi-${type}`,
          festivalId: mockFestivalId,
          ...dto,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await poiService.create(mockFestivalId, dto, mockOrganizerUser);
        expect(result.type).toBe(type);
      }
    });
  });

  // ==========================================================================
  // findAllByFestival() Tests
  // ==========================================================================

  describe('findAllByFestival', () => {
    const mockPois = [
      { ...mockPoi, id: 'poi-1', name: 'POI 1', type: PoiType.STAGE },
      { ...mockPoi, id: 'poi-2', name: 'POI 2', type: PoiType.FOOD },
      { ...mockPoi, id: 'poi-3', name: 'POI 3', type: PoiType.DRINK },
    ];

    it('should return paginated POIs for a festival', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(mockPois);
      mockPrismaService.mapPoi.count.mockResolvedValue(3);

      const result = await poiService.findAllByFestival(mockFestivalId);

      expect(result.pois).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.findAllByFestival(mockFestivalId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by POI type', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([mockPois[0]]);
      mockPrismaService.mapPoi.count.mockResolvedValue(1);

      const result = await poiService.findAllByFestival(mockFestivalId, {
        type: PoiType.STAGE,
      });

      expect(result.pois).toHaveLength(1);
      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: PoiType.STAGE,
          }),
        })
      );
    });

    it('should filter by active status', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(mockPois);
      mockPrismaService.mapPoi.count.mockResolvedValue(3);

      await poiService.findAllByFestival(mockFestivalId, {
        isActive: true,
      });

      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should return empty array when no POIs exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([]);
      mockPrismaService.mapPoi.count.mockResolvedValue(0);

      const result = await poiService.findAllByFestival(mockFestivalId);

      expect(result.pois).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([mockPois[0]]);
      mockPrismaService.mapPoi.count.mockResolvedValue(3);

      const result = await poiService.findAllByFestival(mockFestivalId, {
        page: 2,
        limit: 1,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        })
      );
    });

    it('should order by type and name', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(mockPois);
      mockPrismaService.mapPoi.count.mockResolvedValue(3);

      await poiService.findAllByFestival(mockFestivalId);

      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
        })
      );
    });
  });

  // ==========================================================================
  // findOne() Tests
  // ==========================================================================

  describe('findOne', () => {
    it('should return a POI with festival relation', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);

      const result = await poiService.findOne(mockPoiId);

      expect(result).toEqual(mockPoiWithFestival);
      expect(mockPrismaService.mapPoi.findUnique).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        include: {
          festival: {
            select: {
              id: true,
              name: true,
              organizerId: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(null);

      await expect(poiService.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // update() Tests
  // ==========================================================================

  describe('update', () => {
    const updatePoiDto = {
      name: 'Updated POI Name',
      description: 'Updated description',
    };

    beforeEach(() => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);
    });

    it('should update a POI successfully when user is organizer', async () => {
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        ...updatePoiDto,
      });

      const result = await poiService.update(mockPoiId, updatePoiDto, mockOrganizerUser);

      expect(result.name).toBe(updatePoiDto.name);
      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: expect.objectContaining({
          name: updatePoiDto.name,
          description: updatePoiDto.description,
        }),
      });
    });

    it('should update a POI successfully when user is admin', async () => {
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        ...updatePoiDto,
      });

      const result = await poiService.update(mockPoiId, updatePoiDto, mockAdminUser);

      expect(result.name).toBe(updatePoiDto.name);
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(null);

      await expect(
        poiService.update('non-existent-id', updatePoiDto, mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      await expect(
        poiService.update(mockPoiId, updatePoiDto, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when organizer is not festival owner', async () => {
      const otherOrganizerPoi = {
        ...mockPoiWithFestival,
        festival: {
          ...mockPoiWithFestival.festival,
          organizerId: 'other-organizer-id',
        },
      };
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(otherOrganizerPoi);

      await expect(
        poiService.update(mockPoiId, updatePoiDto, mockOrganizerUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { name: 'New Name Only' };
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        name: 'New Name Only',
      });

      await poiService.update(mockPoiId, partialUpdate, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { name: 'New Name Only' },
      });
    });

    it('should update coordinates', async () => {
      const coordinateUpdate = { latitude: 49.0, longitude: 3.0 };
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        ...coordinateUpdate,
      });

      await poiService.update(mockPoiId, coordinateUpdate, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: expect.objectContaining({
          latitude: 49.0,
          longitude: 3.0,
        }),
      });
    });

    it('should update POI type', async () => {
      const typeUpdate = { type: PoiType.FOOD };
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        type: PoiType.FOOD,
      });

      await poiService.update(mockPoiId, typeUpdate, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { type: PoiType.FOOD },
      });
    });

    it('should update isActive status', async () => {
      const activeUpdate = { isActive: false };
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        isActive: false,
      });

      await poiService.update(mockPoiId, activeUpdate, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { isActive: false },
      });
    });

    it('should update metadata', async () => {
      const metadataUpdate = { metadata: { newKey: 'newValue' } };
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        metadata: { newKey: 'newValue' },
      });

      await poiService.update(mockPoiId, metadataUpdate, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { metadata: { newKey: 'newValue' } },
      });
    });
  });

  // ==========================================================================
  // remove() Tests
  // ==========================================================================

  describe('remove', () => {
    beforeEach(() => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);
    });

    it('should delete a POI successfully when user is organizer', async () => {
      mockPrismaService.mapPoi.delete.mockResolvedValue(mockPoi);

      await poiService.remove(mockPoiId, mockOrganizerUser);

      expect(mockPrismaService.mapPoi.delete).toHaveBeenCalledWith({
        where: { id: mockPoiId },
      });
    });

    it('should delete a POI successfully when user is admin', async () => {
      mockPrismaService.mapPoi.delete.mockResolvedValue(mockPoi);

      await poiService.remove(mockPoiId, mockAdminUser);

      expect(mockPrismaService.mapPoi.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(null);

      await expect(
        poiService.remove('non-existent-id', mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      await expect(
        poiService.remove(mockPoiId, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when organizer is not festival owner', async () => {
      const otherOrganizerPoi = {
        ...mockPoiWithFestival,
        festival: {
          ...mockPoiWithFestival.festival,
          organizerId: 'other-organizer-id',
        },
      };
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(otherOrganizerPoi);

      await expect(
        poiService.remove(mockPoiId, mockOrganizerUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // findByType() Tests
  // ==========================================================================

  describe('findByType', () => {
    const stagePois = [
      { ...mockPoi, id: 'stage-1', name: 'Stage 1' },
      { ...mockPoi, id: 'stage-2', name: 'Stage 2' },
    ];

    it('should return POIs of a specific type', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(stagePois);

      const result = await poiService.findByType(mockFestivalId, PoiType.STAGE);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith({
        where: {
          festivalId: mockFestivalId,
          type: PoiType.STAGE,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.findByType(mockFestivalId, PoiType.STAGE)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no POIs of type exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([]);

      const result = await poiService.findByType(mockFestivalId, PoiType.ATM);

      expect(result).toHaveLength(0);
    });

    it('should only return active POIs', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(stagePois);

      await poiService.findByType(mockFestivalId, PoiType.STAGE);

      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // getCategoryCounts() Tests
  // ==========================================================================

  describe('getCategoryCounts', () => {
    const mockGroupedCounts = [
      { type: PoiType.STAGE, _count: { id: 3 } },
      { type: PoiType.FOOD, _count: { id: 5 } },
      { type: PoiType.DRINK, _count: { id: 4 } },
      { type: PoiType.TOILET, _count: { id: 10 } },
    ];

    it('should return POI counts grouped by type', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.groupBy.mockResolvedValue(mockGroupedCounts);

      const result = await poiService.getCategoryCounts(mockFestivalId);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: PoiType.STAGE, count: 3 });
      expect(result[1]).toEqual({ type: PoiType.FOOD, count: 5 });
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.getCategoryCounts(mockFestivalId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no POIs exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.groupBy.mockResolvedValue([]);

      const result = await poiService.getCategoryCounts(mockFestivalId);

      expect(result).toHaveLength(0);
    });

    it('should only count active POIs', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.groupBy.mockResolvedValue(mockGroupedCounts);

      await poiService.getCategoryCounts(mockFestivalId);

      expect(mockPrismaService.mapPoi.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should order results by type', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.groupBy.mockResolvedValue(mockGroupedCounts);

      await poiService.getCategoryCounts(mockFestivalId);

      expect(mockPrismaService.mapPoi.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { type: 'asc' },
        })
      );
    });
  });

  // ==========================================================================
  // findNearby() Tests
  // ==========================================================================

  describe('findNearby', () => {
    const centerLat = 48.8566;
    const centerLon = 2.3522;
    const nearbyPois = [
      { ...mockPoi, id: 'poi-1', latitude: 48.8567, longitude: 2.3523 }, // ~15m away
      { ...mockPoi, id: 'poi-2', latitude: 48.8580, longitude: 2.3540 }, // ~200m away
      { ...mockPoi, id: 'poi-3', latitude: 48.8700, longitude: 2.3700 }, // ~2000m away
    ];

    it('should return POIs within default radius', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(nearbyPois);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon);

      // Should include POIs within 1000m (default)
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((poi) => 'distance' in poi)).toBe(true);
    });

    it('should return POIs sorted by distance', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(nearbyPois);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon);

      // Verify sorted by distance
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(result[i - 1].distance);
      }
    });

    it('should filter by custom radius', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(nearbyPois);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon, 100);

      // Only very close POIs should be returned
      expect(result.every((poi) => poi.distance <= 100)).toBe(true);
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.findNearby(mockFestivalId, centerLat, centerLon)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no POIs within radius', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([
        { ...mockPoi, latitude: 50.0, longitude: 5.0 }, // Far away
      ]);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon, 100);

      expect(result).toHaveLength(0);
    });

    it('should only include active POIs', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(nearbyPois);

      await poiService.findNearby(mockFestivalId, centerLat, centerLon);

      expect(mockPrismaService.mapPoi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should handle large radius correctly', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue(nearbyPois);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon, 50000);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should calculate distance correctly', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findMany.mockResolvedValue([
        { ...mockPoi, latitude: centerLat, longitude: centerLon }, // Same location
      ]);

      const result = await poiService.findNearby(mockFestivalId, centerLat, centerLon, 1000);

      expect(result[0].distance).toBe(0);
    });
  });

  // ==========================================================================
  // bulkCreate() Tests
  // ==========================================================================

  describe('bulkCreate', () => {
    const createPoisDto = [
      { name: 'POI 1', type: PoiType.STAGE, latitude: 48.8566, longitude: 2.3522 },
      { name: 'POI 2', type: PoiType.FOOD, latitude: 48.8567, longitude: 2.3523 },
      { name: 'POI 3', type: PoiType.DRINK, latitude: 48.8568, longitude: 2.3524 },
    ];

    it('should bulk create POIs successfully', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.createMany.mockResolvedValue({ count: 3 });

      const result = await poiService.bulkCreate(mockFestivalId, createPoisDto, mockOrganizerUser);

      expect(result.created).toBe(3);
      expect(mockPrismaService.mapPoi.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      await expect(
        poiService.bulkCreate(mockFestivalId, createPoisDto, mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);

      await expect(
        poiService.bulkCreate(mockFestivalId, createPoisDto, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to bulk create', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.createMany.mockResolvedValue({ count: 3 });

      const result = await poiService.bulkCreate(mockFestivalId, createPoisDto, mockAdminUser);

      expect(result.created).toBe(3);
    });

    it('should handle empty array', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.createMany.mockResolvedValue({ count: 0 });

      const result = await poiService.bulkCreate(mockFestivalId, [], mockOrganizerUser);

      expect(result.created).toBe(0);
    });

    it('should set isActive to true by default', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.createMany.mockResolvedValue({ count: 1 });

      await poiService.bulkCreate(
        mockFestivalId,
        [{ name: 'Test', type: PoiType.STAGE, latitude: 48.0, longitude: 2.0 }],
        mockOrganizerUser
      );

      expect(mockPrismaService.mapPoi.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            isActive: true,
          }),
        ]),
      });
    });
  });

  // ==========================================================================
  // toggleActive() Tests
  // ==========================================================================

  describe('toggleActive', () => {
    beforeEach(() => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);
    });

    it('should toggle active status from true to false', async () => {
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        isActive: false,
      });

      const result = await poiService.toggleActive(mockPoiId, mockOrganizerUser);

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { isActive: false },
      });
    });

    it('should toggle active status from false to true', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue({
        ...mockPoiWithFestival,
        isActive: false,
      });
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        isActive: true,
      });

      const result = await poiService.toggleActive(mockPoiId, mockOrganizerUser);

      expect(result.isActive).toBe(true);
      expect(mockPrismaService.mapPoi.update).toHaveBeenCalledWith({
        where: { id: mockPoiId },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(null);

      await expect(
        poiService.toggleActive('non-existent-id', mockOrganizerUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      await expect(
        poiService.toggleActive(mockPoiId, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to toggle', async () => {
      mockPrismaService.mapPoi.update.mockResolvedValue({
        ...mockPoi,
        isActive: false,
      });

      const result = await poiService.toggleActive(mockPoiId, mockAdminUser);

      expect(result.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle POI with null optional fields', async () => {
      const poiWithNulls = {
        ...mockPoi,
        description: null,
        iconUrl: null,
        metadata: null,
      };
      mockPrismaService.mapPoi.findUnique.mockResolvedValue({
        ...poiWithNulls,
        festival: mockPoiWithFestival.festival,
      });

      const result = await poiService.findOne(mockPoiId);

      expect(result.description).toBeNull();
      expect(result.iconUrl).toBeNull();
      expect(result.metadata).toBeNull();
    });

    it('should handle special characters in POI name', async () => {
      const createDto = {
        name: 'Stage <Main> "Electro" & Acoustic\'s',
        type: PoiType.STAGE,
        latitude: 48.8566,
        longitude: 2.3522,
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.name).toBe(createDto.name);
    });

    it('should handle unicode characters in POI name', async () => {
      const createDto = {
        name: 'Scene Principale',
        type: PoiType.STAGE,
        description: 'Description avec caracteres speciaux',
        latitude: 48.8566,
        longitude: 2.3522,
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.name).toBe(createDto.name);
    });

    it('should handle boundary coordinates', async () => {
      const createDto = {
        name: 'Edge POI',
        type: PoiType.STAGE,
        latitude: 90, // Max latitude
        longitude: -180, // Min longitude
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.latitude).toBe(90);
      expect(result.longitude).toBe(-180);
    });

    it('should handle negative coordinates', async () => {
      const createDto = {
        name: 'Southern POI',
        type: PoiType.STAGE,
        latitude: -33.8688, // Sydney
        longitude: 151.2093,
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.latitude).toBe(-33.8688);
    });

    it('should handle complex metadata object', async () => {
      const createDto = {
        name: 'Complex POI',
        type: PoiType.STAGE,
        latitude: 48.8566,
        longitude: 2.3522,
        metadata: {
          openingHours: { start: '10:00', end: '02:00' },
          accessibility: { wheelchair: true, elevator: false },
          capacity: 5000,
          tags: ['main', 'headliner', 'outdoor'],
        },
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: 'new-poi-id',
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.metadata).toEqual(createDto.metadata);
    });
  });

  // ==========================================================================
  // POI Type Coverage Tests
  // ==========================================================================

  describe('POI Type Coverage', () => {
    beforeEach(() => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
    });

    it.each(Object.values(PoiType))('should handle POI type: %s', async (poiType) => {
      const createDto = {
        name: `Test ${poiType}`,
        type: poiType,
        latitude: 48.8566,
        longitude: 2.3522,
      };

      mockPrismaService.mapPoi.create.mockResolvedValue({
        id: `poi-${poiType}`,
        festivalId: mockFestivalId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await poiService.create(mockFestivalId, createDto, mockOrganizerUser);

      expect(result.type).toBe(poiType);
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('Authorization', () => {
    it('should allow ADMIN role for all operations', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);

      // Create
      mockPrismaService.mapPoi.create.mockResolvedValue(mockPoi);
      await expect(
        poiService.create(mockFestivalId, { name: 'Test', type: PoiType.STAGE, latitude: 48.0, longitude: 2.0 }, mockAdminUser)
      ).resolves.not.toThrow();

      // Update
      mockPrismaService.mapPoi.update.mockResolvedValue(mockPoi);
      await expect(
        poiService.update(mockPoiId, { name: 'Updated' }, mockAdminUser)
      ).resolves.not.toThrow();

      // Delete
      mockPrismaService.mapPoi.delete.mockResolvedValue(mockPoi);
      await expect(
        poiService.remove(mockPoiId, mockAdminUser)
      ).resolves.not.toThrow();
    });

    it('should deny STAFF role for write operations', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);

      await expect(
        poiService.create(mockFestivalId, { name: 'Test', type: PoiType.STAGE, latitude: 48.0, longitude: 2.0 }, mockStaffUser)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        poiService.update(mockPoiId, { name: 'Updated' }, mockStaffUser)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        poiService.remove(mockPoiId, mockStaffUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny USER role for all write operations', async () => {
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.mapPoi.findUnique.mockResolvedValue(mockPoiWithFestival);

      await expect(
        poiService.create(mockFestivalId, { name: 'Test', type: PoiType.STAGE, latitude: 48.0, longitude: 2.0 }, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        poiService.update(mockPoiId, { name: 'Updated' }, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        poiService.remove(mockPoiId, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
