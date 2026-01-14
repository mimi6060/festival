/**
 * Festivals Controller Unit Tests
 *
 * Comprehensive tests for festival API endpoints including:
 * - POST /festivals (create)
 * - GET /festivals (list)
 * - GET /festivals/:id (get by ID)
 * - GET /festivals/by-slug/:slug (get by slug)
 * - PUT /festivals/:id (update)
 * - DELETE /festivals/:id (delete)
 * - GET /festivals/:id/stats (statistics)
 * - POST /festivals/:id/publish (publish)
 * - POST /festivals/:id/cancel (cancel)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { LocalizedContentService } from '../languages/localized-content.service';
import { FestivalStatus } from '@prisma/client';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  organizerUser,
  regularUser,
  draftFestival,
  publishedFestival,
  ongoingFestival,
} from '../../test/fixtures';
import { FestivalStatus as DtoFestivalStatus } from './dto';

// ============================================================================
// Mock Setup
// ============================================================================

describe('FestivalsController', () => {
  let controller: FestivalsController;
  let _festivalsService: jest.Mocked<FestivalsService>;

  const mockFestivalsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    findPublished: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  };

  const mockLocalizedContentService = {
    getContent: jest.fn(),
    setContent: jest.fn(),
    updateContent: jest.fn(),
    deleteContent: jest.fn(),
    getAvailableLocales: jest.fn(),
  };

  const mockOrganizerRequest = {
    user: {
      sub: organizerUser.id,
      email: organizerUser.email,
      role: organizerUser.role,
    },
  };

  const mockUserRequest = {
    user: {
      sub: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FestivalsController],
      providers: [
        { provide: FestivalsService, useValue: mockFestivalsService },
        { provide: LocalizedContentService, useValue: mockLocalizedContentService },
      ],
    }).compile();

    controller = module.get<FestivalsController>(FestivalsController);
    _festivalsService = module.get(FestivalsService);
  });

  // ==========================================================================
  // POST /festivals Tests
  // ==========================================================================

  describe('POST /festivals (create)', () => {
    const createDto = {
      name: 'New Festival 2026',
      shortDescription: 'A great festival',
      description: 'Full description here',
      location: {
        venueName: 'Test Venue',
        address: '123 Test St',
        city: 'Paris',
        country: 'FR',
        postalCode: '75001',
      },
      startDate: '2026-07-15T14:00:00.000Z',
      endDate: '2026-07-18T23:00:00.000Z',
      capacity: 50000,
      timezone: 'Europe/Paris',
      currency: 'EUR',
    };

    it('should create a festival successfully', async () => {
      // Arrange
      const createdFestival = {
        id: 'new-festival-id',
        ...createDto,
        slug: 'new-festival-2026',
        status: FestivalStatus.DRAFT,
        organizerId: organizerUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFestivalsService.create.mockResolvedValue(createdFestival);

      // Act
      const result = await controller.create(createDto as any, mockOrganizerRequest);

      // Assert
      expect(result.id).toBe('new-festival-id');
      expect(result.status).toBe(FestivalStatus.DRAFT);
      expect(mockFestivalsService.create).toHaveBeenCalledWith(createDto, organizerUser.id);
    });

    it('should pass organizer ID from authenticated user', async () => {
      // Arrange
      mockFestivalsService.create.mockResolvedValue({
        id: 'new-id',
        organizerId: organizerUser.id,
        status: FestivalStatus.DRAFT,
      });

      // Act
      await controller.create(createDto as any, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.create).toHaveBeenCalledWith(
        expect.any(Object),
        organizerUser.id
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      // Arrange
      mockFestivalsService.create.mockRejectedValue(
        new ConflictException('Festival with slug "existing-slug" already exists')
      );

      // Act & Assert
      await expect(
        controller.create({ ...createDto, slug: 'existing-slug' } as any, mockOrganizerRequest)
      ).rejects.toThrow(ConflictException);
    });

    it('should create festival with optional slug', async () => {
      // Arrange
      const dtoWithSlug = { ...createDto, slug: 'custom-slug-2026' };
      mockFestivalsService.create.mockResolvedValue({
        id: 'new-id',
        slug: 'custom-slug-2026',
        status: FestivalStatus.DRAFT,
      });

      // Act
      const result = await controller.create(dtoWithSlug as any, mockOrganizerRequest);

      // Assert
      expect(result.slug).toBe('custom-slug-2026');
    });
  });

  // ==========================================================================
  // GET /festivals Tests
  // ==========================================================================

  describe('GET /festivals (findAll)', () => {
    it('should return paginated festivals', async () => {
      // Arrange
      const paginatedResponse = {
        data: [publishedFestival, ongoingFestival],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockFestivalsService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      const result = await controller.findAll({});

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should default to PUBLISHED status for public access', async () => {
      // Arrange
      mockFestivalsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Act
      await controller.findAll({});

      // Assert
      expect(mockFestivalsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DtoFestivalStatus.PUBLISHED,
        })
      );
    });

    it('should pass filter parameters to service', async () => {
      // Arrange
      const queryParams = {
        search: 'rock',
        status: DtoFestivalStatus.PUBLISHED,
        page: 2,
        limit: 20,
      };
      mockFestivalsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Act
      await controller.findAll(queryParams);

      // Assert
      expect(mockFestivalsService.findAll).toHaveBeenCalledWith(queryParams);
    });

    it('should return empty array when no festivals found', async () => {
      // Arrange
      mockFestivalsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Act
      const result = await controller.findAll({});

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      mockFestivalsService.findAll.mockResolvedValue({
        data: [publishedFestival],
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      });

      // Act
      const result = await controller.findAll({ page: 3, limit: 10 });

      // Assert
      expect(result.page).toBe(3);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  // ==========================================================================
  // GET /festivals/:id Tests
  // ==========================================================================

  describe('GET /festivals/:id (findOne)', () => {
    it('should return festival by ID', async () => {
      // Arrange
      const festivalWithRelations = {
        ...publishedFestival,
        organizer: {
          id: organizerUser.id,
          firstName: 'Organizer',
          lastName: 'User',
          email: 'org@test.com',
        },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 100, vendors: 5, staffAssignments: 20 },
      };
      mockFestivalsService.findOne.mockResolvedValue(festivalWithRelations);

      // Act
      const result = await controller.findOne(publishedFestival.id);

      // Assert
      expect(result.id).toBe(publishedFestival.id);
      expect(result.name).toBe(publishedFestival.name);
      expect(mockFestivalsService.findOne).toHaveBeenCalledWith(publishedFestival.id);
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.findOne.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include related entities in response', async () => {
      // Arrange
      const festivalWithRelations = {
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [{ id: 'cat1', name: 'Standard' }],
        stages: [{ id: 'stage1', name: 'Main Stage' }],
        zones: [{ id: 'zone1', name: 'VIP' }],
        _count: { tickets: 100, vendors: 5, staffAssignments: 20 },
      };
      mockFestivalsService.findOne.mockResolvedValue(festivalWithRelations);

      // Act
      const result = await controller.findOne(publishedFestival.id);

      // Assert
      expect(result.organizer).toBeDefined();
      expect(result.ticketCategories).toHaveLength(1);
      expect(result.stages).toHaveLength(1);
      expect(result.zones).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET /festivals/by-slug/:slug Tests
  // ==========================================================================

  describe('GET /festivals/by-slug/:slug (findBySlug)', () => {
    it('should return festival by slug', async () => {
      // Arrange
      const festivalWithRelations = {
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        _count: { tickets: 50 },
      };
      mockFestivalsService.findBySlug.mockResolvedValue(festivalWithRelations);

      // Act
      const result = await controller.findBySlug(publishedFestival.slug);

      // Assert
      expect(result.slug).toBe(publishedFestival.slug);
      expect(mockFestivalsService.findBySlug).toHaveBeenCalledWith(publishedFestival.slug);
    });

    it('should throw NotFoundException when slug not found', async () => {
      // Arrange
      mockFestivalsService.findBySlug.mockRejectedValue(
        new NotFoundException('Festival with slug "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should work with hyphenated slugs', async () => {
      // Arrange
      const slug = 'summer-beats-festival-2026';
      mockFestivalsService.findBySlug.mockResolvedValue({
        ...publishedFestival,
        slug,
      });

      // Act
      const result = await controller.findBySlug(slug);

      // Assert
      expect(result.slug).toBe(slug);
    });
  });

  // ==========================================================================
  // PUT /festivals/:id Tests
  // ==========================================================================

  describe('PUT /festivals/:id (update)', () => {
    const updateDto = {
      name: 'Updated Festival Name',
      description: 'Updated description',
      maxCapacity: 60000,
    };

    it('should update festival successfully as organizer', async () => {
      // Arrange
      const updatedFestival = {
        ...publishedFestival,
        ...updateDto,
      };
      mockFestivalsService.update.mockResolvedValue(updatedFestival);

      // Act
      const result = await controller.update(
        publishedFestival.id,
        updateDto as any,
        mockOrganizerRequest
      );

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(mockFestivalsService.update).toHaveBeenCalledWith(
        publishedFestival.id,
        updateDto,
        organizerUser.id
      );
    });

    it('should throw ForbiddenException when non-organizer tries to update', async () => {
      // Arrange
      mockFestivalsService.update.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this festival')
      );

      // Act & Assert
      await expect(
        controller.update(publishedFestival.id, updateDto as any, mockUserRequest)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.update.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(
        controller.update('non-existent', updateDto as any, mockOrganizerRequest)
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass user ID from authenticated request', async () => {
      // Arrange
      mockFestivalsService.update.mockResolvedValue(publishedFestival);

      // Act
      await controller.update(publishedFestival.id, updateDto as any, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.update).toHaveBeenCalledWith(
        publishedFestival.id,
        updateDto,
        organizerUser.id
      );
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate = { websiteUrl: 'https://new-website.test' };
      mockFestivalsService.update.mockResolvedValue({
        ...publishedFestival,
        ...partialUpdate,
      });

      // Act
      const result = await controller.update(
        publishedFestival.id,
        partialUpdate as any,
        mockOrganizerRequest
      );

      // Assert
      expect(result.websiteUrl).toBe(partialUpdate.websiteUrl);
    });
  });

  // ==========================================================================
  // DELETE /festivals/:id Tests
  // ==========================================================================

  describe('DELETE /festivals/:id (remove)', () => {
    it('should delete festival successfully as organizer', async () => {
      // Arrange
      mockFestivalsService.remove.mockResolvedValue({
        ...draftFestival,
        isDeleted: true,
        deletedAt: new Date(),
      });

      // Act
      await controller.remove(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.remove).toHaveBeenCalledWith(draftFestival.id, organizerUser.id);
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      mockFestivalsService.remove.mockResolvedValue({
        isDeleted: true,
        deletedAt: new Date(),
      });

      // Act
      const result = await controller.remove(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should throw ForbiddenException when non-organizer tries to delete', async () => {
      // Arrange
      mockFestivalsService.remove.mockRejectedValue(
        new ForbiddenException('You do not have permission to delete this festival')
      );

      // Act & Assert
      await expect(controller.remove(draftFestival.id, mockUserRequest)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.remove.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.remove('non-existent', mockOrganizerRequest)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // GET /festivals/:id/stats Tests
  // ==========================================================================

  describe('GET /festivals/:id/stats (getStats)', () => {
    it('should return festival statistics', async () => {
      // Arrange
      const stats = {
        festivalId: ongoingFestival.id,
        festivalName: ongoingFestival.name,
        maxCapacity: 10000,
        currentAttendees: 4500,
        ticketsSold: 5000,
        ticketsByStatus: [
          { status: 'SOLD', _count: 4500 },
          { status: 'USED', _count: 450 },
          { status: 'CANCELLED', _count: 50 },
        ],
        totalRevenue: 500000,
        occupancyRate: 45,
      };
      mockFestivalsService.getStats.mockResolvedValue(stats);

      // Act
      const result = await controller.getStats(ongoingFestival.id);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.ticketsSold).toBe(5000);
      expect(result.totalRevenue).toBe(500000);
      expect(result.occupancyRate).toBe(45);
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.getStats.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.getStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include ticket breakdown by status', async () => {
      // Arrange
      const stats = {
        festivalId: ongoingFestival.id,
        festivalName: ongoingFestival.name,
        maxCapacity: 10000,
        currentAttendees: 0,
        ticketsSold: 0,
        ticketsByStatus: [],
        totalRevenue: 0,
        occupancyRate: 0,
      };
      mockFestivalsService.getStats.mockResolvedValue(stats);

      // Act
      const result = await controller.getStats(ongoingFestival.id);

      // Assert
      expect(result.ticketsByStatus).toBeDefined();
      expect(Array.isArray(result.ticketsByStatus)).toBe(true);
    });
  });

  // ==========================================================================
  // POST /festivals/:id/publish Tests
  // ==========================================================================

  describe('POST /festivals/:id/publish (publish)', () => {
    it('should publish a draft festival', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        ...draftFestival,
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      const result = await controller.publish(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(result.status).toBe(FestivalStatus.PUBLISHED);
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        draftFestival.id,
        DtoFestivalStatus.PUBLISHED,
        organizerUser.id
      );
    });

    it('should throw ForbiddenException when non-organizer tries to publish', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this festival')
      );

      // Act & Assert
      await expect(controller.publish(draftFestival.id, mockUserRequest)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.publish('non-existent', mockOrganizerRequest)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should pass correct status to service', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        ...draftFestival,
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      await controller.publish(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        draftFestival.id,
        DtoFestivalStatus.PUBLISHED,
        organizerUser.id
      );
    });
  });

  // ==========================================================================
  // POST /festivals/:id/cancel Tests
  // ==========================================================================

  describe('POST /festivals/:id/cancel (cancel)', () => {
    it('should cancel a festival', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        ...publishedFestival,
        status: FestivalStatus.CANCELLED,
      });

      // Act
      const result = await controller.cancel(publishedFestival.id, mockOrganizerRequest);

      // Assert
      expect(result.status).toBe(FestivalStatus.CANCELLED);
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        publishedFestival.id,
        DtoFestivalStatus.CANCELLED,
        organizerUser.id
      );
    });

    it('should throw ForbiddenException when non-organizer tries to cancel', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this festival')
      );

      // Act & Assert
      await expect(controller.cancel(publishedFestival.id, mockUserRequest)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockRejectedValue(
        new NotFoundException('Festival with ID "non-existent" not found')
      );

      // Act & Assert
      await expect(controller.cancel('non-existent', mockOrganizerRequest)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should pass correct status to service', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        ...publishedFestival,
        status: FestivalStatus.CANCELLED,
      });

      // Act
      await controller.cancel(publishedFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        publishedFestival.id,
        DtoFestivalStatus.CANCELLED,
        organizerUser.id
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const error = new NotFoundException('Festival not found');
      mockFestivalsService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException from service', async () => {
      // Arrange
      const error = new ConflictException('Slug already exists');
      mockFestivalsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.create({ name: 'Test' } as any, mockOrganizerRequest)
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate ForbiddenException from service', async () => {
      // Arrange
      const error = new ForbiddenException('Not authorized');
      mockFestivalsService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update('festival-id', {} as any, mockUserRequest)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('authentication', () => {
    it('should extract user ID from request for create', async () => {
      // Arrange
      mockFestivalsService.create.mockResolvedValue({
        id: 'new-id',
        organizerId: organizerUser.id,
      });

      // Act
      await controller.create({ name: 'Test' } as any, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.create).toHaveBeenCalledWith(
        expect.any(Object),
        organizerUser.id
      );
    });

    it('should extract user ID from request for update', async () => {
      // Arrange
      mockFestivalsService.update.mockResolvedValue(publishedFestival);

      // Act
      await controller.update(publishedFestival.id, {} as any, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.update).toHaveBeenCalledWith(
        publishedFestival.id,
        expect.any(Object),
        organizerUser.id
      );
    });

    it('should extract user ID from request for delete', async () => {
      // Arrange
      mockFestivalsService.remove.mockResolvedValue({
        isDeleted: true,
      });

      // Act
      await controller.remove(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.remove).toHaveBeenCalledWith(draftFestival.id, organizerUser.id);
    });

    it('should extract user ID from request for publish', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      await controller.publish(draftFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        draftFestival.id,
        expect.any(String),
        organizerUser.id
      );
    });

    it('should extract user ID from request for cancel', async () => {
      // Arrange
      mockFestivalsService.updateStatus.mockResolvedValue({
        status: FestivalStatus.CANCELLED,
      });

      // Act
      await controller.cancel(publishedFestival.id, mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        publishedFestival.id,
        expect.any(String),
        organizerUser.id
      );
    });
  });

  // ==========================================================================
  // Multi-tenant Tests
  // ==========================================================================

  describe('multi-tenant isolation', () => {
    it('should pass organizer ID to service for tenant-scoped operations', async () => {
      // Arrange
      mockFestivalsService.create.mockResolvedValue({
        id: 'new-id',
        organizerId: organizerUser.id,
      });
      mockFestivalsService.update.mockResolvedValue(publishedFestival);
      mockFestivalsService.remove.mockResolvedValue({ isDeleted: true });
      mockFestivalsService.updateStatus.mockResolvedValue({
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      await controller.create({ name: 'Test' } as any, mockOrganizerRequest);
      await controller.update('festival-id', {} as any, mockOrganizerRequest);
      await controller.remove('festival-id', mockOrganizerRequest);
      await controller.publish('festival-id', mockOrganizerRequest);

      // Assert
      expect(mockFestivalsService.create).toHaveBeenCalledWith(
        expect.any(Object),
        organizerUser.id
      );
      expect(mockFestivalsService.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        organizerUser.id
      );
      expect(mockFestivalsService.remove).toHaveBeenCalledWith(
        expect.any(String),
        organizerUser.id
      );
      expect(mockFestivalsService.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        organizerUser.id
      );
    });

    it('should allow public access to findAll without authentication', async () => {
      // Arrange
      mockFestivalsService.findAll.mockResolvedValue({
        data: [publishedFestival],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Act - No request object needed for public endpoint
      const result = await controller.findAll({});

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should allow public access to findOne without authentication', async () => {
      // Arrange
      mockFestivalsService.findOne.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
      });

      // Act
      const result = await controller.findOne(publishedFestival.id);

      // Assert
      expect(result.id).toBe(publishedFestival.id);
    });

    it('should allow public access to findBySlug without authentication', async () => {
      // Arrange
      mockFestivalsService.findBySlug.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
      });

      // Act
      const result = await controller.findBySlug(publishedFestival.slug);

      // Assert
      expect(result.slug).toBe(publishedFestival.slug);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty update payload', async () => {
      // Arrange
      mockFestivalsService.update.mockResolvedValue(publishedFestival);

      // Act
      const result = await controller.update(publishedFestival.id, {} as any, mockOrganizerRequest);

      // Assert
      expect(result).toBeDefined();
      expect(mockFestivalsService.update).toHaveBeenCalled();
    });

    it('should handle UUID validation for festival ID', async () => {
      // Note: ParseUUIDPipe would handle this at the NestJS level
      // This test verifies the controller passes through valid UUIDs
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockFestivalsService.findOne.mockResolvedValue({
        ...publishedFestival,
        id: validUuid,
      });

      // Act
      const _result = await controller.findOne(validUuid);

      // Assert
      expect(mockFestivalsService.findOne).toHaveBeenCalledWith(validUuid);
    });

    it('should handle special characters in slug parameter', async () => {
      // Arrange
      const slug = 'festival-2026-special';
      mockFestivalsService.findBySlug.mockResolvedValue({
        ...publishedFestival,
        slug,
      });

      // Act
      const result = await controller.findBySlug(slug);

      // Assert
      expect(result.slug).toBe(slug);
    });

    it('should handle statistics for festival with no tickets', async () => {
      // Arrange
      const emptyStats = {
        festivalId: draftFestival.id,
        festivalName: draftFestival.name,
        maxCapacity: draftFestival.maxCapacity,
        currentAttendees: 0,
        ticketsSold: 0,
        ticketsByStatus: [],
        totalRevenue: 0,
        occupancyRate: 0,
      };
      mockFestivalsService.getStats.mockResolvedValue(emptyStats);

      // Act
      const result = await controller.getStats(draftFestival.id);

      // Assert
      expect(result.ticketsSold).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
