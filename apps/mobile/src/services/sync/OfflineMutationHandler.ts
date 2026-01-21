/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any -- WatermelonDB record callbacks require dynamic typing */
/**
 * OfflineMutationHandler
 * Handles offline mutations: queuing, replaying, ordering, and conflict resolution
 * Ensures data consistency when working offline
 */

import { Database, Q, Model } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDatabase, TableNames } from '../../database';
import {
  SyncQueueItem,
  SyncOperation,
  SyncPriority,
  getOperationPriority,
} from '../../database/models';
import { syncQueueService, QueueResult, QueueEvent } from './SyncQueue';
import { conflictResolver, ConflictResult } from './ConflictResolver';
import { syncService } from './SyncService';

// Storage key for mutation tracking
const MUTATION_HISTORY_KEY = '@offline/mutation_history';
const MUTATION_ORDER_KEY = '@offline/mutation_order';

// Mutation types
export type MutationType = 'create' | 'update' | 'delete';

// Mutation entry
export interface Mutation {
  id: string;
  entityType: string;
  entityId: string;
  type: MutationType;
  payload: Record<string, unknown>;
  timestamp: number;
  order: number;
  status: MutationStatus;
  error?: string;
  retryCount: number;
  dependsOn?: string[]; // Other mutation IDs this depends on
  serverResponse?: Record<string, unknown>;
}

export type MutationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'conflict'
  | 'cancelled';

// Mutation result
export interface MutationResult {
  success: boolean;
  mutationId: string;
  error?: string;
  conflictResult?: ConflictResult;
  serverData?: Record<string, unknown>;
}

// Replay result
export interface ReplayResult {
  total: number;
  successful: number;
  failed: number;
  conflicts: number;
  errors: { mutationId: string; error: string }[];
}

// Event types
export type MutationEvent =
  | { type: 'mutation_added'; data: Mutation }
  | { type: 'mutation_processing'; data: Mutation }
  | { type: 'mutation_completed'; data: Mutation }
  | { type: 'mutation_failed'; data: Mutation }
  | { type: 'mutation_conflict'; data: { mutation: Mutation; conflict: ConflictResult } }
  | { type: 'replay_started'; data: { total: number } }
  | { type: 'replay_progress'; data: { processed: number; total: number } }
  | { type: 'replay_completed'; data: ReplayResult };

type MutationEventListener = (event: MutationEvent) => void;

// Configuration
export interface OfflineMutationConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  conflictStrategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  autoReplayOnOnline: boolean;
  preserveMutationHistory: boolean;
  historyRetentionDays: number;
}

const DEFAULT_CONFIG: OfflineMutationConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 10,
  conflictStrategy: 'server-wins',
  autoReplayOnOnline: true,
  preserveMutationHistory: true,
  historyRetentionDays: 7,
};

/**
 * OfflineMutationHandler class
 * Manages offline mutations and their replay
 */
class OfflineMutationHandler {
  private static instance: OfflineMutationHandler;
  private database: Database;
  private config: OfflineMutationConfig;
  private mutations = new Map<string, Mutation>();
  private mutationOrder: string[] = [];
  private listeners = new Set<MutationEventListener>();
  private isReplaying = false;
  private nextOrder = 0;

  private constructor(config?: Partial<OfflineMutationConfig>) {
    this.database = getDatabase();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<OfflineMutationConfig>): OfflineMutationHandler {
    if (!OfflineMutationHandler.instance) {
      OfflineMutationHandler.instance = new OfflineMutationHandler(config);
    }
    return OfflineMutationHandler.instance;
  }

  /**
   * Initialize the mutation handler
   */
  async initialize(): Promise<void> {
    console.info('[OfflineMutationHandler] Initializing...');

    // Load persisted mutations
    await this.loadMutations();

    // Set up queue event listener
    syncQueueService.addListener(this.handleQueueEvent.bind(this));

    // Set up network listener for auto-replay
    if (this.config.autoReplayOnOnline) {
      syncService.addNetworkListener((isOnline) => {
        if (isOnline && this.mutations.size > 0 && !this.isReplaying) {
          console.info('[OfflineMutationHandler] Online - auto-replaying mutations');
          this.replayMutations().catch((error) => {
            console.error('[OfflineMutationHandler] Auto-replay failed:', error);
          });
        }
      });
    }

    console.info('[OfflineMutationHandler] Initialized');
  }

