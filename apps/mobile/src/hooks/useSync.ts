/**
 * useSync Hook
 * Provides sync status and triggers for the mobile app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import {
  syncService,
  SyncStatus,
  SyncState,
  SyncResult,
  syncQueueService,
  QueueEvent,
} from '../services/sync';

// Sync options
export interface SyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
  syncOnReconnect?: boolean;
  backgroundSync?: boolean;
}

const DEFAULT_OPTIONS: SyncOptions = {
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  syncOnReconnect: true,
  backgroundSync: true,
};

/**
 * Hook return type
 */
export interface UseSyncResult {
  // Status
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  hasError: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  progress: number;

  // Actions
  sync: (force?: boolean) => Promise<SyncResult>;
  syncEntity: (entityType: string) => Promise<SyncResult>;
  cancelSync: () => void;
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  resetSyncState: () => Promise<void>;

  // Configuration
  setAuthToken: (token: string) => void;
  setFestivalId: (festivalId: string) => void;
  setUserId: (userId: string) => void;
}

/**
 * Main sync hook
 */
export function useSync(options: SyncOptions = {}): UseSyncResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isOnline, setIsOnline] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(0);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.addListener((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? false;
      const wasOffline = !isOnline;

      setIsOnline(online);

      // Sync on reconnect
      if (online && wasOffline && mergedOptions.syncOnReconnect) {
        console.log('[useSync] Reconnected, triggering sync');
        syncService.sync().catch((error) => {
          console.error('[useSync] Reconnect sync failed:', error);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline, mergedOptions.syncOnReconnect]);

  // Subscribe to queue events to update pending count
  useEffect(() => {
    const updatePendingCount = async () => {
      const stats = await syncQueueService.getStats();
      setPendingChanges(stats.pending + stats.failed);
    };

    const unsubscribe = syncQueueService.addListener((event: QueueEvent) => {
      updatePendingCount();
    });

    // Initial count
    updatePendingCount();

    return () => {
      unsubscribe();
    };
  }, []);

  // Set up auto-sync interval
  useEffect(() => {
    if (!mergedOptions.autoSync || !isOnline) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Initial sync after a short delay
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const initialSyncTimeout = setTimeout(() => {
        syncService.sync().catch((error) => {
          console.error('[useSync] Initial sync failed:', error);
        });
      }, 2000); // Wait 2 seconds before initial sync

      return () => clearTimeout(initialSyncTimeout);
    }

    // Set up interval
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && status.state !== 'syncing') {
        syncService.sync().catch((error) => {
          console.error('[useSync] Auto-sync failed:', error);
        });
      }
    }, mergedOptions.syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [
    mergedOptions.autoSync,
    mergedOptions.syncInterval,
    isOnline,
    status.state,
  ]);

  // Actions
  const sync = useCallback(
    async (force = false): Promise<SyncResult> => {
      if (!isOnline && !force) {
        return {
          success: false,
          pulled: 0,
          pushed: 0,
          errors: ['No network connection'],
          timestamp: new Date(),
        };
      }

      return syncService.sync(force);
    },
    [isOnline]
  );

  const syncEntity = useCallback(
    async (entityType: string): Promise<SyncResult> => {
      if (!isOnline) {
        return {
          success: false,
          pulled: 0,
          pushed: 0,
          errors: ['No network connection'],
          timestamp: new Date(),
        };
      }

      return syncService.syncEntity(entityType);
    },
    [isOnline]
  );

  const cancelSync = useCallback(() => {
    syncService.cancelSync();
  }, []);

  const retryFailed = useCallback(async () => {
    if (!isOnline) return;
    await syncQueueService.retryFailed();
  }, [isOnline]);

  const clearCompleted = useCallback(async () => {
    await syncQueueService.clearCompleted();
  }, []);

  const resetSyncState = useCallback(async () => {
    await syncService.resetSyncState();
    await syncQueueService.clearAll();
  }, []);

  const setAuthToken = useCallback((token: string) => {
    syncService.setAuthToken(token);
  }, []);

  const setFestivalId = useCallback((festivalId: string) => {
    syncService.setFestivalId(festivalId);
  }, []);

  const setUserId = useCallback((userId: string) => {
    syncService.setUserId(userId);
  }, []);

  return {
    // Status
    status,
    isOnline,
    isSyncing: status.state === 'syncing',
    hasError: status.state === 'error',
    lastSyncAt: status.lastSyncAt,
    pendingChanges,
    progress: status.progress,

    // Actions
    sync,
    syncEntity,
    cancelSync,
    retryFailed,
    clearCompleted,
    resetSyncState,

    // Configuration
    setAuthToken,
    setFestivalId,
    setUserId,
  };
}

/**
 * Hook to check if specific entity needs sync
 */
export function useEntitySyncStatus(entityType: string) {
  const [needsSync, setNeedsSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const needs = await syncService.needsSync(entityType);
      setNeedsSync(needs);
      // Could also fetch last sync time from metadata
    };

    checkStatus();
  }, [entityType]);

  return { needsSync, lastSyncAt };
}

/**
 * Hook for sync queue status
 */
export function useSyncQueueStatus() {
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
  });

  useEffect(() => {
    const updateStats = async () => {
      const queueStats = await syncQueueService.getStats();
      setStats(queueStats);
    };

    const unsubscribe = syncQueueService.addListener(() => {
      updateStats();
    });

    updateStats();

    return () => {
      unsubscribe();
    };
  }, []);

  return stats;
}

export default useSync;
