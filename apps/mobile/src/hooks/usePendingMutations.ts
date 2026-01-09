/**
 * usePendingMutations Hook
 * Show pending offline changes and mutation status
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  offlineMutationHandler,
  Mutation,
  MutationEvent,
  MutationStatus,
  ReplayResult,
} from '../services/sync';
import { syncQueueService, QueueEvent } from '../services/sync';

// Return type
export interface PendingMutationsResult {
  // Counts
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  conflictCount: number;

  // Mutations
  mutations: Mutation[];
  pendingMutations: Mutation[];
  failedMutations: Mutation[];
  conflictMutations: Mutation[];

  // By entity
  mutationsByEntity: Map<string, Mutation[]>;
  entityCounts: Map<string, number>;

  // Status
  isReplaying: boolean;
  lastReplayResult: ReplayResult | null;

  // Actions
  replayAll: () => Promise<ReplayResult>;
  retryMutation: (mutationId: string) => Promise<boolean>;
  cancelMutation: (mutationId: string) => Promise<boolean>;
  resolveConflict: (
    mutationId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: Record<string, unknown>
  ) => Promise<boolean>;
  clearAll: () => Promise<void>;

  // Refresh
  refresh: () => void;
}

/**
 * Hook to track and manage pending mutations
 */
export function usePendingMutations(): PendingMutationsResult {
  // State
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [lastReplayResult, setLastReplayResult] = useState<ReplayResult | null>(null);

  /**
   * Load mutations
   */
  const loadMutations = useCallback(() => {
    const history = offlineMutationHandler.getMutationHistory();
    setMutations(history);
  }, []);

  /**
   * Handle mutation events
   */
  const handleMutationEvent = useCallback((event: MutationEvent) => {
    switch (event.type) {
      case 'mutation_added':
      case 'mutation_completed':
      case 'mutation_failed':
      case 'mutation_conflict':
        loadMutations();
        break;

      case 'replay_started':
        setIsReplaying(true);
        break;

      case 'replay_completed':
        setIsReplaying(false);
        setLastReplayResult(event.data);
        loadMutations();
        break;
    }
  }, [loadMutations]);

  /**
   * Initialize listeners
   */
  useEffect(() => {
    // Load initial mutations
    loadMutations();

    // Subscribe to mutation events
    const unsubscribe = offlineMutationHandler.addListener(handleMutationEvent);

    return () => {
      unsubscribe();
    };
  }, [loadMutations, handleMutationEvent]);

  /**
   * Filter mutations by status
   */
  const pendingMutations = useMemo(
    () => mutations.filter((m) => m.status === 'pending'),
    [mutations]
  );

  const failedMutations = useMemo(
    () => mutations.filter((m) => m.status === 'failed'),
    [mutations]
  );

  const conflictMutations = useMemo(
    () => mutations.filter((m) => m.status === 'conflict'),
    [mutations]
  );

  /**
   * Calculate counts
   */
  const totalCount = mutations.length;
  const pendingCount = pendingMutations.length;
  const processingCount = mutations.filter((m) => m.status === 'processing').length;
  const failedCount = failedMutations.length;
  const conflictCount = conflictMutations.length;

  /**
   * Group mutations by entity
   */
  const mutationsByEntity = useMemo(() => {
    const byEntity = new Map<string, Mutation[]>();

    for (const mutation of mutations) {
      const existing = byEntity.get(mutation.entityType) || [];
      existing.push(mutation);
      byEntity.set(mutation.entityType, existing);
    }

    return byEntity;
  }, [mutations]);

  /**
   * Calculate entity counts (pending only)
   */
  const entityCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const mutation of pendingMutations) {
      const current = counts.get(mutation.entityType) || 0;
      counts.set(mutation.entityType, current + 1);
    }

    return counts;
  }, [pendingMutations]);

  /**
   * Replay all pending mutations
   */
  const replayAll = useCallback(async (): Promise<ReplayResult> => {
    setIsReplaying(true);
    try {
      const result = await offlineMutationHandler.replayMutations();
      setLastReplayResult(result);
      loadMutations();
      return result;
    } finally {
      setIsReplaying(false);
    }
  }, [loadMutations]);

  /**
   * Retry a specific mutation
   */
  const retryMutation = useCallback(
    async (mutationId: string): Promise<boolean> => {
      const result = await offlineMutationHandler.retryMutation(mutationId);
      loadMutations();
      return result.success;
    },
    [loadMutations]
  );

  /**
   * Cancel a mutation
   */
  const cancelMutation = useCallback(
    async (mutationId: string): Promise<boolean> => {
      const result = await offlineMutationHandler.cancelMutation(mutationId);
      loadMutations();
      return result;
    },
    [loadMutations]
  );

  /**
   * Resolve a conflict
   */
  const resolveConflict = useCallback(
    async (
      mutationId: string,
      resolution: 'local' | 'server' | 'merge',
      mergedData?: Record<string, unknown>
    ): Promise<boolean> => {
      const result = await offlineMutationHandler.resolveConflict(
        mutationId,
        resolution,
        mergedData
      );
      loadMutations();
      return result.success;
    },
    [loadMutations]
  );

  /**
   * Clear all mutations
   */
  const clearAll = useCallback(async (): Promise<void> => {
    await offlineMutationHandler.clearAllMutations();
    loadMutations();
  }, [loadMutations]);

  return {
    totalCount,
    pendingCount,
    processingCount,
    failedCount,
    conflictCount,
    mutations,
    pendingMutations,
    failedMutations,
    conflictMutations,
    mutationsByEntity,
    entityCounts,
    isReplaying,
    lastReplayResult,
    replayAll,
    retryMutation,
    cancelMutation,
    resolveConflict,
    clearAll,
    refresh: loadMutations,
  };
}

export default usePendingMutations;
