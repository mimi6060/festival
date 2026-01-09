/**
 * Providers Index
 * Exports all React context providers
 */

// Database Provider
export {
  DatabaseProvider,
  useDatabaseContext,
  useDatabaseReady,
  useDatabaseSyncStatus,
  usePendingChanges,
  withDatabase,
} from './DatabaseProvider';
export type {
  DatabaseContextValue,
  DatabaseStats,
  DatabaseProviderProps,
} from './DatabaseProvider';

// Network Status Provider
export {
  NetworkStatusProvider,
  useNetworkStatus,
  useIsOnline,
  withNetworkStatus,
} from './NetworkStatusProvider';
export type {
  NetworkStatusContextValue,
  NetworkStatusProviderProps,
} from './NetworkStatusProvider';
