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
        include: {
          artist: true,
          stage: true,
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
        include: {
          artist: true,
          stage: true,
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
      country: artist.country,
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
      country: artist.country,
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
      include: {
        artist: true,
        stage: true,
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
        country: perf.artist.country,
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
      status: perf.status,
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
