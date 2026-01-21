/**
 * SyncService
 * Enhanced bidirectional sync service between WatermelonDB and backend API
 * Features: delta sync, status tracking, background sync, periodic sync, network reconnection
 */

import { Database, Q } from '@nozbe/watermelondb';
import { synchronize, type SyncLog } from '@nozbe/watermelondb/sync';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { getDatabase, TableNames } from '../../database';
import { SyncMetadata, STALE_THRESHOLDS } from '../../database/models';
import { syncQueueService } from './SyncQueue';
import { conflictResolver } from './ConflictResolver';

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
  // Periodic sync configuration
  periodicSyncEnabled: boolean;
  periodicSyncInterval: number; // milliseconds
  // Background sync configuration
  backgroundSyncEnabled: boolean;
  // Auto sync on reconnection
  autoSyncOnReconnect: boolean;
  // Delta sync configuration
  deltaSyncEnabled: boolean;
  // Minimum interval between syncs (to prevent excessive syncing)
  minSyncInterval: number; // milliseconds
}

const DEFAULT_CONFIG: SyncConfig = {
  apiBaseUrl: API_BASE_URL,
  batchSize: 100,
  timeout: 30000,
  periodicSyncEnabled: true,
  periodicSyncInterval: 5 * 60 * 1000, // 5 minutes
  backgroundSyncEnabled: true,
  autoSyncOnReconnect: true,
  deltaSyncEnabled: true,
  minSyncInterval: 30 * 1000, // 30 seconds
};

// Sync status types
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'paused';

// Entity sync status
export interface EntitySyncStatus {
  entityType: string;
  lastSyncAt: Date | null;
  lastSyncToken: string | null;
  pendingChanges: number;
  isStale: boolean;
  isSyncing: boolean;
  lastError: string | null;
}

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: Date | null;
  lastError: string | null;
  pendingChanges: number;
  progress: number;
  currentEntity: string | null;
  // Enhanced tracking
  entityStatuses: Map<string, EntitySyncStatus>;
  isOnline: boolean;
  nextScheduledSync: Date | null;
  syncCount: number;
  failedSyncCount: number;
}

// Sync result types
export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  errors: string[];
  timestamp: Date;
  duration: number;
  entityResults: Map<string, { pulled: number; pushed: number; errors: string[] }>;
}

// Sync priority for entities
export enum SyncPriority {
  CRITICAL = 0, // Auth, user data
  HIGH = 1, // Tickets, cashless
  MEDIUM = 2, // Program, artists
  LOW = 3, // Notifications, favorites
}

// Entity sync priority mapping
const ENTITY_PRIORITIES: Record<string, SyncPriority> = {
  [TableNames.USERS]: SyncPriority.CRITICAL,
  [TableNames.TICKETS]: SyncPriority.HIGH,
  [TableNames.CASHLESS_ACCOUNTS]: SyncPriority.HIGH,
  [TableNames.CASHLESS_TRANSACTIONS]: SyncPriority.HIGH,
  [TableNames.FESTIVALS]: SyncPriority.MEDIUM,
  [TableNames.ARTISTS]: SyncPriority.MEDIUM,
  [TableNames.PERFORMANCES]: SyncPriority.MEDIUM,
  [TableNames.NOTIFICATIONS]: SyncPriority.LOW,
};

// Event listeners
type SyncEventListener = (status: SyncStatus) => void;
type NetworkChangeListener = (isOnline: boolean) => void;

/**
 * Main sync service class with enhanced functionality
 */
class SyncService {
  private static instance: SyncService;
  private database: Database;
  private config: SyncConfig;
  private status: SyncStatus;
  private listeners = new Set<SyncEventListener>();
  private networkListeners = new Set<NetworkChangeListener>();
  private syncPromise: Promise<SyncResult> | null = null;
  private abortController: AbortController | null = null;

  // Periodic sync
  private periodicSyncTimer: NodeJS.Timeout | null = null;

  // Network and app state listeners
  private netInfoUnsubscribe: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  // Track last sync time for throttling
  private lastSyncTime = 0;

