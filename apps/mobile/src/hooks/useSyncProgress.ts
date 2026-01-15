/**
 * useSyncProgress Hook
 * Track sync progress with detailed information
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  syncService,
  syncManager,
  SyncStatus,
  SyncResult,
  SyncPhase,
  SyncTask,
  SyncManagerEvent,
  EntitySyncStatus,
} from '../services/sync';

// Return type
export interface SyncProgressResult {
  // Overall progress
  progress: number;
  phase: SyncPhase;
  isActive: boolean;

  // Detailed progress
  totalItems: number;
  processedItems: number;
  currentBatch: number;
  totalBatches: number;
  currentEntity: string | null;
  estimatedTimeRemaining: number | null;

  // Entity-level progress
  entityStatuses: Map<string, EntitySyncStatus>;
  currentEntityProgress: number;

  // Tasks
  tasks: SyncTask[];
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;

  // Timing
  startedAt: Date | null;
  duration: number;
  bytesTransferred: number;

  // Errors
  errors: { entity: string; message: string }[];
  hasErrors: boolean;

  // Last result
  lastResult: SyncResult | null;

  // Actions
  startSync: (force?: boolean) => Promise<SyncResult>;
  cancelSync: () => void;
  retryFailed: () => Promise<SyncResult>;
}

/**
 * Hook to track sync progress with detailed metrics
 */
export function useSyncProgress(): SyncProgressResult {
  // Overall progress
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [isActive, setIsActive] = useState(false);

  // Detailed progress
  const [totalItems, setTotalItems] = useState(0);
  const [processedItems, setProcessedItems] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [currentEntity, setCurrentEntity] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [bytesTransferred, setBytesTransferred] = useState(0);

  // Entity statuses
  const [entityStatuses, setEntityStatuses] = useState<Map<string, EntitySyncStatus>>(new Map());

  // Tasks
  const [tasks, setTasks] = useState<SyncTask[]>([]);

  // Timing
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);

  // Errors
  const [errors, setErrors] = useState<{ entity: string; message: string }[]>([]);

  // Last result
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  /**
   * Handle sync status updates
   */
  const handleSyncStatusChange = useCallback((status: SyncStatus) => {
    setProgress(status.progress);
    setCurrentEntity(status.currentEntity);
    setEntityStatuses(new Map(status.entityStatuses));
    setIsActive(status.state === 'syncing');

    if (status.state === 'syncing' && !startedAt) {
      setStartedAt(new Date());
    }
  }, [startedAt]);

  /**
   * Handle sync manager events
   */
  const handleSyncManagerEvent = useCallback((event: SyncManagerEvent) => {
    switch (event.type) {
      case 'progress':
        setTotalItems(event.data.totalItems);
        setProcessedItems(event.data.processedItems);
        setCurrentBatch(event.data.currentBatch);
        setTotalBatches(event.data.totalBatches);
        setEstimatedTimeRemaining(event.data.estimatedTimeRemaining);
        setBytesTransferred(event.data.bytesTransferred);
        setErrors(
          event.data.errors.map((e) => ({ entity: e.entity, message: e.message }))
        );
        break;

      case 'phase_change':
        setPhase(event.data.to);
        if (event.data.to === 'completed' || event.data.to === 'failed') {
          setIsActive(false);
        }
        break;

      case 'task_started':
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === event.data.id ? event.data : t
          );
          if (!prev.find((t) => t.id === event.data.id)) {
            updated.push(event.data);
          }
          return updated;
        });
        break;

      case 'task_completed':
      case 'task_failed':
        setTasks((prev) =>
          prev.map((t) => (t.id === event.data.id ? event.data : t))
        );
        break;

      case 'sync_completed':
        setLastResult(event.data);
        setDuration(event.data.duration);
        setIsActive(false);
        break;

      case 'sync_failed':
        setIsActive(false);
        break;
    }
  }, []);

  /**
   * Initialize listeners
   */
  useEffect(() => {
    // Subscribe to sync service
    const syncUnsubscribe = syncService.addListener(handleSyncStatusChange);

    // Subscribe to sync manager
    const managerUnsubscribe = syncManager.addListener(handleSyncManagerEvent);

    // Get initial status
    const initialStatus = syncService.getStatus();
    handleSyncStatusChange(initialStatus);

    // Get initial tasks
    setTasks(syncManager.getTasks());

    return () => {
      syncUnsubscribe();
      managerUnsubscribe();
    };
  }, [handleSyncStatusChange, handleSyncManagerEvent]);

  /**
   * Update duration while syncing
   */
  useEffect(() => {
    if (!isActive || !startedAt) {return;}

    const interval = setInterval(() => {
      setDuration(Date.now() - startedAt.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  /**
   * Calculate current entity progress
   */
  const currentEntityProgress = useMemo(() => {
    if (!currentEntity) {return 0;}
    const entityStatus = entityStatuses.get(currentEntity);
    if (!entityStatus) {return 0;}

    // Calculate based on pending changes
    if (entityStatus.pendingChanges === 0) {return 100;}
    return Math.round((1 - entityStatus.pendingChanges / 100) * 100);
  }, [currentEntity, entityStatuses]);

  /**
   * Calculate task counts
   */
  const { pendingTasks, completedTasks, failedTasks } = useMemo(() => {
    return {
      pendingTasks: tasks.filter((t) => t.status === 'pending' || t.status === 'running').length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      failedTasks: tasks.filter((t) => t.status === 'failed').length,
    };
  }, [tasks]);

  /**
   * Check if there are errors
   */
  const hasErrors = errors.length > 0 || failedTasks > 0;

  /**
   * Start sync
   */
  const startSync = useCallback(async (force = false): Promise<SyncResult> => {
    setStartedAt(new Date());
    setDuration(0);
    setErrors([]);

    return syncManager.startSync({ force });
  }, []);

  /**
   * Cancel sync
   */
  const cancelSync = useCallback(() => {
    syncManager.cancelSync();
    setIsActive(false);
  }, []);

  /**
   * Retry failed sync
   */
  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    return syncManager.retryFailedSync();
  }, []);

  return {
    progress,
    phase,
    isActive,
    totalItems,
    processedItems,
    currentBatch,
    totalBatches,
    currentEntity,
    estimatedTimeRemaining,
    entityStatuses,
    currentEntityProgress,
    tasks,
    pendingTasks,
    completedTasks,
    failedTasks,
    startedAt,
    duration,
    bytesTransferred,
    errors,
    hasErrors,
    lastResult,
    startSync,
    cancelSync,
    retryFailed,
  };
}

export default useSyncProgress;
