/**
 * SyncService
 * Bidirectional sync service between WatermelonDB and backend API
 */

import { Database, Q } from '@nozbe/watermelondb';
import { synchronize, SyncPullArgs, SyncPushArgs, SyncLog } from '@nozbe/watermelondb/sync';

import { getDatabase, TableNames } from '../../database';
import {
  User,
  Festival,
  Ticket,
  Artist,
  Performance,
  CashlessAccount,
  CashlessTransaction,
  Notification,
  SyncMetadata,
  SyncQueueItem,
  STALE_THRESHOLDS,
} from '../../database/models';
import { SyncQueue, syncQueueService } from './SyncQueue';
import { ConflictResolver, conflictResolver } from './ConflictResolver';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/api';

// Sync configuration
export interface SyncConfig {
  apiBaseUrl: string;
  authToken?: string;
  festivalId?: string;
  userId?: string;
  batchSize: number;
  timeout: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  apiBaseUrl: API_BASE_URL,
  batchSize: 100,
  timeout: 30000,
};

// Sync status types
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: Date | null;
  lastError: string | null;
  pendingChanges: number;
  progress: number;
  currentEntity: string | null;
}

// Sync result types
export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  errors: string[];
  timestamp: Date;
}

// Event listeners
type SyncEventListener = (status: SyncStatus) => void;

/**
 * Main sync service class
 */
class SyncService {
  private static instance: SyncService;
  private database: Database;
  private config: SyncConfig;
  private status: SyncStatus;
  private listeners: Set<SyncEventListener> = new Set();
  private syncPromise: Promise<SyncResult> | null = null;
  private abortController: AbortController | null = null;

