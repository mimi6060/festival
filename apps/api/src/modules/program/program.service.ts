/**
 * Program Service
 *
 * Handles festival program functionality including:
 * - Artists management
 * - Stages management
 * - Performances scheduling
 * - User favorites
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CacheTag } from '../cache/cache.service';
import { Prisma } from '@prisma/client';
import {
  ProgramSearchDto,
  ProgramSearchResultDto,
  PaginatedProgramSearchResponse,
  ProgramSortBy,
} from './dto/program-search.dto';
import {
  ScheduleConflictException,
  StageNotFoundException,
  ArtistNotFoundException,
  PerformanceNotFoundException,
} from '../../common/exceptions/program.exception';

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  PROGRAM_SCHEDULE: 600, // 10 minutes
  ARTISTS: 3600, // 1 hour (artist data changes infrequently)
  ARTIST_DETAIL: 3600, // 1 hour
  ARTIST_PERFORMANCES: 3600, // 1 hour
  STAGES: 600, // 10 minutes
};

// ============================================================================
// Types
// ============================================================================

export interface ArtistDto {
  id: string;
  name: string;
  genre: string | null;
  bio: string | null;
  imageUrl: string | null;
  country: string | null;
}

export interface StageDto {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  location: string | null;
}

export interface PerformanceDto {
  id: string;
  artist: ArtistDto;
  stage: StageDto;
  startTime: string;
  endTime: string;
  day: string;
  status: string;
}

export interface ProgramEventDto {
  id: string;
  artist: {
    id: string;
    name: string;
    genre: string;
    image: string;
  };
  stage: {
    id: string;
    name: string;
    location: string;
    capacity: number;
  };
  startTime: string;
  endTime: string;
  day: string;
  isFavorite?: boolean;
}

/**
 * Types for schedule conflict detection
 */
export interface ScheduleConflict {
  type: 'ARTIST_OVERLAP' | 'STAGE_OVERLAP';
  performanceId: string;
  stageId: string;
  stageName: string;
  artistId: string;
  artistName: string;
  conflictingStartTime: string;
  conflictingEndTime: string;
  message: string;
}

export interface ScheduleConflictResult {
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
}

