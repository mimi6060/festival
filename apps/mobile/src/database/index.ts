/**
 * WatermelonDB Database Initialization
 * Main entry point for the local database
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';

import { schema, TableNames, SCHEMA_VERSION } from './schema';
import { migrations } from './migrations';

// Models
import User from './models/User';
import Festival from './models/Festival';
import Ticket from './models/Ticket';
import Artist from './models/Artist';
import Performance from './models/Performance';
import CashlessAccount from './models/CashlessAccount';
import CashlessTransaction from './models/CashlessTransaction';
import Notification from './models/Notification';
import SyncMetadata from './models/SyncMetadata';
import SyncQueueItem from './models/SyncQueueItem';

// Database configuration
const DATABASE_NAME = 'festival_offline.db';

/**
 * Model classes mapped to table names
 */
const modelClasses = [
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
];

/**
 * Database adapter configuration
 */
interface AdapterConfig {
  dbName: string;
  schema: typeof schema;
  migrations: typeof migrations;
  jsi?: boolean;
  onSetUpError?: (error: Error) => void;
}

/**
 * Create the SQLite adapter with proper configuration
 */
function createAdapter(): SQLiteAdapter {
  const adapterConfig: AdapterConfig = {
    dbName: DATABASE_NAME,
    schema,
    migrations,
    // Enable JSI for better performance on React Native
    jsi: Platform.OS !== 'web',
    onSetUpError: (error: Error) => {
      console.error('[Database] Setup error:', error);
      // In production, you might want to:
      // 1. Report to error tracking service
      // 2. Try to recover or reset database
      // 3. Show user-friendly error message
    },
  };

  return new SQLiteAdapter(adapterConfig);
}

/**
 * Singleton database instance
 */
let databaseInstance: Database | null = null;

/**
 * Get or create the database instance
 */
export function getDatabase(): Database {
  if (!databaseInstance) {
    const adapter = createAdapter();

    databaseInstance = new Database({
      adapter,
      modelClasses,
    });

    console.log(`[Database] Initialized with schema version ${SCHEMA_VERSION}`);
  }

  return databaseInstance;
}

/**
 * Reset the database (useful for logout or debugging)
 * WARNING: This will delete all local data!
 */
export async function resetDatabase(): Promise<void> {
  const database = getDatabase();

  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('[Database] Reset completed');
  } catch (error) {
    console.error('[Database] Reset failed:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (databaseInstance) {
    // WatermelonDB doesn't have explicit close, but we clear reference
    databaseInstance = null;
    console.log('[Database] Connection closed');
  }
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats(): Promise<{
  version: number;
  tables: { name: string; count: number }[];
  totalRecords: number;
}> {
  const database = getDatabase();
  const tables: { name: string; count: number }[] = [];
  let totalRecords = 0;

  for (const tableName of Object.values(TableNames)) {
    try {
      const collection = database.get(tableName);
      const count = await collection.query().fetchCount();
      tables.push({ name: tableName, count });
      totalRecords += count;
    } catch (error) {
      console.warn(`[Database] Could not count records in ${tableName}:`, error);
      tables.push({ name: tableName, count: -1 });
    }
  }

  return {
    version: SCHEMA_VERSION,
    tables,
    totalRecords,
  };
}

/**
 * Check if database needs initial sync
 */
export async function needsInitialSync(): Promise<boolean> {
  const database = getDatabase();

  try {
    const syncMetadata = database.get<SyncMetadata>(TableNames.SYNC_METADATA);
    const metadata = await syncMetadata.query().fetch();

    // If no sync metadata exists, initial sync is needed
    if (metadata.length === 0) {
      return true;
    }

    // Check if all entity types have completed initial sync
    const allSynced = metadata.every((m) => m.isInitialSyncComplete);
    return !allSynced;
  } catch (error) {
    console.error('[Database] Error checking sync status:', error);
    return true;
  }
}

/**
 * Get pending changes count for sync badge
 */
export async function getPendingChangesCount(): Promise<number> {
  const database = getDatabase();

  try {
    const syncQueue = database.get<SyncQueueItem>(TableNames.SYNC_QUEUE);
    return await syncQueue
      .query()
      .fetchCount();
  } catch (error) {
    console.error('[Database] Error getting pending changes:', error);
    return 0;
  }
}

// Re-export schema and types
export { schema, TableNames, SCHEMA_VERSION } from './schema';
export { migrations } from './migrations';

// Re-export models
export { default as User } from './models/User';
export { default as Festival } from './models/Festival';
export { default as Ticket } from './models/Ticket';
export { default as Artist } from './models/Artist';
export { default as Performance } from './models/Performance';
export { default as CashlessAccount } from './models/CashlessAccount';
export { default as CashlessTransaction } from './models/CashlessTransaction';
export { default as Notification } from './models/Notification';
export { default as SyncMetadata } from './models/SyncMetadata';
export { default as SyncQueueItem } from './models/SyncQueueItem';

// Export types
export type { Database } from '@nozbe/watermelondb';
