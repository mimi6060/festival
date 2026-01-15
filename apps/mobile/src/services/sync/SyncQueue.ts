/**
 * SyncQueue Service
 * Manages offline mutations queue for eventual sync
 */

import { Database, Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';

import { getDatabase, TableNames } from '../../database';
import {
  SyncQueueItem,
  SyncOperation,
  SyncPriority,
  SyncItemStatus,
  MAX_RETRY_COUNT,
  getOperationPriority,
  createSyncQueueItemData,
} from '../../database/models';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/api';

// Queue processing configuration
export interface QueueConfig {
  batchSize: number;
  retryDelay: number; // milliseconds
  maxConcurrent: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 10,
  retryDelay: 5000,
  maxConcurrent: 3,
};

// Queue result types
export interface QueueResult {
  processed: number;
  failed: number;
  errors: string[];
}

// Event listeners
type QueueEventListener = (event: QueueEvent) => void;

export interface QueueEvent {
  type: 'added' | 'processing' | 'completed' | 'failed' | 'cleared';
  itemId?: string;
  entityType?: string;
  error?: string;
}

/**
 * Sync Queue Service
 */
class SyncQueue {
  private static instance: SyncQueue;
  private database: Database;
  private config: QueueConfig;
  private listeners = new Set<QueueEventListener>();
  private isProcessing = false;

  private constructor(config: Partial<QueueConfig> = {}) {
    this.database = getDatabase();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<QueueConfig>): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue(config);
    }
    return SyncQueue.instance;
  }

  /**
   * Add item to sync queue
   */
  async add(params: {
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
    priority?: SyncPriority;
  }): Promise<string> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    // Check for existing item for same entity
    const existing = await collection
      .query(
        Q.where('entity_type', params.entityType),
        Q.where('entity_id', params.entityId),
        Q.where('status', Q.oneOf(['pending', 'failed']))
      )
      .fetch();

    let itemId: string;

    await this.database.write(async () => {
      if (existing.length > 0) {
        // Update existing item with new payload
        const item = existing[0];
        await item.updatePayload(params.payload);
        itemId = item.id;
      } else {
        // Create new item
        const item = await collection.create((record) => {
          const data = createSyncQueueItemData(params);
          Object.assign(record, data);
        });
        itemId = item.id;
      }
    });

    this.emit({
      type: 'added',
      itemId: itemId!,
      entityType: params.entityType,
    });

    return itemId!;
  }

  /**
   * Get all pending items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    return await collection
      .query(
        Q.where('status', Q.oneOf(['pending', 'failed'])),
        Q.where('retry_count', Q.lt(MAX_RETRY_COUNT)),
        Q.sortBy('priority', Q.asc),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  /**
   * Get queue length
   */
  async getLength(): Promise<number> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    return await collection
      .query(Q.where('status', Q.oneOf(['pending', 'failed'])))
      .fetchCount();
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  }> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    const [pending, processing, failed, completed] = await Promise.all([
      collection.query(Q.where('status', 'pending')).fetchCount(),
      collection.query(Q.where('status', 'processing')).fetchCount(),
      collection.query(Q.where('status', 'failed')).fetchCount(),
      collection.query(Q.where('status', 'completed')).fetchCount(),
    ]);

    return { pending, processing, failed, completed };
  }

  /**
   * Process queue
   */
  async processQueue(authToken?: string): Promise<QueueResult> {
    if (this.isProcessing) {
      console.log('[SyncQueue] Already processing');
      return { processed: 0, failed: 0, errors: [] };
    }

    this.isProcessing = true;
    const result: QueueResult = { processed: 0, failed: 0, errors: [] };

    try {
      const items = await this.getPendingItems();

      if (items.length === 0) {
        console.log('[SyncQueue] No items to process');
        return result;
      }

      console.log(`[SyncQueue] Processing ${items.length} items`);

      // Process in batches
      for (let i = 0; i < items.length; i += this.config.batchSize) {
        const batch = items.slice(i, i + this.config.batchSize);
        const batchResults = await this.processBatch(batch, authToken);

        result.processed += batchResults.processed;
        result.failed += batchResults.failed;
        result.errors.push(...batchResults.errors);
      }
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Process a batch of items
   */
  private async processBatch(
    items: SyncQueueItem[],
    authToken?: string
  ): Promise<QueueResult> {
    const result: QueueResult = { processed: 0, failed: 0, errors: [] };

    // Process items concurrently with limit
    const chunks = this.chunkArray(items, this.config.maxConcurrent);

    for (const chunk of chunks) {
      const promises = chunk.map((item) =>
        this.processItem(item, authToken)
      );

      const results = await Promise.allSettled(promises);

      for (const itemResult of results) {
        if (itemResult.status === 'fulfilled' && itemResult.value) {
          result.processed++;
        } else {
          result.failed++;
          if (itemResult.status === 'rejected') {
            result.errors.push(itemResult.reason?.message || 'Unknown error');
          }
        }
      }
    }

    return result;
  }

  /**
   * Process single item
   */
  private async processItem(
    item: SyncQueueItem,
    authToken?: string
  ): Promise<boolean> {
    this.emit({
      type: 'processing',
      itemId: item.id,
      entityType: item.entityType,
    });

    await item.markProcessing();

    try {
      const endpoint = this.getEndpointForItem(item);
      const method = this.getMethodForOperation(item.operation);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: item.operation !== 'delete' ? item.payload : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      await item.markCompleted();

      this.emit({
        type: 'completed',
        itemId: item.id,
        entityType: item.entityType,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await item.markFailed(errorMessage);

      this.emit({
        type: 'failed',
        itemId: item.id,
        entityType: item.entityType,
        error: errorMessage,
      });

      console.error(`[SyncQueue] Failed to process item ${item.id}:`, error);
      return false;
    }
  }

  /**
   * Get API endpoint for queue item
   */
  private getEndpointForItem(item: SyncQueueItem): string {
    const baseEndpoint = `${API_BASE_URL}/${this.getApiPath(item.entityType)}`;

    if (item.operation === 'create') {
      return baseEndpoint;
    }

    // Get server ID from payload
    const payload = item.parsedPayload;
    const serverId = payload?.serverId || payload?.id;

    return `${baseEndpoint}/${serverId}`;
  }

  /**
   * Get API path for entity type
   */
  private getApiPath(entityType: string): string {
    const paths: Record<string, string> = {
      [TableNames.USERS]: 'users',
      [TableNames.FESTIVALS]: 'festivals',
      [TableNames.TICKETS]: 'tickets',
      [TableNames.ARTISTS]: 'artists',
      [TableNames.PERFORMANCES]: 'performances',
      [TableNames.CASHLESS_ACCOUNTS]: 'cashless/accounts',
      [TableNames.CASHLESS_TRANSACTIONS]: 'cashless/transactions',
      [TableNames.NOTIFICATIONS]: 'notifications',
    };

    return paths[entityType] || entityType;
  }

  /**
   * Get HTTP method for operation
   */
  private getMethodForOperation(operation: SyncOperation): string {
    const methods: Record<SyncOperation, string> = {
      create: 'POST',
      update: 'PATCH',
      delete: 'DELETE',
    };

    return methods[operation];
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<QueueResult> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    const failedItems = await collection
      .query(
        Q.where('status', 'failed'),
        Q.where('retry_count', Q.lt(MAX_RETRY_COUNT))
      )
      .fetch();

    await this.database.write(async () => {
      for (const item of failedItems) {
        await item.resetForRetry();
      }
    });

    return this.processQueue();
  }

  /**
   * Remove completed items
   */
  async clearCompleted(): Promise<number> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    const completedItems = await collection
      .query(Q.where('status', 'completed'))
      .fetch();

    await this.database.write(async () => {
      for (const item of completedItems) {
        await item.destroyPermanently();
      }
    });

    this.emit({ type: 'cleared' });

    return completedItems.length;
  }

  /**
   * Remove item by ID
   */
  async remove(itemId: string): Promise<void> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    const item = await collection.find(itemId);
    await this.database.write(async () => {
      await item.destroyPermanently();
    });
  }

  /**
   * Clear all items (for reset/debugging)
   */
  async clearAll(): Promise<void> {
    const collection = this.database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);

    const allItems = await collection.query().fetch();

    await this.database.write(async () => {
      for (const item of allItems) {
        await item.destroyPermanently();
      }
    });

    this.emit({ type: 'cleared' });
  }

  /**
   * Add event listener
   */
  addListener(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: QueueEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SyncQueue] Listener error:', error);
      }
    });
  }

  /**
   * Helper to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const syncQueueService = SyncQueue.getInstance();
export { SyncQueue };
export default SyncQueue;
