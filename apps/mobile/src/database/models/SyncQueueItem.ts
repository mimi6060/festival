/**
 * SyncQueueItem Model
 * WatermelonDB model for tracking pending mutations to be synced
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';

import { TableNames } from '../schema';

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete';

// Sync priority levels
export type SyncPriority = 'high' | 'normal' | 'low';

// Sync status
export type SyncItemStatus = 'pending' | 'processing' | 'failed' | 'completed';

/**
 * SyncQueueItem model for tracking offline mutations
 */
export default class SyncQueueItem extends Model {
  static table = TableNames.SYNC_QUEUE;

  // Entity reference
  @text('entity_type') entityType!: string;
  @text('entity_id') entityId!: string;

  // Operation details
  @text('operation') operation!: SyncOperation;
  @text('payload') payload!: string; // JSON string of changes

  // Timing
  @field('created_at') queuedAt!: number;

  // Retry tracking
  @field('retry_count') retryCount!: number;
  @text('last_error') lastError?: string;

  // Priority and status
  @text('priority') priority!: SyncPriority;
  @text('status') status!: SyncItemStatus;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /**
   * Parse payload JSON
   */
  get parsedPayload(): Record<string, unknown> | null {
    if (!this.payload) {return null;}
    try {
      return JSON.parse(this.payload);
    } catch {
      return null;
    }
  }

  /**
   * Queued date
   */
  get queuedDate(): Date {
    return new Date(this.queuedAt);
  }

  /**
   * Time in queue (milliseconds)
   */
  get timeInQueue(): number {
    return Date.now() - this.queuedAt;
  }

  /**
   * Check if can retry
   */
  get canRetry(): boolean {
    return this.status === 'failed' && this.retryCount < MAX_RETRY_COUNT;
  }

  /**
   * Check if is pending
   */
  get isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if is processing
   */
  get isProcessing(): boolean {
    return this.status === 'processing';
  }

  /**
   * Check if has failed
   */
  get hasFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Check if exceeded max retries
   */
  get exceededMaxRetries(): boolean {
    return this.retryCount >= MAX_RETRY_COUNT;
  }

  /**
   * Get priority weight for sorting
   */
  get priorityWeight(): number {
    const weights: Record<SyncPriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };
    return weights[this.priority];
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      entityType: this.entityType,
      entityId: this.entityId,
      operation: this.operation,
      payload: this.parsedPayload,
      queuedAt: this.queuedDate.toISOString(),
      retryCount: this.retryCount,
      lastError: this.lastError,
      priority: this.priority,
      status: this.status,
    };
  }

  /**
   * Mark as processing
   */
  @writer async markProcessing(): Promise<void> {
    await this.update((item) => {
      item.status = 'processing';
    });
  }

  /**
   * Mark as completed
   */
  @writer async markCompleted(): Promise<void> {
    await this.update((item) => {
      item.status = 'completed';
    });
  }

  /**
   * Mark as failed with error
   */
  @writer async markFailed(error: string): Promise<void> {
    await this.update((item) => {
      item.status = 'failed';
      item.lastError = error;
      item.retryCount += 1;
    });
  }

  /**
   * Reset for retry
   */
  @writer async resetForRetry(): Promise<void> {
    await this.update((item) => {
      item.status = 'pending';
    });
  }

  /**
   * Update payload
   */
  @writer async updatePayload(newPayload: Record<string, unknown>): Promise<void> {
    await this.update((item) => {
      item.payload = JSON.stringify(newPayload);
    });
  }
}

// Maximum retry count before giving up
export const MAX_RETRY_COUNT = 5;

// Priority configuration for different operations
export const OPERATION_PRIORITIES: Record<string, Record<SyncOperation, SyncPriority>> = {
  // Cashless operations are high priority
  [TableNames.CASHLESS_TRANSACTIONS]: {
    create: 'high',
    update: 'high',
    delete: 'high',
  },
  [TableNames.CASHLESS_ACCOUNTS]: {
    create: 'normal',
    update: 'high',
    delete: 'normal',
  },
  // Ticket operations are high priority
  [TableNames.TICKETS]: {
    create: 'high',
    update: 'high',
    delete: 'normal',
  },
  // User operations are normal priority
  [TableNames.USERS]: {
    create: 'normal',
    update: 'normal',
    delete: 'low',
  },
  // Notifications are low priority
  [TableNames.NOTIFICATIONS]: {
    create: 'low',
    update: 'low',
    delete: 'low',
  },
  // Default
  default: {
    create: 'normal',
    update: 'normal',
    delete: 'low',
  },
};

/**
 * Get priority for an operation
 */
export function getOperationPriority(
  entityType: string,
  operation: SyncOperation
): SyncPriority {
  const priorities = OPERATION_PRIORITIES[entityType] || OPERATION_PRIORITIES.default;
  return priorities[operation];
}

/**
 * Create sync queue item data
 */
export function createSyncQueueItemData(params: {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  priority?: SyncPriority;
}): Record<string, unknown> {
  return {
    entity_type: params.entityType,
    entity_id: params.entityId,
    operation: params.operation,
    payload: JSON.stringify(params.payload),
    created_at: Date.now(),
    retry_count: 0,
    priority: params.priority || getOperationPriority(params.entityType, params.operation),
    status: 'pending' as SyncItemStatus,
  };
}
