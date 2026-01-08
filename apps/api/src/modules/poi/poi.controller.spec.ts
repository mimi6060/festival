/**
 * POI Controller Unit Tests
 *
 * Comprehensive tests for Point of Interest controller endpoints including:
 * - Festival-scoped POI operations (FestivalPoiController)
 * - Individual POI operations (PoiController)
 * - Authorization and access control
 * - Error handling and response formats
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FestivalPoiController, PoiController } from './poi.controller';
import { PoiService, AuthenticatedUser } from './poi.service';
import { PoiType, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// ============================================================================
// Mock Data
// ============================================================================

const mockFestivalId = 'festival-uuid-00000000-0000-0000-0000-000000000001';
const mockPoiId = 'poi-uuid-00000000-0000-0000-0000-000000000001';

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
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

const mockPoiWithFestival = {
  ...mockPoi,
  festival: {
    id: mockFestivalId,
    name: 'Summer Festival 2024',
    organizerId: 'organizer-uuid-00000000-0000-0000-0000-000000000002',
  },
};

const mockUser: AuthenticatedUser = {
  id: 'organizer-uuid-00000000-0000-0000-0000-000000000002',
  email: 'organizer@festival.test',
  role: UserRole.ORGANIZER,
};

const mockAdminUser: AuthenticatedUser = {
  id: 'admin-uuid-00000000-0000-0000-0000-000000000001',
  email: 'admin@festival.test',
  role: UserRole.ADMIN,
};

// ============================================================================
// Mock Service
// ============================================================================

const mockPoiService = {
  create: jest.fn(),
  findAllByFestival: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findByType: jest.fn(),
  getCategoryCounts: jest.fn(),
  findNearby: jest.fn(),
  bulkCreate: jest.fn(),
  toggleActive: jest.fn(),
};

// ============================================================================
// FestivalPoiController Tests
// ============================================================================

describe('FestivalPoiController', () => {
  let controller: FestivalPoiController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FestivalPoiController],
      providers: [
        { provide: PoiService, useValue: mockPoiService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FestivalPoiController>(FestivalPoiController);
  });

  // ==========================================================================
  // POST /festivals/:festivalId/pois (create)
  // ==========================================================================

  describe('create', () => {
    const createPoiDto = {
      name: 'New Stage',
      type: PoiType.STAGE,
      latitude: 48.8566,
      longitude: 2.3522,
    };

    it('should create a POI successfully', async () => {
      mockPoiService.create.mockResolvedValue(mockPoi);

      const result = await controller.create(mockFestivalId, createPoiDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toBe('POI created successfully');
      expect(result.data).toEqual(mockPoi);
      expect(mockPoiService.create).toHaveBeenCalledWith(mockFestivalId, createPoiDto, mockUser);
    });

    it('should propagate NotFoundException when festival not found', async () => {
      mockPoiService.create.mockRejectedValue(
        new NotFoundException(`Festival with ID ${mockFestivalId} not found`)
      );

      await expect(
        controller.create(mockFestivalId, createPoiDto, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when unauthorized', async () => {
      mockPoiService.create.mockRejectedValue(
        new ForbiddenException('You do not have permission to create POIs for this festival')
      );

      await expect(
        controller.create(mockFestivalId, createPoiDto, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass user to service', async () => {
      mockPoiService.create.mockResolvedValue(mockPoi);

      await controller.create(mockFestivalId, createPoiDto, mockAdminUser);

      expect(mockPoiService.create).toHaveBeenCalledWith(
        mockFestivalId,
        createPoiDto,
        mockAdminUser
      );
    });
  });

  // ==========================================================================
  // POST /festivals/:festivalId/pois/bulk (bulkCreate)
  // ==========================================================================

  describe('bulkCreate', () => {
    const createPoisDto = [
      { name: 'POI 1', type: PoiType.STAGE, latitude: 48.8566, longitude: 2.3522 },
      { name: 'POI 2', type: PoiType.FOOD, latitude: 48.8567, longitude: 2.3523 },
    ];

    it('should bulk create POIs successfully', async () => {
      mockPoiService.bulkCreate.mockResolvedValue({ created: 2 });

      const result = await controller.bulkCreate(mockFestivalId, createPoisDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toBe('2 POIs created successfully');
      expect(result.data).toEqual({ created: 2 });
      expect(mockPoiService.bulkCreate).toHaveBeenCalledWith(mockFestivalId, createPoisDto, mockUser);
    });

    it('should propagate NotFoundException when festival not found', async () => {
      mockPoiService.bulkCreate.mockRejectedValue(
        new NotFoundException(`Festival with ID ${mockFestivalId} not found`)
      );

      await expect(
        controller.bulkCreate(mockFestivalId, createPoisDto, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty array', async () => {
      mockPoiService.bulkCreate.mockResolvedValue({ created: 0 });

      const result = await controller.bulkCreate(mockFestivalId, [], mockUser);

      expect(result.success).toBe(true);
      expect(result.data.created).toBe(0);
    });
  });

  // ==========================================================================
  // GET /festivals/:festivalId/pois (findAll)
  // ==========================================================================

  describe('findAll', () => {
    const mockPois = [mockPoi, { ...mockPoi, id: 'poi-2', name: 'Food Court' }];

    it('should return paginated POIs', async () => {
      mockPoiService.findAllByFestival.mockResolvedValue({
        pois: mockPois,
        total: 2,
        page: 1,
        limit: 50,
      });

      const result = await controller.findAll(mockFestivalId, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPois);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should pass query parameters to service', async () => {
      mockPoiService.findAllByFestival.mockResolvedValue({
        pois: [mockPoi],
        total: 1,
        page: 2,
        limit: 10,
      });

      const query = { type: PoiType.STAGE, isActive: true, page: 2, limit: 10 };
      await controller.findAll(mockFestivalId, query);

      expect(mockPoiService.findAllByFestival).toHaveBeenCalledWith(mockFestivalId, query);
    });

    it('should return empty array when no POIs exist', async () => {
      mockPoiService.findAllByFestival.mockResolvedValue({
        pois: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      const result = await controller.findAll(mockFestivalId, {});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      mockPoiService.findAllByFestival.mockResolvedValue({
        pois: mockPois,
        total: 25,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll(mockFestivalId, { limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });

    it('should propagate NotFoundException when festival not found', async () => {
      mockPoiService.findAllByFestival.mockRejectedValue(
        new NotFoundException(`Festival with ID ${mockFestivalId} not found`)
      );

      await expect(
        controller.findAll(mockFestivalId, {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET /festivals/:festivalId/pois/categories (getCategoryCounts)
  // ==========================================================================

  describe('getCategoryCounts', () => {
    const mockCounts = [
      { type: PoiType.STAGE, count: 3 },
      { type: PoiType.FOOD, count: 5 },
      { type: PoiType.DRINK, count: 4 },
    ];

    it('should return category counts', async () => {
      mockPoiService.getCategoryCounts.mockResolvedValue(mockCounts);

      const result = await controller.getCategoryCounts(mockFestivalId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCounts);
      expect(mockPoiService.getCategoryCounts).toHaveBeenCalledWith(mockFestivalId);
    });

    it('should return empty array when no POIs exist', async () => {
      mockPoiService.getCategoryCounts.mockResolvedValue([]);

      const result = await controller.getCategoryCounts(mockFestivalId);

      expect(result.data).toEqual([]);
    });

    it('should propagate NotFoundException when festival not found', async () => {
      mockPoiService.getCategoryCounts.mockRejectedValue(
        new NotFoundException(`Festival with ID ${mockFestivalId} not found`)
      );

      await expect(
        controller.getCategoryCounts(mockFestivalId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET /festivals/:festivalId/pois/type/:type (findByType)
  // ==========================================================================

  describe('findByType', () => {
    const stagePois = [mockPoi, { ...mockPoi, id: 'stage-2', name: 'Stage 2' }];

    it('should return POIs of specific type', async () => {
      mockPoiService.findByType.mockResolvedValue(stagePois);

      const result = await controller.findByType(mockFestivalId, PoiType.STAGE);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(stagePois);
      expect(result.count).toBe(2);
      expect(mockPoiService.findByType).toHaveBeenCalledWith(mockFestivalId, PoiType.STAGE);
    });

    it('should return empty array when no POIs of type exist', async () => {
      mockPoiService.findByType.mockResolvedValue([]);

      const result = await controller.findByType(mockFestivalId, PoiType.ATM);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should handle all POI types', async () => {
      for (const type of Object.values(PoiType)) {
        mockPoiService.findByType.mockResolvedValue([{ ...mockPoi, type }]);

        const result = await controller.findByType(mockFestivalId, type);

        expect(result.success).toBe(true);
        expect(mockPoiService.findByType).toHaveBeenCalledWith(mockFestivalId, type);
      }
    });
  });

  // ==========================================================================
  // GET /festivals/:festivalId/pois/nearby (findNearby)
  // ==========================================================================

  describe('findNearby', () => {
    const nearbyPois = [
      { ...mockPoi, distance: 50 },
      { ...mockPoi, id: 'poi-2', distance: 150 },
    ];

    it('should return nearby POIs with distances', async () => {
      mockPoiService.findNearby.mockResolvedValue(nearbyPois);

      const result = await controller.findNearby(mockFestivalId, 48.8566, 2.3522);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(nearbyPois);
      expect(result.count).toBe(2);
      expect(mockPoiService.findNearby).toHaveBeenCalledWith(
        mockFestivalId,
        48.8566,
        2.3522,
        undefined
      );
    });

    it('should pass custom radius to service', async () => {
      mockPoiService.findNearby.mockResolvedValue(nearbyPois);

      await controller.findNearby(mockFestivalId, 48.8566, 2.3522, 500);

      expect(mockPoiService.findNearby).toHaveBeenCalledWith(
        mockFestivalId,
        48.8566,
        2.3522,
        500
      );
    });

    it('should return empty array when no POIs nearby', async () => {
      mockPoiService.findNearby.mockResolvedValue([]);

      const result = await controller.findNearby(mockFestivalId, 48.8566, 2.3522);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should convert string query params to numbers', async () => {
      mockPoiService.findNearby.mockResolvedValue(nearbyPois);

      // Query params come as strings from HTTP request
      await controller.findNearby(mockFestivalId, '48.8566' as any, '2.3522' as any);

      expect(mockPoiService.findNearby).toHaveBeenCalledWith(
        mockFestivalId,
        48.8566,
        2.3522,
        undefined
      );
    });
  });
});

// ============================================================================
// PoiController Tests
// ============================================================================

describe('PoiController', () => {
  let controller: PoiController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoiController],
      providers: [
        { provide: PoiService, useValue: mockPoiService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PoiController>(PoiController);
  });

  // ==========================================================================
  // GET /pois/:id (findOne)
  // ==========================================================================

  describe('findOne', () => {
    it('should return a POI with festival details', async () => {
      mockPoiService.findOne.mockResolvedValue(mockPoiWithFestival);

      const result = await controller.findOne(mockPoiId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPoiWithFestival);
      expect(mockPoiService.findOne).toHaveBeenCalledWith(mockPoiId);
    });

    it('should propagate NotFoundException when POI not found', async () => {
      mockPoiService.findOne.mockRejectedValue(
        new NotFoundException(`POI with ID ${mockPoiId} not found`)
      );

      await expect(
        controller.findOne(mockPoiId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include festival relation in response', async () => {
      mockPoiService.findOne.mockResolvedValue(mockPoiWithFestival);

      const result = await controller.findOne(mockPoiId);

      expect(result.data.festival).toBeDefined();
      expect(result.data.festival.id).toBe(mockFestivalId);
    });
  });

  // ==========================================================================
  // PATCH /pois/:id (update)
  // ==========================================================================

  describe('update', () => {
    const updatePoiDto = {
      name: 'Updated Stage Name',
      description: 'Updated description',
    };

    it('should update a POI successfully', async () => {
      const updatedPoi = { ...mockPoi, ...updatePoiDto };
      mockPoiService.update.mockResolvedValue(updatedPoi);

      const result = await controller.update(mockPoiId, updatePoiDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toBe('POI updated successfully');
      expect(result.data).toEqual(updatedPoi);
      expect(mockPoiService.update).toHaveBeenCalledWith(mockPoiId, updatePoiDto, mockUser);
    });

    it('should propagate NotFoundException when POI not found', async () => {
      mockPoiService.update.mockRejectedValue(
        new NotFoundException(`POI with ID ${mockPoiId} not found`)
      );

      await expect(
        controller.update(mockPoiId, updatePoiDto, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when unauthorized', async () => {
      mockPoiService.update.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this POI')
      );

      await expect(
        controller.update(mockPoiId, updatePoiDto, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass user to service', async () => {
      mockPoiService.update.mockResolvedValue(mockPoi);

      await controller.update(mockPoiId, updatePoiDto, mockAdminUser);

      expect(mockPoiService.update).toHaveBeenCalledWith(
        mockPoiId,
        updatePoiDto,
        mockAdminUser
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'Just the name' };
      mockPoiService.update.mockResolvedValue({ ...mockPoi, ...partialUpdate });

      const result = await controller.update(mockPoiId, partialUpdate, mockUser);

      expect(result.data.name).toBe('Just the name');
    });
  });

  // ==========================================================================
  // DELETE /pois/:id (remove)
  // ==========================================================================

  describe('remove', () => {
    it('should delete a POI successfully', async () => {
      mockPoiService.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove(mockPoiId, mockUser)
      ).resolves.toBeUndefined();

      expect(mockPoiService.remove).toHaveBeenCalledWith(mockPoiId, mockUser);
    });

    it('should propagate NotFoundException when POI not found', async () => {
      mockPoiService.remove.mockRejectedValue(
        new NotFoundException(`POI with ID ${mockPoiId} not found`)
      );

      await expect(
        controller.remove(mockPoiId, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when unauthorized', async () => {
      mockPoiService.remove.mockRejectedValue(
        new ForbiddenException('You do not have permission to delete this POI')
      );

      await expect(
        controller.remove(mockPoiId, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass user to service', async () => {
      mockPoiService.remove.mockResolvedValue(undefined);

      await controller.remove(mockPoiId, mockAdminUser);

      expect(mockPoiService.remove).toHaveBeenCalledWith(mockPoiId, mockAdminUser);
    });
  });

  // ==========================================================================
  // POST /pois/:id/toggle-active (toggleActive)
  // ==========================================================================

  describe('toggleActive', () => {
    it('should toggle POI active status to inactive', async () => {
      mockPoiService.toggleActive.mockResolvedValue({ ...mockPoi, isActive: false });

      const result = await controller.toggleActive(mockPoiId, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toBe('POI is now inactive');
      expect(result.data.isActive).toBe(false);
      expect(mockPoiService.toggleActive).toHaveBeenCalledWith(mockPoiId, mockUser);
    });

    it('should toggle POI active status to active', async () => {
      mockPoiService.toggleActive.mockResolvedValue({ ...mockPoi, isActive: true });

      const result = await controller.toggleActive(mockPoiId, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toBe('POI is now active');
      expect(result.data.isActive).toBe(true);
    });

    it('should propagate NotFoundException when POI not found', async () => {
      mockPoiService.toggleActive.mockRejectedValue(
        new NotFoundException(`POI with ID ${mockPoiId} not found`)
      );

      await expect(
        controller.toggleActive(mockPoiId, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when unauthorized', async () => {
      mockPoiService.toggleActive.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this POI')
      );

      await expect(
        controller.toggleActive(mockPoiId, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass user to service', async () => {
      mockPoiService.toggleActive.mockResolvedValue(mockPoi);

      await controller.toggleActive(mockPoiId, mockAdminUser);

      expect(mockPoiService.toggleActive).toHaveBeenCalledWith(mockPoiId, mockAdminUser);
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('Response Format', () => {
    it('should return consistent success response for findOne', async () => {
      mockPoiService.findOne.mockResolvedValue(mockPoiWithFestival);

      const result = await controller.findOne(mockPoiId);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
    });

    it('should return consistent success response for update', async () => {
      mockPoiService.update.mockResolvedValue(mockPoi);

      const result = await controller.update(mockPoiId, { name: 'Test' }, mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
    });

    it('should return consistent success response for toggleActive', async () => {
      mockPoiService.toggleActive.mockResolvedValue(mockPoi);

      const result = await controller.toggleActive(mockPoiId, mockUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
    });
  });

  // ==========================================================================
  // POI Type Handling Tests
  // ==========================================================================

  describe('POI Type Handling', () => {
    it('should handle all POI types in update', async () => {
      for (const type of Object.values(PoiType)) {
        mockPoiService.update.mockResolvedValue({ ...mockPoi, type });

        const result = await controller.update(mockPoiId, { type }, mockUser);

        expect(result.data.type).toBe(type);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty update DTO', async () => {
      mockPoiService.update.mockResolvedValue(mockPoi);

      const result = await controller.update(mockPoiId, {}, mockUser);

      expect(result.success).toBe(true);
      expect(mockPoiService.update).toHaveBeenCalledWith(mockPoiId, {}, mockUser);
    });

    it('should handle update with all fields', async () => {
      const fullUpdate = {
        name: 'Full Update',
        type: PoiType.FOOD,
        description: 'New description',
        latitude: 49.0,
        longitude: 3.0,
        iconUrl: 'https://new-icon.png',
        metadata: { newKey: 'newValue' },
        isActive: false,
      };
      mockPoiService.update.mockResolvedValue({ ...mockPoi, ...fullUpdate });

      const result = await controller.update(mockPoiId, fullUpdate, mockUser);

      expect(result.data.name).toBe(fullUpdate.name);
      expect(mockPoiService.update).toHaveBeenCalledWith(mockPoiId, fullUpdate, mockUser);
    });
  });
});

// ============================================================================
// Integration Between Controllers Tests
// ============================================================================

describe('Controller Integration', () => {
  let festivalController: FestivalPoiController;
  let poiController: PoiController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FestivalPoiController, PoiController],
      providers: [
        { provide: PoiService, useValue: mockPoiService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    festivalController = module.get<FestivalPoiController>(FestivalPoiController);
    poiController = module.get<PoiController>(PoiController);
  });

  it('should create POI through FestivalPoiController and retrieve through PoiController', async () => {
    const createDto = { name: 'Test POI', type: PoiType.STAGE, latitude: 48.0, longitude: 2.0 };
    mockPoiService.create.mockResolvedValue(mockPoi);
    mockPoiService.findOne.mockResolvedValue(mockPoiWithFestival);

    const createResult = await festivalController.create(mockFestivalId, createDto, mockUser);
    const getResult = await poiController.findOne(createResult.data.id);

    expect(createResult.success).toBe(true);
    expect(getResult.success).toBe(true);
    expect(getResult.data.id).toBe(createResult.data.id);
  });

  it('should list POIs through FestivalPoiController and update through PoiController', async () => {
    mockPoiService.findAllByFestival.mockResolvedValue({
      pois: [mockPoi],
      total: 1,
      page: 1,
      limit: 50,
    });
    mockPoiService.update.mockResolvedValue({ ...mockPoi, name: 'Updated' });

    const listResult = await festivalController.findAll(mockFestivalId, {});
    const updateResult = await poiController.update(
      listResult.data[0].id,
      { name: 'Updated' },
      mockUser
    );

    expect(listResult.data).toHaveLength(1);
    expect(updateResult.data.name).toBe('Updated');
  });
});
