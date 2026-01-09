/**
 * useDatabase Hook
 * Provides access to WatermelonDB database and collections
 */

import { useCallback } from 'react';
import { Database, Q, Collection, Model } from '@nozbe/watermelondb';
import { useDatabase as useWatermelonDatabase } from '@nozbe/watermelondb/hooks';

import { TableNames, TableName } from '../database/schema';
import {
  User,
  Festival,
  Ticket,
  Artist,
  Performance,
  CashlessAccount,
  CashlessTransaction,
  Notification,
  SyncMetadata,
  SyncQueueItem,
} from '../database/models';

// Type mapping for collections
type ModelTypeMap = {
  [TableNames.USERS]: User;
  [TableNames.FESTIVALS]: Festival;
  [TableNames.TICKETS]: Ticket;
  [TableNames.ARTISTS]: Artist;
  [TableNames.PERFORMANCES]: Performance;
  [TableNames.CASHLESS_ACCOUNTS]: CashlessAccount;
  [TableNames.CASHLESS_TRANSACTIONS]: CashlessTransaction;
  [TableNames.NOTIFICATIONS]: Notification;
  [TableNames.SYNC_METADATA]: SyncMetadata;
  [TableNames.SYNC_QUEUE]: SyncQueueItem;
};

/**
 * Hook to access the database instance
 */
export function useDatabase(): Database {
  return useWatermelonDatabase();
}

/**
 * Hook to access a specific collection
 */
export function useCollection<T extends TableName>(
  tableName: T
): Collection<ModelTypeMap[T]> {
  const database = useDatabase();
  return database.get<ModelTypeMap[T]>(tableName);
}

/**
 * Hook to perform database write operations
 */
export function useDatabaseWrite() {
  const database = useDatabase();

  const write = useCallback(
    async <T>(action: () => Promise<T>): Promise<T> => {
      return database.write(action);
    },
    [database]
  );

  return write;
}

/**
 * Hook to create a record
 */
export function useCreate<T extends TableName>(tableName: T) {
  const database = useDatabase();
  const collection = useCollection(tableName);

  const create = useCallback(
    async (
      data: Partial<ModelTypeMap[T]>
    ): Promise<ModelTypeMap[T]> => {
      return database.write(async () => {
        return collection.create((record: any) => {
          Object.assign(record, data);
        });
      });
    },
    [database, collection]
  );

  return create;
}

/**
 * Hook to update a record
 */
export function useUpdate<T extends TableName>(tableName: T) {
  const database = useDatabase();
  const collection = useCollection(tableName);

  const update = useCallback(
    async (
      id: string,
      updates: Partial<ModelTypeMap[T]>
    ): Promise<ModelTypeMap[T]> => {
      return database.write(async () => {
        const record = await collection.find(id);
        await record.update((r: any) => {
          Object.assign(r, updates);
        });
        return record;
      });
    },
    [database, collection]
  );

  return update;
}

/**
 * Hook to delete a record
 */
export function useDelete<T extends TableName>(tableName: T) {
  const database = useDatabase();
  const collection = useCollection(tableName);

  const deleteRecord = useCallback(
    async (id: string): Promise<void> => {
      return database.write(async () => {
        const record = await collection.find(id);
        await record.destroyPermanently();
      });
    },
    [database, collection]
  );

  return deleteRecord;
}

/**
 * Hook to find a record by ID
 */
export function useFindById<T extends TableName>(tableName: T) {
  const collection = useCollection(tableName);

  const findById = useCallback(
    async (id: string): Promise<ModelTypeMap[T] | null> => {
      try {
        return await collection.find(id);
      } catch {
        return null;
      }
    },
    [collection]
  );

  return findById;
}

/**
 * Hook to find a record by server ID
 */
export function useFindByServerId<T extends TableName>(tableName: T) {
  const collection = useCollection(tableName);

  const findByServerId = useCallback(
    async (serverId: string): Promise<ModelTypeMap[T] | null> => {
      const results = await collection
        .query(Q.where('server_id', serverId))
        .fetch();
      return results[0] || null;
    },
    [collection]
  );

  return findByServerId;
}

/**
 * Hook for batch operations
 */
export function useBatchOperations() {
  const database = useDatabase();

  const batchCreate = useCallback(
    async <T extends TableName>(
      tableName: T,
      dataArray: Partial<ModelTypeMap[T]>[]
    ): Promise<ModelTypeMap[T][]> => {
      const collection = database.get<ModelTypeMap[T]>(tableName);

      return database.write(async () => {
        const records: ModelTypeMap[T][] = [];
        for (const data of dataArray) {
          const record = await collection.create((r: any) => {
            Object.assign(r, data);
          });
          records.push(record);
        }
        return records;
      });
    },
    [database]
  );

  const batchUpdate = useCallback(
    async <T extends TableName>(
      tableName: T,
      updates: { id: string; data: Partial<ModelTypeMap[T]> }[]
    ): Promise<ModelTypeMap[T][]> => {
      const collection = database.get<ModelTypeMap[T]>(tableName);

      return database.write(async () => {
        const records: ModelTypeMap[T][] = [];
        for (const { id, data } of updates) {
          const record = await collection.find(id);
          await record.update((r: any) => {
            Object.assign(r, data);
          });
          records.push(record);
        }
        return records;
      });
    },
    [database]
  );

  const batchDelete = useCallback(
    async <T extends TableName>(
      tableName: T,
      ids: string[]
    ): Promise<void> => {
      const collection = database.get<ModelTypeMap[T]>(tableName);

      return database.write(async () => {
        for (const id of ids) {
          const record = await collection.find(id);
          await record.destroyPermanently();
        }
      });
    },
    [database]
  );

  return { batchCreate, batchUpdate, batchDelete };
}

/**
 * Hook to get database statistics
 */
export function useDatabaseStats() {
  const database = useDatabase();

  const getStats = useCallback(async () => {
    const stats: { table: string; count: number }[] = [];

    for (const tableName of Object.values(TableNames)) {
      try {
        const collection = database.get(tableName);
        const count = await collection.query().fetchCount();
        stats.push({ table: tableName, count });
      } catch {
        stats.push({ table: tableName, count: -1 });
      }
    }

    return stats;
  }, [database]);

  return getStats;
}

/**
 * Hook to get pending sync count
 */
export function usePendingSyncCount() {
  const database = useDatabase();

  const getPendingCount = useCallback(async () => {
    let count = 0;

    for (const tableName of Object.values(TableNames)) {
      if (
        tableName === TableNames.SYNC_METADATA ||
        tableName === TableNames.SYNC_QUEUE
      ) {
        continue;
      }

      try {
        const collection = database.get(tableName);
        const pending = await collection
          .query(Q.where('needs_push', true))
          .fetchCount();
        count += pending;
      } catch {
        // Table might not have needs_push column
      }
    }

    return count;
  }, [database]);

  return getPendingCount;
}

export default useDatabase;
