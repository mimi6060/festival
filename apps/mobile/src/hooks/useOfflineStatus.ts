/**
 * useOfflineStatus Hook
 * Track online/offline state with enhanced network information
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { syncService, SyncStatus } from '../services/sync';
import { networkDetector, ConnectionQuality } from '../services/offline';

// Return type
export interface OfflineStatusResult {
  // Basic connectivity
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean | null;

  // Connection details
  connectionType: NetInfoStateType;
  connectionQuality: ConnectionQuality;
  isWifi: boolean;
  isCellular: boolean;
  isMetered: boolean;

  // Sync status
  syncState: SyncState;
  lastSyncAt: Date | null;
  pendingChanges: number;
  isSyncing: boolean;

  // Network stats
  latency: number | null;
  lastChecked: Date | null;

  // Actions
  refresh: () => Promise<void>;
  waitForConnection: (timeoutMs?: number) => Promise<boolean>;
}

/**
 * Hook to track offline/online status with detailed network information
 */
export function useOfflineStatus(): OfflineStatusResult {
  // Network state
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<NetInfoStateType>('unknown');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('none');
  const [isWifi, setIsWifi] = useState(false);
  const [isCellular, setIsCellular] = useState(false);
  const [isMetered, setIsMetered] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Ref for connection wait promise
  const connectionWaitResolve = useRef<((value: boolean) => void) | null>(null);

  /**
   * Update state from NetInfo
   */
  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const online = state.isConnected && state.isInternetReachable !== false;

    setIsOnline(online);
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable);
    setConnectionType(state.type);
    setIsWifi(state.type === 'wifi');
    setIsCellular(state.type === 'cellular');
    setLastChecked(new Date());

    // Check if metered
    if (state.type === 'cellular') {
      setIsMetered(true);
    } else if (state.type === 'wifi' && state.details) {
      const details = state.details as { isConnectionExpensive?: boolean };
      setIsMetered(details.isConnectionExpensive ?? false);
    } else {
      setIsMetered(false);
    }

    // Estimate quality
    let quality: ConnectionQuality = 'none';
    if (state.isConnected) {
      if (state.isInternetReachable === false) {
        quality = 'none';
      } else if (state.type === 'wifi') {
        quality = 'good';
      } else if (state.type === 'cellular' && state.details) {
        const cellDetails = state.details as { cellularGeneration?: string };
        switch (cellDetails.cellularGeneration) {
          case '5g':
            quality = 'excellent';
            break;
          case '4g':
            quality = 'good';
            break;
          case '3g':
            quality = 'fair';
            break;
          default:
            quality = 'poor';
        }
      } else {
        quality = 'fair';
      }
    }
    setConnectionQuality(quality);

    // Resolve wait promise if online
    if (online && connectionWaitResolve.current) {
      connectionWaitResolve.current(true);
      connectionWaitResolve.current = null;
    }
  }, []);

  /**
   * Update state from sync service
   */
  const handleSyncStatusChange = useCallback((status: SyncStatus) => {
    setSyncState(status.state);
    setLastSyncAt(status.lastSyncAt);
    setPendingChanges(status.pendingChanges);
    setIsSyncing(status.state === 'syncing');
    setIsOnline(status.isOnline);
  }, []);

  /**
   * Initialize listeners
   */
  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(handleNetworkChange);

    // Subscribe to network changes
    const netInfoUnsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Subscribe to sync service
    const syncUnsubscribe = syncService.addListener(handleSyncStatusChange);

    // Get initial sync status
    const initialStatus = syncService.getStatus();
    handleSyncStatusChange(initialStatus);

    return () => {
      netInfoUnsubscribe();
      syncUnsubscribe();
    };
  }, [handleNetworkChange, handleSyncStatusChange]);

  /**
   * Measure latency periodically
   */
  useEffect(() => {
    const measureLatency = async () => {
      if (isOnline) {
        const measured = await networkDetector.measureLatency();
        setLatency(measured);
      }
    };

    // Initial measurement
    measureLatency();

    // Measure every 30 seconds when online
    const interval = setInterval(() => {
      if (isOnline) {
        measureLatency();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  /**
   * Refresh network status
   */
  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    handleNetworkChange(state);

    if (state.isConnected) {
      const measured = await networkDetector.measureLatency();
      setLatency(measured);
    }
  }, [handleNetworkChange]);

  /**
   * Wait for connection to be available
   */
  const waitForConnection = useCallback(
    (timeoutMs = 30000): Promise<boolean> => {
      if (isOnline) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        connectionWaitResolve.current = resolve;

        // Set timeout
        const timeout = setTimeout(() => {
          if (connectionWaitResolve.current) {
            connectionWaitResolve.current(false);
            connectionWaitResolve.current = null;
          }
        }, timeoutMs);

        // Cleanup on resolve
        const originalResolve = connectionWaitResolve.current;
        connectionWaitResolve.current = (value: boolean) => {
          clearTimeout(timeout);
          originalResolve?.(value);
        };
      });
    },
    [isOnline]
  );

  return {
    isOnline,
    isConnected,
    isInternetReachable,
    connectionType,
    connectionQuality,
    isWifi,
    isCellular,
    isMetered,
    syncState,
    lastSyncAt,
    pendingChanges,
    isSyncing,
    latency,
    lastChecked,
    refresh,
    waitForConnection,
  };
}

export default useOfflineStatus;
