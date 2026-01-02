/**
 * Offline Services Index
 * Export all offline-related services
 */

export { default as OfflineManager, offlineManager } from './OfflineManager';
export type {
  CacheKey,
  CachedItem,
  SyncStatus,
  SyncError,
  OfflineManagerConfig,
} from './OfflineManager';
export { CACHE_KEYS, CACHE_EXPIRY } from './OfflineManager';

export { default as SyncQueue, syncQueue } from './SyncQueue';
export type {
  SyncQueueItem,
  SyncPriority,
  SyncStatus as QueueItemStatus,
  QueueMetadata,
} from './SyncQueue';

export { default as ConflictResolver } from './ConflictResolver';
export type {
  ConflictStrategy,
  ConflictResult,
  ConflictField,
  MergeRule,
  PendingConflict,
} from './ConflictResolver';

export { default as NetworkDetector, networkDetector } from './NetworkDetector';
export type {
  NetworkStatus,
  ConnectionQuality,
  ConnectionMetrics,
} from './NetworkDetector';
