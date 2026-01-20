/**
 * Festivals Service Unit Tests
 *
 * Comprehensive tests for festival management functionality including:
 * - Festival creation
 * - Festival retrieval (findAll, findOne, findBySlug)
 * - Festival updates
 * - Festival deletion (soft delete)
 * - Status management (publish, cancel)
 * - Statistics
 * - Multi-tenant isolation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FestivalsService } from './festivals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { FestivalStatus } from '@prisma/client';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  organizerUser,
  regularUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  adminUser,
  draftFestival,
  publishedFestival,
  ongoingFestival,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  completedFestival,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cancelledFestival,
  deletedFestival,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validFestivalInput,
  createFestivalFixture,
  standardCategory,
} from '../../test/fixtures';
import { ErrorCodes } from '../../common/exceptions/error-codes';

// ============================================================================
// Mock Setup
// ============================================================================

describe('FestivalsService', () => {
  let festivalsService: FestivalsService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _cacheService: jest.Mocked<CacheService>;

  const mockPrismaService = {
    festival: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ticket: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    ticketCategory: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    has: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset cache mock to return null by default (cache miss)
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FestivalsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    festivalsService = module.get<FestivalsService>(FestivalsService);
    _prismaService = module.get(PrismaService);
    _cacheService = module.get(CacheService);
  });

  // ==========================================================================
  // Create Festival Tests
  // ==========================================================================

  describe('create', () => {
    it('should successfully create a festival with all fields', async () => {
      // Arrange
      const createDto = {
        name: 'Summer Beats Festival 2026',
        slug: 'summer-beats-2026',
        description: 'The ultimate electronic music experience',
        location: 'Paris, France',
        address: '123 Festival Avenue',
        startDate: '2026-07-15T14:00:00.000Z',
        endDate: '2026-07-18T23:00:00.000Z',
        maxCapacity: 50000,
        timezone: 'Europe/Paris',
        currency: 'EUR',
        websiteUrl: 'https://summer-beats.test',
        contactEmail: 'contact@summer-beats.test',
        logoUrl: 'https://cdn.test/logo.png',
        bannerUrl: 'https://cdn.test/banner.jpg',
      };

      const createdFestival = {
        id: 'new-festival-id',
        ...createDto,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
        status: FestivalStatus.DRAFT,
        organizerId: organizerUser.id,
        currentAttendees: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(null); // Slug not taken
      mockPrismaService.festival.create.mockResolvedValue(createdFestival);

      // Act
      const result = await festivalsService.create(createDto, organizerUser.id);

      // Assert
      expect(result.name).toBe(createDto.name);
      expect(result.slug).toBe(createDto.slug);
      expect(result.status).toBe(FestivalStatus.DRAFT);
      expect(result.organizerId).toBe(organizerUser.id);
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          slug: createDto.slug,
          organizerId: organizerUser.id,
          status: FestivalStatus.DRAFT,
        }),
      });
    });

    it('should auto-generate slug from name when not provided', async () => {
      // Arrange
      const createDto = {
        name: 'My Amazing Festival 2026',
        description: 'A great festival',
        location: 'Lyon, France',
        startDate: '2026-08-01T12:00:00.000Z',
        endDate: '2026-08-03T23:00:00.000Z',
      };

      const expectedSlug = 'my-amazing-festival-2026';

      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.create.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        slug: expectedSlug,
        status: FestivalStatus.DRAFT,
        organizerId: organizerUser.id,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const _result = await festivalsService.create(createDto, organizerUser.id);

      // Assert
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expectedSlug,
        }),
      });
    });

    it('should generate slug with accents removed', async () => {
      // Arrange
      const createDto = {
        name: 'Fête de la Musique Été',
        description: 'French music festival',
        location: 'Paris',
        startDate: '2026-06-21T18:00:00.000Z',
        endDate: '2026-06-21T23:59:00.000Z',
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.create.mockImplementation(async (args) => ({
        id: 'new-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      await festivalsService.create(createDto, organizerUser.id);

      // Assert
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^fete-de-la-musique-ete$/),
        }),
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      // Arrange
      const createDto = {
        name: 'Duplicate Festival',
        slug: publishedFestival.slug, // Existing slug
        description: 'A duplicate',
        location: 'Paris',
        startDate: '2026-07-01T12:00:00.000Z',
        endDate: '2026-07-03T23:00:00.000Z',
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestival);

      // Act & Assert
      await expect(festivalsService.create(createDto, organizerUser.id)).rejects.toThrow(
        ConflictException
      );
      expect(mockPrismaService.festival.create).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const minimalDto = {
        name: 'Minimal Festival',
        description: 'Basic festival',
        location: 'Somewhere',
        startDate: '2026-09-01T10:00:00.000Z',
        endDate: '2026-09-02T22:00:00.000Z',
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.create.mockImplementation(async (args) => ({
        id: 'new-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      await festivalsService.create(minimalDto, organizerUser.id);

      // Assert
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxCapacity: 10000, // Default
          timezone: 'Europe/Paris', // Default
          currency: 'EUR', // Default
        }),
      });
    });

    it('should create festival with custom capacity and currency', async () => {
      // Arrange
      const createDto = {
        name: 'International Festival',
        description: 'Large international event',
        location: 'London, UK',
        startDate: '2026-08-15T12:00:00.000Z',
        endDate: '2026-08-17T23:00:00.000Z',
        maxCapacity: 100000,
        currency: 'GBP',
        timezone: 'Europe/London',
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.create.mockImplementation(async (args) => ({
        id: 'new-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      await festivalsService.create(createDto, organizerUser.id);

      // Assert
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxCapacity: 100000,
          currency: 'GBP',
          timezone: 'Europe/London',
        }),
      });
    });
  });

  // ==========================================================================
  // Find All Tests
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated festivals with default pagination', async () => {
      // Arrange
      const festivals = [publishedFestival, ongoingFestival];
      mockPrismaService.festival.findMany.mockResolvedValue(festivals);
      mockPrismaService.festival.count.mockResolvedValue(2);

      // Act
      const result = await festivalsService.findAll({});

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      await festivalsService.findAll({ status: FestivalStatus.PUBLISHED });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: FestivalStatus.PUBLISHED,
          }),
        })
      );
    });

    it('should filter by organizerId for multi-tenant isolation', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([draftFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      await festivalsService.findAll({ organizerId: organizerUser.id });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: organizerUser.id,
          }),
        })
      );
    });

    it('should search by name, description, and location', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      await festivalsService.findAll({ search: 'rock' });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'rock', mode: 'insensitive' } },
              { description: { contains: 'rock', mode: 'insensitive' } },
              { location: { contains: 'rock', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      const allFestivals = Array(25)
        .fill(null)
        .map((_, i) => createFestivalFixture({ name: `Festival ${i}` }));
      mockPrismaService.festival.findMany.mockResolvedValue(allFestivals.slice(10, 20));
      mockPrismaService.festival.count.mockResolvedValue(25);

      // Act
      const result = await festivalsService.findAll({ page: 2, limit: 10 });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should exclude soft-deleted festivals', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([]);
      mockPrismaService.festival.count.mockResolvedValue(0);

      // Act
      await festivalsService.findAll({});

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it('should include organizer and counts in response', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      await festivalsService.findAll({});

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            organizer: expect.any(Object),
            _count: expect.any(Object),
          }),
        })
      );
    });

    it('should order by startDate ascending', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([]);
      mockPrismaService.festival.count.mockResolvedValue(0);

      // Act
      await festivalsService.findAll({});

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startDate: 'asc' },
        })
      );
    });
  });

  // ==========================================================================
  // Find One Tests
  // ==========================================================================

  describe('findOne', () => {
    it('should return festival when found', async () => {
      // Arrange
      const festivalWithRelations = {
        ...publishedFestival,
        organizer: {
          id: organizerUser.id,
          firstName: organizerUser.firstName,
          lastName: organizerUser.lastName,
          email: organizerUser.email,
        },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 100, vendors: 5, staffAssignments: 20 },
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithRelations);

      // Act
      const result = await festivalsService.findOne(publishedFestival.id);

      // Assert
      expect(result.id).toBe(publishedFestival.id);
      expect(result.name).toBe(publishedFestival.name);
      expect(result.organizer).toBeDefined();
    });

    it('should throw NotFoundException when festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(festivalsService.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(deletedFestival);

      // Act & Assert
      await expect(festivalsService.findOne(deletedFestival.id)).rejects.toThrow(NotFoundException);
    });

    it('should include related entities in response', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act
      await festivalsService.findOne(publishedFestival.id);

      // Assert
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { id: publishedFestival.id },
        include: expect.objectContaining({
          organizer: expect.any(Object),
          ticketCategories: true,
          stages: true,
          zones: true,
          _count: expect.any(Object),
        }),
      });
    });
  });

  // ==========================================================================
  // Find By Slug Tests
  // ==========================================================================

  describe('findBySlug', () => {
    it('should return festival when found by slug', async () => {
      // Arrange
      const festivalWithRelations = {
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        _count: { tickets: 50 },
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithRelations);

      // Act
      const result = await festivalsService.findBySlug(publishedFestival.slug);

      // Assert
      expect(result.slug).toBe(publishedFestival.slug);
    });

    it('should throw NotFoundException when slug not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(festivalsService.findBySlug('non-existent-slug')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for soft-deleted festival by slug', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(deletedFestival);

      // Act & Assert
      await expect(festivalsService.findBySlug(deletedFestival.slug)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should only include active ticket categories', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        _count: { tickets: 0 },
      });

      // Act
      await festivalsService.findBySlug(publishedFestival.slug);

      // Assert
      expect(mockPrismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { slug: publishedFestival.slug },
        include: expect.objectContaining({
          ticketCategories: { where: { isActive: true } },
        }),
      });
    });
  });

  // ==========================================================================
  // Update Tests
  // ==========================================================================

  describe('update', () => {
    it('should successfully update festival as organizer', async () => {
      // Arrange
      const updateDto = {
        name: 'Updated Festival Name',
        description: 'Updated description',
        maxCapacity: 60000,
      };

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...publishedFestival,
        ...updateDto,
      });

      // Act
      const result = await festivalsService.update(
        publishedFestival.id,
        updateDto,
        organizerUser.id
      );

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: publishedFestival.id },
        data: expect.objectContaining({
          name: updateDto.name,
          description: updateDto.description,
          maxCapacity: updateDto.maxCapacity,
        }),
      });
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(
        festivalsService.update(publishedFestival.id, { name: 'New Name' }, regularUser.id)
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.festival.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        festivalsService.update('non-existent', { name: 'Test' }, organizerUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update dates when provided', async () => {
      // Arrange
      const newStartDate = '2026-08-01T12:00:00.000Z';
      const newEndDate = '2026-08-03T23:00:00.000Z';

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...publishedFestival,
        startDate: new Date(newStartDate),
        endDate: new Date(newEndDate),
      });

      // Act
      await festivalsService.update(
        publishedFestival.id,
        { startDate: newStartDate, endDate: newEndDate },
        organizerUser.id
      );

      // Assert
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: publishedFestival.id },
        data: expect.objectContaining({
          startDate: new Date(newStartDate),
          endDate: new Date(newEndDate),
        }),
      });
    });

    it('should handle partial updates', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...publishedFestival,
        websiteUrl: 'https://new-website.test',
      });

      // Act
      await festivalsService.update(
        publishedFestival.id,
        { websiteUrl: 'https://new-website.test' },
        organizerUser.id
      );

      // Assert
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: publishedFestival.id },
        data: expect.objectContaining({
          websiteUrl: 'https://new-website.test',
        }),
      });
    });
  });

  // ==========================================================================
  // Update Status Tests
  // ==========================================================================

  describe('updateStatus', () => {
    it('should successfully publish a draft festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...draftFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...draftFestival,
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      const result = await festivalsService.updateStatus(
        draftFestival.id,
        FestivalStatus.PUBLISHED,
        organizerUser.id
      );

      // Assert
      expect(result.status).toBe(FestivalStatus.PUBLISHED);
    });

    it('should successfully cancel a festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...publishedFestival,
        status: FestivalStatus.CANCELLED,
      });

      // Act
      const result = await festivalsService.updateStatus(
        publishedFestival.id,
        FestivalStatus.CANCELLED,
        organizerUser.id
      );

      // Assert
      expect(result.status).toBe(FestivalStatus.CANCELLED);
    });

    it('should throw ForbiddenException when non-organizer tries to update status', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...draftFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(
        festivalsService.updateStatus(draftFestival.id, FestivalStatus.PUBLISHED, regularUser.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        festivalsService.updateStatus('non-existent', FestivalStatus.PUBLISHED, organizerUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Remove (Soft Delete) Tests
  // ==========================================================================

  describe('remove', () => {
    it('should soft delete festival as organizer', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...draftFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.festival.update.mockResolvedValue({
        ...draftFestival,
        isDeleted: true,
        deletedAt: new Date(),
      });

      // Act
      const result = await festivalsService.remove(draftFestival.id, organizerUser.id);

      // Assert
      expect(result.isDeleted).toBe(true);
      expect(result.deletedAt).toBeDefined();
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: draftFestival.id },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw ForbiddenException when non-organizer tries to delete', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...draftFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(festivalsService.remove(draftFestival.id, regularUser.id)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(festivalsService.remove('non-existent', organizerUser.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when trying to delete already deleted festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(deletedFestival);

      // Act & Assert
      await expect(festivalsService.remove(deletedFestival.id, organizerUser.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Get Stats Tests
  // ==========================================================================

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      // Arrange
      const festivalWithRelations = {
        ...ongoingFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 100, vendors: 10, staffAssignments: 50 },
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithRelations);
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { status: 'SOLD', _count: 80 },
        { status: 'USED', _count: 15 },
        { status: 'CANCELLED', _count: 5 },
      ]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: 12000 },
      });

      // Act
      const result = await festivalsService.getStats(ongoingFestival.id);

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
      expect(result.festivalName).toBe(ongoingFestival.name);
      expect(result.maxCapacity).toBe(ongoingFestival.maxCapacity);
      expect(result.currentAttendees).toBe(ongoingFestival.currentAttendees);
      expect(result.ticketsSold).toBe(100); // Sum of all statuses
      expect(result.totalRevenue).toBe(12000);
      expect(result.ticketsByStatus).toHaveLength(3);
    });

    it('should throw NotFoundException when festival does not exist', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(festivalsService.getStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should calculate occupancy rate correctly', async () => {
      // Arrange
      const festivalWithRelations = {
        ...ongoingFestival,
        maxCapacity: 10000,
        currentAttendees: 4500,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };

      mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithRelations);
      mockPrismaService.ticket.groupBy.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({ _sum: { purchasePrice: null } });

      // Act
      const result = await festivalsService.getStats(ongoingFestival.id);

      // Assert
      expect(result.occupancyRate).toBe(45); // 4500/10000 * 100
    });

    it('should handle zero revenue gracefully', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...draftFestival,
        organizer: { id: organizerUser.id },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });
      mockPrismaService.ticket.groupBy.mockResolvedValue([]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({ _sum: { purchasePrice: null } });

      // Act
      const result = await festivalsService.getStats(draftFestival.id);

      // Assert
      expect(result.totalRevenue).toBe(0);
      expect(result.ticketsSold).toBe(0);
    });
  });

  // ==========================================================================
  // Find Published Tests
  // ==========================================================================

  describe('findPublished', () => {
    it('should only return published festivals', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      const result = await festivalsService.findPublished({});

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: FestivalStatus.PUBLISHED,
          }),
        })
      );
      expect(result.data).toHaveLength(1);
    });

    it('should apply other filters while keeping published status', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(1);

      // Act
      await festivalsService.findPublished({ search: 'rock', page: 2, limit: 5 });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: FestivalStatus.PUBLISHED,
          }),
          skip: 5,
          take: 5,
        })
      );
    });
  });

  // ==========================================================================
  // Multi-tenant Isolation Tests
  // ==========================================================================

  describe('multi-tenant isolation', () => {
    it('should enforce organizer ownership on update', async () => {
      // Arrange
      const otherOrganizerFestival = createFestivalFixture({
        organizerId: 'other-organizer-id',
      });

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...otherOrganizerFestival,
        organizer: { id: 'other-organizer-id' },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(
        festivalsService.update(otherOrganizerFestival.id, { name: 'Hijacked' }, organizerUser.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce organizer ownership on delete', async () => {
      // Arrange
      const otherOrganizerFestival = createFestivalFixture({
        organizerId: 'other-organizer-id',
      });

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...otherOrganizerFestival,
        organizer: { id: 'other-organizer-id' },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(
        festivalsService.remove(otherOrganizerFestival.id, organizerUser.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce organizer ownership on status change', async () => {
      // Arrange
      const otherOrganizerFestival = createFestivalFixture({
        organizerId: 'other-organizer-id',
      });

      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...otherOrganizerFestival,
        organizer: { id: 'other-organizer-id' },
        ticketCategories: [],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      });

      // Act & Assert
      await expect(
        festivalsService.updateStatus(
          otherOrganizerFestival.id,
          FestivalStatus.PUBLISHED,
          organizerUser.id
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow filtering festivals by organizer', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([draftFestival, publishedFestival]);
      mockPrismaService.festival.count.mockResolvedValue(2);

      // Act
      await festivalsService.findAll({ organizerId: organizerUser.id });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: organizerUser.id,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty search results', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([]);
      mockPrismaService.festival.count.mockResolvedValue(0);

      // Act
      const result = await festivalsService.findAll({ search: 'nonexistent-query-xyz' });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle special characters in search', async () => {
      // Arrange
      mockPrismaService.festival.findMany.mockResolvedValue([]);
      mockPrismaService.festival.count.mockResolvedValue(0);

      // Act
      await festivalsService.findAll({ search: "rock'n'roll & more!" });

      // Assert
      expect(mockPrismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: "rock'n'roll & more!", mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should handle very long festival names in slug generation', async () => {
      // Arrange
      const longName = 'A'.repeat(100) + ' Festival 2026';

      mockPrismaService.festival.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.create.mockImplementation(async (args) => ({
        id: 'new-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      await festivalsService.create(
        {
          name: longName,
          description: 'Test',
          location: 'Paris',
          startDate: '2026-07-01T12:00:00.000Z',
          endDate: '2026-07-02T23:00:00.000Z',
        },
        organizerUser.id
      );

      // Assert
      expect(mockPrismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^[a-z0-9-]{1,50}$/),
        }),
      });
    });

    it('should handle concurrent slug creation attempts', async () => {
      // This simulates a race condition where database unique constraint catches duplicate slug
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null); // Slug check passes initially

      // But create fails due to Prisma unique constraint error (race condition)
      const prismaUniqueError = new Error(
        'Unique constraint failed on the constraint: `Festival_slug_key`'
      );
      (prismaUniqueError as any).code = 'P2002';
      (prismaUniqueError as any).meta = { target: ['slug'] };
      mockPrismaService.festival.create.mockRejectedValueOnce(prismaUniqueError);

      // Act & Assert
      await expect(
        festivalsService.create(
          {
            name: 'Test Festival',
            slug: 'test-slug',
            description: 'Test',
            location: 'Paris',
            startDate: '2026-07-01T12:00:00.000Z',
            endDate: '2026-07-02T23:00:00.000Z',
          },
          organizerUser.id
        )
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  // ==========================================================================
  // Cache Behavior Tests
  // ==========================================================================

  describe('cache behavior', () => {
    describe('findAll caching', () => {
      it('should return cached data on cache hit', async () => {
        // Arrange
        const cachedData = {
          data: [publishedFestival],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };
        mockCacheService.get.mockResolvedValue(cachedData);

        // Act
        const result = await festivalsService.findAll({});

        // Assert
        expect(result).toEqual(cachedData);
        expect(mockCacheService.get).toHaveBeenCalledWith(
          expect.stringContaining('festivals:list:')
        );
        expect(mockPrismaService.festival.findMany).not.toHaveBeenCalled();
      });

      it('should fetch from database and cache on cache miss', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findMany.mockResolvedValue([publishedFestival]);
        mockPrismaService.festival.count.mockResolvedValue(1);

        // Act
        const result = await festivalsService.findAll({});

        // Assert
        expect(result.data).toHaveLength(1);
        expect(mockCacheService.set).toHaveBeenCalledWith(
          expect.stringContaining('festivals:list:'),
          expect.objectContaining({ data: expect.any(Array) }),
          expect.objectContaining({ ttl: 60 }) // 60 seconds TTL
        );
      });

      it('should use correct cache key format with query params', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findMany.mockResolvedValue([]);
        mockPrismaService.festival.count.mockResolvedValue(0);

        // Act
        await festivalsService.findAll({
          status: 'PUBLISHED' as any,
          page: 2,
          limit: 20,
          search: 'rock',
          organizerId: 'org-123',
        });

        // Assert
        expect(mockCacheService.get).toHaveBeenCalledWith(
          'festivals:list:PUBLISHED:2:20:rock:org-123'
        );
      });
    });

    describe('findOne caching', () => {
      it('should return cached festival on cache hit', async () => {
        // Arrange
        const cachedFestival = {
          ...publishedFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          zones: [],
          _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
        };
        mockCacheService.get.mockResolvedValue(cachedFestival);

        // Act
        const result = await festivalsService.findOne(publishedFestival.id);

        // Assert
        expect(result).toEqual(cachedFestival);
        expect(mockCacheService.get).toHaveBeenCalledWith(`festival:${publishedFestival.id}`);
        expect(mockPrismaService.festival.findUnique).not.toHaveBeenCalled();
      });

      it('should fetch from database and cache on cache miss with 30s TTL', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findUnique.mockResolvedValue({
          ...publishedFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          zones: [],
          _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
        });

        // Act
        await festivalsService.findOne(publishedFestival.id);

        // Assert
        expect(mockCacheService.set).toHaveBeenCalledWith(
          `festival:${publishedFestival.id}`,
          expect.any(Object),
          expect.objectContaining({ ttl: 30 }) // 30 seconds TTL
        );
      });
    });

    describe('findBySlug caching', () => {
      it('should return cached festival on cache hit', async () => {
        // Arrange
        const cachedFestival = {
          ...publishedFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          _count: { tickets: 0 },
        };
        mockCacheService.get.mockResolvedValue(cachedFestival);

        // Act
        const result = await festivalsService.findBySlug(publishedFestival.slug);

        // Assert
        expect(result).toEqual(cachedFestival);
        expect(mockCacheService.get).toHaveBeenCalledWith(
          `festival:slug:${publishedFestival.slug}`
        );
        expect(mockPrismaService.festival.findUnique).not.toHaveBeenCalled();
      });

      it('should fetch from database and cache on cache miss with 30s TTL', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findUnique.mockResolvedValue({
          ...publishedFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          _count: { tickets: 0 },
        });

        // Act
        await festivalsService.findBySlug(publishedFestival.slug);

        // Assert
        expect(mockCacheService.set).toHaveBeenCalledWith(
          `festival:slug:${publishedFestival.slug}`,
          expect.any(Object),
          expect.objectContaining({ ttl: 30 }) // 30 seconds TTL
        );
      });
    });

    describe('cache invalidation', () => {
      it('should invalidate cache on festival update', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findUnique.mockResolvedValue({
          ...publishedFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          zones: [],
          _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
        });
        mockPrismaService.festival.update.mockResolvedValue({
          ...publishedFestival,
          name: 'Updated Festival Name',
        });

        // Act
        await festivalsService.update(
          publishedFestival.id,
          { name: 'Updated Festival Name' },
          organizerUser.id
        );

        // Assert
        expect(mockCacheService.delete).toHaveBeenCalledWith(`festival:${publishedFestival.id}`);
        expect(mockCacheService.delete).toHaveBeenCalledWith(
          `festival:${publishedFestival.id}:categories`
        );
        expect(mockCacheService.delete).toHaveBeenCalledWith(
          `festival:slug:${publishedFestival.slug}`
        );
        expect(mockCacheService.deletePattern).toHaveBeenCalledWith('festivals:list:*');
      });

      it('should invalidate cache on festival delete', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findUnique.mockResolvedValue({
          ...draftFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          zones: [],
          _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
        });
        mockPrismaService.festival.update.mockResolvedValue({
          ...draftFestival,
          isDeleted: true,
          deletedAt: new Date(),
        });

        // Act
        await festivalsService.remove(draftFestival.id, organizerUser.id);

        // Assert
        expect(mockCacheService.delete).toHaveBeenCalledWith(`festival:${draftFestival.id}`);
        expect(mockCacheService.deletePattern).toHaveBeenCalledWith('festivals:list:*');
      });

      it('should invalidate cache on status change', async () => {
        // Arrange
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findUnique.mockResolvedValue({
          ...draftFestival,
          organizer: { id: organizerUser.id },
          ticketCategories: [],
          stages: [],
          zones: [],
          _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
        });
        mockPrismaService.festival.update.mockResolvedValue({
          ...draftFestival,
          status: 'PUBLISHED',
        });

        // Act
        await festivalsService.updateStatus(draftFestival.id, 'PUBLISHED' as any, organizerUser.id);

        // Assert
        expect(mockCacheService.delete).toHaveBeenCalledWith(`festival:${draftFestival.id}`);
        expect(mockCacheService.deletePattern).toHaveBeenCalledWith('festivals:list:*');
      });
    });

    describe('cache metrics', () => {
      it('should track cache hits and misses', async () => {
        // Reset metrics
        festivalsService.resetCacheMetrics();

        // Simulate cache miss
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findMany.mockResolvedValue([]);
        mockPrismaService.festival.count.mockResolvedValue(0);
        await festivalsService.findAll({});

        // Check metrics after miss
        let metrics = festivalsService.getCacheMetrics();
        expect(metrics.misses).toBe(1);
        expect(metrics.hits).toBe(0);

        // Simulate cache hit
        mockCacheService.get.mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
        await festivalsService.findAll({ page: 2 });

        // Check metrics after hit
        metrics = festivalsService.getCacheMetrics();
        expect(metrics.hits).toBe(1);
        expect(metrics.misses).toBe(1);
        expect(metrics.hitRate).toBe(50);
      });

      it('should calculate hit rate correctly', async () => {
        festivalsService.resetCacheMetrics();

        // 3 hits, 1 miss = 75% hit rate
        mockCacheService.get.mockResolvedValue({ data: [] });

        // 3 cache hits
        for (let i = 0; i < 3; i++) {
          await festivalsService.findAll({ page: i + 1 });
        }

        // 1 cache miss
        mockCacheService.get.mockResolvedValue(null);
        mockPrismaService.festival.findMany.mockResolvedValue([]);
        mockPrismaService.festival.count.mockResolvedValue(0);
        await festivalsService.findAll({ page: 10 });

        const metrics = festivalsService.getCacheMetrics();
        expect(metrics.hits).toBe(3);
        expect(metrics.misses).toBe(1);
        expect(metrics.total).toBe(4);
        expect(metrics.hitRate).toBe(75);
      });

      it('should reset metrics', async () => {
        // Arrange - simulate some activity
        mockCacheService.get.mockResolvedValue({ data: [] });
        await festivalsService.findAll({});

        // Verify there's data
        let metrics = festivalsService.getCacheMetrics();
        expect(metrics.hits).toBeGreaterThan(0);

        // Act - reset metrics
        festivalsService.resetCacheMetrics();

        // Assert
        metrics = festivalsService.getCacheMetrics();
        expect(metrics.hits).toBe(0);
        expect(metrics.misses).toBe(0);
        expect(metrics.total).toBe(0);
        expect(metrics.hitRate).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Festival Publication Tests
  // ==========================================================================

  describe('validateForPublication', () => {
    it('should return canPublish: true for a valid draft festival with ticket categories', async () => {
      // Arrange
      const validFestival = {
        ...draftFestival,
        status: FestivalStatus.DRAFT,
        ticketCategories: [standardCategory],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(validFestival);

      // Act
      const result = await festivalsService.validateForPublication(draftFestival.id);

      // Assert
      expect(result.canPublish).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when festival name is missing', async () => {
      // Arrange
      const invalidFestival = {
        ...draftFestival,
        name: '',
        ticketCategories: [standardCategory],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(invalidFestival);

      // Act
      const result = await festivalsService.validateForPublication(draftFestival.id);

      // Assert
      expect(result.canPublish).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ErrorCodes.FESTIVAL_PUBLISH_MISSING_NAME,
          field: 'name',
        })
      );
    });

    it('should return error when festival location is missing', async () => {
      // Arrange
      const invalidFestival = {
        ...draftFestival,
        location: '',
        ticketCategories: [standardCategory],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(invalidFestival);

      // Act
      const result = await festivalsService.validateForPublication(draftFestival.id);

      // Assert
      expect(result.canPublish).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ErrorCodes.FESTIVAL_PUBLISH_MISSING_VENUE,
          field: 'location',
        })
      );
    });

    it('should return error when no ticket categories exist', async () => {
      // Arrange
      const invalidFestival = {
        ...draftFestival,
        ticketCategories: [],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(invalidFestival);

      // Act
      const result = await festivalsService.validateForPublication(draftFestival.id);

      // Assert
      expect(result.canPublish).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ErrorCodes.FESTIVAL_PUBLISH_NO_TICKET_CATEGORY,
          field: 'ticketCategories',
        })
      );
    });

    it('should return error when festival is not in DRAFT status', async () => {
      // Arrange
      const invalidFestival = {
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
        ticketCategories: [standardCategory],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(invalidFestival);

      // Act
      const result = await festivalsService.validateForPublication(publishedFestival.id);

      // Assert
      expect(result.canPublish).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: ErrorCodes.FESTIVAL_NOT_DRAFT,
          field: 'status',
        })
      );
    });

    it('should return multiple errors when multiple validations fail', async () => {
      // Arrange
      const invalidFestival = {
        ...draftFestival,
        name: '',
        location: '',
        ticketCategories: [],
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(invalidFestival);

      // Act
      const result = await festivalsService.validateForPublication(draftFestival.id);

      // Assert
      expect(result.canPublish).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(festivalsService.validateForPublication('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for deleted festival', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...deletedFestival,
        isDeleted: true,
      });

      // Act & Assert
      await expect(festivalsService.validateForPublication(deletedFestival.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('publish', () => {
    it('should successfully publish a valid draft festival', async () => {
      // Arrange
      const validDraftFestival = {
        ...draftFestival,
        status: FestivalStatus.DRAFT,
        ticketCategories: [standardCategory],
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      const publishedResult = {
        ...validDraftFestival,
        status: FestivalStatus.PUBLISHED,
      };

      // First call for findOne, second for validation
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique
        .mockResolvedValueOnce(validDraftFestival) // findOne
        .mockResolvedValueOnce(validDraftFestival); // validateForPublication
      mockPrismaService.festival.update.mockResolvedValue(publishedResult);

      // Act
      const result = await festivalsService.publish(draftFestival.id, organizerUser.id);

      // Assert
      expect(result.status).toBe(FestivalStatus.PUBLISHED);
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: draftFestival.id },
        data: { status: FestivalStatus.PUBLISHED },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      // Arrange
      const validDraftFestival = {
        ...draftFestival,
        organizerId: organizerUser.id,
        ticketCategories: [standardCategory],
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(validDraftFestival);

      // Act & Assert
      await expect(festivalsService.publish(draftFestival.id, regularUser.id)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException when festival is already published', async () => {
      // Arrange
      const alreadyPublished = {
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
        ticketCategories: [standardCategory],
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(alreadyPublished);

      // Act & Assert
      await expect(
        festivalsService.publish(publishedFestival.id, organizerUser.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when validation fails', async () => {
      // Arrange
      const invalidFestival = {
        ...draftFestival,
        status: FestivalStatus.DRAFT,
        ticketCategories: [], // No ticket categories
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique
        .mockResolvedValueOnce(invalidFestival) // findOne
        .mockResolvedValueOnce(invalidFestival); // validateForPublication

      // Act & Assert
      await expect(festivalsService.publish(draftFestival.id, organizerUser.id)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should invalidate cache after publishing', async () => {
      // Arrange
      const validDraftFestival = {
        ...draftFestival,
        status: FestivalStatus.DRAFT,
        ticketCategories: [standardCategory],
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      const publishedResult = {
        ...validDraftFestival,
        status: FestivalStatus.PUBLISHED,
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique
        .mockResolvedValueOnce(validDraftFestival)
        .mockResolvedValueOnce(validDraftFestival);
      mockPrismaService.festival.update.mockResolvedValue(publishedResult);

      // Act
      await festivalsService.publish(draftFestival.id, organizerUser.id);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });
  });

  describe('unpublish', () => {
    it('should successfully unpublish a published festival', async () => {
      // Arrange
      const publishedFestivalData = {
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        ticketCategories: [standardCategory],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      const unpublishedResult = {
        ...publishedFestivalData,
        status: FestivalStatus.DRAFT,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestivalData);
      mockPrismaService.festival.update.mockResolvedValue(unpublishedResult);

      // Act
      const result = await festivalsService.unpublish(publishedFestival.id, organizerUser.id);

      // Assert
      expect(result.status).toBe(FestivalStatus.DRAFT);
      expect(mockPrismaService.festival.update).toHaveBeenCalledWith({
        where: { id: publishedFestival.id },
        data: { status: FestivalStatus.DRAFT },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      // Arrange
      const publishedFestivalData = {
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        ticketCategories: [standardCategory],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestivalData);

      // Act & Assert
      await expect(
        festivalsService.unpublish(publishedFestival.id, regularUser.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when festival is not published', async () => {
      // Arrange
      const draftFestivalData = {
        ...draftFestival,
        status: FestivalStatus.DRAFT,
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        ticketCategories: [standardCategory],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(draftFestivalData);

      // Act & Assert
      await expect(festivalsService.unpublish(draftFestival.id, organizerUser.id)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when festival is ongoing (not PUBLISHED)', async () => {
      // Arrange
      const ongoingFestivalData = {
        ...ongoingFestival,
        status: FestivalStatus.ONGOING,
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        ticketCategories: [standardCategory],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestivalData);

      // Act & Assert
      await expect(
        festivalsService.unpublish(ongoingFestival.id, organizerUser.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after unpublishing', async () => {
      // Arrange
      const publishedFestivalData = {
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
        organizer: {
          id: organizerUser.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
        },
        ticketCategories: [standardCategory],
        stages: [],
        zones: [],
        _count: { tickets: 0, vendors: 0, staffAssignments: 0 },
      };
      const unpublishedResult = {
        ...publishedFestivalData,
        status: FestivalStatus.DRAFT,
      };
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(publishedFestivalData);
      mockPrismaService.festival.update.mockResolvedValue(unpublishedResult);

      // Act
      await festivalsService.unpublish(publishedFestival.id, organizerUser.id);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });
  });
});
