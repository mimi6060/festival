/**
 * BackgroundSyncService
 * Handles background sync using Expo TaskManager
 * Enables sync when app is in background or closed
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Constants
const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';
const BACKGROUND_SYNC_INTERVAL = 15 * 60; // 15 minutes in seconds
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between syncs

// Storage keys
const STORAGE_KEYS = {
  LAST_BACKGROUND_SYNC: '@background_sync/last_sync',
  BACKGROUND_SYNC_ENABLED: '@background_sync/enabled',
  PENDING_SYNC_DATA: '@background_sync/pending_data',
};

// Background sync configuration
export interface BackgroundSyncConfig {
  enabled: boolean;
  minimumInterval: number; // seconds
  requiresWifi: boolean;
  requiresCharging: boolean;
}

const DEFAULT_CONFIG: BackgroundSyncConfig = {
  enabled: true,
  minimumInterval: BACKGROUND_SYNC_INTERVAL,
  requiresWifi: false,
  requiresCharging: false,
};

// Sync result type
export interface BackgroundSyncResult {
  success: boolean;
  syncedAt: Date;
  pulled: number;
  pushed: number;
  errors: string[];
  wasBackgroundTask: boolean;
}

// Event types
export type BackgroundSyncEvent =
  | { type: 'sync_started'; data: { isBackground: boolean } }
  | { type: 'sync_completed'; data: BackgroundSyncResult }
  | { type: 'sync_failed'; data: { error: string; isBackground: boolean } }
  | { type: 'task_registered' }
  | { type: 'task_unregistered' };

type BackgroundSyncEventListener = (event: BackgroundSyncEvent) => void;

/**
 * BackgroundSyncService class
 * Manages background synchronization for the mobile app
 */
