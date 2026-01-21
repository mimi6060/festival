/**
 * useTicketCache Hook
 * Provides ticket caching functionality for offline QR code access
 */

import { useState, useEffect, useCallback } from 'react';

import { ticketCacheService, TicketCacheStatus } from '../services/sync';
import type Ticket from '../database/models/Ticket';

// Hook return type
export interface UseTicketCacheResult {
  // Status
  status: TicketCacheStatus;
  isLoading: boolean;
  error: Error | null;

  // Tickets
  tickets: Ticket[];
  validTickets: Ticket[];

  // Actions
  cacheTickets: (tickets: any[]) => Promise<void>;
  getTicket: (ticketId: string) => Promise<Ticket | null>;
  getQRCode: (ticketId: string) => Promise<{ qrCode: string; qrCodeData: string } | null>;
  preloadTickets: (
    fetchFunction: () => Promise<any[]>
  ) => Promise<{ success: boolean; ticketCount: number }>;
  markAsUsed: (ticketId: string, staffId?: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Flags
  hasQRCodesAvailable: boolean;
  needsRefresh: boolean;
}

/**
 * Hook to manage ticket caching for offline access
 */
export function useTicketCache(festivalId?: string): UseTicketCacheResult {
  // State
  const [status, setStatus] = useState<TicketCacheStatus>({
    isCached: false,
    ticketCount: 0,
    lastFetchedAt: null,
    isStale: true,
    qrCodesAvailable: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [validTickets, setValidTickets] = useState<Ticket[]>([]);
  const [needsRefresh, setNeedsRefresh] = useState(true);

  /**
   * Initialize and load status
   */
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await ticketCacheService.initialize();
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize ticket cache'));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [festivalId]);

  /**
   * Refresh cache status and tickets
   */
  const refreshStatus = useCallback(async () => {
    try {
      const cacheStatus = await ticketCacheService.getCacheStatus(festivalId);
      setStatus(cacheStatus);

      const cachedTickets = await ticketCacheService.getCachedTickets(festivalId);
      setTickets(cachedTickets);

      const valid = await ticketCacheService.getValidTickets(festivalId);
      setValidTickets(valid);

      const needs = await ticketCacheService.needsRefresh();
      setNeedsRefresh(needs);
    } catch (err) {
      console.error('[useTicketCache] Failed to refresh status:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh cache status'));
    }
  }, [festivalId]);

  /**
   * Cache tickets
   */
  const cacheTickets = useCallback(
    async (ticketsToCache: any[]) => {
      setIsLoading(true);
      setError(null);

      try {
        await ticketCacheService.cacheTickets(ticketsToCache);
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to cache tickets'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStatus]
  );

  /**
   * Get a single ticket
   */
  const getTicket = useCallback(async (ticketId: string): Promise<Ticket | null> => {
    try {
      return await ticketCacheService.getCachedTicketById(ticketId);
    } catch (err) {
      console.error('[useTicketCache] Failed to get ticket:', err);
      return null;
    }
  }, []);

  /**
   * Get QR code data for a ticket
   */
  const getQRCode = useCallback(async (ticketId: string) => {
    try {
      return await ticketCacheService.getQRCodeData(ticketId);
    } catch (err) {
      console.error('[useTicketCache] Failed to get QR code:', err);
      return null;
    }
  }, []);

  /**
   * Preload tickets
   */
  const preloadTickets = useCallback(
    async (
      fetchFunction: () => Promise<any[]>
    ): Promise<{ success: boolean; ticketCount: number }> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ticketCacheService.preloadTickets(fetchFunction, festivalId);
        await refreshStatus();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to preload tickets'));
        return { success: false, ticketCount: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [festivalId, refreshStatus]
  );

  /**
   * Mark a ticket as used
   */
  const markAsUsed = useCallback(
    async (ticketId: string, staffId?: string): Promise<boolean> => {
      try {
        const result = await ticketCacheService.markTicketAsUsed(ticketId, staffId);
        await refreshStatus();
        return result;
      } catch (err) {
        console.error('[useTicketCache] Failed to mark ticket as used:', err);
        return false;
      }
    },
    [refreshStatus]
  );

  /**
   * Clear the cache
   */
  const clearCache = useCallback(async () => {
    setIsLoading(true);

    try {
      await ticketCacheService.clearCache();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear cache'));
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  return {
    // Status
    status,
    isLoading,
    error,

    // Tickets
    tickets,
    validTickets,

    // Actions
    cacheTickets,
    getTicket,
    getQRCode,
    preloadTickets,
    markAsUsed,
    refreshStatus,
    clearCache,

    // Flags
    hasQRCodesAvailable: status.qrCodesAvailable,
    needsRefresh,
  };
}

export default useTicketCache;
