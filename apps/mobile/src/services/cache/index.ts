/**
 * Cache Services Index
 * Exports all cache-related services and utilities
 */

// CacheManager - Core LRU cache with TTL and priority eviction
export {
  CacheManager,
  getCacheManager,
  resetCacheManager,
  CachePriority,
  type CacheEntry,
  type CacheConfig,
  type CacheStatistics,
  type CacheEvent,
  type EvictionReason,
} from './CacheManager';

// CacheStrategies - Different caching strategies
export {
  CacheFirstStrategy,
  NetworkFirstStrategy,
  StaleWhileRevalidateStrategy,
  NetworkOnlyStrategy,
  CacheOnlyStrategy,
  StrategyFactory,
  StrategyName,
  executeStrategy,
  cachedFetch,
  getStrategyFactory,
  type FetchFunction,
  type StrategyOptions,
  type StrategyResult,
  type CacheStrategy,
  type StrategyFactoryConfig,
} from './CacheStrategies';

// FestivalDataCache - Specialized festival data caching
export {
  FestivalDataCache,
  getFestivalDataCache,
  resetFestivalDataCache,
  CacheTTL,
  CacheKeys,
  CacheTags,
  type Festival,
  type ScheduleData,
  type ArtistData,
  type VenueData,
  type TicketsData,
  type SyncStatus,
} from './FestivalDataCache';

// ImageCache - Disk-based image caching
export {
  ImageCache,
  getImageCache,
  resetImageCache,
  getCachedImageUri,
  prefetchImages,
  type ImageCacheConfig,
  type ImageMetadata,
  type PrefetchResult,
  type ImageCacheStats,
} from './ImageCache';
