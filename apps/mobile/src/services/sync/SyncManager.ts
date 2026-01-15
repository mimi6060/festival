/**
 * SyncManager
 * Manages sync lifecycle, priorities, batching, and progress reporting
 * Provides a high-level interface for coordinating sync operations
 */

import { Database, Q } from '@nozbe/watermelondb';
import { AppState, AppStateStatus } from 'react-native';

import { getDatabase, TableNames } from '../../database';
import { SyncMetadata, STALE_THRESHOLDS } from '../../database/models';
import { syncService, SyncStatus, SyncResult, SyncConfig, EntitySyncStatus } from './SyncService';
import { syncQueueService, QueueResult } from './SyncQueue';
import { conflictResolver } from './ConflictResolver';

// Sync priority levels
export enum SyncPriorityLevel {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4,
}

// Batch configuration
export interface BatchConfig {
  maxBatchSize: number;
  batchDelayMs: number;
  maxConcurrentBatches: number;
}

// Progress reporting
export interface SyncProgress {
  totalItems: number;
  processedItems: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  currentEntity: string | null;
  currentPhase: SyncPhase;
  estimatedTimeRemaining: number | null;
  bytesTransferred: number;
  errors: SyncProgressError[];
}

export interface SyncProgressError {
  entity: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

// Sync phases
export type SyncPhase =
  | 'idle'
  | 'preparing'
  | 'authenticating'
  | 'pulling'
  | 'resolving_conflicts'
  | 'pushing'
  | 'finalizing'
  | 'completed'
  | 'failed';

// Sync task definition
export interface SyncTask {
  id: string;
  entityType: string;
  priority: SyncPriorityLevel;
  estimatedItems: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// Event types
export type SyncManagerEvent =
  | { type: 'progress'; data: SyncProgress }
  | { type: 'phase_change'; data: { from: SyncPhase; to: SyncPhase } }
  | { type: 'task_started'; data: SyncTask }
  | { type: 'task_completed'; data: SyncTask }
  | { type: 'task_failed'; data: SyncTask }
  | { type: 'batch_completed'; data: { batch: number; total: number } }
  | { type: 'sync_completed'; data: SyncResult }
  | { type: 'sync_failed'; data: { error: string } }
  | { type: 'conflict_detected'; data: { entity: string; count: number } };

type SyncManagerEventListener = (event: SyncManagerEvent) => void;

// Priority order for entities
const ENTITY_PRIORITY_ORDER: Record<string, SyncPriorityLevel> = {
  [TableNames.USERS]: SyncPriorityLevel.CRITICAL,
  [TableNames.TICKETS]: SyncPriorityLevel.HIGH,
  [TableNames.CASHLESS_ACCOUNTS]: SyncPriorityLevel.HIGH,
  [TableNames.CASHLESS_TRANSACTIONS]: SyncPriorityLevel.HIGH,
  [TableNames.FESTIVALS]: SyncPriorityLevel.MEDIUM,
  [TableNames.ARTISTS]: SyncPriorityLevel.MEDIUM,
  [TableNames.PERFORMANCES]: SyncPriorityLevel.MEDIUM,
  [TableNames.NOTIFICATIONS]: SyncPriorityLevel.LOW,
};

// Default batch configuration
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 100,
  batchDelayMs: 100,
  maxConcurrentBatches: 2,
};

/**
 * SyncManager class
 * Coordinates and manages all sync operations
 */
class SyncManager {
  private static instance: SyncManager;
  private database: Database;
  private batchConfig: BatchConfig;
  private listeners = new Set<SyncManagerEventListener>();
  private tasks = new Map<string, SyncTask>();
  private currentPhase: SyncPhase = 'idle';
  private progress: SyncProgress;
  private isInitialized = false;
  private syncStartTime = 0;
  private processedItemsHistory: { timestamp: number; count: number }[] = [];

  private constructor(batchConfig?: Partial<BatchConfig>) {
    this.database = getDatabase();
    this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...batchConfig };
    this.progress = this.createInitialProgress();
  }

