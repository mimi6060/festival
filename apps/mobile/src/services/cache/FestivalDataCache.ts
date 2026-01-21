/**
 * FestivalDataCache - Specialized caching for festival-related data
 * Manages different TTLs for different data types with smart prefetching
 */

import { CacheManager, getCacheManager, CachePriority } from './CacheManager';
import { StrategyName, executeStrategy, type StrategyResult } from './CacheStrategies';
import { apiService } from '../api';
import type { ProgramEvent, Artist, Stage, Ticket } from '../../types';

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  SCHEDULE: 5 * 60 * 1000, // 5 minutes
  ARTIST_INFO: 60 * 60 * 1000, // 1 hour
  VENUE_STAGE: 24 * 60 * 60 * 1000, // 24 hours
  TICKETS: 30 * 1000, // 30 seconds (real-time sync)
  FESTIVAL_INFO: 6 * 60 * 60 * 1000, // 6 hours
  NOTIFICATIONS: 2 * 60 * 1000, // 2 minutes
  USER_PROFILE: 15 * 60 * 1000, // 15 minutes
} as const;

// Cache key prefixes
export const CacheKeys = {
  SCHEDULE: 'festival:schedule',
  ARTIST: 'festival:artist',
  ARTISTS_LIST: 'festival:artists',
  STAGE: 'festival:stage',
  STAGES_LIST: 'festival:stages',
  TICKETS: 'festival:tickets',
  FESTIVAL: 'festival:info',
  PERFORMANCE: 'festival:performance',
  UPCOMING: 'festival:upcoming',
  FAVORITES: 'festival:favorites',
} as const;

// Cache tags for grouped operations
export const CacheTags = {
  SCHEDULE: 'schedule',
  ARTISTS: 'artists',
  VENUES: 'venues',
  TICKETS: 'tickets',
  USER: 'user',
  FESTIVAL: 'festival',
} as const;

// Festival data types
export interface Festival {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  imageUrl?: string;
  stages: Stage[];
}

export interface ScheduleData {
  events: ProgramEvent[];
  lastUpdated: number;
  festivalId: string;
}

export interface ArtistData {
  artist: Artist;
  performances: ProgramEvent[];
  lastUpdated: number;
}

export interface VenueData {
  stages: Stage[];
  lastUpdated: number;
  festivalId: string;
}

export interface TicketsData {
  tickets: Ticket[];
  lastSynced: number;
  userId: string;
}

// Sync status for real-time data
export interface SyncStatus {
  isConnected: boolean;
  lastSyncAt: number | null;
  pendingUpdates: number;
  error: Error | null;
}

/**
 * FestivalDataCache - Main class for festival data caching
 */
export class FestivalDataCache {
  private cacheManager: CacheManager;
  private festivalId: string | null = null;
  private userId: string | null = null;
  private prefetchQueue = new Set<string>();
  private isPrefetching = false;
  private syncStatus: SyncStatus = {
    isConnected: true,
    lastSyncAt: null,
    pendingUpdates: 0,
    error: null,
  };
  private ticketSyncInterval: NodeJS.Timeout | null = null;
  private scheduleSyncInterval: NodeJS.Timeout | null = null;

  constructor(cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || getCacheManager();
  }

  /**
   * Initialize the cache with festival and user context
   */
  async initialize(festivalId: string, userId?: string): Promise<void> {
    this.festivalId = festivalId;
    this.userId = userId || null;

    // Initialize cache manager
    await this.cacheManager.initialize();

    // Start background sync for tickets
    if (userId) {
      this.startTicketSync();
    }

    // Start schedule refresh
    this.startScheduleSync();
  }

  /**
   * Cleanup and stop sync
   */
  destroy(): void {
    if (this.ticketSyncInterval) {
      clearInterval(this.ticketSyncInterval);
    }
    if (this.scheduleSyncInterval) {
      clearInterval(this.scheduleSyncInterval);
    }
  }

  // Schedule data (5-min TTL)

