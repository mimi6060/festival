'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';

// Types for real-time data
export interface RealtimeStats {
  activeConnections: number;
  ticketsSoldToday: number;
  revenueToday: number;
  cashlessBalance: number;
  currentAttendees: number;
  zoneOccupancy: Record<string, { current: number; capacity: number }>;
  recentTransactions: RealtimeTransaction[];
  alerts: RealtimeAlert[];
}

export interface RealtimeTransaction {
  id: string;
  type: 'ticket_sale' | 'cashless_topup' | 'cashless_payment' | 'refund';
  amount: number;
  timestamp: string;
  festivalId?: string;
  userId?: string;
}

export interface RealtimeAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface UseRealtimeDataOptions {
  festivalId?: string;
  autoConnect?: boolean;
  pollingFallback?: boolean;
  pollingInterval?: number;
}

export interface UseRealtimeDataReturn {
  stats: RealtimeStats;
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  acknowledgeAlert: (alertId: string) => void;
  refresh: () => void;
}

// Initial state
const initialStats: RealtimeStats = {
  activeConnections: 0,
  ticketsSoldToday: 0,
  revenueToday: 0,
  cashlessBalance: 0,
  currentAttendees: 0,
  zoneOccupancy: {},
  recentTransactions: [],
  alerts: [],
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Fetch real data from the API
async function fetchRealtimeStats(festivalId?: string): Promise<RealtimeStats> {
  if (!festivalId) {
    throw new Error('Festival ID is required for realtime data');
  }

  const [liveResponse, zonesResponse] = await Promise.all([
    fetch(`${API_URL}/v1/analytics/festivals/${festivalId}/realtime/live`, {
      credentials: 'include',
    }),
    fetch(`${API_URL}/v1/analytics/festivals/${festivalId}/realtime/zones`, {
      credentials: 'include',
    }),
  ]);

  if (!liveResponse.ok) {
    throw new Error(`Failed to fetch live metrics: ${liveResponse.statusText}`);
  }

  const liveData = await liveResponse.json();
  const zonesData = zonesResponse.ok ? await zonesResponse.json() : {};

  // Map API response to RealtimeStats interface
  return {
    activeConnections: liveData.activeConnections ?? 0,
    ticketsSoldToday: liveData.ticketsSoldToday ?? 0,
    revenueToday: liveData.revenueToday ?? 0,
    cashlessBalance: liveData.totalCashlessBalance ?? 0,
    currentAttendees: liveData.currentAttendees ?? 0,
    zoneOccupancy: zonesData.zones ?? {},
    recentTransactions: liveData.recentTransactions ?? [],
    alerts: liveData.alerts ?? [],
  };
}

export function useRealtimeData(options: UseRealtimeDataOptions = {}): UseRealtimeDataReturn {
  const {
    festivalId,
    autoConnect = true,
    pollingFallback = true,
    pollingInterval = 30000, // 30 seconds - reasonable for real API calls
  } = options;

  const [stats, setStats] = useState<RealtimeStats>(initialStats);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActive = useRef(false);
  const isMounted = useRef(true);

  // WebSocket URL for real-time updates
  const wsUrl = festivalId
    ? `${API_URL.replace('http', 'ws')}/ws/realtime?festivalId=${festivalId}`
    : '';

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (!isMounted.current) {
      return;
    }

    switch (message.type) {
      case 'stats_update':
        setStats((prev) => ({
          ...prev,
          ...(message.payload as Partial<RealtimeStats>),
        }));
        setLastUpdate(new Date());
        break;

      case 'transaction':
        setStats((prev) => ({
          ...prev,
          recentTransactions: [
            message.payload as RealtimeTransaction,
            ...prev.recentTransactions.slice(0, 9),
          ],
        }));
        break;

      case 'alert':
        setStats((prev) => ({
          ...prev,
          alerts: [message.payload as RealtimeAlert, ...prev.alerts],
        }));
        break;

      case 'zone_update':
        setStats((prev) => ({
          ...prev,
          zoneOccupancy: {
            ...prev.zoneOccupancy,
            ...(message.payload as Record<string, { current: number; capacity: number }>),
          },
        }));
        break;
    }
  }, []);

  const {
    isConnected,
    connectionState,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onConnect: () => {
      // Stop polling when WebSocket connects
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingActive.current = false;
    },
    onDisconnect: () => {
      // Start polling fallback when WebSocket disconnects
      if (pollingFallback && festivalId) {
        isPollingActive.current = true;
      }
    },
    reconnect: true,
    maxReconnectAttempts: 5,
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!festivalId || !isMounted.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newStats = await fetchRealtimeStats(festivalId);
      if (isMounted.current) {
        setStats((prev) => ({
          ...newStats,
          // Preserve acknowledged alerts
          alerts: [...newStats.alerts, ...prev.alerts.filter((a) => a.acknowledged)],
        }));
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [festivalId]);

  // Initial fetch and polling setup
  useEffect(() => {
    isMounted.current = true;

    // Only fetch if we have a festivalId
    if (!festivalId) {
      return () => {
        isMounted.current = false;
      };
    }

    // Initial fetch
    fetchData();

    // Setup polling if WebSocket is not connected and polling is enabled
    if (pollingFallback && !isConnected) {
      isPollingActive.current = true;
      pollingRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      isMounted.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [festivalId, pollingFallback, pollingInterval, isConnected, fetchData]);

  // Connect WebSocket on mount if autoConnect
  useEffect(() => {
    if (autoConnect && festivalId && wsUrl) {
      wsConnect();
    }
    return undefined;
  }, [autoConnect, festivalId, wsUrl, wsConnect]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setStats((prev) => ({
      ...prev,
      alerts: prev.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    }));
  }, []);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    isConnected,
    connectionState: isConnected ? 'connected' : connectionState,
    lastUpdate,
    isLoading,
    error,
    connect: wsConnect,
    disconnect: wsDisconnect,
    acknowledgeAlert,
    refresh,
  };
}

export default useRealtimeData;