  /**
   * Load persisted mutations from storage
   */
  private async loadMutations(): Promise<void> {
    try {
      const [historyJson, orderJson] = await Promise.all([
        AsyncStorage.getItem(MUTATION_HISTORY_KEY),
        AsyncStorage.getItem(MUTATION_ORDER_KEY),
      ]);

      if (historyJson) {
        const history = JSON.parse(historyJson) as Mutation[];
        for (const mutation of history) {
          if (mutation.status === 'pending' || mutation.status === 'failed') {
            this.mutations.set(mutation.id, mutation);
          }
        }
      }

      if (orderJson) {
        this.mutationOrder = JSON.parse(orderJson);
        // Filter to only include existing mutations
        this.mutationOrder = this.mutationOrder.filter((id) => this.mutations.has(id));
        this.nextOrder = this.mutationOrder.length;
      }

      console.info(`[OfflineMutationHandler] Loaded ${this.mutations.size} pending mutations`);
    } catch (error) {
      console.error('[OfflineMutationHandler] Failed to load mutations:', error);
    }
  }

  /**
   * Persist mutations to storage
   */
  private async persistMutations(): Promise<void> {
    try {
      const mutations = Array.from(this.mutations.values());
      await Promise.all([
        AsyncStorage.setItem(MUTATION_HISTORY_KEY, JSON.stringify(mutations)),
        AsyncStorage.setItem(MUTATION_ORDER_KEY, JSON.stringify(this.mutationOrder)),
      ]);
    } catch (error) {
      console.error('[OfflineMutationHandler] Failed to persist mutations:', error);
    }
  }

  /**
   * Handle queue events
   */
  private handleQueueEvent(event: QueueEvent): void {
    // Map queue events to mutation events if relevant
    if (event.itemId) {
      const mutation = this.findMutationByQueueId(event.itemId);
      if (mutation) {
        switch (event.type) {
          case 'processing':
            this.updateMutationStatus(mutation.id, 'processing');
            break;
          case 'completed':
            this.updateMutationStatus(mutation.id, 'completed');
            break;
          case 'failed':
            this.updateMutationStatus(mutation.id, 'failed', event.error);
            break;
        }
      }
    }
  }

  /**
   * Find mutation by queue item ID
   */
  private findMutationByQueueId(queueId: string): Mutation | undefined {
    for (const mutation of this.mutations.values()) {
      if (mutation.id === queueId) {
        return mutation;
      }
    }
    return undefined;
  }