  /**
   * Get festival schedule
   */
  async getSchedule(forceRefresh = false): Promise<StrategyResult<ScheduleData>> {
    const cacheKey = `${CacheKeys.SCHEDULE}:${this.festivalId}`;

    if (forceRefresh) {
      await this.cacheManager.delete(cacheKey);
    }

    return executeStrategy<ScheduleData>(
      StrategyName.STALE_WHILE_REVALIDATE,
      async () => {
        const response = await apiService.getProgram();
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch schedule');
        }

        return {
          events: response.data,
          lastUpdated: Date.now(),
          festivalId: this.festivalId!,
        };
      },
      {
        cacheKey,
        ttl: CacheTTL.SCHEDULE,
        priority: CachePriority.HIGH,
        tags: [CacheTags.SCHEDULE, CacheTags.FESTIVAL],
        onBackgroundUpdate: () => {
          this.syncStatus.lastSyncAt = Date.now();
        },
      }
    );
  }

  /**
   * Get schedule for a specific day
   */
  async getScheduleByDay(day: string): Promise<StrategyResult<ProgramEvent[]>> {
    const cacheKey = `${CacheKeys.SCHEDULE}:${this.festivalId}:day:${day}`;

    return executeStrategy<ProgramEvent[]>(
      StrategyName.CACHE_FIRST,
      async () => {
        const response = await apiService.getProgramByDay(day);
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch schedule');
        }
        return response.data;
      },
      {
        cacheKey,
        ttl: CacheTTL.SCHEDULE,
        priority: CachePriority.HIGH,
        tags: [CacheTags.SCHEDULE],
      }
    );
  }

  /**
   * Get upcoming performances (prefetched)
   */
  async getUpcomingPerformances(limit = 10): Promise<StrategyResult<ProgramEvent[]>> {
    const cacheKey = `${CacheKeys.UPCOMING}:${this.festivalId}:${limit}`;

    return executeStrategy<ProgramEvent[]>(
      StrategyName.CACHE_FIRST,
      async () => {
        const scheduleResult = await this.getSchedule();
        if (!scheduleResult.data) {
          return [];
        }

        const now = new Date();
        return scheduleResult.data.events
          .filter((event) => new Date(event.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, limit);
      },
      {
        cacheKey,
        ttl: 60 * 1000, // 1 minute (more frequently updated)
        priority: CachePriority.HIGH,
        tags: [CacheTags.SCHEDULE],
      }
    );
  }

  // Artist data (1-hour TTL)

  /**
   * Get all artists
   */
  async getArtists(): Promise<StrategyResult<Artist[]>> {
    const cacheKey = `${CacheKeys.ARTISTS_LIST}:${this.festivalId}`;

    return executeStrategy<Artist[]>(
      StrategyName.CACHE_FIRST,
      async () => {
        const scheduleResult = await this.getSchedule();
        if (!scheduleResult.data) {
          return [];
        }

        // Extract unique artists from schedule
        const artistMap = new Map<string, Artist>();
        for (const event of scheduleResult.data.events) {
          if (event.artist && !artistMap.has(event.artist.id)) {
            artistMap.set(event.artist.id, event.artist);
          }
        }

        return Array.from(artistMap.values());
      },
      {
        cacheKey,
        ttl: CacheTTL.ARTIST_INFO,
        priority: CachePriority.NORMAL,
        tags: [CacheTags.ARTISTS],
      }
    );
  }

  /**
   * Get single artist with performances
   */
  async getArtist(artistId: string): Promise<StrategyResult<ArtistData | null>> {
    const cacheKey = `${CacheKeys.ARTIST}:${artistId}`;

    return executeStrategy<ArtistData | null>(
      StrategyName.CACHE_FIRST,
      async () => {
        const scheduleResult = await this.getSchedule();
        if (!scheduleResult.data) {
          return null;
        }

        // Find artist and their performances
        const artistPerformances = scheduleResult.data.events.filter(
          (event) => event.artist?.id === artistId
        );

        if (artistPerformances.length === 0) {
          return null;
        }

        const firstPerformance = artistPerformances[0];
        if (!firstPerformance) {
          return null;
        }

        return {
          artist: firstPerformance.artist,
          performances: artistPerformances,
          lastUpdated: Date.now(),
        };
      },
      {
        cacheKey,
        ttl: CacheTTL.ARTIST_INFO,
        priority: CachePriority.NORMAL,
        tags: [CacheTags.ARTISTS],
      }
    );
  }

  /**
   * Prefetch artists for better performance
   */
  async prefetchArtists(artistIds: string[]): Promise<void> {
    for (const artistId of artistIds) {
      this.prefetchQueue.add(`${CacheKeys.ARTIST}:${artistId}`);
    }

    await this.processPrefetchQueue();
  }

  // Venue/Stage data (24-hour TTL)

  /**
   * Get all stages/venues
   */
  async getStages(): Promise<StrategyResult<Stage[]>> {
    const cacheKey = `${CacheKeys.STAGES_LIST}:${this.festivalId}`;

    return executeStrategy<Stage[]>(
      StrategyName.CACHE_FIRST,
      async () => {
        const scheduleResult = await this.getSchedule();
        if (!scheduleResult.data) {
          return [];
        }

        // Extract unique stages from schedule
        const stageMap = new Map<string, Stage>();
        for (const event of scheduleResult.data.events) {
          if (event.stage && !stageMap.has(event.stage.id)) {
            stageMap.set(event.stage.id, event.stage);
          }
        }

        return Array.from(stageMap.values());
      },
      {
        cacheKey,
        ttl: CacheTTL.VENUE_STAGE,
        priority: CachePriority.NORMAL,
        tags: [CacheTags.VENUES],
      }
    );
  }

  /**
   * Get single stage with schedule
   */
  async getStage(
    stageId: string
  ): Promise<StrategyResult<{ stage: Stage; events: ProgramEvent[] } | null>> {
    const cacheKey = `${CacheKeys.STAGE}:${stageId}`;

    return executeStrategy<{ stage: Stage; events: ProgramEvent[] } | null>(
      StrategyName.CACHE_FIRST,
      async () => {
        const scheduleResult = await this.getSchedule();
        if (!scheduleResult.data) {
          return null;
        }

        const stageEvents = scheduleResult.data.events.filter(
          (event) => event.stage?.id === stageId
        );

        if (stageEvents.length === 0) {
          return null;
        }

        const firstEvent = stageEvents[0];
        if (!firstEvent) {
          return null;
        }

        return {
          stage: firstEvent.stage,
          events: stageEvents.sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          ),
        };
      },
      {
        cacheKey,
        ttl: CacheTTL.VENUE_STAGE,
        priority: CachePriority.NORMAL,
        tags: [CacheTags.VENUES],
      }
    );
  }

  // Ticket data (real-time sync)

  /**
   * Get user tickets with real-time sync
   */
  async getTickets(forceRefresh = false): Promise<StrategyResult<TicketsData>> {
    if (!this.userId) {
      return {
        data: null,
        source: 'cache',
        isStale: false,
        error: new Error('User not authenticated'),
        fromCache: false,
      };
    }

    const cacheKey = `${CacheKeys.TICKETS}:${this.userId}`;

    if (forceRefresh) {
      await this.cacheManager.delete(cacheKey);
    }

    return executeStrategy<TicketsData>(
      StrategyName.NETWORK_FIRST, // Always try network first for tickets
      async () => {
        const response = await apiService.getTickets();
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch tickets');
        }

        return {
          tickets: response.data,
          lastSynced: Date.now(),
          userId: this.userId!,
        };
      },
      {
        cacheKey,
        ttl: CacheTTL.TICKETS,
        priority: CachePriority.CRITICAL,
        tags: [CacheTags.TICKETS, CacheTags.USER],
        onNetworkError: (error) => {
          this.syncStatus.error = error;
        },
      }
    );
  }

  /**
   * Get single ticket
   */
  async getTicket(ticketId: string): Promise<StrategyResult<Ticket | null>> {
    const cacheKey = `${CacheKeys.TICKETS}:ticket:${ticketId}`;

    return executeStrategy<Ticket | null>(
      StrategyName.NETWORK_FIRST,
      async () => {
        const response = await apiService.getTicketById(ticketId);
        if (!response.success || !response.data) {
          return null;
        }
        return response.data;
      },
      {
        cacheKey,
        ttl: CacheTTL.TICKETS,
        priority: CachePriority.CRITICAL,
        tags: [CacheTags.TICKETS],
      }
    );
  }

  // Favorites management

  /**
   * Get user favorites
   */
  async getFavorites(): Promise<StrategyResult<string[]>> {
    const cacheKey = `${CacheKeys.FAVORITES}:${this.userId}`;

    return executeStrategy<string[]>(
      StrategyName.CACHE_FIRST,
      async () => {
        // Favorites are stored locally only
        return [];
      },
      {
        cacheKey,
        ttl: CacheTTL.VENUE_STAGE, // Long TTL for local data
        priority: CachePriority.HIGH,
        tags: [CacheTags.USER],
      }
    );
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(eventId: string): Promise<void> {
    const cacheKey = `${CacheKeys.FAVORITES}:${this.userId}`;
    const favoritesResult = await this.getFavorites();
    const favorites = favoritesResult.data || [];

    const newFavorites = favorites.includes(eventId)
      ? favorites.filter((id) => id !== eventId)
      : [...favorites, eventId];

    await this.cacheManager.set(cacheKey, newFavorites, {
      ttl: CacheTTL.VENUE_STAGE,
      priority: CachePriority.HIGH,
      tags: [CacheTags.USER],
    });
  }

  // Prefetch and sync management

  /**
   * Prefetch upcoming performances
   */
  async prefetchUpcoming(): Promise<void> {
    const upcomingResult = await this.getUpcomingPerformances(20);
    if (!upcomingResult.data) {
      return;
    }

    // Prefetch artists from upcoming performances
    const artistIds = upcomingResult.data
      .map((event) => event.artist?.id)
      .filter((id): id is string => !!id);

    const uniqueArtistIds = Array.from(new Set(artistIds));
    await this.prefetchArtists(uniqueArtistIds);
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.isPrefetching || this.prefetchQueue.size === 0) {
      return;
    }

    this.isPrefetching = true;

    try {
      const keysToProcess = Array.from(this.prefetchQueue).slice(0, 5); // Process 5 at a time

      for (const key of keysToProcess) {
        this.prefetchQueue.delete(key);

        // Check if already cached
        if (this.cacheManager.has(key)) {
          continue;
        }

        // Determine type and fetch
        if (key.startsWith(CacheKeys.ARTIST)) {
          const artistId = key.split(':').pop();
          if (artistId) {
            await this.getArtist(artistId);
          }
        }
      }
    } finally {
      this.isPrefetching = false;

      // Continue processing if there are more items
      if (this.prefetchQueue.size > 0) {
        setTimeout(() => this.processPrefetchQueue(), 100);
      }
    }
  }

  /**
   * Start ticket sync interval
   */
  private startTicketSync(): void {
    this.ticketSyncInterval = setInterval(async () => {
      if (this.syncStatus.isConnected) {
        await this.getTickets(true);
      }
    }, CacheTTL.TICKETS);
  }

  /**
   * Start schedule sync interval
   */
  private startScheduleSync(): void {
    this.scheduleSyncInterval = setInterval(async () => {
      if (this.syncStatus.isConnected) {
        await this.getSchedule(true);
      }
    }, CacheTTL.SCHEDULE);
  }

  /**
   * Update connection status
   */
  setConnectionStatus(isConnected: boolean): void {
    this.syncStatus.isConnected = isConnected;
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Cache management

  /**
   * Clear all festival data
   */
  async clearFestivalData(): Promise<void> {
    await this.cacheManager.deleteByTag(CacheTags.FESTIVAL);
    await this.cacheManager.deleteByTag(CacheTags.SCHEDULE);
    await this.cacheManager.deleteByTag(CacheTags.ARTISTS);
    await this.cacheManager.deleteByTag(CacheTags.VENUES);
  }

  /**
   * Clear user-specific data
   */
  async clearUserData(): Promise<void> {
    await this.cacheManager.deleteByTag(CacheTags.USER);
    await this.cacheManager.deleteByTag(CacheTags.TICKETS);
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    return this.cacheManager.getStatistics();
  }

  /**
   * Invalidate schedule cache (call when schedule updates)
   */
  async invalidateSchedule(): Promise<void> {
    await this.cacheManager.deleteByTag(CacheTags.SCHEDULE);
  }

  /**
   * Invalidate artist cache
   */
  async invalidateArtist(artistId: string): Promise<void> {
    await this.cacheManager.delete(`${CacheKeys.ARTIST}:${artistId}`);
  }
}

// Singleton instance
let festivalDataCacheInstance: FestivalDataCache | null = null;

export function getFestivalDataCache(): FestivalDataCache {
  if (!festivalDataCacheInstance) {
    festivalDataCacheInstance = new FestivalDataCache();
  }
  return festivalDataCacheInstance;
}

export function resetFestivalDataCache(): void {
  if (festivalDataCacheInstance) {
    festivalDataCacheInstance.destroy();
    festivalDataCacheInstance = null;
  }
}

export default FestivalDataCache;
