/**
 * useBackgroundSync Hook
 * Provides access to background sync functionality and status
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import {
  backgroundSyncService,
  BackgroundSyncConfig,
  BackgroundSyncResult,
  BackgroundSyncEvent,
} from '../services/sync';

// Hook return type
export interface UseBackgroundSyncResult {
  // Status
  isEnabled: boolean;
  isRegistered: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  isNativeAvailable: boolean;

  // Timing
  lastSyncTime: Date | null;
  timeUntilNextSync: number | null;

  // Last result
  lastResult: BackgroundSyncResult | null;

  // Actions
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  triggerSync: () => Promise<BackgroundSyncResult>;
  updateConfig: (config: Partial<BackgroundSyncConfig>) => Promise<void>;

  // Configuration
  config: BackgroundSyncConfig;
}

/**
 * Hook to manage background sync
 */
export function useBackgroundSync(): UseBackgroundSyncResult {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [timeUntilNextSync, setTimeUntilNextSync] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<BackgroundSyncResult | null>(null);
  const [config, setConfig] = useState<BackgroundSyncConfig>(backgroundSyncService.getConfig());

  // Ref for interval
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle background sync events
   */
  const handleEvent = useCallback((event: BackgroundSyncEvent) => {
    switch (event.type) {
      case 'sync_started':
        setIsSyncing(true);
        break;

      case 'sync_completed':
        setIsSyncing(false);
        setLastResult(event.data);
        setLastSyncTime(event.data.syncedAt);
        break;

      case 'sync_failed':
        setIsSyncing(false);
        break;

      case 'task_registered':
        setIsRegistered(true);
        break;

      case 'task_unregistered':
        setIsRegistered(false);
        break;
    }
  }, []);

  /**
   * Initialize and subscribe to events
   */
  useEffect(() => {
    // Initialize background sync service
    backgroundSyncService.initialize().catch((error) => {
      console.error('[useBackgroundSync] Failed to initialize:', error);
    });

    // Subscribe to events
    const unsubscribe = backgroundSyncService.addListener(handleEvent);

    // Get initial status
    const status = backgroundSyncService.getStatus();
    setIsEnabled(status.enabled);
    setIsRegistered(status.isRegistered);
    setIsSyncing(status.isSyncing);
    setIsOnline(status.isOnline);
    setIsNativeAvailable(status.nativeModulesAvailable);
    setLastSyncTime(status.lastSyncTime);
    setConfig(backgroundSyncService.getConfig());

    return () => {
      unsubscribe();
    };
  }, [handleEvent]);

  /**
   * Update time until next sync periodically
   */
  useEffect(() => {
    const updateTimer = () => {
      const remaining = backgroundSyncService.getTimeUntilNextSync();
      setTimeUntilNextSync(remaining);
    };

    updateTimer();

    // Update every minute
    timerIntervalRef.current = setInterval(updateTimer, 60000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isEnabled, isRegistered]);

  /**
   * Enable background sync
   */
  const enable = useCallback(async () => {
    await backgroundSyncService.enable();
    setIsEnabled(true);
    setConfig(backgroundSyncService.getConfig());
  }, []);

  /**
   * Disable background sync
   */
  const disable = useCallback(async () => {
    await backgroundSyncService.disable();
    setIsEnabled(false);
    setConfig(backgroundSyncService.getConfig());
  }, []);

  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(async (): Promise<BackgroundSyncResult> => {
    const result = await backgroundSyncService.triggerSync();
    setLastResult(result);
    return result;
  }, []);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(async (updates: Partial<BackgroundSyncConfig>) => {
    await backgroundSyncService.updateConfig(updates);
    setConfig(backgroundSyncService.getConfig());
    setIsEnabled(backgroundSyncService.isEnabled());
  }, []);

  return {
    // Status
    isEnabled,
    isRegistered,
    isSyncing,
    isOnline,
    isNativeAvailable,

    // Timing
    lastSyncTime,
    timeUntilNextSync,

    // Last result
    lastResult,

    // Actions
    enable,
    disable,
    triggerSync,
    updateConfig,

    // Configuration
    config,
  };
}

export default useBackgroundSync;
