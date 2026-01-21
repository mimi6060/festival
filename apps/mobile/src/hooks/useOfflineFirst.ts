/**
 * useOfflineFirst Hook
 * Provides offline-first data fetching with automatic sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Q, Query } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';

import { TableNames, TableName } from '../database/schema';
import { syncService, syncQueueService } from '../services/sync';
import { SyncOperation } from '../database/models/SyncQueueItem';

// WatermelonDB record type for dynamic property access
type WatermelonRecord = Record<string, unknown> & {
  id: string;
  serverId?: string;
  isSynced?: boolean;
  needsPush?: boolean;
  lastSyncedAt?: number;
  serverCreatedAt?: number;
  serverUpdatedAt?: number;
  toJSON?: () => Record<string, unknown>;
  update: (updater: (record: WatermelonRecord) => void) => Promise<void>;
  observe: () => {
    subscribe: (observer: { next: (value: unknown) => void; error: (err: Error) => void }) => {
      unsubscribe: () => void;
    };
  };
  destroyPermanently: () => Promise<void>;
};

// Hook options
export interface UseOfflineFirstOptions<T> {
  // Query configuration
  query?: (collection: { query: (...args: unknown[]) => Query<T> }) => Query<T>;
  // Server fetch function
  fetchFromServer?: () => Promise<T[]>;
  // Transform server data to local format
  transformServerData?: (serverData: unknown) => Partial<T>;
  // Sync behavior
  syncOnMount?: boolean;
  refreshInterval?: number; // milliseconds, 0 = disabled
  // Stale data threshold
  staleAfter?: number; // milliseconds
}

// Hook result
export interface UseOfflineFirstResult<T> {
  // Data
  data: T[];
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isSyncing: boolean;
  // Error state
  error: Error | null;
  // Data freshness
  isStale: boolean;
  lastUpdatedAt: Date | null;
  // Actions
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Main offline-first data hook
 */
