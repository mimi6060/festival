/**
 * SyncQueue.ts
 * Queue system for managing offline actions that need to be synchronized
 * Implements priority-based processing with retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../../utils/Logger';

const SYNC_QUEUE_STORAGE_KEY = '@offline/sync_queue';
const QUEUE_METADATA_KEY = '@offline/queue_metadata';

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface SyncQueueItem {
  id: string;
  action: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  priority: SyncPriority;
  status: SyncStatus;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  timeout: number;
  dependsOn?: string[];
  onSuccess?: string;
  onFailure?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueMetadata {
  lastProcessedAt: number | null;
  totalProcessed: number;
  totalFailed: number;
  totalSuccess: number;
  averageProcessingTime: number;
}

const PRIORITY_ORDER: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

class SyncQueue {
  private static instance: SyncQueue;
  private queue: SyncQueueItem[] = [];
  private metadata: QueueMetadata;
  private isLoaded = false;
  private processingLock = false;

  private constructor() {
    this.metadata = this.getInitialMetadata();
  }

  public static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  private getInitialMetadata(): QueueMetadata {
    return {
      lastProcessedAt: null,
      totalProcessed: 0,
      totalFailed: 0,
      totalSuccess: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Load queue from storage
   */
  public async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const [queueData, metadataData] = await Promise.all([
        AsyncStorage.getItem(SYNC_QUEUE_STORAGE_KEY),
        AsyncStorage.getItem(QUEUE_METADATA_KEY),
      ]);

      if (queueData) {
        this.queue = JSON.parse(queueData);
        // Reset processing items to pending (in case app crashed)
        this.queue = this.queue.map((item) => ({
          ...item,
          status: item.status === 'processing' ? 'pending' : item.status,
        }));
      }

      if (metadataData) {
        this.metadata = JSON.parse(metadataData);
      }

      this.isLoaded = true;
      Logger.debug(`[SyncQueue] Loaded ${this.queue.length} items from storage`);
    } catch (error) {
      Logger.error('[SyncQueue] Failed to load queue:', error);
      this.queue = [];
      this.metadata = this.getInitialMetadata();
    }
  }

  /**
   * Save queue to storage
   */
  private async save(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(this.queue)),
        AsyncStorage.setItem(QUEUE_METADATA_KEY, JSON.stringify(this.metadata)),
      ]);
    } catch (error) {
      Logger.error('[SyncQueue] Failed to save queue:', error);
    }
  }

  /**
   * Generate unique ID for queue item
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add item to queue
   */
  public async add(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'status'>
  ): Promise<string> {
    await this.load();

    const id = this.generateId();
    const now = Date.now();

    const queueItem: SyncQueueItem = {
      ...item,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: item.maxRetries ?? 3,
      timeout: item.timeout ?? 30000,
      priority: item.priority ?? 'normal',
    };

    // Check for duplicates (same action, endpoint, and body)
    const existingIndex = this.queue.findIndex(
      (q) =>
        q.action === item.action &&
        q.endpoint === item.endpoint &&
        q.status === 'pending' &&
        JSON.stringify(q.body) === JSON.stringify(item.body)
    );

    if (existingIndex !== -1) {
      // Update existing item instead of adding duplicate
      this.queue[existingIndex] = {
        ...this.queue[existingIndex],
        updatedAt: now,
        priority: this.getHigherPriority(this.queue[existingIndex].priority, queueItem.priority),
      };
      await this.save();
      Logger.debug(`[SyncQueue] Updated existing item: ${this.queue[existingIndex].id}`);
      return this.queue[existingIndex].id;
    }

    this.queue.push(queueItem);
    this.sortQueue();
    await this.save();

    Logger.info(`[SyncQueue] Added item: ${id} (${item.action})`);
    return id;
  }

  /**
   * Get higher priority between two
   */
  private getHigherPriority(a: SyncPriority, b: SyncPriority): SyncPriority {
    return PRIORITY_ORDER[a] <= PRIORITY_ORDER[b] ? a : b;
  }

  /**
   * Sort queue by priority and creation time
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by creation time
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Get all pending items
   */
  public async getAll(): Promise<SyncQueueItem[]> {
    await this.load();
    return [...this.queue];
  }

  /**
   * Get pending items only
   */
  public async getPending(): Promise<SyncQueueItem[]> {
    await this.load();
    return this.queue.filter((item) => item.status === 'pending');
  }

  /**
   * Get items by status
   */
  public async getByStatus(status: SyncStatus): Promise<SyncQueueItem[]> {
    await this.load();
    return this.queue.filter((item) => item.status === status);
  }

  /**
   * Get item by ID
   */
  public async getById(id: string): Promise<SyncQueueItem | undefined> {
    await this.load();
    return this.queue.find((item) => item.id === id);
  }

  /**
   * Get next item to process
   */
  public async getNext(): Promise<SyncQueueItem | null> {
    await this.load();

    // Find first pending item that has no unmet dependencies
    for (const item of this.queue) {
      if (item.status !== 'pending') continue;

      if (item.dependsOn && item.dependsOn.length > 0) {
        const dependenciesMet = item.dependsOn.every((depId) => {
          const dep = this.queue.find((q) => q.id === depId);
          return dep?.status === 'completed';
        });
        if (!dependenciesMet) continue;
      }

      return item;
    }

    return null;
  }

  /**
   * Mark item as processing
   */
  public async markProcessing(id: string): Promise<void> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue[index] = {
        ...this.queue[index],
        status: 'processing',
        updatedAt: Date.now(),
      };
      await this.save();
      Logger.debug(`[SyncQueue] Marked as processing: ${id}`);
    }
  }

  /**
   * Mark item as completed
   */
  public async markCompleted(id: string): Promise<void> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      const processingTime = Date.now() - this.queue[index].updatedAt;
      this.queue[index] = {
        ...this.queue[index],
        status: 'completed',
        updatedAt: Date.now(),
      };

      // Update metadata
      this.metadata.totalProcessed++;
      this.metadata.totalSuccess++;
      this.metadata.lastProcessedAt = Date.now();
      this.metadata.averageProcessingTime =
        (this.metadata.averageProcessingTime * (this.metadata.totalProcessed - 1) + processingTime) /
        this.metadata.totalProcessed;

      await this.save();
      Logger.debug(`[SyncQueue] Marked as completed: ${id}`);
    }
  }

  /**
   * Mark item as failed
   */
  public async markFailed(id: string, error: string): Promise<void> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      const item = this.queue[index];
      const newRetryCount = item.retryCount + 1;

      if (newRetryCount >= item.maxRetries) {
        // Permanently failed
        this.queue[index] = {
          ...item,
          status: 'failed',
          retryCount: newRetryCount,
          lastError: error,
          updatedAt: Date.now(),
        };
        this.metadata.totalFailed++;
      } else {
        // Will retry
        this.queue[index] = {
          ...item,
          status: 'pending',
          retryCount: newRetryCount,
          lastError: error,
          updatedAt: Date.now(),
        };
      }

      this.metadata.totalProcessed++;
      this.metadata.lastProcessedAt = Date.now();

      await this.save();
      Logger.debug(`[SyncQueue] Marked as failed: ${id} (retry ${newRetryCount}/${item.maxRetries})`);
    }
  }

  /**
   * Cancel an item
   */
  public async cancel(id: string): Promise<void> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue[index] = {
        ...this.queue[index],
        status: 'cancelled',
        updatedAt: Date.now(),
      };
      await this.save();
      Logger.debug(`[SyncQueue] Cancelled: ${id}`);
    }
  }

  /**
   * Remove item from queue
   */
  public async remove(id: string): Promise<void> {
    await this.load();

    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.id !== id);

    if (this.queue.length !== initialLength) {
      await this.save();
      Logger.debug(`[SyncQueue] Removed: ${id}`);
    }
  }

  /**
   * Remove completed items
   */
  public async removeCompleted(): Promise<number> {
    await this.load();

    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.status !== 'completed');
    const removed = initialLength - this.queue.length;

    if (removed > 0) {
      await this.save();
      Logger.debug(`[SyncQueue] Removed ${removed} completed items`);
    }

    return removed;
  }

  /**
   * Remove failed items older than specified time
   */
  public async removeOldFailed(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    await this.load();

    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(
      (item) => !(item.status === 'failed' && item.updatedAt < cutoff)
    );
    const removed = initialLength - this.queue.length;

    if (removed > 0) {
      await this.save();
      Logger.debug(`[SyncQueue] Removed ${removed} old failed items`);
    }

    return removed;
  }

  /**
   * Clear entire queue
   */
  public async clear(): Promise<void> {
    this.queue = [];
    await this.save();
    Logger.info('[SyncQueue] Queue cleared');
  }

  /**
   * Get queue length
   */
  public async getLength(): Promise<number> {
    await this.load();
    return this.queue.length;
  }

  /**
   * Get pending count
   */
  public async getPendingCount(): Promise<number> {
    await this.load();
    return this.queue.filter((item) => item.status === 'pending').length;
  }

  /**
   * Get queue statistics
   */
  public async getStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    byPriority: Record<SyncPriority, number>;
    metadata: QueueMetadata;
  }> {
    await this.load();

    const byStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    const byPriority: Record<SyncPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    this.queue.forEach((item) => {
      byStatus[item.status]++;
      byPriority[item.priority]++;
    });

    return {
      total: this.queue.length,
      ...byStatus,
      byPriority,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Retry all failed items
   */
  public async retryAllFailed(): Promise<number> {
    await this.load();

    let retried = 0;
    this.queue = this.queue.map((item) => {
      if (item.status === 'failed') {
        retried++;
        return {
          ...item,
          status: 'pending' as SyncStatus,
          retryCount: 0,
          lastError: undefined,
          updatedAt: Date.now(),
        };
      }
      return item;
    });

    if (retried > 0) {
      await this.save();
      Logger.info(`[SyncQueue] Retrying ${retried} failed items`);
    }

    return retried;
  }

  /**
   * Retry specific failed item
   */
  public async retry(id: string): Promise<boolean> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1 && this.queue[index].status === 'failed') {
      this.queue[index] = {
        ...this.queue[index],
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
        updatedAt: Date.now(),
      };
      await this.save();
      Logger.debug(`[SyncQueue] Retrying item: ${id}`);
      return true;
    }

    return false;
  }

  /**
   * Update item priority
   */
  public async updatePriority(id: string, priority: SyncPriority): Promise<void> {
    await this.load();

    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue[index] = {
        ...this.queue[index],
        priority,
        updatedAt: Date.now(),
      };
      this.sortQueue();
      await this.save();
      Logger.debug(`[SyncQueue] Updated priority for ${id} to ${priority}`);
    }
  }

  /**
   * Check if queue has critical items
   */
  public async hasCriticalItems(): Promise<boolean> {
    await this.load();
    return this.queue.some(
      (item) => item.priority === 'critical' && item.status === 'pending'
    );
  }

  /**
   * Export queue for debugging
   */
  public async export(): Promise<string> {
    await this.load();
    return JSON.stringify(
      {
        queue: this.queue,
        metadata: this.metadata,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export const syncQueue = SyncQueue.getInstance();
export default SyncQueue;