  static getInstance(batchConfig?: Partial<BatchConfig>): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(batchConfig);
    }
    return SyncManager.instance;
  }

  /**
   * Create initial progress state
   */
  private createInitialProgress(): SyncProgress {
    return {
      totalItems: 0,
      processedItems: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches: 0,
      currentEntity: null,
      currentPhase: 'idle',
      estimatedTimeRemaining: null,
      bytesTransferred: 0,
      errors: [],
    };
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[SyncManager] Already initialized');
      return;
    }

    console.log('[SyncManager] Initializing...');

    // Initialize sync service
    await syncService.initialize();

    // Subscribe to sync service events
    syncService.addListener(this.handleSyncStatusChange.bind(this));

    this.isInitialized = true;
    console.log('[SyncManager] Initialized successfully');
  }

  /**
   * Handle sync status changes from SyncService
   */
  private handleSyncStatusChange(status: SyncStatus): void {
    // Update progress based on sync status
    this.progress = {
      ...this.progress,
      percentage: status.progress,
      currentEntity: status.currentEntity,
    };

    this.notifyListeners({
      type: 'progress',
      data: this.progress,
    });
  }

  /**
   * Add event listener
   */
  addListener(listener: SyncManagerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: SyncManagerEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SyncManager] Listener error:', error);
      }
    });
  }

  /**
   * Set sync phase and notify
   */
  private setPhase(phase: SyncPhase): void {
    const previousPhase = this.currentPhase;
    this.currentPhase = phase;
    this.progress.currentPhase = phase;

    this.notifyListeners({
      type: 'phase_change',
      data: { from: previousPhase, to: phase },
    });
  }

  /**
   * Start a full sync with priority management
   */
  async startSync(options?: {
    force?: boolean;
    priorities?: SyncPriorityLevel[];
    entities?: string[];
  }): Promise<SyncResult> {
    const { force = false, priorities, entities } = options || {};

    console.log('[SyncManager] Starting sync...', { force, priorities, entities });

    // Reset progress
    this.progress = this.createInitialProgress();
    this.syncStartTime = Date.now();
    this.processedItemsHistory = [];

    try {
      this.setPhase('preparing');

      // Build task list based on priorities and entities
      const tasks = await this.buildSyncTasks(priorities, entities);
      this.tasks = new Map(tasks.map((t) => [t.id, t]));

      // Estimate total items
      this.progress.totalItems = tasks.reduce((sum, t) => sum + t.estimatedItems, 0);
      this.progress.totalBatches = Math.ceil(
        this.progress.totalItems / this.batchConfig.maxBatchSize
      );

      this.notifyListeners({ type: 'progress', data: this.progress });

      this.setPhase('pulling');

      // Execute sync
      const result = await syncService.sync(force);

      if (result.success) {
        this.setPhase('completed');
        this.notifyListeners({ type: 'sync_completed', data: result });
      } else {
        this.setPhase('failed');
        this.notifyListeners({
          type: 'sync_failed',
          data: { error: result.errors.join(', ') },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setPhase('failed');
      this.notifyListeners({ type: 'sync_failed', data: { error: errorMessage } });

      return {
        success: false,
        pulled: 0,
        pushed: 0,
        errors: [errorMessage],
        timestamp: new Date(),
        duration: Date.now() - this.syncStartTime,
        entityResults: new Map(),
      };
    }
  }

  /**
   * Build sync tasks based on priorities
   */
  private async buildSyncTasks(
    priorities?: SyncPriorityLevel[],
    entities?: string[]
  ): Promise<SyncTask[]> {
    const tasks: SyncTask[] = [];

    // Get all syncable entities
    let syncableEntities = Object.values(TableNames).filter(
      (name) => name !== TableNames.SYNC_METADATA && name !== TableNames.SYNC_QUEUE
    );

    // Filter by specified entities if provided
    if (entities && entities.length > 0) {
      syncableEntities = syncableEntities.filter((e) => entities.includes(e));
    }

    // Filter by priority levels if provided
    if (priorities && priorities.length > 0) {
      syncableEntities = syncableEntities.filter((e) => {
        const entityPriority = ENTITY_PRIORITY_ORDER[e] ?? SyncPriorityLevel.LOW;
        return priorities.includes(entityPriority);
      });
    }

    // Sort by priority
    syncableEntities.sort((a, b) => {
      const priorityA = ENTITY_PRIORITY_ORDER[a] ?? SyncPriorityLevel.LOW;
      const priorityB = ENTITY_PRIORITY_ORDER[b] ?? SyncPriorityLevel.LOW;
      return priorityA - priorityB;
    });

    // Create tasks
    for (const entityType of syncableEntities) {
      const estimatedItems = await this.estimateEntityItems(entityType);
      const priority = ENTITY_PRIORITY_ORDER[entityType] ?? SyncPriorityLevel.LOW;

      tasks.push({
        id: `sync-${entityType}-${Date.now()}`,
        entityType,
        priority,
        estimatedItems,
        createdAt: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
      });
    }

    return tasks;
  }

  /**
   * Estimate number of items to sync for an entity
   */
  private async estimateEntityItems(entityType: string): Promise<number> {
    try {
      const collection = this.database.get(entityType);

      // Count local items that need push
      const pendingPush = await collection
        .query(Q.where('needs_push', true))
        .fetchCount();

      // Add estimate for pull (use last sync count or default)
      const metadata = await this.getSyncMetadata(entityType);
      const estimatedPull = metadata?.lastPullCount || 50;

      return pendingPush + estimatedPull;
    } catch {
      return 50; // Default estimate
    }
  }

  /**
   * Get sync metadata for entity
   */
  private async getSyncMetadata(entityType: string): Promise<SyncMetadata | null> {
    try {
      const collection = this.database.get<SyncMetadata>(TableNames.SYNC_METADATA);
      const results = await collection
        .query(Q.where('entity_type', entityType))
        .fetch();
      return results[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Sync only critical data (user, tickets, cashless)
   */
  async syncCritical(): Promise<SyncResult> {
    return this.startSync({
      priorities: [SyncPriorityLevel.CRITICAL, SyncPriorityLevel.HIGH],
    });
  }

  /**
   * Sync specific entity
   */
  async syncEntity(entityType: string, force = false): Promise<SyncResult> {
    console.log(`[SyncManager] Syncing entity: ${entityType}`);

    this.setPhase('preparing');

    try {
      const result = await syncService.syncEntity(entityType);

      this.setPhase(result.success ? 'completed' : 'failed');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setPhase('failed');

      return {
        success: false,
        pulled: 0,
        pushed: 0,
        errors: [errorMessage],
        timestamp: new Date(),
        duration: 0,
        entityResults: new Map(),
      };
    }
  }

  /**
   * Process data in batches
   */
  async processBatch<T>(
    items: T[],
    processor: (batch: T[]) => Promise<void>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    const { maxBatchSize, batchDelayMs, maxConcurrentBatches } = this.batchConfig;
    const totalItems = items.length;
    let processedItems = 0;

    // Split into batches
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += maxBatchSize) {
      batches.push(items.slice(i, i + maxBatchSize));
    }

    this.progress.totalBatches = batches.length;

    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + maxConcurrentBatches);

      await Promise.all(
        concurrentBatches.map(async (batch, index) => {
          try {
            await processor(batch);
            processedItems += batch.length;
            this.progress.currentBatch = i + index + 1;
            this.progress.processedItems = processedItems;

            // Update estimated time remaining
            this.updateEstimatedTimeRemaining(processedItems, totalItems);

            onProgress?.(processedItems, totalItems);

            this.notifyListeners({
              type: 'batch_completed',
              data: { batch: i + index + 1, total: batches.length },
            });
          } catch (error) {
            console.error(`[SyncManager] Batch ${i + index + 1} failed:`, error);
            throw error;
          }
        })
      );

      // Add delay between batch groups
      if (i + maxConcurrentBatches < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }
    }
  }

  /**
   * Update estimated time remaining based on processing rate
   */
  private updateEstimatedTimeRemaining(processed: number, total: number): void {
    const now = Date.now();
    this.processedItemsHistory.push({ timestamp: now, count: processed });

    // Keep only last 10 data points
    if (this.processedItemsHistory.length > 10) {
      this.processedItemsHistory.shift();
    }

    // Calculate rate from history
    if (this.processedItemsHistory.length >= 2) {
      const first = this.processedItemsHistory[0];
      const last = this.processedItemsHistory[this.processedItemsHistory.length - 1];
      const timeDiff = last.timestamp - first.timestamp;
      const itemsDiff = last.count - first.count;

      if (timeDiff > 0 && itemsDiff > 0) {
        const itemsPerMs = itemsDiff / timeDiff;
        const remainingItems = total - processed;
        this.progress.estimatedTimeRemaining = Math.round(remainingItems / itemsPerMs);
      }
    }
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): SyncPhase {
    return this.currentPhase;
  }

  /**
   * Get all tasks
   */
  getTasks(): SyncTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): SyncTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Cancel a specific task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task?.status === 'pending') {
      task.status = 'cancelled';
      this.tasks.set(taskId, task);
      return true;
    }
    return false;
  }

  /**
   * Cancel all pending tasks and current sync
   */
  cancelSync(): void {
    // Cancel all pending tasks
    for (const [id, task] of this.tasks) {
      if (task.status === 'pending' || task.status === 'running') {
        task.status = 'cancelled';
        this.tasks.set(id, task);
      }
    }

    // Cancel sync service
    syncService.cancelSync();

    this.setPhase('idle');
    console.log('[SyncManager] Sync cancelled');
  }

  /**
   * Retry failed sync
   */
  async retryFailedSync(): Promise<SyncResult> {
    console.log('[SyncManager] Retrying failed sync...');

    // Get failed tasks
    const failedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'failed' && t.retryCount < t.maxRetries
    );

    if (failedTasks.length === 0) {
      console.log('[SyncManager] No failed tasks to retry');
      return {
        success: true,
        pulled: 0,
        pushed: 0,
        errors: [],
        timestamp: new Date(),
        duration: 0,
        entityResults: new Map(),
      };
    }

    // Reset failed tasks
    for (const task of failedTasks) {
      task.status = 'pending';
      task.retryCount++;
      task.error = undefined;
      this.tasks.set(task.id, task);
    }

    // Start sync with only failed entities
    return this.startSync({
      entities: failedTasks.map((t) => t.entityType),
    });
  }

  /**
   * Get sync statistics
   */
  async getStatistics(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalPulled: number;
    totalPushed: number;
    averageDuration: number;
    lastSyncAt: Date | null;
    pendingChanges: number;
    entityStats: Map<string, { lastSync: Date | null; pendingChanges: number; isStale: boolean }>;
  }> {
    const status = syncService.getStatus();
    const pendingChanges = await syncService.getPendingChangesCount();

    // Build entity stats
    const entityStats = new Map<string, { lastSync: Date | null; pendingChanges: number; isStale: boolean }>();

    for (const [entityType, entityStatus] of status.entityStatuses) {
      entityStats.set(entityType, {
        lastSync: entityStatus.lastSyncAt,
        pendingChanges: entityStatus.pendingChanges,
        isStale: entityStatus.isStale,
      });
    }

    return {
      totalSyncs: status.syncCount,
      successfulSyncs: status.syncCount - status.failedSyncCount,
      failedSyncs: status.failedSyncCount,
      totalPulled: 0, // Would need to track this
      totalPushed: 0, // Would need to track this
      averageDuration: 0, // Would need to track this
      lastSyncAt: status.lastSyncAt,
      pendingChanges,
      entityStats,
    };
  }

  /**
   * Update batch configuration
   */
  updateBatchConfig(config: Partial<BatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...config };
    console.log('[SyncManager] Batch config updated:', this.batchConfig);
  }

  /**
   * Get stale entities that need sync
   */
  async getStaleEntities(): Promise<string[]> {
    const staleEntities: string[] = [];
    const status = syncService.getStatus();

    for (const [entityType, entityStatus] of status.entityStatuses) {
      if (entityStatus.isStale) {
        staleEntities.push(entityType);
      }
    }

    return staleEntities;
  }

  /**
   * Check if any entity needs sync
   */
  async needsSync(): Promise<boolean> {
    const status = syncService.getStatus();

    // Check if any entity is stale
    for (const [, entityStatus] of status.entityStatuses) {
      if (entityStatus.isStale || entityStatus.pendingChanges > 0) {
        return true;
      }
    }

    // Check queue
    const queueLength = await syncQueueService.getLength();
    return queueLength > 0;
  }

  /**
   * Get detailed sync status
   */
  getDetailedStatus(): {
    phase: SyncPhase;
    progress: SyncProgress;
    tasks: SyncTask[];
    isOnline: boolean;
    lastSync: Date | null;
    nextScheduledSync: Date | null;
  } {
    const status = syncService.getStatus();

    return {
      phase: this.currentPhase,
      progress: this.progress,
      tasks: this.getTasks(),
      isOnline: status.isOnline,
      lastSync: status.lastSyncAt,
      nextScheduledSync: status.nextScheduledSync,
    };
  }

  /**
   * Reset sync manager state
   */
  reset(): void {
    this.tasks.clear();
    this.progress = this.createInitialProgress();
    this.currentPhase = 'idle';
    this.processedItemsHistory = [];

    console.log('[SyncManager] State reset');
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.listeners.clear();
    this.tasks.clear();
    this.reset();

    console.log('[SyncManager] Destroyed');
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();
export { SyncManager };
export default SyncManager;
