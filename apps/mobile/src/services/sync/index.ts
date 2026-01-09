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
} from './SyncService';

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
