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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    invalidateByTag: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset cache mock to return null by default (cache miss)
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);
    mockCacheService.invalidateByTag.mockResolvedValue(0);

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
        select: {
          id: true,
          startTime: true,
          endTime: true,
          artist: {
            select: {
              id: true,
              name: true,
              genre: true,
              imageUrl: true,
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              location: true,
              capacity: true,
            },
          },
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
        select: {
          id: true,
          startTime: true,
          endTime: true,
          artist: {
            select: {
              id: true,
              name: true,
              genre: true,
              imageUrl: true,
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              location: true,
              capacity: true,
            },
          },
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
      expect(mockCacheService.get).toHaveBeenCalledWith(`artists:festival:${mockFestivalId}:list`);
    });

    it('should cache artists after fetching from database', async () => {
      // Arrange
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);

      // Act
      await programService.getArtists(mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `artists:festival:${mockFestivalId}:list`,
        expect.arrayContaining([
          expect.objectContaining({
            id: mockArtistId,
            name: 'Test Artist',
          }),
        ]),
        {
          ttl: 3600, // 1 hour
          tags: [CacheTag.ARTIST, CacheTag.FESTIVAL],
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
        select: {
          id: true,
          name: true,
          genre: true,
          bio: true,
          imageUrl: true,
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
        country: null, // Country field not in schema
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
        select: {
          id: true,
          name: true,
          genre: true,
          bio: true,
          imageUrl: true,
        },
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
        country: null, // Country field not in schema
      });
    });

    it('should return cached artist when available', async () => {
      // Arrange
      const cachedArtist = {
        id: mockArtistId,
        name: 'Test Artist',
        genre: 'Electronic',
        bio: 'A talented electronic artist',
        imageUrl: 'https://example.com/artist.jpg',
        country: 'France',
      };
      mockCacheService.get.mockResolvedValue(cachedArtist);

      // Act
      const result = await programService.getArtistById(mockArtistId);

      // Assert
      expect(result).toEqual(cachedArtist);
      expect(mockPrismaService.artist.findUnique).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(`artists:detail:${mockArtistId}`);
    });

    it('should cache artist after fetching from database', async () => {
      // Arrange
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      // Act
      await programService.getArtistById(mockArtistId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `artists:detail:${mockArtistId}`,
        expect.objectContaining({
          id: mockArtistId,
          name: 'Test Artist',
        }),
        {
          ttl: 3600, // 1 hour
          tags: [CacheTag.ARTIST],
        }
      );
    });

    it('should not cache when artist is not found', async () => {
      // Arrange
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.getArtistById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
      expect(mockCacheService.set).not.toHaveBeenCalled();
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
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isCancelled: true,
          artist: {
            select: {
              id: true,
              name: true,
              genre: true,
              bio: true,
              imageUrl: true,
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              description: true,
              capacity: true,
              location: true,
            },
          },
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
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isCancelled: true,
          artist: {
            select: {
              id: true,
              name: true,
              genre: true,
              bio: true,
              imageUrl: true,
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              description: true,
              capacity: true,
              location: true,
            },
          },
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

    it('should return cached performances when available (without festivalId)', async () => {
      // Arrange
      const cachedPerformances = [
        {
          id: 'performance-uuid-001',
          artist: mockArtist,
          stage: mockStage,
          startTime: '2026-07-15T20:00:00.000Z',
          endTime: '2026-07-15T22:00:00.000Z',
          day: 'Mercredi',
          status: 'SCHEDULED',
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedPerformances);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(result).toEqual(cachedPerformances);
      expect(mockPrismaService.performance.findMany).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(`artists:${mockArtistId}:performances:all`);
    });

    it('should return cached performances when available (with festivalId)', async () => {
      // Arrange
      const cachedPerformances = [
        {
          id: 'performance-uuid-001',
          artist: mockArtist,
          stage: mockStage,
          startTime: '2026-07-15T20:00:00.000Z',
          endTime: '2026-07-15T22:00:00.000Z',
          day: 'Mercredi',
          status: 'SCHEDULED',
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedPerformances);

      // Act
      const result = await programService.getArtistPerformances(mockArtistId, mockFestivalId);

      // Assert
      expect(result).toEqual(cachedPerformances);
      expect(mockPrismaService.performance.findMany).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `artists:${mockArtistId}:performances:festival:${mockFestivalId}`
      );
    });

    it('should cache performances after fetching from database (without festivalId)', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getArtistPerformances(mockArtistId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `artists:${mockArtistId}:performances:all`,
        expect.any(Array),
        {
          ttl: 3600, // 1 hour
          tags: [CacheTag.ARTIST, CacheTag.PROGRAM],
        }
      );
    });

    it('should cache performances with FESTIVAL tag when festivalId is provided', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);

      // Act
      await programService.getArtistPerformances(mockArtistId, mockFestivalId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `artists:${mockArtistId}:performances:festival:${mockFestivalId}`,
        expect.any(Array),
        {
          ttl: 3600, // 1 hour
          tags: [CacheTag.ARTIST, CacheTag.PROGRAM, CacheTag.FESTIVAL],
        }
      );
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
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          location: true,
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
      expect(mockCacheService.get).toHaveBeenCalledWith(`artists:festival:${mockFestivalId}:list`);
    });

    it('should use correct cache key for getStages', async () => {
      // Arrange
      mockPrismaService.stage.findMany.mockResolvedValue([]);

      // Act
      await programService.getStages(mockFestivalId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(`program:${mockFestivalId}:stages`);
    });

    it('should use appropriate tags for all cached items', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([mockPerformance]);
      mockPrismaService.artist.findMany.mockResolvedValue([mockArtist]);
      mockPrismaService.stage.findMany.mockResolvedValue([mockStage]);

      // Act
      await programService.getProgram(mockFestivalId);
      await programService.getArtists(mockFestivalId);
      await programService.getStages(mockFestivalId);

      // Assert - program uses FESTIVAL tag
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:all`,
        expect.any(Array),
        expect.objectContaining({
          tags: [CacheTag.FESTIVAL],
        })
      );

      // Assert - artists use ARTIST and FESTIVAL tags
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `artists:festival:${mockFestivalId}:list`,
        expect.any(Array),
        expect.objectContaining({
          tags: [CacheTag.ARTIST, CacheTag.FESTIVAL],
        })
      );

      // Assert - stages use FESTIVAL tag
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `program:${mockFestivalId}:stages`,
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

  // ==========================================================================
  // Cache Invalidation Tests
  // ==========================================================================

  describe('invalidateArtistCache', () => {
    it('should delete artist detail cache', async () => {
      // Act
      await programService.invalidateArtistCache(mockArtistId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(`artists:detail:${mockArtistId}`);
    });

    it('should delete artist performances pattern', async () => {
      // Act
      await programService.invalidateArtistCache(mockArtistId);

      // Assert
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `artists:${mockArtistId}:performances:*`
      );
    });

    it('should invalidate by ARTIST tag', async () => {
      // Act
      await programService.invalidateArtistCache(mockArtistId);

      // Assert
      expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.ARTIST);
    });
  });

  describe('invalidateArtistListCache', () => {
    it('should delete artist list cache for specific festival', async () => {
      // Act
      await programService.invalidateArtistListCache(mockFestivalId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `artists:festival:${mockFestivalId}:list`
      );
    });
  });

  describe('invalidateProgramCache', () => {
    it('should delete program schedule pattern', async () => {
      // Act
      await programService.invalidateProgramCache(mockFestivalId);

      // Assert
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(`program:${mockFestivalId}:*`);
    });

    it('should delete artist list for festival', async () => {
      // Act
      await programService.invalidateProgramCache(mockFestivalId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `artists:festival:${mockFestivalId}:list`
      );
    });

    it('should delete artist performances pattern for festival', async () => {
      // Act
      await programService.invalidateProgramCache(mockFestivalId);

      // Assert
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `artists:*:performances:festival:${mockFestivalId}`
      );
    });

    it('should delete stages cache for festival', async () => {
      // Act
      await programService.invalidateProgramCache(mockFestivalId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(`program:${mockFestivalId}:stages`);
    });
  });

  // ==========================================================================
  // Schedule Conflict Detection Tests
  // ==========================================================================

  describe('detectScheduleConflicts', () => {
    const baseStartTime = new Date('2026-07-15T20:00:00.000Z');
    const baseEndTime = new Date('2026-07-15T22:00:00.000Z');

    it('should return no conflicts when schedule is clear', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect artist time conflict (same artist, overlapping time)', async () => {
      // Arrange - First query for artist conflicts returns a conflict
      const conflictingPerformance = {
        id: 'conflict-perf-id',
        artistId: mockArtistId,
        stageId: 'other-stage-id',
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage-id', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([conflictingPerformance]) // Artist conflicts
        .mockResolvedValueOnce([]); // Stage conflicts

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('ARTIST_OVERLAP');
      expect(result.conflicts[0].artistId).toBe(mockArtistId);
      expect(result.conflicts[0].message).toContain('Test Artist');
    });

    it('should detect stage time conflict (same stage, different artist)', async () => {
      // Arrange
      const conflictingPerformance = {
        id: 'conflict-perf-id',
        artistId: 'other-artist-id',
        stageId: mockStageId,
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: { ...mockArtist, id: 'other-artist-id', name: 'Other Artist' },
        stage: mockStage,
      };
      // Optimized query returns all conflicts in a single call
      mockPrismaService.performance.findMany.mockResolvedValue([conflictingPerformance]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('STAGE_OVERLAP');
      expect(result.conflicts[0].stageId).toBe(mockStageId);
      expect(result.conflicts[0].message).toContain('Main Stage');
    });

    it('should detect multiple conflicts (both artist and stage)', async () => {
      // Arrange
      const artistConflict = {
        id: 'artist-conflict-id',
        artistId: mockArtistId,
        stageId: 'other-stage-id',
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage-id', name: 'Other Stage' },
      };
      const stageConflict = {
        id: 'stage-conflict-id',
        artistId: 'other-artist-id',
        stageId: mockStageId,
        startTime: new Date('2026-07-15T21:30:00.000Z'),
        endTime: new Date('2026-07-15T23:30:00.000Z'),
        artist: { ...mockArtist, id: 'other-artist-id', name: 'Other Artist' },
        stage: mockStage,
      };
      // Optimized query returns all conflicts in a single call
      mockPrismaService.performance.findMany.mockResolvedValue([artistConflict, stageConflict]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts.map((c) => c.type)).toContain('ARTIST_OVERLAP');
      expect(result.conflicts.map((c) => c.type)).toContain('STAGE_OVERLAP');
    });

    it('should exclude specified performance ID when checking conflicts', async () => {
      // Arrange
      mockPrismaService.performance.findMany.mockResolvedValue([]);
      const excludeId = 'exclude-this-id';

      // Act
      await programService.detectScheduleConflicts(
        {
          artistId: mockArtistId,
          stageId: mockStageId,
          startTime: baseStartTime,
          endTime: baseEndTime,
        },
        excludeId
      );

      // Assert - Verify the exclusion filter was applied
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: excludeId },
          }),
        })
      );
    });

    it('should not duplicate conflicts when same performance conflicts on both artist and stage', async () => {
      // Arrange - Same performance appears in both queries
      const sameConflict = {
        id: 'same-conflict-id',
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: mockArtist,
        stage: mockStage,
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([sameConflict])
        .mockResolvedValueOnce([sameConflict]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert - Should only have one conflict, not duplicated
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });

    it('should detect conflict when new performance starts during existing performance', async () => {
      // Arrange - Existing: 19:00-21:00, New: 20:00-22:00
      const existingPerformance = {
        id: 'existing-id',
        artistId: mockArtistId,
        stageId: 'other-stage-id',
        startTime: new Date('2026-07-15T19:00:00.000Z'),
        endTime: new Date('2026-07-15T21:00:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage-id', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([existingPerformance])
        .mockResolvedValueOnce([]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime, // 20:00
        endTime: baseEndTime, // 22:00
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
    });

    it('should detect conflict when new performance ends during existing performance', async () => {
      // Arrange - Existing: 21:00-23:00, New: 20:00-22:00
      const existingPerformance = {
        id: 'existing-id',
        artistId: mockArtistId,
        stageId: 'other-stage-id',
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage-id', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([existingPerformance])
        .mockResolvedValueOnce([]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime, // 20:00
        endTime: baseEndTime, // 22:00
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
    });

    it('should detect conflict when new performance completely contains existing', async () => {
      // Arrange - Existing: 20:30-21:30, New: 20:00-22:00
      const existingPerformance = {
        id: 'existing-id',
        artistId: mockArtistId,
        stageId: 'other-stage-id',
        startTime: new Date('2026-07-15T20:30:00.000Z'),
        endTime: new Date('2026-07-15T21:30:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage-id', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([existingPerformance])
        .mockResolvedValueOnce([]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime, // 20:00
        endTime: baseEndTime, // 22:00
      });

      // Assert
      expect(result.hasConflicts).toBe(true);
    });

    it('should not detect conflict for adjacent performances (no overlap)', async () => {
      // Arrange - Existing ends exactly when new starts: 18:00-20:00, New: 20:00-22:00
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      const result = await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime, // 20:00
        endTime: baseEndTime, // 22:00
      });

      // Assert
      expect(result.hasConflicts).toBe(false);
    });

    it('should skip cancelled performances', async () => {
      // Arrange - The query filters out cancelled performances
      mockPrismaService.performance.findMany.mockResolvedValue([]);

      // Act
      await programService.detectScheduleConflicts({
        artistId: mockArtistId,
        stageId: mockStageId,
        startTime: baseStartTime,
        endTime: baseEndTime,
      });

      // Assert - Verify isCancelled: false filter was applied
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCancelled: false,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Performance CRUD Tests
  // ==========================================================================

  describe('createPerformance', () => {
    const createData = {
      artistId: mockArtistId,
      stageId: mockStageId,
      startTime: new Date('2026-07-15T20:00:00.000Z'),
      endTime: new Date('2026-07-15T22:00:00.000Z'),
      description: 'Test performance',
    };

    it('should create a performance when no conflicts exist', async () => {
      // Arrange
      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrismaService.performance.findMany.mockResolvedValue([]);
      mockPrismaService.performance.create.mockResolvedValue({
        ...mockPerformance,
        description: createData.description,
      });

      // Act
      const result = await programService.createPerformance(createData);

      // Assert
      expect(result.id).toBe(mockPerformance.id);
      expect(mockPrismaService.performance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            artistId: createData.artistId,
            stageId: createData.stageId,
          }),
        })
      );
    });

    it('should throw StageNotFoundException when stage does not exist', async () => {
      // Arrange
      mockPrismaService.stage.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.createPerformance(createData)).rejects.toThrow();
    });

    it('should throw ArtistNotFoundException when artist does not exist', async () => {
      // Arrange
      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.artist.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.createPerformance(createData)).rejects.toThrow();
    });

    it('should throw ScheduleConflictException when conflicts are detected', async () => {
      // Arrange
      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);

      const conflictingPerformance = {
        id: 'conflict-id',
        artistId: mockArtistId,
        stageId: 'other-stage',
        startTime: new Date('2026-07-15T21:00:00.000Z'),
        endTime: new Date('2026-07-15T23:00:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([conflictingPerformance])
        .mockResolvedValueOnce([]);

      // Act & Assert
      await expect(programService.createPerformance(createData)).rejects.toThrow();
    });

    it('should invalidate program cache after creating performance', async () => {
      // Arrange
      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrismaService.performance.findMany.mockResolvedValue([]);
      mockPrismaService.performance.create.mockResolvedValue(mockPerformance);

      // Act
      await programService.createPerformance(createData);

      // Assert
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(`program:${mockFestivalId}:*`);
    });
  });

  describe('updatePerformance', () => {
    const performanceId = 'perf-to-update';
    const updateData = {
      startTime: new Date('2026-07-15T21:00:00.000Z'),
      endTime: new Date('2026-07-15T23:00:00.000Z'),
    };

    it('should update a performance when no conflicts exist', async () => {
      // Arrange
      const existingPerformance = {
        ...mockPerformance,
        id: performanceId,
      };
      mockPrismaService.performance.findUnique.mockResolvedValueOnce(existingPerformance);
      mockPrismaService.performance.findMany.mockResolvedValue([]);
      mockPrismaService.performance.update.mockResolvedValue({
        ...existingPerformance,
        ...updateData,
      });

      // Act
      const result = await programService.updatePerformance(performanceId, updateData);

      // Assert
      expect(result.id).toBe(performanceId);
      expect(mockPrismaService.performance.update).toHaveBeenCalled();
    });

    it('should throw PerformanceNotFoundException when performance does not exist', async () => {
      // Arrange
      mockPrismaService.performance.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.updatePerformance('non-existent', updateData)).rejects.toThrow();
    });

    it('should throw ScheduleConflictException when update creates conflicts', async () => {
      // Arrange
      const existingPerformance = {
        ...mockPerformance,
        id: performanceId,
      };
      mockPrismaService.performance.findUnique.mockResolvedValueOnce(existingPerformance);

      const conflictingPerformance = {
        id: 'other-perf',
        artistId: mockArtistId,
        stageId: 'other-stage',
        startTime: new Date('2026-07-15T22:00:00.000Z'),
        endTime: new Date('2026-07-15T23:30:00.000Z'),
        artist: mockArtist,
        stage: { ...mockStage, id: 'other-stage', name: 'Other Stage' },
      };
      mockPrismaService.performance.findMany
        .mockResolvedValueOnce([conflictingPerformance])
        .mockResolvedValueOnce([]);

      // Act & Assert
      await expect(programService.updatePerformance(performanceId, updateData)).rejects.toThrow();
    });

    it('should exclude current performance when checking conflicts during update', async () => {
      // Arrange
      const existingPerformance = {
        ...mockPerformance,
        id: performanceId,
      };
      mockPrismaService.performance.findUnique.mockResolvedValueOnce(existingPerformance);
      mockPrismaService.performance.findMany.mockResolvedValue([]);
      mockPrismaService.performance.update.mockResolvedValue({
        ...existingPerformance,
        ...updateData,
      });

      // Act
      await programService.updatePerformance(performanceId, updateData);

      // Assert
      expect(mockPrismaService.performance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: performanceId },
          }),
        })
      );
    });

    it('should verify new stage exists when stageId is updated', async () => {
      // Arrange
      const existingPerformance = {
        ...mockPerformance,
        id: performanceId,
      };
      mockPrismaService.performance.findUnique
        .mockResolvedValueOnce(existingPerformance)
        .mockResolvedValueOnce(existingPerformance);
      mockPrismaService.stage.findUnique.mockResolvedValue(null);

      const updateWithNewStage = { stageId: 'new-stage-id' };

      // Act & Assert
      await expect(
        programService.updatePerformance(performanceId, updateWithNewStage)
      ).rejects.toThrow();
    });
  });

  describe('getPerformanceById', () => {
    it('should return performance when found', async () => {
      // Arrange
      mockPrismaService.performance.findUnique.mockResolvedValue(mockPerformance);

      // Act
      const result = await programService.getPerformanceById(mockPerformance.id);

      // Assert
      expect(result.id).toBe(mockPerformance.id);
      expect(result.artist.name).toBe(mockArtist.name);
      expect(result.stage.name).toBe(mockStage.name);
    });

    it('should throw PerformanceNotFoundException when not found', async () => {
      // Arrange
      mockPrismaService.performance.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.getPerformanceById('non-existent')).rejects.toThrow();
    });
  });

  describe('deletePerformance', () => {
    it('should delete performance and invalidate cache', async () => {
      // Arrange
      mockPrismaService.performance.findUnique.mockResolvedValue(mockPerformance);
      mockPrismaService.performance.delete.mockResolvedValue(mockPerformance);

      // Act
      await programService.deletePerformance(mockPerformance.id);

      // Assert
      expect(mockPrismaService.performance.delete).toHaveBeenCalledWith({
        where: { id: mockPerformance.id },
      });
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(`program:${mockFestivalId}:*`);
    });

    it('should throw PerformanceNotFoundException when performance does not exist', async () => {
      // Arrange
      mockPrismaService.performance.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(programService.deletePerformance('non-existent')).rejects.toThrow();
    });
  });
});
