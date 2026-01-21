/**
 * NetworkStatusProvider
 * Monitors network connectivity and triggers sync on reconnection
 * Provides network context to the entire app
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

import { syncService, syncManager, offlineMutationHandler, SyncResult } from '../services/sync';
import { networkDetector, ConnectionQuality } from '../services/offline';

// Context value type
export interface NetworkStatusContextValue {
  // Connection state
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: NetInfoStateType;
  connectionQuality: ConnectionQuality;

  // Connection details
  isWifi: boolean;
  isCellular: boolean;
  isMetered: boolean;
  cellularGeneration: string | null;

  // Metrics
  latency: number | null;
  lastChecked: Date | null;

  // Sync state
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncAt: Date | null;

  // Actions
  refresh: () => Promise<void>;
  measureLatency: () => Promise<number | null>;
  triggerSync: (force?: boolean) => Promise<SyncResult>;
  waitForConnection: (timeoutMs?: number) => Promise<boolean>;

  // Utility
  shouldUseReducedDataMode: boolean;
  shouldDeferLargeOperations: boolean;
}

// Create context
const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

// Provider props
export interface NetworkStatusProviderProps {
  children: ReactNode;
  // Configuration
  autoSyncOnReconnect?: boolean;
  autoSyncDelay?: number;
  enableBackgroundSync?: boolean;
  // Callbacks
  onOnline?: () => void;
  onOffline?: () => void;
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

/**
 * NetworkStatusProvider Component
 */
