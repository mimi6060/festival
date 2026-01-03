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

// Simulated real-time data generator for demo
function generateMockStats(): RealtimeStats {
  const baseStats = {
    activeConnections: Math.floor(Math.random() * 100) + 50,
    ticketsSoldToday: Math.floor(Math.random() * 500) + 200,
    revenueToday: Math.floor(Math.random() * 50000) + 10000,
    cashlessBalance: Math.floor(Math.random() * 100000) + 50000,
    currentAttendees: Math.floor(Math.random() * 10000) + 5000,
    zoneOccupancy: {
      'main-stage': {
        current: Math.floor(Math.random() * 40000) + 10000,
        capacity: 50000,
      },
      'vip-area': {
        current: Math.floor(Math.random() * 1500) + 500,
        capacity: 2000,
      },
      backstage: {
        current: Math.floor(Math.random() * 300) + 100,
        capacity: 500,
      },
      'food-court': {
        current: Math.floor(Math.random() * 3000) + 1000,
        capacity: 5000,
      },
      camping: {
        current: Math.floor(Math.random() * 8000) + 2000,
        capacity: 10000,
      },
    },
    recentTransactions: generateMockTransactions(5),
    alerts: generateMockAlerts(),
  };

  return baseStats;
}

function generateMockTransactions(count: number): RealtimeTransaction[] {
  const types: RealtimeTransaction['type'][] = [
    'ticket_sale',
    'cashless_topup',
    'cashless_payment',
    'refund',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${Date.now()}-${i}`,
    type: types[Math.floor(Math.random() * types.length)] ?? 'ticket_sale',
    amount: Math.floor(Math.random() * 200) + 10,
    timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
  }));
}

function generateMockAlerts(): RealtimeAlert[] {
  const alerts: RealtimeAlert[] = [];

  // Randomly generate alerts
  if (Math.random() > 0.7) {
    alerts.push({
      id: `alert-${Date.now()}`,
      type: 'warning',
      message: 'Zone VIP proche de la capacite maximale (92%)',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (Math.random() > 0.9) {
    alerts.push({
      id: `alert-${Date.now()}-2`,
      type: 'error',
      message: 'Echec de connexion au terminal de paiement #12',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (Math.random() > 0.8) {
    alerts.push({
      id: `alert-${Date.now()}-3`,
      type: 'success',
      message: 'Objectif de ventes journalier atteint!',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  return alerts;
}

export function useRealtimeData(options: UseRealtimeDataOptions = {}): UseRealtimeDataReturn {
  const {
    festivalId,
    autoConnect = true,
    pollingFallback = true,
    pollingInterval = 5000,
  } = options;

  const [stats, setStats] = useState<RealtimeStats>(initialStats);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const usePolling = useRef(true); // Set to true for demo mode

  // WebSocket URL (would be real in production)
  const wsUrl = festivalId
    ? `wss://api.festival.com/ws/realtime?festivalId=${festivalId}`
    : 'wss://api.festival.com/ws/realtime';

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
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
      usePolling.current = false;
    },
    onDisconnect: () => {
      // Start polling fallback
      if (pollingFallback) {
        usePolling.current = true;
      }
    },
    reconnect: true,
    maxReconnectAttempts: 5,
  });

  // Polling fallback for demo or when WebSocket unavailable
  useEffect(() => {
    if (usePolling.current && pollingFallback) {
      const poll = () => {
        const newStats = generateMockStats();
        setStats((prev) => ({
          ...newStats,
          // Preserve acknowledged alerts
          alerts: [...newStats.alerts, ...prev.alerts.filter((a) => a.acknowledged)],
        }));
        setLastUpdate(new Date());
      };

      // Initial fetch
      poll();

      // Set up interval
      pollingRef.current = setInterval(poll, pollingInterval);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
    return undefined;
  }, [pollingFallback, pollingInterval]);

  // Connect on mount if autoConnect
  useEffect(() => {
    if (autoConnect && !usePolling.current) {
      wsConnect();
    }
  }, [autoConnect, wsConnect]);

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
    if (usePolling.current) {
      const newStats = generateMockStats();
      setStats((prev) => ({
        ...newStats,
        alerts: [...newStats.alerts, ...prev.alerts.filter((a) => a.acknowledged)],
      }));
      setLastUpdate(new Date());
    }
  }, []);

  return {
    stats,
    isConnected: isConnected || usePolling.current,
    connectionState: usePolling.current ? 'connected' : connectionState,
    lastUpdate,
    connect: wsConnect,
    disconnect: wsDisconnect,
    acknowledgeAlert,
    refresh,
  };
}

export default useRealtimeData;
