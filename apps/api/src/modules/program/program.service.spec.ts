/**
 * Program Service Unit Tests
 *
 * Comprehensive tests for festival program functionality including:
 * - Program retrieval (getProgram, getProgramByDay)
 * - Artists management (getArtists, getArtistById, getArtistPerformances)
 * - Stages management (getStages)
 * - Favorites management (getFavorites, toggleFavorite)
 * - Caching behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProgramService } from './program.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CacheTag } from '../cache/cache.service';
import { NotFoundException } from '@nestjs/common';

// ============================================================================
// Mock Data
// ============================================================================

const mockFestivalId = 'festival-uuid-123';
const mockUserId = 'user-uuid-456';
const mockArtistId = 'artist-uuid-789';
const mockStageId = 'stage-uuid-101';

const mockArtist = {
  id: mockArtistId,
  name: 'Test Artist',
  genre: 'Electronic',
  bio: 'A talented electronic artist',
  imageUrl: 'https://example.com/artist.jpg',
  country: 'France',
  spotifyUrl: 'https://spotify.com/artist',
  instagramUrl: 'https://instagram.com/artist',
  websiteUrl: 'https://artist.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockArtist2 = {
  id: 'artist-uuid-002',
  name: 'Second Artist',
  genre: 'Rock',
  bio: 'A rock band',
  imageUrl: 'https://example.com/artist2.jpg',
  country: 'UK',
  spotifyUrl: null,
  instagramUrl: null,
  websiteUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStage = {
  id: mockStageId,
  festivalId: mockFestivalId,
  name: 'Main Stage',
  description: 'The main festival stage',
  capacity: 50000,
  location: 'Center Field',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStage2 = {
  id: 'stage-uuid-002',
  festivalId: mockFestivalId,
  name: 'Techno Tent',
  description: 'Electronic music tent',
  capacity: 5000,
  location: 'North Area',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPerformance = {
  id: 'performance-uuid-001',
  artistId: mockArtistId,
  stageId: mockStageId,
  startTime: new Date('2026-07-15T20:00:00.000Z'),
  endTime: new Date('2026-07-15T22:00:00.000Z'),
  description: 'Headlining performance',
  isCancelled: false,
  status: 'SCHEDULED',
  createdAt: new Date(),
  updatedAt: new Date(),
  artist: mockArtist,
  stage: mockStage,
};

const mockPerformance2 = {
  id: 'performance-uuid-002',
  artistId: 'artist-uuid-002',
  stageId: 'stage-uuid-002',
  startTime: new Date('2026-07-15T18:00:00.000Z'),
  endTime: new Date('2026-07-15T19:30:00.000Z'),
  description: 'Opening act',
  isCancelled: false,
  status: 'SCHEDULED',
  createdAt: new Date(),
  updatedAt: new Date(),
  artist: mockArtist2,
  stage: mockStage2,
};

const mockFavorite = {
  id: 'favorite-uuid-001',
  userId: mockUserId,
  artistId: mockArtistId,
  festivalId: mockFestivalId,
  notifyMe: true,
  createdAt: new Date(),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ProgramService', () => {
  let programService: ProgramService;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockPrismaService = {
    performance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    artist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    stage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    favoriteArtist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
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
        ProgramService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    programService = module.get<ProgramService>(ProgramService);
    // Note: We use mockPrismaService and mockCacheService directly for assertions
    // The typed variables below are kept for potential future use with typed assertions
    prismaService = module.get(PrismaService);
    cacheService = module.get(CacheService);
    // Suppress unused variable warnings - these are available for typed assertions if needed
    void prismaService;
    void cacheService;
  });

  // ==========================================================================
  // getProgram Tests
  // ==========================================================================

  describe('getProgram', () => {
    it('should return all performances for a festival', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance, mockPerformance2]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].artist.name).toBe('Test Artist');
      expect(result[1].artist.name).toBe('Second Artist');
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith({
        where: {
          stage: {
            festivalId: mockFestivalId,
          },
        },
        include: {
          artist: true,
          stage: true,
        },
        orderBy: [{ startTime: 'asc' }],
      });
    });

    it('should return cached program when available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.performance.findMany).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:all`);
    });

    it('should cache program after fetching from database', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getProgram(mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:all`,
        [mockPerformance],
        {
          ttl: 600, // 10 minutes
          tags: [CacheTag.FESTIVAL],
        }
      );
    });

    it('should mark favorites when userId is provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([{ artistId: mockArtistId }]);

      // Act
      const result = await programService.getProgram(mockFestivalId, mockUserId);

      // Assert
      expect(result[0].isFavorite).toBe(true);
      expect(mockPrismaService.favoriteArtist.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          festivalId: mockFestivalId,
        },
        select: {
          artistId: true,
        },
      });
    });

    it('should mark non-favorites correctly', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance, mockPerformance2]);
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([
        { artistId: mockArtistId }, // Only first artist is favorite
      ]);

      // Act
      const result = await programService.getProgram(mockFestivalId, mockUserId);

      // Assert
      expect(result[0].isFavorite).toBe(true);
      expect(result[1].isFavorite).toBe(false);
    });

    it('should not query favorites when userId is not provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].isFavorite).toBe(false);
      expect(mockPrismaService.favoriteArtist.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no performances exist', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle null genre in artist', async () => {
      // Arrange
      const perfWithNullGenre = {
        ...mockPerformance,
        artist: { ...mockArtist, genre: null },
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithNullGenre]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].artist.genre).toBe('Unknown');
    });

    it('should handle null imageUrl in artist', async () => {
      // Arrange
      const perfWithNullImage = {
        ...mockPerformance,
        artist: { ...mockArtist, imageUrl: null },
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithNullImage]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].artist.image).toBe('');
    });

    it('should handle null location in stage', async () => {
      // Arrange
      const perfWithNullLocation = {
        ...mockPerformance,
        stage: { ...mockStage, location: null },
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithNullLocation]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].stage.location).toBe('TBD');
    });

    it('should handle null capacity in stage', async () => {
      // Arrange
      const perfWithNullCapacity = {
        ...mockPerformance,
        stage: { ...mockStage, capacity: null },
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithNullCapacity]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].stage.capacity).toBe(0);
    });
  });

  // ==========================================================================
  // getProgramByDay Tests
  // ==========================================================================

  describe('getProgramByDay', () => {
    const testDay = '2026-07-15';

    it('should return performances for a specific day', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith({
        where: {
          stage: {
            festivalId: mockFestivalId,
          },
          startTime: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: {
          artist: true,
          stage: true,
        },
        orderBy: [{ startTime: 'asc' }],
      });
    });

    it('should return cached day program when available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.performance.findMany).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:day:${testDay}`);
    });

    it('should cache day program after fetching from database', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:day:${testDay}`,
        [mockPerformance],
        {
          ttl: 600,
          tags: [CacheTag.FESTIVAL],
        }
      );
    });

    it('should mark favorites when userId is provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([{ artistId: mockArtistId }]);

      // Act
      const result = await programService.getProgramByDay(mockFestivalId, testDay, mockUserId);

      // Assert
      expect(result[0].isFavorite).toBe(true);
    });

    it('should return empty array when no performances on that day', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should filter correctly by date range', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert - verify the date range is correct
      const callArgs = mockPrismaService.performance.findMany.mock.calls[0][0];
      const startOfDay = new Date(testDay);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(testDay);
      endOfDay.setHours(23, 59, 59, 999);

      expect(callArgs.where.startTime.gte.getDate()).toBe(startOfDay.getDate());
      expect(callArgs.where.startTime.lte.getDate()).toBe(endOfDay.getDate());
    });
  });

  // ==========================================================================
  // getArtists Tests
  // ==========================================================================

  describe('getArtists', () => {
    it('should return all artists for a festival', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist, mockArtist2]);

      // Act
      const result = await programService.getArtists(mockFestivalId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Artist');
      expect(result[1].name).toBe('Second Artist');
    });

    it('should return cached artists when available', async () => {
      // Arrange
      const cachedArtists = [
        {
          id: mockArtistId,
          name: 'Test Artist',
          genre: 'Electronic',
          bio: null,
          imageUrl: null,
          country: null,
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedArtists);

      // Act
      const result = await programService.getArtists(mockFestivalId);

      // Assert
      expect(result).toEqual(cachedArtists);
      expect(mockPrismaService.artist.findMany).not.toHaveBeenCalled();
    });

    it('should cache artists after fetching from database', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);

      // Act
      await programService.getArtists(mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:artists`,
        expect.arrayContaining([
          expect.objectContaining({
            id: mockArtistId,
            name: 'Test Artist',
          }),
        ]),
        {
          ttl: 600,
          tags: [CacheTag.FESTIVAL],
        }
      );
    });

    it('should filter artists by festival performances', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);

      // Act
      await programService.getArtists(mockFestivalId);

      // Assert
      expect(mockPrismaService.artist.findMany).toHaveBeenCalledWith({
        where: {
          performances: {
            some: {
              stage: {
                festivalId: mockFestivalId,
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should return empty array when no artists exist', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getArtists(mockFestivalId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should map artist properties correctly', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);

      // Act
      const result = await programService.getArtists(mockFestivalId);

      // Assert
      expect(result[0]).toEqual({
        id: mockArtist.id,
        name: mockArtist.name,
        genre: mockArtist.genre,
        bio: mockArtist.bio,
        imageUrl: mockArtist.imageUrl,
        country: mockArtist.country,
      });
    });
  });

  // ==========================================================================
  // getArtistById Tests
  // ==========================================================================

  describe('getArtistById', () => {
    it('should return artist when found', async () => {
      // Arrange
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      // Act
      const result = await programService.getArtistById(mockArtistId);

      // Assert
      expect(result.id).toBe(mockArtistId);
      expect(result.name).toBe('Test Artist');
      expect(mockPrismaService.artist.findUnique).toHaveBeenCalledWith({
        where: { id: mockArtistId },
      });
    });

    it('should throw NotFoundException when artist not found', async () => {
      // Arrange
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.getArtistById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should map all artist properties correctly', async () => {
      // Arrange
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      // Act
      const result = await programService.getArtistById(mockArtistId);

      // Assert
      expect(result).toEqual({
        id: mockArtist.id,
        name: mockArtist.name,
        genre: mockArtist.genre,
        bio: mockArtist.bio,
        imageUrl: mockArtist.imageUrl,
        country: mockArtist.country,
      });
    });
  });

  // ==========================================================================
  // getArtistPerformances Tests
  // ==========================================================================

  describe('getArtistPerformances', () => {
    it('should return all performances for an artist', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].artist.name).toBe('Test Artist');
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getArtistPerformances(mockArtistId, mockFestivalId);

      // Assert
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith({
        where: {
          artistId: mockArtistId,
          stage: {
            festivalId: mockFestivalId,
          },
        },
        include: {
          artist: true,
          stage: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    });

    it('should not filter by festivalId when not provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith({
        where: {
          artistId: mockArtistId,
        },
        include: {
          artist: true,
          stage: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    });

    it('should return empty array when no performances exist', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should map performance properties correctly', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(result[0]).toMatchObject({
        id: mockPerformance.id,
        startTime: mockPerformance.startTime.toISOString(),
        endTime: mockPerformance.endTime.toISOString(),
        status: mockPerformance.status,
      });
    });

    it('should return multiple performances for same artist', async () => {
      // Arrange
      const performance2 = {
        ...mockPerformance,
        id: 'performance-uuid-003',
        startTime: new Date('2026-07-16T20:00:00.000Z'),
        endTime: new Date('2026-07-16T22:00:00.000Z'),
      };
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance, performance2]);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // getStages Tests
  // ==========================================================================

  describe('getStages', () => {
    it('should return all stages for a festival', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage, mockStage2]);

      // Act
      const result = await programService.getStages(mockFestivalId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Main Stage');
      expect(result[1].name).toBe('Techno Tent');
    });

    it('should return cached stages when available', async () => {
      // Arrange
      const cachedStages = [
        {
          id: mockStageId,
          name: 'Main Stage',
          description: null,
          capacity: 50000,
          location: 'Center Field',
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedStages);

      // Act
      const result = await programService.getStages(mockFestivalId);

      // Assert
      expect(result).toEqual(cachedStages);
      expect(mockPrismaService.stage.findMany).not.toHaveBeenCalled();
    });

    it('should cache stages after fetching from database', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage]);

      // Act
      await programService.getStages(mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:stages`,
        expect.arrayContaining([
          expect.objectContaining({
            id: mockStageId,
            name: 'Main Stage',
          }),
        ]),
        {
          ttl: 600,
          tags: [CacheTag.FESTIVAL],
        }
      );
    });

    it('should filter by festivalId', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage]);

      // Act
      await programService.getStages(mockFestivalId);

      // Assert
      expect(mockPrismaService.stage.findMany).toHaveBeenCalledWith({
        where: {
          festivalId: mockFestivalId,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should return empty array when no stages exist', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getStages(mockFestivalId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should map stage properties correctly', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage]);

      // Act
      const result = await programService.getStages(mockFestivalId);

      // Assert
      expect(result[0]).toEqual({
        id: mockStage.id,
        name: mockStage.name,
        description: mockStage.description,
        capacity: mockStage.capacity,
        location: mockStage.location,
      });
    });
  });

  // ==========================================================================
  // getFavorites Tests
  // ==========================================================================

  describe('getFavorites', () => {
    it('should return list of favorite artist IDs', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([
        { artistId: mockArtistId },
        { artistId: 'artist-uuid-002' },
      ]);

      // Act
      const result = await programService.getFavorites(mockUserId, mockFestivalId);

      // Assert
      expect(result).toEqual([mockArtistId, 'artist-uuid-002']);
    });

    it('should query favorites by userId and festivalId', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([]);

      // Act
      await programService.getFavorites(mockUserId, mockFestivalId);

      // Assert
      expect(mockPrismaService.favoriteArtist.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          festivalId: mockFestivalId,
        },
        select: {
          artistId: true,
        },
      });
    });

    it('should return empty array when no favorites exist', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.getFavorites(mockUserId, mockFestivalId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // toggleFavorite Tests
  // ==========================================================================

  describe('toggleFavorite', () => {
    it('should add artist to favorites when not already favorite', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findUnique.mockResolvedValue(null);
      mockPrismaService.favoriteArtist.create.mockResolvedValue(mockFavorite);

      // Act
      const result = await programService.toggleFavorite(mockUserId, mockFestivalId, mockArtistId);

      // Assert
      expect(result.isFavorite).toBe(true);
      expect(mockPrismaService.favoriteArtist.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          artistId: mockArtistId,
          festivalId: mockFestivalId,
        },
      });
    });

    it('should remove artist from favorites when already favorite', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaService.favoriteArtist.delete.mockResolvedValue(mockFavorite);

      // Act
      const result = await programService.toggleFavorite(mockUserId, mockFestivalId, mockArtistId);

      // Assert
      expect(result.isFavorite).toBe(false);
      expect(mockPrismaService.favoriteArtist.delete).toHaveBeenCalledWith({
        where: {
          id: mockFavorite.id,
        },
      });
    });

    it('should check for existing favorite with correct unique key', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findUnique.mockResolvedValue(null);
      mockPrismaService.favoriteArtist.create.mockResolvedValue(mockFavorite);

      // Act
      await programService.toggleFavorite(mockUserId, mockFestivalId, mockArtistId);

      // Assert
      expect(mockPrismaService.favoriteArtist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_artistId_festivalId: {
            userId: mockUserId,
            artistId: mockArtistId,
            festivalId: mockFestivalId,
          },
        },
      });
    });

    it('should not call delete when adding favorite', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findUnique.mockResolvedValue(null);
      mockPrismaService.favoriteArtist.create.mockResolvedValue(mockFavorite);

      // Act
      await programService.toggleFavorite(mockUserId, mockFestivalId, mockArtistId);

      // Assert
      expect(mockPrismaService.favoriteArtist.delete).not.toHaveBeenCalled();
    });

    it('should not call create when removing favorite', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaService.favoriteArtist.delete.mockResolvedValue(mockFavorite);

      // Act
      await programService.toggleFavorite(mockUserId, mockFestivalId, mockArtistId);

      // Assert
      expect(mockPrismaService.favoriteArtist.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Caching Behavior Tests
  // ==========================================================================

  describe('caching behavior', () => {
    it('should use correct cache key for getProgram', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      await programService.getProgram(mockFestivalId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:all`);
    });

    it('should use correct cache key for getProgramByDay', async () => {
      // Arrange
      const testDay = '2026-07-15';
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      await programService.getProgramByDay(mockFestivalId, testDay);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:day:${testDay}`);
    });

    it('should use correct cache key for getArtists', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([]);

      // Act
      await programService.getArtists(mockFestivalId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:artists`);
    });

    it('should use correct cache key for getStages', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([]);

      // Act
      await programService.getStages(mockFestivalId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:stages`);
    });

    it('should use FESTIVAL tag for all cached items', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage]);

      // Act
      await programService.getProgram(mockFestivalId);
      await programService.getArtists(mockFestivalId);
      await programService.getStages(mockFestivalId);

      // Assert - all cache sets should use FESTIVAL tag
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          tags: [CacheTag.FESTIVAL],
        })
      );
    });

    it('should use 10 minute TTL for program cache', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getProgram(mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          ttl: 600,
        })
      );
    });
  });

  // ==========================================================================
  // Time Formatting Tests
  // ==========================================================================

  describe('time formatting', () => {
    it('should format startTime correctly', async () => {
      // Arrange
      const perfWithSpecificTime = {
        ...mockPerformance,
        startTime: new Date('2026-07-15T20:30:00.000Z'),
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithSpecificTime]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].startTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format endTime correctly', async () => {
      // Arrange
      const perfWithSpecificTime = {
        ...mockPerformance,
        endTime: new Date('2026-07-15T22:45:00.000Z'),
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithSpecificTime]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should return correct day name for different days', async () => {
      // Arrange - Wednesday, July 15, 2026
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].day).toBe('Mercredi');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle performance with all null optional fields', async () => {
      // Arrange
      const perfWithNulls = {
        ...mockPerformance,
        artist: {
          ...mockArtist,
          genre: null,
          bio: null,
          imageUrl: null,
          country: null,
        },
        stage: {
          ...mockStage,
          description: null,
          capacity: null,
          location: null,
        },
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithNulls]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].artist.genre).toBe('Unknown');
      expect(result[0].artist.image).toBe('');
      expect(result[0].stage.location).toBe('TBD');
      expect(result[0].stage.capacity).toBe(0);
    });

    it('should handle very long artist names', async () => {
      // Arrange
      const longNameArtist = {
        ...mockArtist,
        name: 'A'.repeat(255),
      };
      const perfWithLongName = {
        ...mockPerformance,
        artist: longNameArtist,
      };
      mockPrismaService.performance.findMany.mockResolvedValue([perfWithLongName]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].artist.name).toBe('A'.repeat(255));
    });

    it('should handle special characters in artist bio', async () => {
      // Arrange
      const specialBioArtist = {
        ...mockArtist,
        bio: "Rock'n'Roll with <script>alert('xss')</script>",
      };
      mockPrismaService.artist.findUnique.mockResolvedValue(specialBioArtist);

      // Act
      const result = await programService.getArtistById(mockArtistId);

      // Assert
      expect(result.bio).toBe("Rock'n'Roll with <script>alert('xss')</script>");
    });

    it('should handle unicode characters in stage name', async () => {
      // Arrange
      const unicodeStage = {
        ...mockStage,
        name: 'Scène Étoile ★',
      };
      mockPrismaService.stage.findMany.mockResolvedValue([unicodeStage]);

      // Act
      const result = await programService.getStages(mockFestivalId);

      // Assert
      expect(result[0].name).toBe('Scène Étoile ★');
    });

    it('should handle multiple favorites for same user', async () => {
      // Arrange
      mockPrismaService.favoriteArtist.findMany.mockResolvedValue([
        { artistId: mockArtistId },
        { artistId: 'artist-uuid-002' },
        { artistId: 'artist-uuid-003' },
      ]);

      // Act
      const result = await programService.getFavorites(mockUserId, mockFestivalId);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should handle performance at midnight', async () => {
      // Arrange
      const midnightPerf = {
        ...mockPerformance,
        startTime: new Date('2026-07-16T00:00:00.000Z'),
        endTime: new Date('2026-07-16T02:00:00.000Z'),
      };
      mockPrismaService.performance.findMany.mockResolvedValue([midnightPerf]);

      // Act
      const result = await programService.getProgram(mockFestivalId);

      // Assert
      expect(result[0].startTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