class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private config: BackgroundSyncConfig;
  private listeners = new Set<BackgroundSyncEventListener>();
  private isTaskRegistered = false;
  private isSyncing = false;
  private lastSyncTime = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private isOnline = true;

  // TaskManager and BackgroundFetch will be dynamically imported
  private TaskManager: any = null;
  private BackgroundFetch: any = null;
  private isNativeModulesAvailable = false;

  private constructor(config?: Partial<BackgroundSyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<BackgroundSyncConfig>): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService(config);
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Initialize the background sync service
   */
  async initialize(): Promise<void> {
    console.log('[BackgroundSyncService] Initializing...');

    // Load last sync time
    await this.loadLastSyncTime();

    // Load config
    await this.loadConfig();

    // Try to load native modules
    await this.loadNativeModules();

    // Setup network monitoring
    this.setupNetworkMonitoring();

    // Setup app state monitoring
    this.setupAppStateMonitoring();

    // Register background task if enabled and available
    if (this.config.enabled && this.isNativeModulesAvailable) {
      await this.registerBackgroundTask();
    }

    console.log('[BackgroundSyncService] Initialized');
  }

  /**
   * Load native modules dynamically
   */
  private async loadNativeModules(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('[BackgroundSyncService] Background sync not available on web');
      return;
    }

    try {
      // Try to import expo-task-manager
      this.TaskManager = require('expo-task-manager');
      console.log('[BackgroundSyncService] TaskManager loaded');
    } catch (error) {
      console.log('[BackgroundSyncService] expo-task-manager not available:', error);
    }

    try {
      // Try to import expo-background-fetch
      this.BackgroundFetch = require('expo-background-fetch');
      console.log('[BackgroundSyncService] BackgroundFetch loaded');
    } catch (error) {
      console.log('[BackgroundSyncService] expo-background-fetch not available:', error);
    }

    this.isNativeModulesAvailable = !!(this.TaskManager && this.BackgroundFetch);

    if (!this.isNativeModulesAvailable) {
      console.log('[BackgroundSyncService] Native modules not fully available, background sync will use foreground alternatives');
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const enabledStr = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_SYNC_ENABLED);
      if (enabledStr !== null) {
        this.config.enabled = enabledStr === 'true';
      }
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to load config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BACKGROUND_SYNC_ENABLED,
        String(this.config.enabled)
      );
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to save config:', error);
    }
  }

  /**
   * Load last sync time from storage
   */
  private async loadLastSyncTime(): Promise<void> {
    try {
      const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND_SYNC);
      if (lastSyncStr) {
        this.lastSyncTime = parseInt(lastSyncStr, 10);
      }
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to load last sync time:', error);
    }
  }

  /**
   * Save last sync time to storage
   */
  private async saveLastSyncTime(): Promise<void> {
    try {
      this.lastSyncTime = Date.now();
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_BACKGROUND_SYNC,
        String(this.lastSyncTime)
      );
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to save last sync time:', error);
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.fetch().then((state) => {
      this.handleNetworkChange(state);
    });

    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected && state.isInternetReachable !== false;

    // Trigger sync when coming back online
    if (wasOffline && this.isOnline) {
      console.log('[BackgroundSyncService] Network reconnected, triggering sync');
      this.triggerSyncOnReconnect();
    }
  }

  /**
   * Trigger sync when network reconnects
   */
  private async triggerSyncOnReconnect(): Promise<void> {
    // Check if we need to sync
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync >= MIN_SYNC_INTERVAL_MS) {
      // Small delay to allow network to stabilize
      setTimeout(async () => {
        if (this.isOnline && !this.isSyncing) {
          console.log('[BackgroundSyncService] Syncing after reconnection');
          await this.performSync(false);
        }
      }, 2000);
    }
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App came to foreground - check if we need to sync
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      if (timeSinceLastSync >= MIN_SYNC_INTERVAL_MS && this.isOnline && !this.isSyncing) {
        console.log('[BackgroundSyncService] App foregrounded, triggering sync');
        this.performSync(false).catch((error) => {
          console.error('[BackgroundSyncService] Foreground sync failed:', error);
        });
      }
    }
  }

  /**
   * Register the background sync task
   */
  async registerBackgroundTask(): Promise<void> {
    if (!this.isNativeModulesAvailable) {
      console.log('[BackgroundSyncService] Cannot register task - native modules not available');
      return;
    }

    if (this.isTaskRegistered) {
      console.log('[BackgroundSyncService] Task already registered');
      return;
    }

    try {
      // Define the background task
      this.TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        console.log('[BackgroundSyncService] Background task executing');

        try {
          const result = await this.performSync(true);

          return result.success
            ? this.BackgroundFetch.BackgroundFetchResult.NewData
            : this.BackgroundFetch.BackgroundFetchResult.Failed;
        } catch (error) {
          console.error('[BackgroundSyncService] Background task error:', error);
          return this.BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch
      await this.BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: this.config.minimumInterval,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isTaskRegistered = true;
      this.notifyListeners({ type: 'task_registered' });

      console.log('[BackgroundSyncService] Background task registered successfully');
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to register background task:', error);
    }
  }

  /**
   * Unregister the background sync task
   */
  async unregisterBackgroundTask(): Promise<void> {
    if (!this.isNativeModulesAvailable || !this.isTaskRegistered) {
      return;
    }

    try {
      await this.BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      this.isTaskRegistered = false;
      this.notifyListeners({ type: 'task_unregistered' });

      console.log('[BackgroundSyncService] Background task unregistered');
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to unregister background task:', error);
    }
  }

  /**
   * Perform the actual sync operation
   */
  async performSync(isBackgroundTask: boolean): Promise<BackgroundSyncResult> {
    if (this.isSyncing) {
      console.log('[BackgroundSyncService] Sync already in progress');
      return {
        success: false,
        syncedAt: new Date(),
        pulled: 0,
        pushed: 0,
        errors: ['Sync already in progress'],
        wasBackgroundTask: isBackgroundTask,
      };
    }

    if (!this.isOnline) {
      console.log('[BackgroundSyncService] Cannot sync - offline');
      return {
        success: false,
        syncedAt: new Date(),
        pulled: 0,
        pushed: 0,
        errors: ['Device is offline'],
        wasBackgroundTask: isBackgroundTask,
      };
    }

    this.isSyncing = true;
    this.notifyListeners({
      type: 'sync_started',
      data: { isBackground: isBackgroundTask },
    });

    const result: BackgroundSyncResult = {
      success: false,
      syncedAt: new Date(),
      pulled: 0,
      pushed: 0,
      errors: [],
      wasBackgroundTask: isBackgroundTask,
    };

    try {
      // Import sync service dynamically to avoid circular dependencies
      const { syncService } = await import('./SyncService');

      // Perform the sync
      const syncResult = await syncService.sync(true);

      result.success = syncResult.success;
      result.pulled = syncResult.pulled;
      result.pushed = syncResult.pushed;
      result.errors = syncResult.errors;

      // Save last sync time
      await this.saveLastSyncTime();

      this.notifyListeners({
        type: 'sync_completed',
        data: result,
      });

      console.log(
        `[BackgroundSyncService] Sync completed: pulled=${result.pulled}, pushed=${result.pushed}, background=${isBackgroundTask}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);

      this.notifyListeners({
        type: 'sync_failed',
        data: { error: errorMessage, isBackground: isBackgroundTask },
      });

      console.error('[BackgroundSyncService] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Manually trigger a sync
   */
  async triggerSync(): Promise<BackgroundSyncResult> {
    return this.performSync(false);
  }

  /**
   * Enable background sync
   */
  async enable(): Promise<void> {
    this.config.enabled = true;
    await this.saveConfig();

    if (this.isNativeModulesAvailable && !this.isTaskRegistered) {
      await this.registerBackgroundTask();
    }

    console.log('[BackgroundSyncService] Background sync enabled');
  }

  /**
   * Disable background sync
   */
  async disable(): Promise<void> {
    this.config.enabled = false;
    await this.saveConfig();

    if (this.isTaskRegistered) {
      await this.unregisterBackgroundTask();
    }

    console.log('[BackgroundSyncService] Background sync disabled');
  }

  /**
   * Check if background sync is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if background task is registered
   */
  isRegistered(): boolean {
    return this.isTaskRegistered;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime > 0 ? new Date(this.lastSyncTime) : null;
  }

  /**
   * Get time until next scheduled sync (approximate)
   */
  getTimeUntilNextSync(): number | null {
    if (!this.config.enabled || !this.isTaskRegistered) {
      return null;
    }

    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    const intervalMs = this.config.minimumInterval * 1000;
    const remaining = intervalMs - timeSinceLastSync;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): BackgroundSyncConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<BackgroundSyncConfig>): Promise<void> {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    await this.saveConfig();

    // Handle enable/disable changes
    if (config.enabled !== undefined && config.enabled !== wasEnabled) {
      if (config.enabled) {
        await this.enable();
      } else {
        await this.disable();
      }
    }

    // Re-register with new interval if changed
    if (
      config.minimumInterval !== undefined &&
      this.isTaskRegistered &&
      this.isNativeModulesAvailable
    ) {
      await this.unregisterBackgroundTask();
      await this.registerBackgroundTask();
    }
  }

  /**
   * Add event listener
   */
  addListener(listener: BackgroundSyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: BackgroundSyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[BackgroundSyncService] Listener error:', error);
      }
    });
  }

  /**
   * Get status for debugging
   */
  getStatus(): {
    enabled: boolean;
    isRegistered: boolean;
    isSyncing: boolean;
    isOnline: boolean;
    lastSyncTime: Date | null;
    nativeModulesAvailable: boolean;
  } {
    return {
      enabled: this.config.enabled,
      isRegistered: this.isTaskRegistered,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      lastSyncTime: this.getLastSyncTime(),
      nativeModulesAvailable: this.isNativeModulesAvailable,
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.listeners.clear();

    console.log('[BackgroundSyncService] Destroyed');
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
export default BackgroundSyncService;