  private constructor(config: Partial<SyncConfig> = {}) {
    this.database = getDatabase();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      state: 'idle',
      lastSyncAt: null,
      lastError: null,
      pendingChanges: 0,
      progress: 0,
      currentEntity: null,
    };
  }

  static getInstance(config?: Partial<SyncConfig>): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService(config);
    }
    return SyncService.instance;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Set current festival context
   */
  setFestivalId(festivalId: string): void {
    this.config.festivalId = festivalId;
  }

  /**
   * Set current user context
   */
  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Add status change listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[SyncService] Listener error:', error);
      }
    });
  }

  /**
   * Update status and notify
   */
  private updateStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  /**
   * Perform full sync
   */
  async sync(force = false): Promise<SyncResult> {
    // If already syncing, return existing promise
    if (this.syncPromise && !force) {
      console.log('[SyncService] Sync already in progress');
      return this.syncPromise;
    }

    // Cancel any existing sync if forcing
    if (force && this.abortController) {
      this.abortController.abort();
    }

    this.syncPromise = this.performSync();

    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  /**
   * Internal sync implementation
   */
  private async performSync(): Promise<SyncResult> {
    this.abortController = new AbortController();
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      this.updateStatus({ state: 'syncing', progress: 0, lastError: null });

      // First, process offline queue
      this.updateStatus({ currentEntity: 'offline_queue' });
      const queueResult = await syncQueueService.processQueue(this.config.authToken);
      result.pushed += queueResult.processed;
      if (queueResult.errors.length > 0) {
        result.errors.push(...queueResult.errors);
      }

      this.updateStatus({ progress: 10 });

      // Perform WatermelonDB sync
      await synchronize({
        database: this.database,
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          return this.pullChanges(lastPulledAt, schemaVersion);
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          return this.pushChanges(changes, lastPulledAt);
        },
        migrationsEnabledAtVersion: 1,
        log: this.createSyncLog(),
        conflictResolver: (table, local, remote, resolved) => {
          return conflictResolver.resolveWatermelonConflict(table, local, remote);
        },
      });

      result.success = true;
      this.updateStatus({
        state: 'idle',
        lastSyncAt: new Date(),
        progress: 100,
        currentEntity: null,
      });

      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);

      this.updateStatus({
        state: 'error',
        lastError: errorMessage,
        currentEntity: null,
      });

      console.error('[SyncService] Sync failed:', error);
    }

    this.abortController = null;
    return result;
  }

  /**
   * Pull changes from server
   */
  private async pullChanges(
    lastPulledAt: number | null,
    schemaVersion: number
  ): Promise<{ changes: any; timestamp: number }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }

    const params = new URLSearchParams({
      lastPulledAt: String(lastPulledAt || 0),
      schemaVersion: String(schemaVersion),
    });

    if (this.config.festivalId) {
      params.append('festivalId', this.config.festivalId);
    }

    if (this.config.userId) {
      params.append('userId', this.config.userId);
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/sync/pull?${params.toString()}`,
      {
        method: 'GET',
        headers,
        signal: this.abortController?.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Update progress based on entities
    this.updateStatus({ progress: 50 });

    return {
      changes: data.changes,
      timestamp: data.timestamp,
    };
  }

  /**
   * Push changes to server
   */
  private async pushChanges(
    changes: any,
    lastPulledAt: number | null
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(`${this.config.apiBaseUrl}/sync/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        changes,
        lastPulledAt,
        festivalId: this.config.festivalId,
        userId: this.config.userId,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Push failed: ${response.status} ${errorData.message || response.statusText}`
      );
    }

    this.updateStatus({ progress: 90 });
  }

  /**
   * Create sync log for debugging
   */
  private createSyncLog(): SyncLog {
    return {
      // Optional logging functions
    };
  }

  /**
   * Sync specific entity type
   */
  async syncEntity(entityType: string): Promise<SyncResult> {
    console.log(`[SyncService] Syncing entity: ${entityType}`);

    this.updateStatus({ currentEntity: entityType });

    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Get sync metadata for this entity
      const metadata = await this.getOrCreateSyncMetadata(entityType);

      // Pull changes
      const pullResult = await this.pullEntityChanges(entityType, metadata.lastPulledAt);
      result.pulled = pullResult.count;

      // Push local changes
      const pushResult = await this.pushEntityChanges(entityType);
      result.pushed = pushResult.count;

      // Update metadata
      await metadata.recordPull(pullResult.syncToken);
      await metadata.recordPush();

      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error(`[SyncService] Entity sync failed for ${entityType}:`, error);
    }

    this.updateStatus({ currentEntity: null });
    return result;
  }

  /**
   * Pull changes for specific entity
   */
  private async pullEntityChanges(
    entityType: string,
    lastPulledAt?: number
  ): Promise<{ count: number; syncToken?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }

    const params = new URLSearchParams({
      entity: entityType,
      lastPulledAt: String(lastPulledAt || 0),
    });

    if (this.config.festivalId) {
      params.append('festivalId', this.config.festivalId);
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/sync/pull/${entityType}?${params.toString()}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`Pull ${entityType} failed: ${response.status}`);
    }

    const data = await response.json();
    await this.applyPulledChanges(entityType, data.records);

    return {
      count: data.records?.length || 0,
      syncToken: data.syncToken,
    };
  }

  /**
   * Push changes for specific entity
   */
  private async pushEntityChanges(
    entityType: string
  ): Promise<{ count: number }> {
    const collection = this.database.get(entityType);
    const pendingRecords = await collection
      .query(Q.where('needs_push', true))
      .fetch();

    if (pendingRecords.length === 0) {
      return { count: 0 };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }

    const records = pendingRecords.map((record: any) => record.toJSON());

    const response = await fetch(
      `${this.config.apiBaseUrl}/sync/push/${entityType}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ records }),
      }
    );

    if (!response.ok) {
      throw new Error(`Push ${entityType} failed: ${response.status}`);
    }

    // Mark records as synced
    await this.database.write(async () => {
      for (const record of pendingRecords) {
        await record.update((r: any) => {
          r.isSynced = true;
          r.needsPush = false;
          r.lastSyncedAt = Date.now();
        });
      }
    });

    return { count: pendingRecords.length };
  }

  /**
   * Apply pulled changes to local database
   */
  private async applyPulledChanges(
    entityType: string,
    records: any[]
  ): Promise<void> {
    if (!records || records.length === 0) return;

    const collection = this.database.get(entityType);

    await this.database.write(async () => {
      for (const serverRecord of records) {
        // Check if record exists locally
        let localRecord: any = null;
        try {
          localRecord = await collection
            .query(Q.where('server_id', serverRecord.id))
            .fetch();
          localRecord = localRecord[0];
        } catch {
          // Record doesn't exist
        }

        if (localRecord) {
          // Resolve conflict and update
          const resolved = conflictResolver.resolve(
            entityType,
            localRecord,
            serverRecord
          );

          if (resolved.useServer) {
            await localRecord.updateFromServer(serverRecord);
          }
        } else {
          // Create new record
          await collection.create((record: any) => {
            this.mapServerToLocal(record, serverRecord, entityType);
          });
        }
      }
    });
  }

  /**
   * Map server record to local record format
   */
  private mapServerToLocal(
    local: any,
    server: any,
    entityType: string
  ): void {
    local.serverId = server.id;
    local.isSynced = true;
    local.lastSyncedAt = Date.now();
    local.needsPush = false;

    // Copy all other fields based on entity type
    // This is a simplified mapping - extend based on entity
    Object.keys(server).forEach((key) => {
      if (key !== 'id') {
        const localKey = this.camelToSnake(key);
        if (local[localKey] !== undefined) {
          local[localKey] = server[key];
        }
      }
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Get or create sync metadata for entity
   */
  private async getOrCreateSyncMetadata(
    entityType: string
  ): Promise<SyncMetadata> {
    const collection = this.database.get<SyncMetadata>(TableNames.SYNC_METADATA);

    const existing = await collection
      .query(Q.where('entity_type', entityType))
      .fetch();

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new metadata
    return await this.database.write(async () => {
      return await collection.create((metadata) => {
        metadata.entityType = entityType;
        metadata.pendingChangesCount = 0;
        metadata.isInitialSyncComplete = false;
      });
    });
  }

  /**
   * Check if entity needs sync
   */
  async needsSync(entityType: string): Promise<boolean> {
    const metadata = await this.getOrCreateSyncMetadata(entityType);
    const threshold = STALE_THRESHOLDS[entityType] || 60 * 60 * 1000; // Default 1 hour

    return metadata.needsSync || metadata.isStale(threshold);
  }

  /**
   * Get pending changes count
   */
  async getPendingChangesCount(): Promise<number> {
    let count = 0;

    for (const tableName of Object.values(TableNames)) {
      if (tableName === TableNames.SYNC_METADATA || tableName === TableNames.SYNC_QUEUE) {
        continue;
      }

      try {
        const collection = this.database.get(tableName);
        const pending = await collection
          .query(Q.where('needs_push', true))
          .fetchCount();
        count += pending;
      } catch {
        // Table might not have needs_push column
      }
    }

    return count;
  }

  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.updateStatus({ state: 'idle', currentEntity: null });
    }
  }

  /**
   * Reset sync state (for debugging)
   */
  async resetSyncState(): Promise<void> {
    const collection = this.database.get<SyncMetadata>(TableNames.SYNC_METADATA);
    const allMetadata = await collection.query().fetch();

    await this.database.write(async () => {
      for (const metadata of allMetadata) {
        await metadata.resetSync();
      }
    });

    this.updateStatus({
      lastSyncAt: null,
      lastError: null,
      pendingChanges: 0,
    });

    console.log('[SyncService] Sync state reset');
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
export default SyncService;
