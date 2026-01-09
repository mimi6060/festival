/**
 * SyncMetadata Model
 * WatermelonDB model for tracking sync state per entity type
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';

import { TableNames, TableName } from '../schema';

/**
 * SyncMetadata model for tracking sync status of each entity type
 */
export default class SyncMetadata extends Model {
  static table = TableNames.SYNC_METADATA;

  // Entity type (table name)
  @text('entity_type') entityType!: string;

  // Sync timestamps
  @field('last_pulled_at') lastPulledAt?: number;
  @field('last_pushed_at') lastPushedAt?: number;

  // Server sync token for incremental sync
  @text('last_sync_token') lastSyncToken?: string;

  // Pending changes tracking
  @field('pending_changes_count') pendingChangesCount!: number;

  // Initial sync flag
  @field('is_initial_sync_complete') isInitialSyncComplete!: boolean;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /**
   * Last pulled date
   */
  get lastPulledDate(): Date | null {
    return this.lastPulledAt ? new Date(this.lastPulledAt) : null;
  }

  /**
   * Last pushed date
   */
  get lastPushedDate(): Date | null {
    return this.lastPushedAt ? new Date(this.lastPushedAt) : null;
  }

  /**
   * Check if sync is needed
   */
  get needsSync(): boolean {
    return !this.isInitialSyncComplete || this.pendingChangesCount > 0;
  }

  /**
   * Check if has pending changes
   */
  get hasPendingChanges(): boolean {
    return this.pendingChangesCount > 0;
  }

  /**
   * Get time since last pull in milliseconds
   */
  get timeSinceLastPull(): number | null {
    if (!this.lastPulledAt) return null;
    return Date.now() - this.lastPulledAt;
  }

  /**
   * Check if data is stale (older than given threshold)
   */
  isStale(thresholdMs: number): boolean {
    const timeSince = this.timeSinceLastPull;
    if (timeSince === null) return true;
    return timeSince > thresholdMs;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      entityType: this.entityType,
      lastPulledAt: this.lastPulledAt ? new Date(this.lastPulledAt).toISOString() : null,
      lastPushedAt: this.lastPushedAt ? new Date(this.lastPushedAt).toISOString() : null,
      lastSyncToken: this.lastSyncToken,
      pendingChangesCount: this.pendingChangesCount,
      isInitialSyncComplete: this.isInitialSyncComplete,
    };
  }

  /**
   * Update after successful pull
   */
  @writer async recordPull(syncToken?: string): Promise<void> {
    await this.update((metadata) => {
      metadata.lastPulledAt = Date.now();
      if (syncToken) {
        metadata.lastSyncToken = syncToken;
      }
      metadata.isInitialSyncComplete = true;
    });
  }

  /**
   * Update after successful push
   */
  @writer async recordPush(): Promise<void> {
    await this.update((metadata) => {
      metadata.lastPushedAt = Date.now();
      metadata.pendingChangesCount = 0;
    });
  }

  /**
   * Increment pending changes count
   */
  @writer async incrementPendingChanges(): Promise<void> {
    await this.update((metadata) => {
      metadata.pendingChangesCount += 1;
    });
  }

  /**
   * Decrement pending changes count
   */
  @writer async decrementPendingChanges(): Promise<void> {
    await this.update((metadata) => {
      metadata.pendingChangesCount = Math.max(0, metadata.pendingChangesCount - 1);
    });
  }

  /**
   * Reset sync state (for debugging/troubleshooting)
   */
  @writer async resetSync(): Promise<void> {
    await this.update((metadata) => {
      metadata.lastPulledAt = undefined;
      metadata.lastPushedAt = undefined;
      metadata.lastSyncToken = undefined;
      metadata.isInitialSyncComplete = false;
    });
  }
}

/**
 * Default stale thresholds per entity type (in milliseconds)
 */
export const STALE_THRESHOLDS: Record<string, number> = {
  [TableNames.USERS]: 60 * 60 * 1000, // 1 hour
  [TableNames.FESTIVALS]: 6 * 60 * 60 * 1000, // 6 hours
  [TableNames.TICKETS]: 24 * 60 * 60 * 1000, // 24 hours
  [TableNames.ARTISTS]: 6 * 60 * 60 * 1000, // 6 hours
  [TableNames.PERFORMANCES]: 30 * 60 * 1000, // 30 minutes
  [TableNames.CASHLESS_ACCOUNTS]: 5 * 60 * 1000, // 5 minutes
  [TableNames.CASHLESS_TRANSACTIONS]: 5 * 60 * 1000, // 5 minutes
  [TableNames.NOTIFICATIONS]: 5 * 60 * 1000, // 5 minutes
};
