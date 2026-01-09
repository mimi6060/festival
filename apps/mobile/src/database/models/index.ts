/**
 * Database Models Index
 * Exports all WatermelonDB models
 */

// Core models
export { default as User } from './User';
export type { UserRole, UserStatus } from './User';

export { default as Festival } from './Festival';
export type { FestivalStatus } from './Festival';

export { default as Ticket } from './Ticket';
export type { TicketStatus, TicketType } from './Ticket';

export { default as Artist } from './Artist';

export { default as Performance } from './Performance';

export { default as CashlessAccount } from './CashlessAccount';

export { default as CashlessTransaction, createOfflineTransactionData } from './CashlessTransaction';
export type { TransactionType } from './CashlessTransaction';

export { default as Notification } from './Notification';
export type { NotificationType } from './Notification';

// Sync models
export { default as SyncMetadata, STALE_THRESHOLDS } from './SyncMetadata';

export {
  default as SyncQueueItem,
  MAX_RETRY_COUNT,
  OPERATION_PRIORITIES,
  getOperationPriority,
  createSyncQueueItemData,
} from './SyncQueueItem';
export type { SyncOperation, SyncPriority, SyncItemStatus } from './SyncQueueItem';
