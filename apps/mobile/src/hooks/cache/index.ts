/**
 * Cache Hooks Index
 * Exports all cache-related React hooks
 */

// Generic cached data hook
export {
  useCachedData,
  useCacheStats,
  useCacheClear,
  type UseCachedDataOptions,
  type UseCachedDataResult,
} from './useCachedData';

// Festival-specific caching hooks
export {
  useCachedFestival,
  useFestivalFavorites,
  useUpcomingPerformances,
  type UseCachedFestivalOptions,
  type UseCachedFestivalResult,
} from './useCachedFestival';

// Artists caching hooks
export {
  useCachedArtists,
  useCachedArtist,
  useArtistsByGenre,
  useArtistSearch,
  type UseCachedArtistsOptions,
  type UseCachedArtistsResult,
  type UseCachedArtistOptions,
  type UseCachedArtistResult,
} from './useCachedArtists';

// Schedule caching hooks
export {
  useCachedSchedule,
  useScheduleByDay,
  useScheduleByStage,
  useCurrentlyPlaying,
  useSmartScheduleRefresh,
  type UseCachedScheduleOptions,
  type UseCachedScheduleResult,
  type ScheduleFilters,
  type GroupedSchedule,
} from './useCachedSchedule';
