/**
 * OfflineManager.ts
 * Main controller for offline functionality
 * Handles data caching, sync orchestration, and offline state management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkDetector } from './NetworkDetector';
import { SyncQueue, SyncQueueItem, SyncPriority } from './SyncQueue';
import { ConflictResolver, ConflictStrategy } from './ConflictResolver';
import { LocalDatabase } from '../database/LocalDatabase';
import { Logger } from '../../utils/Logger';

// Cache keys for different data types
export const CACHE_KEYS = {
  TICKETS: '@offline/tickets',
  WALLET_BALANCE: '@offline/wallet_balance',
  TRANSACTIONS: '@offline/transactions',
  PROGRAM: '@offline/program',
  ARTISTS: '@offline/artists',
  STAGES: '@offline/stages',
  MAP_DATA: '@offline/map_data',
  USER_PROFILE: '@offline/user_profile',
  FESTIVALS: '@offline/festivals',
  NOTIFICATIONS: '@offline/notifications',
  FAVORITES: '@offline/favorites',
  LAST_SYNC: '@offline/last_sync',
  SYNC_METADATA: '@offline/sync_metadata',
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

// Cache item structure with metadata
export interface CachedItem<T> {
  data: T;
  timestamp: number;
  version: number;
  expiresAt: number | null;
  checksum?: string;
}

// Sync status for tracking progress
export interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errors: SyncError[];
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
}

export interface SyncError {
  key: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRY = {
  TICKETS: 1000 * 60 * 60 * 24, // 24 hours
  WALLET: 1000 * 60 * 5, // 5 minutes
  PROGRAM: 1000 * 60 * 60 * 6, // 6 hours
  MAP: 1000 * 60 * 60 * 24 * 7, // 7 days
  USER: 1000 * 60 * 60, // 1 hour
  FESTIVALS: 1000 * 60 * 60 * 12, // 12 hours
  NEVER: null, // Never expires
} as const;

// Offline manager configuration
export interface OfflineManagerConfig {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  maxRetries: number;
  conflictStrategy: ConflictStrategy;
  backgroundSync: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

const DEFAULT_CONFIG: OfflineManagerConfig = {
  autoSync: true,
  syncInterval: 1000 * 60 * 5, // 5 minutes
  maxRetries: 3,
  conflictStrategy: 'last-write-wins',
  backgroundSync: true,
  compressionEnabled: false,
  encryptionEnabled: false,
};

class OfflineManager {
  private static instance: OfflineManager;
  private config: OfflineManagerConfig;
  private networkDetector: NetworkDetector;
  private syncQueue: SyncQueue;
  private conflictResolver: ConflictResolver;
  private localDatabase: LocalDatabase;
  private syncStatus: SyncStatus;
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private isInitialized: boolean = false;

  private constructor(config: Partial<OfflineManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkDetector = NetworkDetector.getInstance();
    this.syncQueue = SyncQueue.getInstance();
    this.conflictResolver = new ConflictResolver(this.config.conflictStrategy);
    this.localDatabase = LocalDatabase.getInstance();
    this.syncStatus = this.getInitialSyncStatus();
  }

  public static getInstance(config?: Partial<OfflineManagerConfig>): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(config);
    }
    return OfflineManager.instance;
  }

  private getInitialSyncStatus(): SyncStatus {
    return {
      isRunning: false,
      progress: 0,
      currentStep: '',
      totalSteps: 0,
      completedSteps: 0,
      errors: [],
      lastSyncAt: null,
      nextSyncAt: null,
    };
  }

  /**
   * Initialize the offline manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.debug('[OfflineManager] Already initialized');
      return;
    }

    try {
      Logger.info('[OfflineManager] Initializing...');

      // Initialize local database
      await this.localDatabase.initialize();

      // Initialize network detector
      await this.networkDetector.initialize();

      // Load last sync time
      await this.loadLastSyncTime();

      // Set up network change listener
      this.networkDetector.addListener(this.handleNetworkChange.bind(this));

      // Start auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      Logger.info('[OfflineManager] Initialized successfully');
    } catch (error) {
      Logger.error('[OfflineManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    Logger.info(`[OfflineManager] Network changed: ${isOnline ? 'online' : 'offline'}`);

    if (isOnline) {
      // Trigger sync when coming back online
      this.syncAll().catch((error) => {
        Logger.error('[OfflineManager] Sync on reconnect failed:', error);
      });
    }

    this.notifyListeners('networkChange', { isOnline });
  }

  /**
   * Cache data with key
   */
  public async cacheData<T>(
    key: CacheKey,
    data: T,
    expiryMs: number | null = CACHE_EXPIRY.NEVER
  ): Promise<void> {
    try {
      const cachedItem: CachedItem<T> = {
        data,
        timestamp: Date.now(),
        version: await this.getNextVersion(key),
        expiresAt: expiryMs ? Date.now() + expiryMs : null,
        checksum: this.generateChecksum(data),
      };

      await AsyncStorage.setItem(key, JSON.stringify(cachedItem));
      Logger.debug(`[OfflineManager] Cached data for key: ${key}`);

      // Also store in local database for complex queries
      await this.localDatabase.upsert(key, cachedItem);

      this.notifyListeners('cacheUpdate', { key, data });
    } catch (error) {
      Logger.error(`[OfflineManager] Failed to cache data for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get cached data by key
   */
  public async getCachedData<T>(key: CacheKey): Promise<T | null> {
    try {
      const cachedString = await AsyncStorage.getItem(key);
      if (!cachedString) {
        return null;
      }

      const cachedItem: CachedItem<T> = JSON.parse(cachedString);

      // Check if expired
      if (cachedItem.expiresAt && cachedItem.expiresAt < Date.now()) {
        Logger.debug(`[OfflineManager] Cache expired for key: ${key}`);
        await this.removeCachedData(key);
        return null;
      }

      return cachedItem.data;
    } catch (error) {
      Logger.error(`[OfflineManager] Failed to get cached data for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Get cached item with metadata
   */
  public async getCachedItem<T>(key: CacheKey): Promise<CachedItem<T> | null> {
    try {
      const cachedString = await AsyncStorage.getItem(key);
      if (!cachedString) {
        return null;
      }

      return JSON.parse(cachedString);
    } catch (error) {
      Logger.error(`[OfflineManager] Failed to get cached item for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  public async removeCachedData(key: CacheKey): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      await this.localDatabase.delete(key);
      Logger.debug(`[OfflineManager] Removed cached data for key: ${key}`);
    } catch (error) {
      Logger.error(`[OfflineManager] Failed to remove cached data for key: ${key}`, error);
    }
  }

  /**
   * Clear all cached data
   */
  public async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
      await this.localDatabase.clearAll();
      Logger.info('[OfflineManager] Cleared all cached data');
    } catch (error) {
      Logger.error('[OfflineManager] Failed to clear all cache:', error);
      throw error;
    }
  }

  /**
   * Add an action to the sync queue
   */
  public async queueAction(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const id = await this.syncQueue.add(item);
    Logger.debug(`[OfflineManager] Queued action: ${item.action} with id: ${id}`);

    // If online and auto-sync enabled, process immediately
    if (this.networkDetector.isOnline() && this.config.autoSync) {
      this.processSyncQueue().catch((error) => {
        Logger.error('[OfflineManager] Failed to process queue after queueing action:', error);
      });
    }

    return id;
  }

  /**
   * Process the sync queue
   */
  public async processSyncQueue(): Promise<void> {
    if (!this.networkDetector.isOnline()) {
      Logger.debug('[OfflineManager] Offline, skipping queue processing');
      return;
    }

    const items = await this.syncQueue.getAll();
    if (items.length === 0) {
      Logger.debug('[OfflineManager] No items in sync queue');
      return;
    }

    Logger.info(`[OfflineManager] Processing ${items.length} queued items`);

    for (const item of items) {
      if (item.status === 'completed') continue;

      try {
        await this.syncQueue.markProcessing(item.id);
        await this.processQueueItem(item);
        await this.syncQueue.markCompleted(item.id);
        Logger.debug(`[OfflineManager] Processed queue item: ${item.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.syncQueue.markFailed(item.id, errorMessage);

        if (item.retryCount < this.config.maxRetries) {
          Logger.warn(`[OfflineManager] Queue item ${item.id} failed, will retry`);
        } else {
          Logger.error(`[OfflineManager] Queue item ${item.id} failed after max retries`);
        }
      }
    }

    // Clean up completed items
    await this.syncQueue.removeCompleted();
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const response = await fetch(item.endpoint, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        ...item.headers,
      },
      body: item.body ? JSON.stringify(item.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    // Handle response data if needed
    if (item.onSuccess) {
      const data = await response.json();
      // Call success handler (stored as action type)
      this.notifyListeners(`sync:${item.action}:success`, data);
    }
  }

  /**
   * Sync all data from server
   */
  public async syncAll(force: boolean = false): Promise<SyncStatus> {
    if (this.syncStatus.isRunning && !force) {
      Logger.debug('[OfflineManager] Sync already in progress');
      return this.syncStatus;
    }

    if (!this.networkDetector.isOnline()) {
      Logger.debug('[OfflineManager] Offline, cannot sync');
      return this.syncStatus;
    }

    const steps = [
      { name: 'tickets', key: CACHE_KEYS.TICKETS },
      { name: 'wallet', key: CACHE_KEYS.WALLET_BALANCE },
      { name: 'transactions', key: CACHE_KEYS.TRANSACTIONS },
      { name: 'program', key: CACHE_KEYS.PROGRAM },
      { name: 'festivals', key: CACHE_KEYS.FESTIVALS },
      { name: 'user', key: CACHE_KEYS.USER_PROFILE },
    ];

    this.syncStatus = {
      ...this.syncStatus,
      isRunning: true,
      progress: 0,
      currentStep: '',
      totalSteps: steps.length + 1, // +1 for queue processing
      completedSteps: 0,
      errors: [],
    };

    this.notifyListeners('syncStart', this.syncStatus);

    try {
      // First, process the queue
      this.syncStatus.currentStep = 'Processing offline actions...';
      this.notifyListeners('syncProgress', this.syncStatus);
      await this.processSyncQueue();
      this.syncStatus.completedSteps++;
      this.syncStatus.progress = (this.syncStatus.completedSteps / this.syncStatus.totalSteps) * 100;

      // Then sync each data type
      for (const step of steps) {
        this.syncStatus.currentStep = `Syncing ${step.name}...`;
        this.notifyListeners('syncProgress', this.syncStatus);

        try {
          await this.syncDataType(step.name);
          this.syncStatus.completedSteps++;
          this.syncStatus.progress = (this.syncStatus.completedSteps / this.syncStatus.totalSteps) * 100;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.syncStatus.errors.push({
            key: step.key,
            message: errorMessage,
            timestamp: new Date(),
            retryable: true,
          });
          Logger.error(`[OfflineManager] Failed to sync ${step.name}:`, error);
        }
      }

      this.syncStatus.lastSyncAt = new Date();
      this.syncStatus.nextSyncAt = new Date(Date.now() + this.config.syncInterval);
      await this.saveLastSyncTime();

      Logger.info('[OfflineManager] Sync completed successfully');
    } catch (error) {
      Logger.error('[OfflineManager] Sync failed:', error);
    } finally {
      this.syncStatus.isRunning = false;
      this.syncStatus.currentStep = '';
      this.notifyListeners('syncComplete', this.syncStatus);
    }

    return this.syncStatus;
  }

  /**
   * Sync a specific data type
   */
  private async syncDataType(type: string): Promise<void> {
    // This would call the API service to fetch fresh data
    // and use the conflict resolver if needed
    this.notifyListeners(`sync:${type}`, { type });
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.networkDetector.isOnline()) {
        this.syncAll().catch((error) => {
          Logger.error('[OfflineManager] Auto-sync failed:', error);
        });
      }
    }, this.config.syncInterval);

    Logger.info(`[OfflineManager] Auto-sync started with interval: ${this.config.syncInterval}ms`);
  }

  /**
   * Stop auto-sync timer
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      Logger.info('[OfflineManager] Auto-sync stopped');
    }
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get queue length
   */
  public async getQueueLength(): Promise<number> {
    return this.syncQueue.getLength();
  }

  /**
   * Check if data is stale
   */
  public async isDataStale(key: CacheKey): Promise<boolean> {
    const item = await this.getCachedItem(key);
    if (!item) return true;

    if (item.expiresAt && item.expiresAt < Date.now()) {
      return true;
    }

    return false;
  }

  /**
   * Resolve conflict between local and server data
   */
  public async resolveConflict<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): Promise<T> {
    return this.conflictResolver.resolve(localData, serverData, serverTimestamp);
  }

  /**
   * Add listener for events
   */
  public addListener(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        Logger.error(`[OfflineManager] Listener error for event ${event}:`, error);
      }
    });
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Get next version number for a cache key
   */
  private async getNextVersion(key: CacheKey): Promise<number> {
    const existing = await this.getCachedItem(key);
    return existing ? existing.version + 1 : 1;
  }

  /**
   * Load last sync time from storage
   */
  private async loadLastSyncTime(): Promise<void> {
    try {
      const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      if (lastSync) {
        this.syncStatus.lastSyncAt = new Date(lastSync);
      }
    } catch (error) {
      Logger.error('[OfflineManager] Failed to load last sync time:', error);
    }
  }

  /**
   * Save last sync time to storage
   */
  private async saveLastSyncTime(): Promise<void> {
    try {
      if (this.syncStatus.lastSyncAt) {
        await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, this.syncStatus.lastSyncAt.toISOString());
      }
    } catch (error) {
      Logger.error('[OfflineManager] Failed to save last sync time:', error);
    }
  }

  /**
   * Get network status
   */
  public isOnline(): boolean {
    return this.networkDetector.isOnline();
  }

  /**
   * Get configuration
   */
  public getConfig(): OfflineManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<OfflineManagerConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.autoSync !== undefined) {
      if (config.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }

    if (config.conflictStrategy) {
      this.conflictResolver.setStrategy(config.conflictStrategy);
    }

    Logger.info('[OfflineManager] Configuration updated');
  }

  /**
   * Cleanup and destroy instance
   */
  public async destroy(): Promise<void> {
    this.stopAutoSync();
    this.networkDetector.removeAllListeners();
    this.listeners.clear();
    this.isInitialized = false;
    Logger.info('[OfflineManager] Destroyed');
  }
}

export const offlineManager = OfflineManager.getInstance();
export default OfflineManager;