  // Track if we're waiting to sync after reconnection
  private pendingReconnectionSync = false;

  private constructor(config: Partial<SyncConfig> = {}) {
    this.database = getDatabase();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = this.createInitialStatus();
  }

  /**
   * Create initial sync status
   */
  private createInitialStatus(): SyncStatus {
    return {
      state: 'idle',
      lastSyncAt: null,
      lastError: null,
      pendingChanges: 0,
      progress: 0,
      currentEntity: null,
      entityStatuses: new Map(),
      isOnline: true,
      nextScheduledSync: null,
      syncCount: 0,
      failedSyncCount: 0,
    };
  }

  static getInstance(config?: Partial<SyncConfig>): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService(config);
    }
    return SyncService.instance;
  }

  /**
   * Initialize the sync service
   * Sets up network monitoring, app state monitoring, and periodic sync
   */
  async initialize(): Promise<void> {
    console.log('[SyncService] Initializing...');

    // Initialize entity sync statuses
    await this.initializeEntityStatuses();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Set up app state monitoring for background sync
    if (this.config.backgroundSyncEnabled) {
      this.setupAppStateMonitoring();
    }

    // Start periodic sync if enabled
    if (this.config.periodicSyncEnabled) {
      this.startPeriodicSync();
    }

    // Load pending changes count
    await this.updatePendingChangesCount();

    console.log('[SyncService] Initialized successfully');
  }

  /**
   * Initialize entity sync statuses from metadata
   */
  private async initializeEntityStatuses(): Promise<void> {
    const syncableEntities = Object.values(TableNames).filter(
      (name) => name !== TableNames.SYNC_METADATA && name !== TableNames.SYNC_QUEUE
    );

    for (const entityType of syncableEntities) {
      try {
        const metadata = await this.getOrCreateSyncMetadata(entityType);
        const threshold = STALE_THRESHOLDS[entityType] || 60 * 60 * 1000;

        this.status.entityStatuses.set(entityType, {
          entityType,
          lastSyncAt: metadata.lastPulledAt ? new Date(metadata.lastPulledAt) : null,
          lastSyncToken: metadata.syncToken || null,
          pendingChanges: metadata.pendingChangesCount,
          isStale: metadata.isStale(threshold),
          isSyncing: false,
          lastError: metadata.lastError || null,
        });
      } catch (error) {
        console.error(`[SyncService] Failed to init status for ${entityType}:`, error);
      }
    }
  }

  /**
   * Set up network state monitoring
   */
  private setupNetworkMonitoring(): void {
    // Get initial network state
    NetInfo.fetch().then((state) => {
      this.handleNetworkChange(state);
    });

    // Subscribe to network changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const wasOffline = !this.status.isOnline;
    const isNowOnline = state.isConnected && state.isInternetReachable !== false;

    this.status.isOnline = isNowOnline;

    // Update state if offline
    if (!isNowOnline && this.status.state !== 'syncing') {
      this.updateStatus({ state: 'offline' });
    } else if (isNowOnline && this.status.state === 'offline') {
      this.updateStatus({ state: 'idle' });
    }

    // Notify network listeners
    this.networkListeners.forEach((listener) => {
      try {
        listener(isNowOnline);
      } catch (error) {
        console.error('[SyncService] Network listener error:', error);
      }
    });

    // Auto-sync on reconnection
    if (wasOffline && isNowOnline && this.config.autoSyncOnReconnect) {
      console.log('[SyncService] Network reconnected, triggering sync');
      this.pendingReconnectionSync = true;

      // Delay sync slightly to allow network to stabilize
      setTimeout(() => {
        if (this.pendingReconnectionSync) {
          this.pendingReconnectionSync = false;
          this.sync().catch((error) => {
            console.error('[SyncService] Reconnection sync failed:', error);
          });
        }
      }, 2000);
    }
  }

  /**
   * Set up app state monitoring for background sync
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes (foreground/background)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      console.log('[SyncService] App came to foreground');

      // Check if we should sync
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      const shouldSync =
        this.status.isOnline &&
        timeSinceLastSync > this.config.minSyncInterval &&
        this.status.state !== 'syncing';

      if (shouldSync) {
        console.log('[SyncService] Triggering background-to-foreground sync');
        this.sync().catch((error) => {
          console.error('[SyncService] Foreground sync failed:', error);
        });
      }
    }
  }

  /**
   * Start periodic sync timer
   */
  startPeriodicSync(): void {
    this.stopPeriodicSync();

    if (!this.config.periodicSyncEnabled) {
      return;
    }

    const scheduleNextSync = () => {
      this.status.nextScheduledSync = new Date(Date.now() + this.config.periodicSyncInterval);
      this.notifyListeners();
    };

    this.periodicSyncTimer = setInterval(async () => {
      if (this.status.isOnline && this.status.state !== 'syncing') {
        console.log('[SyncService] Periodic sync triggered');
        await this.sync().catch((error) => {
          console.error('[SyncService] Periodic sync failed:', error);
        });
      }
      scheduleNextSync();
    }, this.config.periodicSyncInterval);

    scheduleNextSync();
    console.log(
      `[SyncService] Periodic sync started (interval: ${this.config.periodicSyncInterval}ms)`
    );
  }

  /**
   * Stop periodic sync timer
   */
  stopPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
      this.status.nextScheduledSync = null;
      console.log('[SyncService] Periodic sync stopped');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    const wasPeriodicEnabled = this.config.periodicSyncEnabled;
    this.config = { ...this.config, ...config };

    // Handle periodic sync config changes
    if (config.periodicSyncEnabled !== undefined || config.periodicSyncInterval !== undefined) {
      if (this.config.periodicSyncEnabled && !wasPeriodicEnabled) {
        this.startPeriodicSync();
      } else if (!this.config.periodicSyncEnabled && wasPeriodicEnabled) {
        this.stopPeriodicSync();
      } else if (this.config.periodicSyncEnabled && config.periodicSyncInterval !== undefined) {
        // Restart with new interval
        this.startPeriodicSync();
      }
    }
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
    return {
      ...this.status,
      entityStatuses: new Map(this.status.entityStatuses),
    };
  }

  /**
   * Get entity sync status
   */
  getEntityStatus(entityType: string): EntitySyncStatus | undefined {
    return this.status.entityStatuses.get(entityType);
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * Add status change listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add network change listener
   */
  addNetworkListener(listener: NetworkChangeListener): () => void {
    this.networkListeners.add(listener);
    return () => this.networkListeners.delete(listener);
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
   * Update entity status
   */
  private updateEntityStatus(entityType: string, updates: Partial<EntitySyncStatus>): void {
    const current = this.status.entityStatuses.get(entityType);
    if (current) {
      this.status.entityStatuses.set(entityType, { ...current, ...updates });
    }
  }

  /**
   * Update pending changes count
   */
  private async updatePendingChangesCount(): Promise<void> {
    const count = await this.getPendingChangesCount();
    this.updateStatus({ pendingChanges: count });
  }

  /**
   * Perform full sync
   */
  async sync(force = false): Promise<SyncResult> {
    // Check if online
    if (!this.status.isOnline) {
      console.log('[SyncService] Cannot sync: offline');
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        errors: ['Device is offline'],
        timestamp: new Date(),
        duration: 0,
        entityResults: new Map(),
      };
    }

    // Check minimum sync interval (unless forced)
    if (!force && this.lastSyncTime > 0) {
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      if (timeSinceLastSync < this.config.minSyncInterval) {
        console.log('[SyncService] Sync throttled, too soon since last sync');
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
    }

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
    const startTime = Date.now();
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      errors: [],
      timestamp: new Date(),
      duration: 0,
      entityResults: new Map(),
    };

    try {
      this.updateStatus({
        state: 'syncing',
        progress: 0,
        lastError: null,
        currentEntity: null,
      });
      this.status.syncCount++;

      // First, process offline queue
      this.updateStatus({ currentEntity: 'offline_queue', progress: 5 });
      const queueResult = await syncQueueService.processQueue(this.config.authToken);
      result.pushed += queueResult.processed;
      if (queueResult.errors.length > 0) {
        result.errors.push(...queueResult.errors);
      }

      this.updateStatus({ progress: 10 });

      // Perform delta sync if enabled, otherwise full sync
      if (this.config.deltaSyncEnabled) {
        await this.performDeltaSync(result);
      } else {
        await this.performFullSync(result);
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;
      this.lastSyncTime = Date.now();

      this.updateStatus({
        state: 'idle',
        lastSyncAt: new Date(),
        progress: 100,
        currentEntity: null,
      });

      // Update pending changes count
      await this.updatePendingChangesCount();

      console.log(
        `[SyncService] Sync completed: pulled=${result.pulled}, pushed=${result.pushed}, duration=${result.duration}ms`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.duration = Date.now() - startTime;

      this.status.failedSyncCount++;

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
   * Perform delta sync (only sync changed records)
   */
  private async performDeltaSync(result: SyncResult): Promise<void> {
    // Get entities sorted by priority
    const sortedEntities = this.getSortedEntitiesByPriority();
    const totalEntities = sortedEntities.length;
    let processedEntities = 0;

    for (const entityType of sortedEntities) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Sync aborted');
      }

      try {
        this.updateEntityStatus(entityType, { isSyncing: true });
        this.updateStatus({ currentEntity: entityType });

        // Get sync metadata for this entity
        const metadata = await this.getOrCreateSyncMetadata(entityType);

        // Check if entity needs sync (has changes or is stale)
        const threshold = STALE_THRESHOLDS[entityType] || 60 * 60 * 1000;
        const needsSync = metadata.needsSync || metadata.isStale(threshold);

        if (needsSync) {
          const entityResult = await this.syncEntity(entityType);
          result.pulled += entityResult.pulled;
          result.pushed += entityResult.pushed;
          result.errors.push(...entityResult.errors);
          result.entityResults.set(entityType, {
            pulled: entityResult.pulled,
            pushed: entityResult.pushed,
            errors: entityResult.errors,
          });

          this.updateEntityStatus(entityType, {
            lastSyncAt: new Date(),
            pendingChanges: 0,
            isStale: false,
            lastError: entityResult.errors.length > 0 ? entityResult.errors[0] : null,
          });
        }

        this.updateEntityStatus(entityType, { isSyncing: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.updateEntityStatus(entityType, {
          isSyncing: false,
          lastError: errorMessage,
        });
        result.errors.push(`${entityType}: ${errorMessage}`);
      }

      processedEntities++;
      const progress = 10 + (processedEntities / totalEntities) * 85;
      this.updateStatus({ progress });
    }
  }

  /**
   * Perform full sync using WatermelonDB synchronize
   */
  private async performFullSync(_result: SyncResult): Promise<void> {
    await synchronize({
      database: this.database,
      pullChanges: async ({ lastPulledAt, schemaVersion }) => {
        return this.pullChanges(lastPulledAt, schemaVersion);
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        return this.pushChanges(changes, lastPulledAt);
      },
      migrationsEnabledAtVersion: 1,
      log: this.createSyncLog(),
      conflictResolver: (table, local, remote, _resolved) => {
        return conflictResolver.resolveWatermelonConflict(table, local, remote);
      },
    });
  }

  /**
   * Get entities sorted by sync priority
   */
  private getSortedEntitiesByPriority(): string[] {
    const entities = Object.values(TableNames).filter(
      (name) => name !== TableNames.SYNC_METADATA && name !== TableNames.SYNC_QUEUE
    );

    return entities.sort((a, b) => {
      const priorityA = ENTITY_PRIORITIES[a] ?? SyncPriority.LOW;
      const priorityB = ENTITY_PRIORITIES[b] ?? SyncPriority.LOW;
      return priorityA - priorityB;
    });
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

    // Add delta sync flag
    if (this.config.deltaSyncEnabled) {
      params.append('deltaSync', 'true');
    }

    const response = await fetch(`${this.config.apiBaseUrl}/sync/pull?${params.toString()}`, {
      method: 'GET',
      headers,
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    this.updateStatus({ progress: 50 });

    return {
      changes: data.changes,
      timestamp: data.timestamp,
    };
  }

  /**
   * Push changes to server
   */
  private async pushChanges(changes: any, lastPulledAt: number | null): Promise<void> {
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

    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      errors: [],
      timestamp: new Date(),
      duration: 0,
      entityResults: new Map(),
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
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.duration = Date.now() - startTime;
      console.error(`[SyncService] Entity sync failed for ${entityType}:`, error);
    }

    return result;
  }

  /**
   * Pull changes for specific entity (delta sync)
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
      deltaSync: 'true',
    });

    if (this.config.festivalId) {
      params.append('festivalId', this.config.festivalId);
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/sync/pull/${entityType}?${params.toString()}`,
      {
        method: 'GET',
        headers,
        signal: this.abortController?.signal,
      }
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
  private async pushEntityChanges(entityType: string): Promise<{ count: number }> {
    const collection = this.database.get(entityType);
    const pendingRecords = await collection.query(Q.where('needs_push', true)).fetch();

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

    const response = await fetch(`${this.config.apiBaseUrl}/sync/push/${entityType}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ records }),
      signal: this.abortController?.signal,
    });

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
  private async applyPulledChanges(entityType: string, records: any[]): Promise<void> {
    if (!records || records.length === 0) {
      return;
    }

    const collection = this.database.get(entityType);

    await this.database.write(async () => {
      for (const serverRecord of records) {
        // Check if record exists locally
        let localRecord: any = null;
        try {
          localRecord = await collection.query(Q.where('server_id', serverRecord.id)).fetch();
          localRecord = localRecord[0];
        } catch {
          // Record doesn't exist
        }

        if (localRecord) {
          // Resolve conflict and update
          const resolved = conflictResolver.resolve(entityType, localRecord, serverRecord);

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
  private mapServerToLocal(local: any, server: any, _entityType: string): void {
    local.serverId = server.id;
    local.isSynced = true;
    local.lastSyncedAt = Date.now();
    local.needsPush = false;

    // Copy all other fields based on entity type
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
  private async getOrCreateSyncMetadata(entityType: string): Promise<SyncMetadata> {
    const collection = this.database.get<SyncMetadata>(TableNames.SYNC_METADATA);

    const existing = await collection.query(Q.where('entity_type', entityType)).fetch();

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
    const threshold = STALE_THRESHOLDS[entityType] || 60 * 60 * 1000;

    return metadata.needsSync || metadata.isStale(threshold);
  }

  /**
   * Get pending changes count
   */
  async getPendingChangesCount(): Promise<number> {
    let count = 0;

    // Count from sync queue
    const queueLength = await syncQueueService.getLength();
    count += queueLength;

    // Count from tables with needs_push
    for (const tableName of Object.values(TableNames)) {
      if (tableName === TableNames.SYNC_METADATA || tableName === TableNames.SYNC_QUEUE) {
        continue;
      }

      try {
        const collection = this.database.get(tableName);
        const pending = await collection.query(Q.where('needs_push', true)).fetchCount();
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
   * Pause sync (e.g., when user is actively using the app)
   */
  pauseSync(): void {
    this.stopPeriodicSync();
    this.updateStatus({ state: 'paused' });
  }

  /**
   * Resume sync
   */
  resumeSync(): void {
    if (this.config.periodicSyncEnabled) {
      this.startPeriodicSync();
    }
    this.updateStatus({ state: this.status.isOnline ? 'idle' : 'offline' });
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

    // Reset entity statuses
    for (const [entityType, status] of this.status.entityStatuses) {
      this.status.entityStatuses.set(entityType, {
        ...status,
        lastSyncAt: null,
        lastSyncToken: null,
        pendingChanges: 0,
        isStale: true,
        lastError: null,
      });
    }

    this.updateStatus({
      lastSyncAt: null,
      lastError: null,
      pendingChanges: 0,
      syncCount: 0,
      failedSyncCount: 0,
    });

    console.log('[SyncService] Sync state reset');
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopPeriodicSync();

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.listeners.clear();
    this.networkListeners.clear();

    console.log('[SyncService] Destroyed');
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
export default SyncService;
