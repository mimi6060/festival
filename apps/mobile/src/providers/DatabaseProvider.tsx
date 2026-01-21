/**
 * DatabaseProvider
 * React context provider for WatermelonDB database access
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Database } from '@nozbe/watermelondb';
import { DatabaseProvider as WatermelonDBProvider } from '@nozbe/watermelondb/react';

import {
  getDatabase,
  resetDatabase,
  getDatabaseStats,
  needsInitialSync,
  getPendingChangesCount,
} from '../database';
import { syncService, SyncStatus } from '../services/sync';

// Context types
export interface DatabaseContextValue {
  // Database instance
  database: Database;
  // Status
  isReady: boolean;
  isInitializing: boolean;
  error: Error | null;
  // Stats
  stats: DatabaseStats | null;
  pendingChanges: number;
  needsInitialSync: boolean;
  // Sync status
  syncStatus: SyncStatus;
  // Actions
  refreshStats: () => Promise<void>;
  resetDb: () => Promise<void>;
  sync: () => Promise<void>;
}

export interface DatabaseStats {
  version: number;
  tables: { name: string; count: number }[];
  totalRecords: number;
}

// Create context
const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// Provider props
export interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
  autoSync?: boolean;
}

/**
 * Database Provider Component
 */
export function DatabaseProvider({
  children,
  onReady,
  onError,
  autoSync = true,
}: DatabaseProviderProps): JSX.Element {
  const [database, setDatabase] = useState<Database | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [needsSync, setNeedsSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  // Initialize database
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Get database instance
        const db = getDatabase();
        setDatabase(db);

        // Check if initial sync is needed
        const needsInitial = await needsInitialSync();
        setNeedsSync(needsInitial);

        // Get initial stats
        const dbStats = await getDatabaseStats();
        setStats(dbStats);

        // Get pending changes count
        const pending = await getPendingChangesCount();
        setPendingChanges(pending);

        setIsReady(true);
        onReady?.();

        console.log('[DatabaseProvider] Database initialized');

        // Trigger initial sync if needed and autoSync is enabled
        if (autoSync && needsInitial) {
          console.log('[DatabaseProvider] Triggering initial sync');
          syncService.sync().catch((err) => {
            console.error('[DatabaseProvider] Initial sync failed:', err);
          });
        }
      } catch (err) {
        const initError = err instanceof Error ? err : new Error('Database initialization failed');
        setError(initError);
        onError?.(initError);
        console.error('[DatabaseProvider] Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDatabase();
  }, [autoSync, onReady, onError]);

  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = syncService.addListener((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const dbStats = await getDatabaseStats();
      setStats(dbStats);

      const pending = await getPendingChangesCount();
      setPendingChanges(pending);

      const needsInitial = await needsInitialSync();
      setNeedsSync(needsInitial);
    } catch (err) {
      console.error('[DatabaseProvider] Failed to refresh stats:', err);
    }
  }, []);

  // Reset database
  const resetDb = useCallback(async () => {
    try {
      await resetDatabase();
      await refreshStats();
      setNeedsSync(true);
      console.log('[DatabaseProvider] Database reset');
    } catch (err) {
      console.error('[DatabaseProvider] Failed to reset database:', err);
      throw err;
    }
  }, [refreshStats]);

  // Trigger sync
  const sync = useCallback(async () => {
    try {
      await syncService.sync();
      await refreshStats();
    } catch (err) {
      console.error('[DatabaseProvider] Sync failed:', err);
      throw err;
    }
  }, [refreshStats]);

  // Context value
  const contextValue: DatabaseContextValue | null = database
    ? {
        database,
        isReady,
        isInitializing,
        error,
        stats,
        pendingChanges,
        needsInitialSync: needsSync,
        syncStatus,
        refreshStats,
        resetDb,
        sync,
      }
    : null;

  // Show loading state while initializing
  if (isInitializing || !database) {
    return <DatabaseLoadingState error={error} />;
  }

  // Render with WatermelonDB provider
  return (
    <DatabaseContext.Provider value={contextValue}>
      <WatermelonDBProvider database={database}>{children}</WatermelonDBProvider>
    </DatabaseContext.Provider>
  );
}

/**
 * Loading state component
 */
function DatabaseLoadingState({ error }: { error: Error | null }): JSX.Element {
  // You can customize this based on your app's design
  if (error) {
    return (
      <DatabaseErrorView
        error={error}
        onRetry={() => {
          // Reload the app
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />
    );
  }

  return <DatabaseLoadingView />;
}

/**
 * Loading view (placeholder - customize based on your design)
 */
function DatabaseLoadingView(): JSX.Element {
  // Return null or a minimal loading indicator
  // The actual UI should be implemented based on your app's design system
  return null as unknown as JSX.Element;
}

/**
 * Error view (placeholder - customize based on your design)
 */
function DatabaseErrorView({
  error,
  onRetry: _onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): JSX.Element {
  // Return null or error UI
  // The actual UI should be implemented based on your app's design system
  console.error('[DatabaseProvider] Error:', error);
  return null as unknown as JSX.Element;
}

/**
 * Hook to access database context
 */
export function useDatabaseContext(): DatabaseContextValue {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }

  return context;
}

/**
 * Hook to check if database is ready
 */
export function useDatabaseReady(): boolean {
  const context = useContext(DatabaseContext);
  return context?.isReady ?? false;
}

/**
 * Hook to get sync status from context
 */
export function useDatabaseSyncStatus(): SyncStatus | null {
  const context = useContext(DatabaseContext);
  return context?.syncStatus ?? null;
}

/**
 * Hook to get pending changes count
 */
export function usePendingChanges(): number {
  const context = useContext(DatabaseContext);
  return context?.pendingChanges ?? 0;
}

/**
 * Higher-order component to wrap components with database provider
 */
export function withDatabase<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { databaseProps?: Partial<DatabaseProviderProps> }> {
  return function WithDatabaseComponent({
    databaseProps,
    ...props
  }: P & { databaseProps?: Partial<DatabaseProviderProps> }) {
    return (
      <DatabaseProvider {...databaseProps}>
        <Component {...(props as P)} />
      </DatabaseProvider>
    );
  };
}

export default DatabaseProvider;
