// Translation hooks
export { useTranslation, getCurrentLanguage, translate, setLanguage } from './useTranslation';
export type { UseTranslationReturn, TranslationKey, TranslationKeys } from './useTranslation';

// Formatting hooks (locale-aware)
export {
  useFormatDate,
  type UseFormatDateReturn,
  type DateFormatterOptions,
  type DateFormatStyle,
  type TimeFormatStyle,
} from './useFormatDate';

export {
  useFormatNumber,
  type UseFormatNumberReturn,
  type NumberFormatterOptions,
  type CompactDisplay,
  type PercentFormatterOptions,
} from './useFormatNumber';

export {
  useFormatCurrency,
  type UseFormatCurrencyReturn,
  type CurrencyFormatterOptions,
  type CurrencyDisplay,
  type CurrencySign,
  type CurrencyConfig,
} from './useFormatCurrency';

export {
  useRelativeTime,
  useLiveRelativeTime,
  useLiveCountdown,
  type UseRelativeTimeReturn,
  type CountdownResult,
  type RelativeTimeOptions,
  type RelativeTimeUnit,
  type RelativeTimeNumeric,
  type RelativeTimeStyle,
} from './useRelativeTime';

// Offline & Location
export { useOffline } from './useOffline';
export { useOfflineStatus } from './useOfflineStatus';
export type { OfflineStatusResult } from './useOfflineStatus';
export { useOfflineMap } from './useOfflineMap';
export { useIndoorLocation } from './useIndoorLocation';

// Sync Progress
export { useSyncProgress } from './useSyncProgress';
export type { SyncProgressResult } from './useSyncProgress';

// Pending Mutations
export { usePendingMutations } from './usePendingMutations';
export type { PendingMutationsResult } from './usePendingMutations';

// NFC
export { useNFC } from './useNFC';
export { useNFCRead } from './useNFCRead';
export { useNFCWrite } from './useNFCWrite';

// Wallet
export { useWallet } from './useWallet';

// WatermelonDB Database
export {
  useDatabase,
  useCollection,
  useDatabaseWrite,
  useCreate,
  useUpdate,
  useDelete,
  useFindById,
  useFindByServerId,
  useBatchOperations,
  useDatabaseStats,
  usePendingSyncCount,
} from './useDatabase';

// Sync
export { useSync, useEntitySyncStatus, useSyncQueueStatus } from './useSync';
export type { SyncOptions, UseSyncResult } from './useSync';

// Offline-First Data
export {
  useOfflineFirst,
  useOfflineFirstRecord,
  useTickets,
  useArtists,
  usePerformances,
  useCashlessAccount,
  useCashlessTransactions,
  useNotifications,
} from './useOfflineFirst';
export type { UseOfflineFirstOptions, UseOfflineFirstResult } from './useOfflineFirst';

// Cache Hooks
export {
  useCachedData,
  useCacheStats,
  useCacheClear,
  useCachedFestival,
  useFestivalFavorites,
  useUpcomingPerformances,
  useCachedArtists,
  useCachedArtist,
  useArtistsByGenre,
  useArtistSearch,
  useCachedSchedule,
  useScheduleByDay,
  useScheduleByStage,
  useCurrentlyPlaying,
  useSmartScheduleRefresh,
} from './cache';
export type {
  UseCachedDataOptions,
  UseCachedDataResult,
  UseCachedFestivalOptions,
  UseCachedFestivalResult,
  UseCachedArtistsOptions,
  UseCachedArtistsResult,
  UseCachedArtistOptions,
  UseCachedArtistResult,
  UseCachedScheduleOptions,
  UseCachedScheduleResult,
  ScheduleFilters,
  GroupedSchedule,
} from './cache';