export function useOfflineFirst<T>(
  tableName: TableName,
  options: UseOfflineFirstOptions<T> = {}
): UseOfflineFirstResult<T> {
  const database = useDatabase();
  const collection = database.get<T>(tableName);

  const {
    query,
    fetchFromServer,
    transformServerData,
    syncOnMount = true,
    refreshInterval = 0,
    staleAfter = 5 * 60 * 1000, // 5 minutes default
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // Refs
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Computed
  const isStale = lastUpdatedAt !== null && Date.now() - lastUpdatedAt.getTime() > staleAfter;

  // Build query
  const buildQuery = useCallback((): Query<T> => {
    if (query) {
      return query(collection);
    }
    return collection.query();
  }, [collection, query]);

  // Subscribe to local data changes
  useEffect(() => {
    const queryObj = buildQuery();

    // Set up subscription
    subscriptionRef.current = queryObj.observeWithColumns(['updated_at']).subscribe({
      next: (records) => {
        setData(records as unknown as T[]);
        setIsLoading(false);
        setLastUpdatedAt(new Date());
      },
      error: (err) => {
        console.error('[useOfflineFirst] Subscription error:', err);
        setError(err);
        setIsLoading(false);
      },
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [buildQuery]);

  // Initial sync on mount
  useEffect(() => {
    if (syncOnMount) {
      sync().catch((err) => {
        console.error('[useOfflineFirst] Initial sync failed:', err);
      });
    }
  }, [syncOnMount]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) {
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      sync().catch((err) => {
        console.error('[useOfflineFirst] Interval sync failed:', err);
      });
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshInterval]);

  // Sync with server
  const sync = useCallback(async (): Promise<void> => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      // Use sync service for the entity
      await syncService.syncEntity(tableName);
      setLastUpdatedAt(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed');
      setError(error);
      console.error('[useOfflineFirst] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, isSyncing]);

  // Refresh from server (pull only)
  const refresh = useCallback(async (): Promise<void> => {
    if (isRefreshing || !fetchFromServer) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const serverData = await fetchFromServer();

      await database.write(async () => {
        for (const item of serverData) {
          const localItem = transformServerData ? transformServerData(item) : (item as Partial<T>);

          // Check if record exists
          const localItemRecord = localItem as WatermelonRecord;
          const itemRecord = item as WatermelonRecord;
          const serverId = localItemRecord.serverId || itemRecord.id;
          const existing = await collection.query(Q.where('server_id', serverId)).fetch();

          if (existing.length > 0) {
            // Update existing
            const existingRecord = existing[0] as unknown as WatermelonRecord;
            await existingRecord.update((record) => {
              Object.assign(record, localItem);
              record.isSynced = true;
              record.lastSyncedAt = Date.now();
            });
          } else {
            // Create new
            await collection.create((record) => {
              const wmRecord = record as unknown as WatermelonRecord;
              Object.assign(wmRecord, localItem);
              wmRecord.serverId = serverId as string;
              wmRecord.isSynced = true;
              wmRecord.lastSyncedAt = Date.now();
              wmRecord.needsPush = false;
            });
          }
        }
      });

      setLastUpdatedAt(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed');
      setError(error);
      console.error('[useOfflineFirst] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [database, collection, fetchFromServer, transformServerData, isRefreshing]);

  // Create record (offline capable)
  const create = useCallback(
    async (recordData: Partial<T>): Promise<T> => {
      const record = await database.write(async () => {
        return collection.create((r) => {
          const wmRecord = r as unknown as WatermelonRecord;
          Object.assign(wmRecord, recordData);
          wmRecord.isSynced = false;
          wmRecord.needsPush = true;
          wmRecord.serverCreatedAt = Date.now();
          wmRecord.serverUpdatedAt = Date.now();
        });
      });

      // Add to sync queue
      const wmRecord = record as unknown as WatermelonRecord;
      await syncQueueService.add({
        entityType: tableName,
        entityId: wmRecord.id,
        operation: 'create' as SyncOperation,
        payload: wmRecord.toJSON ? wmRecord.toJSON() : (recordData as Record<string, unknown>),
      });

      return record as unknown as T;
    },
    [database, collection, tableName]
  );

  // Update record (offline capable)
  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<T> => {
      const record = await database.write(async () => {
        const existing = await collection.find(id);
        const wmExisting = existing as unknown as WatermelonRecord;
        await wmExisting.update((r) => {
          Object.assign(r, updates);
          r.isSynced = false;
          r.needsPush = true;
          r.serverUpdatedAt = Date.now();
        });
        return existing;
      });

      // Add to sync queue
      const wmRecord = record as unknown as WatermelonRecord;
      await syncQueueService.add({
        entityType: tableName,
        entityId: wmRecord.id,
        operation: 'update' as SyncOperation,
        payload: wmRecord.toJSON ? wmRecord.toJSON() : (updates as Record<string, unknown>),
      });

      return record as unknown as T;
    },
    [database, collection, tableName]
  );

  // Remove record (offline capable)
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const record = await collection.find(id);
      const wmRecord = record as unknown as WatermelonRecord;
      const recordData = wmRecord.toJSON ? wmRecord.toJSON() : { id };

      await database.write(async () => {
        await wmRecord.destroyPermanently();
      });

      // Add to sync queue (if record was synced)
      if (wmRecord.serverId) {
        await syncQueueService.add({
          entityType: tableName,
          entityId: id,
          operation: 'delete' as SyncOperation,
          payload: recordData,
        });
      }
    },
    [database, collection, tableName]
  );

  return {
    data,
    isLoading,
    isRefreshing,
    isSyncing,
    error,
    isStale,
    lastUpdatedAt,
    refresh,
    sync,
    create,
    update,
    remove,
  };
}

/**
 * Hook for single record offline-first access
 */
export function useOfflineFirstRecord<T>(
  tableName: TableName,
  id: string | null,
  options: {
    fetchFromServer?: (id: string) => Promise<T>;
    transformServerData?: (serverData: unknown) => Partial<T>;
  } = {}
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (updates: Partial<T>) => Promise<void>;
} {
  const database = useDatabase();
  const collection = database.get<T>(tableName);

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Subscribe to record changes
  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const loadRecord = async () => {
      try {
        // First try to find by WatermelonDB ID
        let record: T | null = null;
        try {
          record = await collection.find(id);
        } catch {
          // If not found, try by server ID
          const results = await collection.query(Q.where('server_id', id)).fetch();
          record = results[0] || null;
        }

        if (record) {
          setData(record);

          // Subscribe to changes
          const wmRecord = record as unknown as WatermelonRecord;
          subscriptionRef.current = wmRecord.observe().subscribe({
            next: (updated) => setData(updated as T),
            error: (err: Error) => setError(err),
          });
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load record'));
      } finally {
        setIsLoading(false);
      }
    };

    loadRecord();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [collection, id]);

  const refresh = useCallback(async () => {
    if (!id || !options.fetchFromServer) {
      return;
    }

    try {
      const serverData = await options.fetchFromServer(id);
      const localData = options.transformServerData
        ? options.transformServerData(serverData)
        : (serverData as Partial<T>);

      await database.write(async () => {
        if (data) {
          const wmData = data as unknown as WatermelonRecord;
          await wmData.update((r) => {
            Object.assign(r, localData);
            r.isSynced = true;
            r.lastSyncedAt = Date.now();
          });
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Refresh failed'));
    }
  }, [database, data, id, options]);

  const update = useCallback(
    async (updates: Partial<T>) => {
      if (!data) {
        return;
      }

      const wmData = data as unknown as WatermelonRecord;
      await database.write(async () => {
        await wmData.update((r) => {
          Object.assign(r, updates);
          r.isSynced = false;
          r.needsPush = true;
        });
      });

      // Add to sync queue
      await syncQueueService.add({
        entityType: tableName,
        entityId: wmData.id,
        operation: 'update',
        payload: updates as Record<string, unknown>,
      });
    },
    [database, data, tableName]
  );

  return {
    data,
    isLoading,
    error,
    refresh,
    update,
  };
}

/**
 * Specialized hooks for common entities
 */

// Tickets
export function useTickets(festivalId?: string) {
  return useOfflineFirst(TableNames.TICKETS, {
    query: festivalId
      ? (collection) => collection.query(Q.where('festival_id', festivalId))
      : undefined,
    syncOnMount: true,
    staleAfter: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Artists
export function useArtists(_festivalId?: string) {
  return useOfflineFirst(TableNames.ARTISTS, {
    syncOnMount: true,
    staleAfter: 6 * 60 * 60 * 1000, // 6 hours
  });
}

// Performances (schedule)
export function usePerformances(festivalId?: string) {
  return useOfflineFirst(TableNames.PERFORMANCES, {
    query: festivalId
      ? (collection) =>
          collection.query(Q.where('festival_id', festivalId), Q.sortBy('start_time', Q.asc))
      : (collection) => collection.query(Q.sortBy('start_time', Q.asc)),
    syncOnMount: true,
    refreshInterval: 30 * 60 * 1000, // Refresh every 30 minutes
    staleAfter: 30 * 60 * 1000, // 30 minutes
  });
}

// Cashless account
export function useCashlessAccount(userId?: string) {
  return useOfflineFirst(TableNames.CASHLESS_ACCOUNTS, {
    query: userId ? (collection) => collection.query(Q.where('user_id', userId)) : undefined,
    syncOnMount: true,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleAfter: 5 * 60 * 1000, // 5 minutes
  });
}

// Transactions
export function useCashlessTransactions(accountId?: string) {
  return useOfflineFirst(TableNames.CASHLESS_TRANSACTIONS, {
    query: accountId
      ? (collection) =>
          collection.query(Q.where('account_id', accountId), Q.sortBy('server_created_at', Q.desc))
      : (collection) => collection.query(Q.sortBy('server_created_at', Q.desc)),
    syncOnMount: true,
    staleAfter: 5 * 60 * 1000, // 5 minutes
  });
}

// Notifications
export function useNotifications(userId?: string) {
  return useOfflineFirst(TableNames.NOTIFICATIONS, {
    query: userId
      ? (collection) =>
          collection.query(Q.where('user_id', userId), Q.sortBy('server_created_at', Q.desc))
      : (collection) => collection.query(Q.sortBy('server_created_at', Q.desc)),
    syncOnMount: true,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleAfter: 5 * 60 * 1000, // 5 minutes
  });
}

export default useOfflineFirst;