export interface CreatePerformanceDto {
  artistId: string;
  stageId: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface UpdatePerformanceDto {
  artistId?: string;
  stageId?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Get all performances for a festival
   */
  async getProgram(festivalId: string, userId?: string): Promise<ProgramEventDto[]> {
    // Cache key without userId (base program is shared)
    const cacheKey = `program:${festivalId}:all`;

    // Try to get base program from cache
    let performances = await this.cacheService.get<any[]>(cacheKey);

    if (!performances) {
      this.logger.debug(`Cache miss for program: ${festivalId}`);
      performances = await this.prisma.performance.findMany({
        where: {
          stage: {
            festivalId,
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

      // Cache the result with 10 min TTL
      await this.cacheService.set(cacheKey, performances, {
        ttl: CACHE_TTL.PROGRAM_SCHEDULE,
        tags: [CacheTag.FESTIVAL],
      });

      this.logger.debug(`Cached program: ${festivalId}`);
    } else {
      this.logger.debug(`Cache hit for program: ${festivalId}`);
    }

    // Get user favorites if userId is provided (not cached, user-specific)
    let favoriteArtistIds = new Set<string>();
    if (userId) {
      const favorites = await this.prisma.favoriteArtist.findMany({
        where: {
          userId,
          festivalId,
        },
        select: {
          artistId: true,
        },
      });
      favoriteArtistIds = new Set(favorites.map((f) => f.artistId));
    }

    return performances.map((perf) => this.mapToEventDto(perf, favoriteArtistIds));
  }

  /**
   * Get performances by day
   */
  async getProgramByDay(
    festivalId: string,
    day: string,
    userId?: string
  ): Promise<ProgramEventDto[]> {
    // Cache key with day (without userId, base schedule is shared)
    const cacheKey = `program:${festivalId}:day:${day}`;

    // Try to get from cache
    let performances = await this.cacheService.get<any[]>(cacheKey);

    if (!performances) {
      this.logger.debug(`Cache miss for program by day: ${festivalId}/${day}`);

      // Parse the day and create date range
      const startOfDay = new Date(day);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999);

      performances = await this.prisma.performance.findMany({
        where: {
          stage: {
            festivalId,
          },
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
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

      // Cache the result with 10 min TTL
      await this.cacheService.set(cacheKey, performances, {
        ttl: CACHE_TTL.PROGRAM_SCHEDULE,
        tags: [CacheTag.FESTIVAL],
      });

      this.logger.debug(`Cached program by day: ${festivalId}/${day}`);
    } else {
      this.logger.debug(`Cache hit for program by day: ${festivalId}/${day}`);
    }

    let favoriteArtistIds = new Set<string>();
    if (userId) {
      const favorites = await this.prisma.favoriteArtist.findMany({
        where: {
          userId,
          festivalId,
        },
        select: {
          artistId: true,
        },
      });
      favoriteArtistIds = new Set(favorites.map((f) => f.artistId));
    }

    return performances.map((perf) => this.mapToEventDto(perf, favoriteArtistIds));
  }

  /**
   * Get all artists for a festival
   * Cached with 1-hour TTL for performance optimization
   */
  async getArtists(festivalId: string): Promise<ArtistDto[]> {
    const cacheKey = `artists:festival:${festivalId}:list`;

    // Try to get from cache
    const cached = await this.cacheService.get<ArtistDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for artists: ${festivalId}`);
      return cached;
    }

    this.logger.debug(`Cache miss for artists: ${festivalId}`);

    const artists = await this.prisma.artist.findMany({
      where: {
        performances: {
          some: {
            stage: {
              festivalId,
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

    const result = artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      genre: artist.genre,
      bio: artist.bio,
      imageUrl: artist.imageUrl,
      country: null, // Country field not in schema, kept for API compatibility
    }));

    // Cache the result with 1 hour TTL
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.ARTISTS,
      tags: [CacheTag.ARTIST, CacheTag.FESTIVAL],
    });

    this.logger.debug(`Cached artists list for festival: ${festivalId}`);

    return result;
  }

  /**
   * Get all stages for a festival
   */
  async getStages(festivalId: string): Promise<StageDto[]> {
    const cacheKey = `program:${festivalId}:stages`;

    // Try to get from cache
    const cached = await this.cacheService.get<StageDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for stages: ${festivalId}`);
      return cached;
    }

    const stages = await this.prisma.stage.findMany({
      where: {
        festivalId,
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

    const result = stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      capacity: stage.capacity,
      location: stage.location,
    }));

    // Cache the result with 10 min TTL
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.STAGES,
      tags: [CacheTag.FESTIVAL],
    });

    this.logger.debug(`Cached stages: ${festivalId}`);

    return result;
  }

  /**
   * Get user's favorite artists
   */
  async getFavorites(userId: string, festivalId: string): Promise<string[]> {
    const favorites = await this.prisma.favoriteArtist.findMany({
      where: {
        userId,
        festivalId,
      },
      select: {
        artistId: true,
      },
    });

    return favorites.map((f) => f.artistId);
  }

  /**
   * Toggle favorite artist
   */
  async toggleFavorite(
    userId: string,
    festivalId: string,
    artistId: string
  ): Promise<{ isFavorite: boolean }> {
    // Check if already favorite
    const existing = await this.prisma.favoriteArtist.findUnique({
      where: {
        userId_artistId_festivalId: {
          userId,
          artistId,
          festivalId,
        },
      },
    });

    if (existing) {
      // Remove from favorites
      await this.prisma.favoriteArtist.delete({
        where: {
          id: existing.id,
        },
      });
      return { isFavorite: false };
    } else {
      // Add to favorites
      await this.prisma.favoriteArtist.create({
        data: {
          userId,
          artistId,
          festivalId,
        },
      });
      return { isFavorite: true };
    }
  }

  /**
   * Get artist by ID
   * Cached with 1-hour TTL for performance optimization
   */
  async getArtistById(artistId: string): Promise<ArtistDto> {
    const cacheKey = `artists:detail:${artistId}`;

    // Try to get from cache
    const cached = await this.cacheService.get<ArtistDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for artist detail: ${artistId}`);
      return cached;
    }

    this.logger.debug(`Cache miss for artist detail: ${artistId}`);

    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        name: true,
        genre: true,
        bio: true,
        imageUrl: true,
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const result: ArtistDto = {
      id: artist.id,
      name: artist.name,
      genre: artist.genre,
      bio: artist.bio,
      imageUrl: artist.imageUrl,
      country: null, // Country field not in schema, kept for API compatibility
    };

    // Cache the result with 1 hour TTL
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.ARTIST_DETAIL,
      tags: [CacheTag.ARTIST],
    });

    this.logger.debug(`Cached artist detail: ${artistId}`);

    return result;
  }

  /**
   * Get performances for an artist
   * Cached with 1-hour TTL for performance optimization
   */
  async getArtistPerformances(artistId: string, festivalId?: string): Promise<PerformanceDto[]> {
    const cacheKey = festivalId
      ? `artists:${artistId}:performances:festival:${festivalId}`
      : `artists:${artistId}:performances:all`;

    // Try to get from cache
    const cached = await this.cacheService.get<PerformanceDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for artist performances: ${artistId}`);
      return cached;
    }

    this.logger.debug(`Cache miss for artist performances: ${artistId}`);

    const where: Prisma.PerformanceWhereInput = {
      artistId,
    };

    if (festivalId) {
      where.stage = {
        festivalId,
      };
    }

    const performances = await this.prisma.performance.findMany({
      where,
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

    const result = performances.map((perf) => ({
      id: perf.id,
      artist: {
        id: perf.artist.id,
        name: perf.artist.name,
        genre: perf.artist.genre,
        bio: perf.artist.bio,
        imageUrl: perf.artist.imageUrl,
        country: null, // Country field not in schema, kept for API compatibility
      },
      stage: {
        id: perf.stage.id,
        name: perf.stage.name,
        description: perf.stage.description,
        capacity: perf.stage.capacity,
        location: perf.stage.location,
      },
      startTime: perf.startTime.toISOString(),
      endTime: perf.endTime.toISOString(),
      day: this.getDayName(perf.startTime),
      status: perf.isCancelled ? 'CANCELLED' : 'SCHEDULED', // Derived from isCancelled field
    }));

    // Cache the result with 1 hour TTL
    const tags = festivalId
      ? [CacheTag.ARTIST, CacheTag.PROGRAM, CacheTag.FESTIVAL]
      : [CacheTag.ARTIST, CacheTag.PROGRAM];

    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.ARTIST_PERFORMANCES,
      tags,
    });

    this.logger.debug(`Cached artist performances: ${artistId}`);

    return result;
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  /**
   * Search the festival program with multiple filters
   * Supports filtering by query string, genre, date, and stage
   * Returns paginated results
   */
  async searchProgram(
    searchDto: ProgramSearchDto,
    userId?: string
  ): Promise<PaginatedProgramSearchResponse> {
    const { festivalId, q, genre, date, stageId, page, sortBy, sortOrder } = searchDto;
    const skip = searchDto.skip;
    const take = searchDto.take;

    this.logger.debug(
      `Searching program for festival ${festivalId} with filters: q=${q}, genre=${genre}, date=${date}, stageId=${stageId}`
    );

    // Build the where clause with all filters
    const where: Prisma.PerformanceWhereInput = {
      stage: {
        festivalId,
      },
    };

    // Filter by stage if provided
    if (stageId) {
      where.stageId = stageId;
    }

    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Filter by query string (artist name or description) and/or genre
    if (q || genre) {
      where.artist = {};

      if (q) {
        where.artist.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (genre) {
        where.artist.genre = { contains: genre, mode: 'insensitive' };
      }
    }

    // Build orderBy based on sortBy parameter
    let orderBy: Prisma.PerformanceOrderByWithRelationInput[];
    switch (sortBy) {
      case ProgramSortBy.ARTIST_NAME:
        orderBy = [{ artist: { name: sortOrder } }];
        break;
      case ProgramSortBy.STAGE_NAME:
        orderBy = [{ stage: { name: sortOrder } }];
        break;
      case ProgramSortBy.START_TIME:
      default:
        orderBy = [{ startTime: sortOrder }];
        break;
    }

    // Execute count and find queries in parallel for efficiency
    const [total, performances] = await Promise.all([
      this.prisma.performance.count({ where }),
      this.prisma.performance.findMany({
        where,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          description: true,
          isCancelled: true,
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
        orderBy,
        skip,
        take,
      }),
    ]);

    // Get user favorites if userId is provided
    let favoriteArtistIds = new Set<string>();
    if (userId) {
      const favorites = await this.prisma.favoriteArtist.findMany({
        where: {
          userId,
          festivalId,
        },
        select: {
          artistId: true,
        },
      });
      favoriteArtistIds = new Set(favorites.map((f) => f.artistId));
    }

    // Map results to DTOs
    const data: ProgramSearchResultDto[] = performances.map((perf) => ({
      id: perf.id,
      artist: {
        id: perf.artist.id,
        name: perf.artist.name,
        genre: perf.artist.genre,
        imageUrl: perf.artist.imageUrl,
      },
      stage: {
        id: perf.stage.id,
        name: perf.stage.name,
        location: perf.stage.location,
        capacity: perf.stage.capacity,
      },
      startTime: perf.startTime.toISOString(),
      endTime: perf.endTime.toISOString(),
      description: perf.description,
      day: this.getDayName(perf.startTime),
      isCancelled: perf.isCancelled,
      isFavorite: favoriteArtistIds.has(perf.artist.id),
    }));

    const totalPages = Math.ceil(total / take);
    const currentPage = page || 1;

    this.logger.debug(`Found ${total} performances matching search criteria`);

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: take,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };
  }

  // ============================================================================
  // Cache Invalidation Methods
  // ============================================================================

  /**
   * Invalidate all artist-related caches
   * Call this when an artist is created, updated, or deleted
   */
  async invalidateArtistCache(artistId: string): Promise<void> {
    this.logger.log(`Invalidating cache for artist: ${artistId}`);

    // Invalidate individual artist detail cache
    await this.cacheService.delete(`artists:detail:${artistId}`);

    // Invalidate artist performances cache (all festivals)
    await this.cacheService.deletePattern(`artists:${artistId}:performances:*`);

    // Invalidate by tag for broader cleanup
    await this.cacheService.invalidateByTag(CacheTag.ARTIST);

    this.logger.log(`Cache invalidated for artist: ${artistId}`);
  }

  /**
   * Invalidate artist list cache for a specific festival
   * Call this when artists are added/removed from a festival
   */
  async invalidateArtistListCache(festivalId: string): Promise<void> {
    this.logger.log(`Invalidating artist list cache for festival: ${festivalId}`);

    await this.cacheService.delete(`artists:festival:${festivalId}:list`);

    this.logger.log(`Artist list cache invalidated for festival: ${festivalId}`);
  }

  /**
   * Invalidate all program-related caches for a festival
   * Call this when significant program changes occur
   */
  async invalidateProgramCache(festivalId: string): Promise<void> {
    this.logger.log(`Invalidating program cache for festival: ${festivalId}`);

    // Invalidate program schedule
    await this.cacheService.deletePattern(`program:${festivalId}:*`);

    // Invalidate artist list for this festival
    await this.cacheService.delete(`artists:festival:${festivalId}:list`);

    // Invalidate artist performances for this festival
    await this.cacheService.deletePattern(`artists:*:performances:festival:${festivalId}`);

    // Invalidate stages for this festival
    await this.cacheService.delete(`program:${festivalId}:stages`);

    this.logger.log(`Program cache invalidated for festival: ${festivalId}`);
  }

  // ============================================================================
  // Schedule Conflict Detection Methods
  // ============================================================================

  /**
   * Detect schedule conflicts for a performance
   *
   * Checks for:
   * 1. Same artist performing at overlapping times (across any stage)
   * 2. Same stage with overlapping performances
   *
   * @param performance - The performance data to check
   * @param excludePerformanceId - Optional ID to exclude (for updates)
   * @returns ScheduleConflictResult with conflict details
   */
  async detectScheduleConflicts(
    performance: {
      artistId: string;
      stageId: string;
      startTime: Date;
      endTime: Date;
    },
    excludePerformanceId?: string
  ): Promise<ScheduleConflictResult> {
    const { artistId, stageId, startTime, endTime } = performance;
    const conflicts: ScheduleConflict[] = [];

    this.logger.debug(
      `Checking schedule conflicts for artist ${artistId} on stage ${stageId} from ${startTime.toISOString()} to ${endTime.toISOString()}`
    );

    // Build the base exclusion filter
    const excludeFilter = excludePerformanceId ? { NOT: { id: excludePerformanceId } } : {};

    // Check for artist time conflicts (same artist, overlapping time, any stage)
    const artistConflicts = await this.prisma.performance.findMany({
      where: {
        artistId,
        isCancelled: false,
        ...excludeFilter,
        OR: [
          // New performance starts during existing performance
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New performance ends during existing performance
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New performance completely contains existing performance
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      include: {
        stage: true,
        artist: true,
      },
    });

    for (const conflict of artistConflicts) {
      conflicts.push({
        type: 'ARTIST_OVERLAP',
        performanceId: conflict.id,
        stageId: conflict.stageId,
        stageName: conflict.stage.name,
        artistId: conflict.artistId,
        artistName: conflict.artist.name,
        conflictingStartTime: conflict.startTime.toISOString(),
        conflictingEndTime: conflict.endTime.toISOString(),
        message: `Artist "${conflict.artist.name}" already has a performance on "${conflict.stage.name}" from ${this.formatTime(conflict.startTime)} to ${this.formatTime(conflict.endTime)}`,
      });
    }

    // Check for stage time conflicts (same stage, overlapping time, any artist)
    const stageConflicts = await this.prisma.performance.findMany({
      where: {
        stageId,
        isCancelled: false,
        ...excludeFilter,
        OR: [
          // New performance starts during existing performance
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New performance ends during existing performance
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New performance completely contains existing performance
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      include: {
        stage: true,
        artist: true,
      },
    });

    for (const conflict of stageConflicts) {
      // Skip if this is the same conflict we already found (same performance)
      if (conflicts.some((c) => c.performanceId === conflict.id)) {
        continue;
      }

      conflicts.push({
        type: 'STAGE_OVERLAP',
        performanceId: conflict.id,
        stageId: conflict.stageId,
        stageName: conflict.stage.name,
        artistId: conflict.artistId,
        artistName: conflict.artist.name,
        conflictingStartTime: conflict.startTime.toISOString(),
        conflictingEndTime: conflict.endTime.toISOString(),
        message: `Stage "${conflict.stage.name}" already has a performance by "${conflict.artist.name}" from ${this.formatTime(conflict.startTime)} to ${this.formatTime(conflict.endTime)}`,
      });
    }

    const hasConflicts = conflicts.length > 0;

    if (hasConflicts) {
      this.logger.warn(
        `Found ${conflicts.length} schedule conflict(s) for artist ${artistId} on stage ${stageId}`
      );
    } else {
      this.logger.debug('No schedule conflicts detected');
    }

    return {
      hasConflicts,
      conflicts,
    };
  }

  // ============================================================================
  // Performance CRUD Methods with Conflict Detection
  // ============================================================================

  /**
   * Create a new performance with schedule conflict detection
   *
   * @param data - Performance creation data
   * @throws ScheduleConflictException if conflicts are detected
   * @throws StageNotFoundException if stage doesn't exist
   * @throws ArtistNotFoundException if artist doesn't exist
   */
  async createPerformance(data: CreatePerformanceDto): Promise<PerformanceDto> {
    const { artistId, stageId, startTime, endTime, description } = data;

    this.logger.log(`Creating performance for artist ${artistId} on stage ${stageId}`);

    // Verify stage exists and get festival ID
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new StageNotFoundException(stageId);
    }

    // Verify artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new ArtistNotFoundException(artistId);
    }

    // Check for schedule conflicts
    const conflictResult = await this.detectScheduleConflicts({
      artistId,
      stageId,
      startTime,
      endTime,
    });

    if (conflictResult.hasConflicts) {
      throw new ScheduleConflictException(
        conflictResult.conflicts.map((c) => ({
          stageId: c.stageId,
          performanceId: c.performanceId,
          time: `${c.conflictingStartTime} - ${c.conflictingEndTime}`,
        }))
      );
    }

    // Create the performance
    const performance = await this.prisma.performance.create({
      data: {
        artistId,
        stageId,
        startTime,
        endTime,
        description,
      },
      include: {
        artist: true,
        stage: true,
      },
    });

    // Invalidate relevant caches
    await this.invalidateProgramCache(stage.festivalId);

    this.logger.log(`Performance created with ID: ${performance.id}`);

    return {
      id: performance.id,
      artist: {
        id: performance.artist.id,
        name: performance.artist.name,
        genre: performance.artist.genre,
        bio: performance.artist.bio,
        imageUrl: performance.artist.imageUrl,
        country: performance.artist.country,
      },
      stage: {
        id: performance.stage.id,
        name: performance.stage.name,
        description: performance.stage.description,
        capacity: performance.stage.capacity,
        location: performance.stage.location,
      },
      startTime: performance.startTime.toISOString(),
      endTime: performance.endTime.toISOString(),
      day: this.getDayName(performance.startTime),
      status: performance.status,
    };
  }

  /**
   * Update an existing performance with schedule conflict detection
   *
   * @param performanceId - ID of the performance to update
   * @param data - Update data
   * @throws PerformanceNotFoundException if performance doesn't exist
   * @throws ScheduleConflictException if conflicts are detected
   * @throws StageNotFoundException if new stage doesn't exist
   * @throws ArtistNotFoundException if new artist doesn't exist
   */
  async updatePerformance(
    performanceId: string,
    data: UpdatePerformanceDto
  ): Promise<PerformanceDto> {
    this.logger.log(`Updating performance ${performanceId}`);

    // Get existing performance
    const existingPerformance = await this.prisma.performance.findUnique({
      where: { id: performanceId },
      include: {
        stage: true,
        artist: true,
      },
    });

    if (!existingPerformance) {
      throw new PerformanceNotFoundException(performanceId);
    }

    // Determine final values (use existing if not provided)
    const artistId = data.artistId ?? existingPerformance.artistId;
    const stageId = data.stageId ?? existingPerformance.stageId;
    const startTime = data.startTime ?? existingPerformance.startTime;
    const endTime = data.endTime ?? existingPerformance.endTime;

    // Verify new stage exists if changed
    if (data.stageId && data.stageId !== existingPerformance.stageId) {
      const stage = await this.prisma.stage.findUnique({
        where: { id: data.stageId },
      });

      if (!stage) {
        throw new StageNotFoundException(data.stageId);
      }
    }

    // Verify new artist exists if changed
    if (data.artistId && data.artistId !== existingPerformance.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: data.artistId },
      });

      if (!artist) {
        throw new ArtistNotFoundException(data.artistId);
      }
    }

    // Check for schedule conflicts (excluding the current performance)
    const conflictResult = await this.detectScheduleConflicts(
      {
        artistId,
        stageId,
        startTime,
        endTime,
      },
      performanceId
    );

    if (conflictResult.hasConflicts) {
      throw new ScheduleConflictException(
        conflictResult.conflicts.map((c) => ({
          stageId: c.stageId,
          performanceId: c.performanceId,
          time: `${c.conflictingStartTime} - ${c.conflictingEndTime}`,
        }))
      );
    }

    // Update the performance
    const performance = await this.prisma.performance.update({
      where: { id: performanceId },
      data: {
        artistId,
        stageId,
        startTime,
        endTime,
        description: data.description,
      },
      include: {
        artist: true,
        stage: true,
      },
    });

    // Invalidate relevant caches for both old and new festivals if stage changed
    await this.invalidateProgramCache(existingPerformance.stage.festivalId);
    if (data.stageId && data.stageId !== existingPerformance.stageId) {
      const newStage = await this.prisma.stage.findUnique({
        where: { id: data.stageId },
        select: { festivalId: true },
      });
      if (newStage && newStage.festivalId !== existingPerformance.stage.festivalId) {
        await this.invalidateProgramCache(newStage.festivalId);
      }
    }

    this.logger.log(`Performance updated: ${performanceId}`);

    return {
      id: performance.id,
      artist: {
        id: performance.artist.id,
        name: performance.artist.name,
        genre: performance.artist.genre,
        bio: performance.artist.bio,
        imageUrl: performance.artist.imageUrl,
        country: performance.artist.country,
      },
      stage: {
        id: performance.stage.id,
        name: performance.stage.name,
        description: performance.stage.description,
        capacity: performance.stage.capacity,
        location: performance.stage.location,
      },
      startTime: performance.startTime.toISOString(),
      endTime: performance.endTime.toISOString(),
      day: this.getDayName(performance.startTime),
      status: performance.status,
    };
  }

  /**
   * Get a single performance by ID
   */
  async getPerformanceById(performanceId: string): Promise<PerformanceDto> {
    const performance = await this.prisma.performance.findUnique({
      where: { id: performanceId },
      include: {
        artist: true,
        stage: true,
      },
    });

    if (!performance) {
      throw new PerformanceNotFoundException(performanceId);
    }

    return {
      id: performance.id,
      artist: {
        id: performance.artist.id,
        name: performance.artist.name,
        genre: performance.artist.genre,
        bio: performance.artist.bio,
        imageUrl: performance.artist.imageUrl,
        country: performance.artist.country,
      },
      stage: {
        id: performance.stage.id,
        name: performance.stage.name,
        description: performance.stage.description,
        capacity: performance.stage.capacity,
        location: performance.stage.location,
      },
      startTime: performance.startTime.toISOString(),
      endTime: performance.endTime.toISOString(),
      day: this.getDayName(performance.startTime),
      status: performance.status,
    };
  }

  /**
   * Delete a performance
   */
  async deletePerformance(performanceId: string): Promise<void> {
    const performance = await this.prisma.performance.findUnique({
      where: { id: performanceId },
      include: {
        stage: true,
      },
    });

    if (!performance) {
      throw new PerformanceNotFoundException(performanceId);
    }

    await this.prisma.performance.delete({
      where: { id: performanceId },
    });

    // Invalidate relevant caches
    await this.invalidateProgramCache(performance.stage.festivalId);

    this.logger.log(`Performance deleted: ${performanceId}`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private mapToEventDto(perf: any, favoriteArtistIds: Set<string>): ProgramEventDto {
    return {
      id: perf.id,
      artist: {
        id: perf.artist.id,
        name: perf.artist.name,
        genre: perf.artist.genre || 'Unknown',
        image: perf.artist.imageUrl || '',
      },
      stage: {
        id: perf.stage.id,
        name: perf.stage.name,
        location: perf.stage.location || 'TBD',
        capacity: perf.stage.capacity || 0,
      },
      startTime: this.formatTime(perf.startTime),
      endTime: this.formatTime(perf.endTime),
      day: this.getDayName(perf.startTime),
      isFavorite: favoriteArtistIds.has(perf.artist.id),
    };
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getDayName(date: Date): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
  }
}