export function NetworkStatusProvider({
  children,
  autoSyncOnReconnect = true,
  autoSyncDelay = 2000,
  enableBackgroundSync = true,
  onOnline,
  onOffline,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: NetworkStatusProviderProps): JSX.Element {
  // Connection state
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<NetInfoStateType>('unknown');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('none');

  // Connection details
  const [isWifi, setIsWifi] = useState(false);
  const [isCellular, setIsCellular] = useState(false);
  const [isMetered, setIsMetered] = useState(false);
  const [cellularGeneration, setCellularGeneration] = useState<string | null>(null);

  // Metrics
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Refs
  const wasOfflineRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');

  /**
   * Update state from network info
   */
  const updateNetworkState = useCallback((state: NetInfoState) => {
    const online = state.isConnected && state.isInternetReachable !== false;

    setIsOnline(online);
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable);
    setConnectionType(state.type);
    setIsWifi(state.type === 'wifi');
    setIsCellular(state.type === 'cellular');
    setLastChecked(new Date());

    // Get cellular generation
    if (state.type === 'cellular' && state.details) {
      const details = state.details as { cellularGeneration?: string };
      setCellularGeneration(details.cellularGeneration ?? null);
    } else {
      setCellularGeneration(null);
    }

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

    return online;
  }, []);

  /**
   * Handle network change
   */
  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const isNowOnline = updateNetworkState(state);

      // Check for reconnection
      if (wasOfflineRef.current && isNowOnline) {
        console.log('[NetworkStatusProvider] Network reconnected');
        onOnline?.();

        // Trigger sync on reconnection
        if (autoSyncOnReconnect) {
          // Clear any existing timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Delay sync to allow network to stabilize
          syncTimeoutRef.current = setTimeout(async () => {
            console.log('[NetworkStatusProvider] Triggering reconnection sync');
            try {
              onSyncStart?.();
              setIsSyncing(true);

              // First replay offline mutations
              await offlineMutationHandler.replayMutations();

              // Then full sync
              const result = await syncService.sync();

              setLastSyncAt(new Date());
              onSyncComplete?.(result);
            } catch (error) {
              console.error('[NetworkStatusProvider] Reconnection sync failed:', error);
              onSyncError?.(error instanceof Error ? error : new Error('Sync failed'));
            } finally {
              setIsSyncing(false);
            }
          }, autoSyncDelay);
        }
      } else if (!isNowOnline && !wasOfflineRef.current) {
        console.log('[NetworkStatusProvider] Network disconnected');
        onOffline?.();
      }

      wasOfflineRef.current = !isNowOnline;
    },
    [
      autoSyncOnReconnect,
      autoSyncDelay,
      updateNetworkState,
      onOnline,
      onOffline,
      onSyncStart,
      onSyncComplete,
      onSyncError,
    ]
  );

  /**
   * Handle app state change (for background sync)
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (
        enableBackgroundSync &&
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[NetworkStatusProvider] App came to foreground');

        // Refresh network state
        NetInfo.fetch().then(updateNetworkState);

        // Trigger sync if online
        if (isOnline && !isSyncing) {
          syncService.sync().catch((error) => {
            console.error('[NetworkStatusProvider] Foreground sync failed:', error);
          });
        }
      }

      appStateRef.current = nextAppState;
    },
    [enableBackgroundSync, isOnline, isSyncing, updateNetworkState]
  );

  /**
   * Initialize listeners
   */
  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then((state) => {
      updateNetworkState(state);
      wasOfflineRef.current = !(state.isConnected && state.isInternetReachable !== false);
    });

    // Subscribe to network changes
    const netInfoUnsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Subscribe to sync service status
    const syncUnsubscribe = syncService.addListener((status) => {
      setIsSyncing(status.state === 'syncing');
      setPendingChanges(status.pendingChanges);
      setLastSyncAt(status.lastSyncAt);
    });

    // Initialize services
    syncService.initialize().catch((error) => {
      console.error('[NetworkStatusProvider] Failed to initialize sync service:', error);
    });

    offlineMutationHandler.initialize().catch((error) => {
      console.error('[NetworkStatusProvider] Failed to initialize mutation handler:', error);
    });

    syncManager.initialize().catch((error) => {
      console.error('[NetworkStatusProvider] Failed to initialize sync manager:', error);
    });

    return () => {
      netInfoUnsubscribe();
      appStateSubscription.remove();
      syncUnsubscribe();

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [updateNetworkState, handleNetworkChange, handleAppStateChange]);

  /**
   * Measure latency periodically
   */
  useEffect(() => {
    const measureLatencyNow = async () => {
      if (isOnline) {
        const measured = await networkDetector.measureLatency();
        setLatency(measured);
      }
    };

    // Initial measurement
    measureLatencyNow();

    // Measure every 30 seconds
    const interval = setInterval(measureLatencyNow, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  /**
   * Refresh network status
   */
  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    updateNetworkState(state);

    if (state.isConnected) {
      const measured = await networkDetector.measureLatency();
      setLatency(measured);
    }
  }, [updateNetworkState]);

  /**
   * Measure latency
   */
  const measureLatency = useCallback(async (): Promise<number | null> => {
    const measured = await networkDetector.measureLatency();
    setLatency(measured);
    return measured;
  }, []);

  /**
   * Trigger sync
   */
  const triggerSync = useCallback(
    async (force = false): Promise<SyncResult> => {
      if (!isOnline) {
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

      try {
        onSyncStart?.();
        setIsSyncing(true);

        const result = await syncService.sync(force);

        setLastSyncAt(new Date());
        onSyncComplete?.(result);

        return result;
      } catch (error) {
        onSyncError?.(error instanceof Error ? error : new Error('Sync failed'));
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, onSyncStart, onSyncComplete, onSyncError]
  );

  /**
   * Wait for connection
   */
  const waitForConnection = useCallback(
    (timeoutMs = 30000): Promise<boolean> => {
      if (isOnline) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unsubscribe();
            resolve(false);
          }
        }, timeoutMs);

        const unsubscribe = NetInfo.addEventListener((state) => {
          const online = state.isConnected && state.isInternetReachable !== false;
          if (online && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            unsubscribe();
            resolve(true);
          }
        });
      });
    },
    [isOnline]
  );

  /**
   * Utility flags
   */
  const shouldUseReducedDataMode = isMetered || connectionQuality === 'poor';
  const shouldDeferLargeOperations =
    connectionQuality === 'poor' || (connectionQuality === 'fair' && isMetered);

  // Context value
  const contextValue: NetworkStatusContextValue = {
    isOnline,
    isConnected,
    isInternetReachable,
    connectionType,
    connectionQuality,
    isWifi,
    isCellular,
    isMetered,
    cellularGeneration,
    latency,
    lastChecked,
    isSyncing,
    pendingChanges,
    lastSyncAt,
    refresh,
    measureLatency,
    triggerSync,
    waitForConnection,
    shouldUseReducedDataMode,
    shouldDeferLargeOperations,
  };

  return (
    <NetworkStatusContext.Provider value={contextValue}>{children}</NetworkStatusContext.Provider>
  );
}

/**
 * Hook to access network status context
 */
export function useNetworkStatus(): NetworkStatusContextValue {
  const context = useContext(NetworkStatusContext);

  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }

  return context;
}

/**
 * Hook to check if online (shorthand)
 */
export function useIsOnline(): boolean {
  const context = useContext(NetworkStatusContext);
  return context?.isOnline ?? true;
}

/**
 * Higher-order component to wrap components with network provider
 */
export function withNetworkStatus<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { networkProviderProps?: Partial<NetworkStatusProviderProps> }> {
  return function WithNetworkStatusComponent({
    networkProviderProps,
    ...props
  }: P & { networkProviderProps?: Partial<NetworkStatusProviderProps> }) {
    return (
      <NetworkStatusProvider {...networkProviderProps}>
        <Component {...(props as P)} />
      </NetworkStatusProvider>
    );
  };
}

export default NetworkStatusProvider;
