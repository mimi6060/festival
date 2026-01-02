import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineService } from '../services';

interface UseOfflineReturn {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
  syncPending: number;
  lastSyncedAt: string | null;
  sync: () => Promise<{ success: boolean; message?: string }>;
  isSyncing: boolean;
}

export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      handleConnectionChange(state);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      handleConnectionChange(state);
    });

    // Load last sync time
    loadLastSyncTime();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleConnectionChange = (state: NetInfoState) => {
    setIsOnline(state.isConnected ?? false);
    setIsConnected(state.isInternetReachable ?? false);
    setConnectionType(state.type);
    setSyncPending(offlineService.getSyncQueueLength());
  };

  const loadLastSyncTime = async () => {
    const time = await offlineService.getLastSyncTime();
    setLastSyncedAt(time);
  };

  const sync = useCallback(async () => {
    if (isSyncing) {
      return { success: false, message: 'Already syncing' };
    }

    setIsSyncing(true);
    try {
      const result = await offlineService.syncAllData();
      await loadLastSyncTime();
      setSyncPending(offlineService.getSyncQueueLength());
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return {
    isOnline,
    isConnected,
    connectionType,
    syncPending,
    lastSyncedAt,
    sync,
    isSyncing,
  };
};

export default useOffline;
