/**
 * useCachedFestival - Festival-specific caching hook
 * Provides access to cached festival data with automatic sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFestivalDataCache,
  type ScheduleData,
  type SyncStatus,
  CacheTTL,
} from '../../services/cache';
import { useAuthStore } from '../../store/authStore';

// Hook options
export interface UseCachedFestivalOptions {
  festivalId: string;
  autoSync?: boolean;
  syncInterval?: number;
}

// Hook result for festival info
export interface UseCachedFestivalResult {
  // Festival schedule
  schedule: ScheduleData | null;
  scheduleLoading: boolean;
  scheduleError: Error | null;
  refreshSchedule: () => Promise<void>;

  // Sync status
  syncStatus: SyncStatus;
  isOnline: boolean;

  // Actions
  invalidateAll: () => Promise<void>;

  // Statistics
  cacheStats: {
    hitRate: number;
    entryCount: number;
    totalSize: number;
  };
}

/**
 * Main festival caching hook
 */
export function useCachedFestival(options: UseCachedFestivalOptions): UseCachedFestivalResult {
  const { festivalId, autoSync = true, syncInterval = CacheTTL.SCHEDULE } = options;

  const user = useAuthStore((state) => state.user);

  // State
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: true,
    lastSyncAt: null,
    pendingUpdates: 0,
    error: null,
  });
  const [cacheStats, setCacheStats] = useState({
    hitRate: 0,
    entryCount: 0,
    totalSize: 0,
  });

  // Refs
  const cacheRef = useRef(getFestivalDataCache());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Initialize cache
  useEffect(() => {
    const initCache = async () => {
      try {
        await cacheRef.current.initialize(festivalId, user?.id);
      } catch (error) {
        console.error('[useCachedFestival] Failed to initialize cache:', error);
      }
    };

    initCache();

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [festivalId, user?.id]);

  // Fetch schedule
  const fetchSchedule = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) {
      return;
    }

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const result = await cacheRef.current.getSchedule(forceRefresh);

      if (!isMountedRef.current) {
        return;
      }

      if (result.data) {
        setSchedule(result.data);
      } else if (result.error) {
        setScheduleError(result.error);
      }

      // Update sync status
      setSyncStatus(cacheRef.current.getSyncStatus());

      // Update cache stats
      const stats = cacheRef.current.getStatistics();
      setCacheStats({
        hitRate: stats.hitRate,
        entryCount: stats.entryCount,
        totalSize: stats.totalSize,
      });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const err = error instanceof Error ? error : new Error('Failed to fetch schedule');
      setScheduleError(err);
    } finally {
      if (isMountedRef.current) {
        setScheduleLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Auto sync
  useEffect(() => {
    if (!autoSync || syncInterval <= 0) {
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      fetchSchedule(true);
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, fetchSchedule]);

  // Refresh schedule
  const refreshSchedule = useCallback(async () => {
    await fetchSchedule(true);
  }, [fetchSchedule]);

  // Invalidate all cached data
  const invalidateAll = useCallback(async () => {
    await cacheRef.current.clearFestivalData();
    setSchedule(null);
    await fetchSchedule(true);
  }, [fetchSchedule]);

  return {
    schedule,
    scheduleLoading,
    scheduleError,
    refreshSchedule,
    syncStatus,
    isOnline: syncStatus.isConnected,
    invalidateAll,
    cacheStats,
  };
}

/**
 * Hook for festival favorites
 */
export function useFestivalFavorites(festivalId: string) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheRef = useRef(getFestivalDataCache());

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const result = await cacheRef.current.getFavorites();
        if (result.data) {
          setFavorites(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, [festivalId]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (eventId: string) => {
    await cacheRef.current.toggleFavorite(eventId);

    setFavorites((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  }, []);

  // Check if event is favorited
  const isFavorite = useCallback((eventId: string) => favorites.includes(eventId), [favorites]);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    count: favorites.length,
  };
}

/**
 * Hook for upcoming performances
 */
export function useUpcomingPerformances(_festivalId: string, limit = 10) {
  const [performances, setPerformances] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef(getFestivalDataCache());

  // Fetch upcoming
  const fetchUpcoming = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheRef.current.getUpcomingPerformances(limit);

      if (result.data) {
        setPerformances(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch upcoming performances');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(fetchUpcoming, 60 * 1000); // Every minute
    return () => clearInterval(interval);
  }, [fetchUpcoming]);

  return {
    performances,
    isLoading,
    error,
    refresh: fetchUpcoming,
  };
}

export default useCachedFestival;
