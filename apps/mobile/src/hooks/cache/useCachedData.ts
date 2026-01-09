/**
 * useCachedData - Generic cached data hook
 * Provides a flexible way to fetch and cache any data with various strategies
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCacheManager,
  CachePriority,
  StrategyName,
  executeStrategy,
  type StrategyResult,
  type CacheStatistics,
} from '../../services/cache';

// Hook options
export interface UseCachedDataOptions<T> {
  // Cache key (required)
  cacheKey: string;
  // Fetch function to get fresh data
  fetchFn: () => Promise<T>;
  // Caching strategy
  strategy?: StrategyName;
  // Time to live in milliseconds
  ttl?: number;
  // Cache priority
  priority?: CachePriority;
  // Tags for grouped cache operations
  tags?: string[];
  // Whether to fetch on mount
  fetchOnMount?: boolean;
  // Polling interval in milliseconds (0 = disabled)
  pollingInterval?: number;
  // Whether to refetch when app comes to foreground
  refetchOnFocus?: boolean;
  // Transform function for fetched data
  transform?: (data: T) => T;
  // Callback on successful fetch
  onSuccess?: (data: T) => void;
  // Callback on error
  onError?: (error: Error) => void;
  // Callback when data becomes stale
  onStale?: () => void;
  // Skip fetching (useful for conditional fetching)
  skip?: boolean;
}

// Hook result
export interface UseCachedDataResult<T> {
  // The cached/fetched data
  data: T | null;
  // Loading state (first load)
  isLoading: boolean;
  // Refreshing state (subsequent fetches)
  isRefreshing: boolean;
  // Whether data is from cache
  fromCache: boolean;
  // Whether data is stale
  isStale: boolean;
  // Error state
  error: Error | null;
  // Data source
  source: 'cache' | 'network' | 'stale' | null;
  // Last updated timestamp
  lastUpdatedAt: number | null;
  // Manually refresh data
  refresh: () => Promise<void>;
  // Invalidate cache
  invalidate: () => Promise<void>;
  // Update cache manually
  setData: (data: T) => Promise<void>;
}

/**
 * Generic cached data hook
 */
export function useCachedData<T>(
  options: UseCachedDataOptions<T>
): UseCachedDataResult<T> {
  const {
    cacheKey,
    fetchFn,
    strategy = StrategyName.STALE_WHILE_REVALIDATE,
    ttl = 5 * 60 * 1000, // 5 minutes default
    priority = CachePriority.NORMAL,
    tags = [],
    fetchOnMount = true,
    pollingInterval = 0,
    // refetchOnFocus = false, // Reserved for future use
    transform,
    onSuccess,
    onError,
    onStale,
    skip = false,
  } = options;

  // State
  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'cache' | 'network' | 'stale' | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  // Refs
  const isMountedRef = useRef(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstFetchRef = useRef(true);

  // Get cache manager
  const cacheManager = getCacheManager();

  // Fetch data
  const fetchData = useCallback(async (isRefresh: boolean = false): Promise<void> => {
    if (skip) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else if (isFirstFetchRef.current) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const result: StrategyResult<T> = await executeStrategy<T>(
        strategy,
        async () => {
          const freshData = await fetchFn();
          return transform ? transform(freshData) : freshData;
        },
        {
          cacheKey,
          ttl,
          priority,
          tags,
          onCacheHit: () => {
            if (isMountedRef.current) {
              setFromCache(true);
            }
          },
          onCacheMiss: () => {
            if (isMountedRef.current) {
              setFromCache(false);
            }
          },
          onBackgroundUpdate: (updatedData) => {
            if (isMountedRef.current) {
              setDataState(updatedData as T);
              setLastUpdatedAt(Date.now());
              onSuccess?.(updatedData as T);
            }
          },
          onNetworkError: (err) => {
            if (isMountedRef.current) {
              setError(err);
              onError?.(err);
            }
          },
        }
      );

      if (!isMountedRef.current) return;

      if (result.data !== null) {
        setDataState(result.data);
        setSource(result.source);
        setFromCache(result.fromCache);
        setIsStale(result.isStale);
        setLastUpdatedAt(Date.now());

        if (result.isStale) {
          onStale?.();
        }

        onSuccess?.(result.data);
      } else if (result.error) {
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const fetchError = err instanceof Error ? err : new Error('Failed to fetch data');
      setError(fetchError);
      onError?.(fetchError);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        isFirstFetchRef.current = false;
      }
    }
  }, [
    skip,
    strategy,
    fetchFn,
    transform,
    cacheKey,
    ttl,
    priority,
    tags,
    onSuccess,
    onError,
    onStale,
  ]);

  // Refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(async (): Promise<void> => {
    await cacheManager.delete(cacheKey);
    setDataState(null);
    setSource(null);
    setFromCache(false);
    setIsStale(false);
    setLastUpdatedAt(null);
  }, [cacheManager, cacheKey]);

  // Manually set data
  const setData = useCallback(async (newData: T): Promise<void> => {
    await cacheManager.set(cacheKey, newData, { ttl, priority, tags });
    setDataState(newData);
    setSource('cache');
    setFromCache(true);
    setIsStale(false);
    setLastUpdatedAt(Date.now());
  }, [cacheManager, cacheKey, ttl, priority, tags]);

  // Initial fetch
  useEffect(() => {
    if (fetchOnMount && !skip) {
      fetchData();
    }
  }, [fetchOnMount, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (pollingInterval > 0 && !skip) {
      pollingRef.current = setInterval(() => {
        fetchData(true);
      }, pollingInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollingInterval, skip, fetchData]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    fromCache,
    isStale,
    error,
    source,
    lastUpdatedAt,
    refresh,
    invalidate,
    setData,
  };
}

/**
 * Hook to get cache statistics
 */
export function useCacheStats(): CacheStatistics {
  const [stats, setStats] = useState<CacheStatistics>(() =>
    getCacheManager().getStatistics()
  );

  useEffect(() => {
    const cacheManager = getCacheManager();

    // Subscribe to cache events
    const unsubscribe = cacheManager.subscribe(() => {
      setStats(cacheManager.getStatistics());
    });

    return unsubscribe;
  }, []);

  return stats;
}

/**
 * Hook to clear cache
 */
export function useCacheClear(): {
  clearAll: () => Promise<void>;
  clearByTag: (tag: string) => Promise<number>;
  clearByKey: (key: string) => Promise<boolean>;
} {
  const cacheManager = getCacheManager();

  const clearAll = useCallback(async () => {
    await cacheManager.clear();
  }, [cacheManager]);

  const clearByTag = useCallback(async (tag: string) => {
    return cacheManager.deleteByTag(tag);
  }, [cacheManager]);

  const clearByKey = useCallback(async (key: string) => {
    return cacheManager.delete(key);
  }, [cacheManager]);

  return { clearAll, clearByTag, clearByKey };
}

export default useCachedData;
