/**
 * Sync Services Index
 * Exports all sync-related services
 */

// Main sync service
export { default as SyncService, syncService } from './SyncService';
export type {
  SyncConfig,
  SyncState,
  SyncStatus,
  SyncResult,
  EntitySyncStatus,
} from './SyncService';
export { SyncPriority } from './SyncService';

// Sync queue service
export { SyncQueue, syncQueueService } from './SyncQueue';
export type {
  QueueConfig,
  QueueResult,
  QueueEvent,
} from './SyncQueue';

// Conflict resolver
export { ConflictResolver, conflictResolver } from './ConflictResolver';
export type {
  ConflictStrategy,
  ConflictResult,
  ConflictDetail,
  PendingConflict,
  MergeRule,
  EntityConflictConfig,
} from './ConflictResolver';

// Sync manager
export { SyncManager, syncManager } from './SyncManager';
export type {
  BatchConfig,
  SyncProgress,
  SyncProgressError,
  SyncPhase,
  SyncTask,
  SyncManagerEvent,
} from './SyncManager';
export { SyncPriorityLevel } from './SyncManager';

// Offline mutation handler
export { OfflineMutationHandler, offlineMutationHandler } from './OfflineMutationHandler';
export type {
  Mutation,
  MutationType,
  MutationStatus,
  MutationResult,
  ReplayResult,
  MutationEvent,
  OfflineMutationConfig,
} from './OfflineMutationHandler';

// Background sync service
export { default as BackgroundSyncService, backgroundSyncService } from './BackgroundSyncService';
export type {
  BackgroundSyncConfig,
  BackgroundSyncResult,
  BackgroundSyncEvent,
} from './BackgroundSyncService';

// Ticket cache service
export { default as TicketCacheService, ticketCacheService } from './TicketCacheService';
export type {
  CachedTicketData,
  TicketCacheStatus,
} from './TicketCacheService';
