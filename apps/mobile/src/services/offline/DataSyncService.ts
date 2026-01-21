/**
 * DataSyncService.ts
 * Complete data synchronization service for offline-first mobile app
 * Handles bi-directional sync with conflict resolution and delta updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineManager, CACHE_KEYS, CACHE_EXPIRY } from './OfflineManager';
import { syncQueue, SyncPriority } from './SyncQueue';
import { networkDetector } from './NetworkDetector';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.festival.app';

// Sync configuration
export interface DataSyncConfig {
  apiBaseUrl: string;
  authToken: string | null;
  festivalId: string | null;
  userId: string | null;
  enableDeltaSync: boolean;
  enableCompression: boolean;
  maxBatchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

// Sync result
export interface SyncResult {
  success: boolean;
  dataType: string;
  itemsSynced: number;
  conflicts: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

// Full sync result
export interface FullSyncResult {
  success: boolean;
  results: SyncResult[];
  totalItemsSynced: number;
  totalConflicts: number;
  totalErrors: number;
  duration: number;
  timestamp: Date;
}

// Delta sync metadata
interface DeltaSyncMeta {
  lastSyncTimestamp: number;
  lastServerVersion: string | null;
  checksums: Record<string, string>;
}

// Data types for sync
export type SyncDataType =
  | 'tickets'
  | 'wallet'
  | 'transactions'
  | 'program'
  | 'artists'
  | 'stages'
  | 'map'
  | 'user'
  | 'festivals'
  | 'notifications'
  | 'favorites';

// Sync priority mapping
const SYNC_PRIORITY_MAP: Record<SyncDataType, SyncPriority> = {
  tickets: 'critical',
  wallet: 'critical',
  transactions: 'high',
  program: 'normal',
  artists: 'normal',
  stages: 'normal',
  map: 'low',
  user: 'high',
  festivals: 'normal',
  notifications: 'high',
  favorites: 'low',
};

// Sync order (dependencies)
const SYNC_ORDER: SyncDataType[] = [
  'user',
  'festivals',
  'tickets',
  'wallet',
  'transactions',
  'program',
  'artists',
  'stages',
  'map',
  'notifications',
  'favorites',
];

const DELTA_SYNC_META_KEY = '@sync/delta_meta';

class DataSyncService {
  private static instance: DataSyncService;
  private config: DataSyncConfig;
  private deltaMeta: Record<SyncDataType, DeltaSyncMeta>;
  private isSyncing = false;
  private syncListeners = new Set<(result: SyncResult) => void>();
  private abortController: AbortController | null = null;

  private constructor() {
    this.config = {
      apiBaseUrl: API_BASE_URL,
      authToken: null,
      festivalId: null,
      userId: null,
      enableDeltaSync: true,
      enableCompression: true,
      maxBatchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
    };
    this.deltaMeta = this.getInitialDeltaMeta();
  }

  public static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  private getInitialDeltaMeta(): Record<SyncDataType, DeltaSyncMeta> {
    const meta: Partial<Record<SyncDataType, DeltaSyncMeta>> = {};
    for (const dataType of SYNC_ORDER) {
      meta[dataType] = {
        lastSyncTimestamp: 0,
        lastServerVersion: null,
        checksums: {},
      };
    }
    return meta as Record<SyncDataType, DeltaSyncMeta>;
  }

  /**
   * Initialize the sync service
   */
  public async initialize(config: Partial<DataSyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.loadDeltaMeta();
    console.log('[DataSyncService] Initialized');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DataSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Load delta sync metadata from storage
   */
  private async loadDeltaMeta(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(DELTA_SYNC_META_KEY);
      if (stored) {
        this.deltaMeta = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[DataSyncService] Failed to load delta meta:', error);
    }
  }

  /**
   * Save delta sync metadata to storage
   */
  private async saveDeltaMeta(): Promise<void> {
    try {
      await AsyncStorage.setItem(DELTA_SYNC_META_KEY, JSON.stringify(this.deltaMeta));
    } catch (error) {
      console.error('[DataSyncService] Failed to save delta meta:', error);
    }
  }

  /**
   * Perform a full sync of all data types
   */
  public async syncAll(force = false): Promise<FullSyncResult> {
    if (this.isSyncing && !force) {
      console.log('[DataSyncService] Sync already in progress');
      return {
        success: false,
        results: [],
        totalItemsSynced: 0,
        totalConflicts: 0,
        totalErrors: 1,
        duration: 0,
        timestamp: new Date(),
      };
    }

    if (!networkDetector.isOnline()) {
      console.log('[DataSyncService] Offline, cannot sync');
      return {
        success: false,
        results: [],
        totalItemsSynced: 0,
        totalConflicts: 0,
        totalErrors: 1,
        duration: 0,
        timestamp: new Date(),
      };
    }

    this.isSyncing = true;
    this.abortController = new AbortController();
    const startTime = Date.now();
    const results: SyncResult[] = [];

    try {
      // First, push local changes to server
      await this.pushLocalChanges();

      // Then pull updates from server for each data type
      for (const dataType of SYNC_ORDER) {
        try {
          const result = await this.syncDataType(dataType);
          results.push(result);
          this.notifySyncListeners(result);
        } catch (error) {
          results.push({
            success: false,
            dataType,
            itemsSynced: 0,
            conflicts: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration: 0,
            timestamp: new Date(),
          });
        }
      }

      await this.saveDeltaMeta();

      const duration = Date.now() - startTime;
      const totalItemsSynced = results.reduce((sum, r) => sum + r.itemsSynced, 0);
      const totalConflicts = results.reduce((sum, r) => sum + r.conflicts, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      console.log(`[DataSyncService] Full sync completed in ${duration}ms`);

      return {
        success: totalErrors === 0,
        results,
        totalItemsSynced,
        totalConflicts,
        totalErrors,
        duration,
        timestamp: new Date(),
      };
    } finally {
      this.isSyncing = false;
      this.abortController = null;
    }
  }

  /**
   * Sync a specific data type
   */
  public async syncDataType(dataType: SyncDataType): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsSynced = 0;
    let conflicts = 0;

    try {
      const endpoint = this.getEndpointForDataType(dataType);
      const cacheKey = this.getCacheKeyForDataType(dataType);
      const meta = this.deltaMeta[dataType];

      // Build query params for delta sync
      const params = new URLSearchParams();
      if (this.config.enableDeltaSync && meta.lastSyncTimestamp > 0) {
        params.append('since', meta.lastSyncTimestamp.toString());
      }
      if (this.config.festivalId) {
        params.append('festivalId', this.config.festivalId);
      }

      const url = `${this.config.apiBaseUrl}${endpoint}?${params.toString()}`;

      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const serverData = await response.json();

      // Get local data
      const localData = await offlineManager.getCachedData(cacheKey);

      // Merge data with conflict resolution
      const { merged, conflictCount } = await this.mergeData(
        dataType,
        localData,
        serverData.data || serverData,
        serverData.serverTimestamp || Date.now()
      );

      conflicts = conflictCount;
      itemsSynced = Array.isArray(merged) ? merged.length : 1;

      // Cache merged data
      await offlineManager.cacheData(cacheKey, merged, this.getCacheExpiryForDataType(dataType));

      // Update delta meta
      this.deltaMeta[dataType] = {
        lastSyncTimestamp: Date.now(),
        lastServerVersion: serverData.version || null,
        checksums: this.generateChecksums(merged),
      };

      console.log(`[DataSyncService] Synced ${dataType}: ${itemsSynced} items`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error(`[DataSyncService] Failed to sync ${dataType}:`, error);
    }

    return {
      success: errors.length === 0,
      dataType,
      itemsSynced,
      conflicts,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Push local changes to server
   */
  private async pushLocalChanges(): Promise<void> {
    const pendingCount = await syncQueue.getPendingCount();
    if (pendingCount === 0) {
      return;
    }

    console.log(`[DataSyncService] Pushing ${pendingCount} local changes`);
    await offlineManager.processSyncQueue();
  }

  /**
   * Merge local and server data with conflict resolution
   */
  private async mergeData<T>(
    dataType: SyncDataType,
    localData: T | null,
    serverData: T,
    serverTimestamp: number
  ): Promise<{ merged: T; conflictCount: number }> {
    if (!localData) {
      return { merged: serverData, conflictCount: 0 };
    }

    // For simple data types, server wins by default
    if (!Array.isArray(serverData) || !Array.isArray(localData)) {
      return { merged: serverData, conflictCount: 0 };
    }

    // For arrays, merge by ID
    const localArray = localData as { id: string; updatedAt?: number }[];
    const serverArray = serverData as { id: string; updatedAt?: number }[];

    const merged: { id: string; updatedAt?: number }[] = [];
    const localMap = new Map(localArray.map((item) => [item.id, item]));
    let conflictCount = 0;

    for (const serverItem of serverArray) {
      const localItem = localMap.get(serverItem.id);

      if (!localItem) {
        // New item from server
        merged.push(serverItem);
      } else {
        // Item exists locally - resolve conflict
        const localTimestamp = localItem.updatedAt || 0;
        const serverItemTimestamp = serverItem.updatedAt || serverTimestamp;

        if (serverItemTimestamp >= localTimestamp) {
          // Server wins
          merged.push(serverItem);
        } else {
          // Local wins - push local change to server
          merged.push(localItem);
          conflictCount++;

          // Queue local change to be pushed
          await this.queueLocalChange(dataType, localItem);
        }

        localMap.delete(serverItem.id);
      }
    }

    // Add remaining local items (not on server)
    for (const localItem of localMap.values()) {
      merged.push(localItem);
      // Queue for push to server
      await this.queueLocalChange(dataType, localItem);
    }

    return { merged: merged as unknown as T, conflictCount };
  }

  /**
   * Queue a local change for sync
   */
  private async queueLocalChange(dataType: SyncDataType, data: unknown): Promise<void> {
    const endpoint = this.getEndpointForDataType(dataType);

    await syncQueue.add({
      action: `sync:${dataType}`,
      endpoint: `${this.config.apiBaseUrl}${endpoint}`,
      method: 'PUT',
      body: data as Record<string, unknown>,
      headers: this.getHeaders(),
      priority: SYNC_PRIORITY_MAP[dataType],
      timeout: 30000,
      maxRetries: this.config.retryAttempts,
    });
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    if (this.config.enableCompression) {
      headers['Accept-Encoding'] = 'gzip, deflate';
    }

    return headers;
  }

  /**
   * Get API endpoint for data type
   */
  private getEndpointForDataType(dataType: SyncDataType): string {
    const endpoints: Record<SyncDataType, string> = {
      tickets: '/api/tickets/me',
      wallet: '/api/cashless/balance',
      transactions: '/api/cashless/transactions',
      program: '/api/program',
      artists: '/api/artists',
      stages: '/api/stages',
      map: '/api/map',
      user: '/api/auth/me',
      festivals: '/api/festivals',
      notifications: '/api/notifications',
      favorites: '/api/favorites',
    };
    return endpoints[dataType];
  }

  /**
   * Get cache key for data type
   */
  private getCacheKeyForDataType(dataType: SyncDataType): string {
    const cacheKeys: Record<SyncDataType, string> = {
      tickets: CACHE_KEYS.TICKETS,
      wallet: CACHE_KEYS.WALLET_BALANCE,
      transactions: CACHE_KEYS.TRANSACTIONS,
      program: CACHE_KEYS.PROGRAM,
      artists: CACHE_KEYS.ARTISTS,
      stages: CACHE_KEYS.STAGES,
      map: CACHE_KEYS.MAP_DATA,
      user: CACHE_KEYS.USER_PROFILE,
      festivals: CACHE_KEYS.FESTIVALS,
      notifications: CACHE_KEYS.NOTIFICATIONS,
      favorites: CACHE_KEYS.FAVORITES,
    };
    return cacheKeys[dataType];
  }

  /**
   * Get cache expiry for data type
   */
  private getCacheExpiryForDataType(dataType: SyncDataType): number | null {
    const expiry: Record<SyncDataType, number | null> = {
      tickets: CACHE_EXPIRY.TICKETS,
      wallet: CACHE_EXPIRY.WALLET,
      transactions: CACHE_EXPIRY.WALLET,
      program: CACHE_EXPIRY.PROGRAM,
      artists: CACHE_EXPIRY.PROGRAM,
      stages: CACHE_EXPIRY.PROGRAM,
      map: CACHE_EXPIRY.MAP,
      user: CACHE_EXPIRY.USER,
      festivals: CACHE_EXPIRY.FESTIVALS,
      notifications: CACHE_EXPIRY.USER,
      favorites: CACHE_EXPIRY.NEVER,
    };
    return expiry[dataType];
  }

  /**
   * Generate checksums for data integrity
   */
  private generateChecksums(data: unknown): Record<string, string> {
    const checksums: Record<string, string> = {};

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item && typeof item === 'object' && 'id' in item) {
          checksums[(item as { id: string }).id] = this.hashObject(item);
        }
      }
    } else if (data && typeof data === 'object') {
      checksums['main'] = this.hashObject(data);
    }

    return checksums;
  }

  /**
   * Simple hash function for objects
   */
  private hashObject(obj: unknown): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add sync listener
   */
  public addSyncListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach((listener) => {
      try {
        listener(result);
      } catch (error) {
        console.error('[DataSyncService] Listener error:', error);
      }
    });
  }

  /**
   * Cancel ongoing sync
   */
  public cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if sync is in progress
   */
  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time for a data type
   */
  public getLastSyncTime(dataType: SyncDataType): Date | null {
    const timestamp = this.deltaMeta[dataType]?.lastSyncTimestamp;
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Force refresh a specific data type
   */
  public async forceRefresh(dataType: SyncDataType): Promise<SyncResult> {
    // Clear delta meta to force full sync
    this.deltaMeta[dataType] = {
      lastSyncTimestamp: 0,
      lastServerVersion: null,
      checksums: {},
    };

    return this.syncDataType(dataType);
  }

  /**
   * Clear all sync data and cache
   */
  public async clearAllData(): Promise<void> {
    await offlineManager.clearAllCache();
    await syncQueue.clear();
    this.deltaMeta = this.getInitialDeltaMeta();
    await this.saveDeltaMeta();
    console.log('[DataSyncService] All data cleared');
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    lastFullSync: Date | null;
    dataTypeStats: Record<SyncDataType, { lastSync: Date | null; itemCount: number }>;
  } {
    const dataTypeStats: Record<SyncDataType, { lastSync: Date | null; itemCount: number }> =
      {} as Record<SyncDataType, { lastSync: Date | null; itemCount: number }>;

    for (const dataType of SYNC_ORDER) {
      const meta = this.deltaMeta[dataType];
      dataTypeStats[dataType] = {
        lastSync: meta.lastSyncTimestamp ? new Date(meta.lastSyncTimestamp) : null,
        itemCount: Object.keys(meta.checksums).length,
      };
    }

    // Find the oldest last sync time as the "last full sync"
    const lastSyncTimes = Object.values(this.deltaMeta)
      .map((m) => m.lastSyncTimestamp)
      .filter((t) => t > 0);

    const lastFullSync = lastSyncTimes.length > 0 ? new Date(Math.min(...lastSyncTimes)) : null;

    return {
      lastFullSync,
      dataTypeStats,
    };
  }
}

export const dataSyncService = DataSyncService.getInstance();
export default DataSyncService;