  /**
   * Add event listener
   */
  addListener(listener: MutationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: MutationEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineMutationHandler] Listener error:', error);
      }
    });
  }

  /**
   * Queue a mutation for offline processing
   */
  async queueMutation(params: {
    entityType: string;
    entityId: string;
    type: MutationType;
    payload: Record<string, unknown>;
    dependsOn?: string[];
  }): Promise<string> {
    const { entityType, entityId, type, payload, dependsOn } = params;

    // Generate mutation ID
    const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create mutation entry
    const mutation: Mutation = {
      id: mutationId,
      entityType,
      entityId,
      type,
      payload,
      timestamp: Date.now(),
      order: this.nextOrder++,
      status: 'pending',
      retryCount: 0,
      dependsOn,
    };

    // Check for conflicting mutations (same entity)
    const existingMutation = this.findExistingMutation(entityType, entityId);
    if (existingMutation) {
      // Merge or replace based on type
      const merged = this.mergeMutations(existingMutation, mutation);
      this.mutations.set(existingMutation.id, merged);

      console.info(`[OfflineMutationHandler] Merged mutation: ${existingMutation.id}`);
    } else {
      // Add new mutation
      this.mutations.set(mutationId, mutation);
      this.mutationOrder.push(mutationId);

      console.info(`[OfflineMutationHandler] Queued mutation: ${mutationId}`);
    }

    // Also add to sync queue
    await syncQueueService.add({
      entityType,
      entityId,
      operation: type as SyncOperation,
      payload,
      priority: getOperationPriority(type as SyncOperation),
    });

    // Persist
    await this.persistMutations();

    // Notify
    this.notifyListeners({ type: 'mutation_added', data: mutation });

    return existingMutation?.id || mutationId;
  }

  /**
   * Find existing mutation for same entity
   */
  private findExistingMutation(entityType: string, entityId: string): Mutation | undefined {
    for (const mutation of this.mutations.values()) {
      if (
        mutation.entityType === entityType &&
        mutation.entityId === entityId &&
        (mutation.status === 'pending' || mutation.status === 'failed')
      ) {
        return mutation;
      }
    }
    return undefined;
  }

  /**
   * Merge two mutations for the same entity
   */
  private mergeMutations(existing: Mutation, incoming: Mutation): Mutation {
    // If existing is create and incoming is update, merge payload into create
    if (existing.type === 'create' && incoming.type === 'update') {
      return {
        ...existing,
        payload: { ...existing.payload, ...incoming.payload },
        timestamp: incoming.timestamp,
      };
    }

    // If existing is create/update and incoming is delete, use delete
    if (incoming.type === 'delete') {
      return {
        ...incoming,
        order: existing.order, // Keep original order
      };
    }

    // If existing is update and incoming is update, merge payloads
    if (existing.type === 'update' && incoming.type === 'update') {
      return {
        ...existing,
        payload: { ...existing.payload, ...incoming.payload },
        timestamp: incoming.timestamp,
      };
    }

    // Default: use incoming
    return { ...incoming, order: existing.order };
  }

  /**
   * Update mutation status
   */
  private async updateMutationStatus(
    mutationId: string,
    status: MutationStatus,
    error?: string
  ): Promise<void> {
    const mutation = this.mutations.get(mutationId);
    if (mutation) {
      mutation.status = status;
      if (error) {
        mutation.error = error;
      }
      if (status === 'failed') {
        mutation.retryCount++;
      }
      this.mutations.set(mutationId, mutation);
      await this.persistMutations();

      // Notify based on status
      switch (status) {
        case 'processing':
          this.notifyListeners({ type: 'mutation_processing', data: mutation });
          break;
        case 'completed':
          this.notifyListeners({ type: 'mutation_completed', data: mutation });
          break;
        case 'failed':
          this.notifyListeners({ type: 'mutation_failed', data: mutation });
          break;
      }
    }
  }

  /**
   * Get pending mutations count
   */
  getPendingCount(): number {
    return Array.from(this.mutations.values()).filter(
      (m) => m.status === 'pending' || m.status === 'failed'
    ).length;
  }

  /**
   * Get all pending mutations
   */
  getPendingMutations(): Mutation[] {
    return this.mutationOrder
      .map((id) => this.mutations.get(id))
      .filter(
        (m): m is Mutation => m !== undefined && (m.status === 'pending' || m.status === 'failed')
      );
  }

  /**
   * Get mutations by entity
   */
  getMutationsByEntity(entityType: string, entityId?: string): Mutation[] {
    return Array.from(this.mutations.values()).filter((m) => {
      if (m.entityType !== entityType) {
        return false;
      }
      if (entityId && m.entityId !== entityId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Replay all pending mutations
   */
  async replayMutations(): Promise<ReplayResult> {
    if (this.isReplaying) {
      console.info('[OfflineMutationHandler] Already replaying');
      return { total: 0, successful: 0, failed: 0, conflicts: 0, errors: [] };
    }

    if (!syncService.isOnline()) {
      console.info('[OfflineMutationHandler] Cannot replay: offline');
      return { total: 0, successful: 0, failed: 0, conflicts: 0, errors: [] };
    }

    this.isReplaying = true;
    const pendingMutations = this.getPendingMutations();

    const result: ReplayResult = {
      total: pendingMutations.length,
      successful: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };

    if (pendingMutations.length === 0) {
      console.info('[OfflineMutationHandler] No mutations to replay');
      this.isReplaying = false;
      return result;
    }

    console.info(`[OfflineMutationHandler] Replaying ${pendingMutations.length} mutations`);

    this.notifyListeners({
      type: 'replay_started',
      data: { total: pendingMutations.length },
    });

    try {
      // Process in order, respecting dependencies
      const processed = new Set<string>();

      for (const mutation of pendingMutations) {
        // Check dependencies
        if (mutation.dependsOn) {
          const unmetDependencies = mutation.dependsOn.filter(
            (depId) => !processed.has(depId) && this.mutations.has(depId)
          );

          if (unmetDependencies.length > 0) {
            // Skip for now, will be processed later
            continue;
          }
        }

        // Process mutation
        const mutationResult = await this.processMutation(mutation);

        if (mutationResult.success) {
          result.successful++;
          processed.add(mutation.id);
        } else if (mutationResult.conflictResult) {
          result.conflicts++;
          processed.add(mutation.id);
        } else {
          result.failed++;
          result.errors.push({
            mutationId: mutation.id,
            error: mutationResult.error || 'Unknown error',
          });
        }

        // Notify progress
        this.notifyListeners({
          type: 'replay_progress',
          data: {
            processed: result.successful + result.failed + result.conflicts,
            total: result.total,
          },
        });
      }

      // Process any remaining mutations (ones that were skipped due to dependencies)
      const remaining = pendingMutations.filter((m) => !processed.has(m.id));
      for (const mutation of remaining) {
        const mutationResult = await this.processMutation(mutation);
        if (mutationResult.success) {
          result.successful++;
        } else if (mutationResult.conflictResult) {
          result.conflicts++;
        } else {
          result.failed++;
          result.errors.push({
            mutationId: mutation.id,
            error: mutationResult.error || 'Unknown error',
          });
        }
      }
    } finally {
      this.isReplaying = false;
    }

    // Cleanup completed mutations
    await this.cleanupCompletedMutations();

    console.info(
      `[OfflineMutationHandler] Replay completed: ${result.successful} successful, ${result.failed} failed, ${result.conflicts} conflicts`
    );

    this.notifyListeners({ type: 'replay_completed', data: result });

    return result;
  }

  /**
   * Process a single mutation
   */
  private async processMutation(mutation: Mutation): Promise<MutationResult> {
    console.info(`[OfflineMutationHandler] Processing mutation: ${mutation.id}`);

    await this.updateMutationStatus(mutation.id, 'processing');

    try {
      // Fetch current server state for conflict detection
      const serverData = await this.fetchServerData(mutation.entityType, mutation.entityId);

      // Check for conflicts
      if (serverData && mutation.type !== 'create') {
        const conflictResult = conflictResolver.resolve(
          mutation.entityType,
          mutation.payload,
          serverData
        );

        if (conflictResult.requiresManualResolution) {
          await this.updateMutationStatus(mutation.id, 'conflict');
          this.notifyListeners({
            type: 'mutation_conflict',
            data: { mutation, conflict: conflictResult },
          });

          return {
            success: false,
            mutationId: mutation.id,
            conflictResult,
          };
        }

        // Apply resolved data if merge occurred
        if (conflictResult.merged) {
          mutation.payload = conflictResult.merged;
        }
      }

      // Send mutation to server
      const response = await this.sendMutation(mutation);

      // Update local database with server response
      if (response.success && response.data) {
        await this.updateLocalRecord(mutation, response.data);
      }

      await this.updateMutationStatus(mutation.id, 'completed');

      return {
        success: true,
        mutationId: mutation.id,
        serverData: response.data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateMutationStatus(mutation.id, 'failed', errorMessage);

      return {
        success: false,
        mutationId: mutation.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch current server data for an entity
   */
  private async fetchServerData(
    entityType: string,
    entityId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/api';
      const endpoint = `${apiBaseUrl}/${this.getApiPath(entityType)}/${entityId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Auth token would be added here
        },
      });

      if (response.status === 404) {
        return null; // Entity doesn't exist on server
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[OfflineMutationHandler] Failed to fetch server data:`, error);
      return null;
    }
  }

  /**
   * Send mutation to server
   */
  private async sendMutation(
    mutation: Mutation
  ): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/api';
    const basePath = this.getApiPath(mutation.entityType);

    let endpoint: string;
    let method: string;

    switch (mutation.type) {
      case 'create':
        endpoint = `${apiBaseUrl}/${basePath}`;
        method = 'POST';
        break;
      case 'update':
        endpoint = `${apiBaseUrl}/${basePath}/${mutation.entityId}`;
        method = 'PATCH';
        break;
      case 'delete':
        endpoint = `${apiBaseUrl}/${basePath}/${mutation.entityId}`;
        method = 'DELETE';
        break;
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Auth token would be added here
      },
      body: mutation.type !== 'delete' ? JSON.stringify(mutation.payload) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    if (mutation.type === 'delete') {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  }

  /**
   * Update local record with server response
   */
  private async updateLocalRecord(
    mutation: Mutation,
    serverData: Record<string, unknown>
  ): Promise<void> {
    const collection = this.database.get(mutation.entityType);

    await this.database.write(async () => {
      if (mutation.type === 'create') {
        // Find local record by local ID and update with server ID
        const localRecords = await collection.query(Q.where('id', mutation.entityId)).fetch();

        if (localRecords.length > 0) {
          await localRecords[0].update((record: any) => {
            record.serverId = serverData.id;
            record.isSynced = true;
            record.needsPush = false;
            record.lastSyncedAt = Date.now();
          });
        }
      } else if (mutation.type === 'update') {
        // Update local record with server response
        const localRecords = await collection
          .query(Q.where('server_id', mutation.entityId))
          .fetch();

        if (localRecords.length > 0) {
          await localRecords[0].update((record: any) => {
            record.isSynced = true;
            record.needsPush = false;
            record.lastSyncedAt = Date.now();
            // Update fields from server response if needed
            record.serverUpdatedAt = serverData.updatedAt;
          });
        }
      }
      // Delete mutations: local record should already be marked as deleted
    });
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
   * Cleanup completed mutations
   */
  private async cleanupCompletedMutations(): Promise<void> {
    const now = Date.now();
    const retentionMs = this.config.historyRetentionDays * 24 * 60 * 60 * 1000;

    for (const [id, mutation] of this.mutations) {
      if (
        mutation.status === 'completed' ||
        mutation.status === 'cancelled' ||
        (mutation.status === 'failed' && mutation.retryCount >= this.config.maxRetries)
      ) {
        // Remove if older than retention period
        if (now - mutation.timestamp > retentionMs) {
          this.mutations.delete(id);
          this.mutationOrder = this.mutationOrder.filter((orderId) => orderId !== id);
        }
      }
    }

    await this.persistMutations();
  }

  /**
   * Cancel a pending mutation
   */
  async cancelMutation(mutationId: string): Promise<boolean> {
    const mutation = this.mutations.get(mutationId);
    if (mutation?.status === 'pending') {
      mutation.status = 'cancelled';
      this.mutations.set(mutationId, mutation);
      await this.persistMutations();
      return true;
    }
    return false;
  }

  /**
   * Retry a failed mutation
   */
  async retryMutation(mutationId: string): Promise<MutationResult> {
    const mutation = this.mutations.get(mutationId);
    if (!mutation) {
      return { success: false, mutationId, error: 'Mutation not found' };
    }

    if (mutation.status !== 'failed') {
      return { success: false, mutationId, error: 'Mutation is not in failed state' };
    }

    mutation.status = 'pending';
    this.mutations.set(mutationId, mutation);

    return this.processMutation(mutation);
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    mutationId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: Record<string, unknown>
  ): Promise<MutationResult> {
    const mutation = this.mutations.get(mutationId);
    if (mutation?.status !== 'conflict') {
      return { success: false, mutationId, error: 'Invalid mutation or not in conflict state' };
    }

    switch (resolution) {
      case 'local':
        // Retry with local data
        mutation.status = 'pending';
        this.mutations.set(mutationId, mutation);
        return this.processMutation(mutation);

      case 'server':
        // Discard local changes
        await this.updateMutationStatus(mutationId, 'cancelled');
        return { success: true, mutationId };

      case 'merge':
        if (!mergedData) {
          return { success: false, mutationId, error: 'Merged data required for merge resolution' };
        }
        mutation.payload = mergedData;
        mutation.status = 'pending';
        this.mutations.set(mutationId, mutation);
        return this.processMutation(mutation);
    }
  }

  /**
   * Get mutation history
   */
  getMutationHistory(): Mutation[] {
    return Array.from(this.mutations.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all mutations
   */
  async clearAllMutations(): Promise<void> {
    this.mutations.clear();
    this.mutationOrder = [];
    await this.persistMutations();
    console.info('[OfflineMutationHandler] All mutations cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OfflineMutationConfig>): void {
    this.config = { ...this.config, ...config };
    console.info('[OfflineMutationHandler] Config updated');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    conflicts: number;
  } {
    const mutations = Array.from(this.mutations.values());

    return {
      total: mutations.length,
      pending: mutations.filter((m) => m.status === 'pending').length,
      processing: mutations.filter((m) => m.status === 'processing').length,
      completed: mutations.filter((m) => m.status === 'completed').length,
      failed: mutations.filter((m) => m.status === 'failed').length,
      conflicts: mutations.filter((m) => m.status === 'conflict').length,
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.listeners.clear();
    console.info('[OfflineMutationHandler] Destroyed');
  }
}

// Export singleton instance
export const offlineMutationHandler = OfflineMutationHandler.getInstance();
export { OfflineMutationHandler };
export default OfflineMutationHandler;
