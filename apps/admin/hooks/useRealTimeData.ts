'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketIO, ConnectionState } from './useSocketIO';

// Types for real-time data
export interface RealtimeStats {
  activeConnections: number;
  ticketsSoldToday: number;
  revenueToday: number;
  cashlessBalance: number;
  currentAttendees: number;
  zoneOccupancy: Record<string, ZoneOccupancyData>;
  recentTransactions: RealtimeTransaction[];
  alerts: RealtimeAlert[];
}

export interface ZoneOccupancyData {
  zoneId: string;
  zoneName: string;
  current: number;
  capacity: number;
  percentage: number;
  status: 'open' | 'busy' | 'near_capacity' | 'full' | 'closed' | 'emergency';
  trend: 'increasing' | 'decreasing' | 'stable';
  entriesLastHour: number;
  exitsLastHour: number;
}

export interface RealtimeTransaction {
  id: string;
  type: 'ticket_sale' | 'cashless_topup' | 'cashless_payment' | 'refund';
  amount: number;
  timestamp: string;
  festivalId?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export interface RealtimeAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  zoneId?: string;
  zoneName?: string;
  level?: 'info' | 'warning' | 'critical';
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
  connectionState: ConnectionState;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

// Fetch real data from the API
async function fetchRealtimeStats(festivalId?: string): Promise<RealtimeStats> {
  if (!festivalId) {
    // Return mock data if no festivalId
    return generateMockStats();
  }

  try {
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
  } catch {
    // Fallback to mock data on error
    return generateMockStats();
  }
}

// Generate mock stats for demo/fallback
function generateMockStats(): RealtimeStats {
  return {
    activeConnections: Math.floor(Math.random() * 500) + 100,
    ticketsSoldToday: Math.floor(Math.random() * 200) + 50,
    revenueToday: Math.floor(Math.random() * 50000) + 10000,
    cashlessBalance: Math.floor(Math.random() * 100000) + 25000,
    currentAttendees: Math.floor(Math.random() * 3000) + 1000,
    zoneOccupancy: {
      'main-stage': {
        zoneId: 'main-stage',
        zoneName: 'Scene Principale',
        current: Math.floor(Math.random() * 800) + 200,
        capacity: 1000,
        percentage: 0,
        status: 'open',
        trend: 'increasing',
        entriesLastHour: 150,
        exitsLastHour: 80,
      },
      'vip-area': {
        zoneId: 'vip-area',
        zoneName: 'Zone VIP',
        current: Math.floor(Math.random() * 150) + 50,
        capacity: 200,
        percentage: 0,
        status: 'busy',
        trend: 'stable',
        entriesLastHour: 30,
        exitsLastHour: 25,
      },
      'food-court': {
        zoneId: 'food-court',
        zoneName: 'Espace Restauration',
        current: Math.floor(Math.random() * 400) + 100,
        capacity: 500,
        percentage: 0,
        status: 'near_capacity',
        trend: 'increasing',
        entriesLastHour: 200,
        exitsLastHour: 120,
      },
      'camping': {
        zoneId: 'camping',
        zoneName: 'Camping',
        current: Math.floor(Math.random() * 1500) + 500,
        capacity: 2000,
        percentage: 0,
        status: 'open',
        trend: 'stable',
        entriesLastHour: 50,
        exitsLastHour: 30,
      },
    },
    recentTransactions: generateMockTransactions(),
    alerts: [],
  };
}

function generateMockTransactions(): RealtimeTransaction[] {
  const types: RealtimeTransaction['type'][] = [
    'ticket_sale',
    'cashless_topup',
    'cashless_payment',
    'refund',
  ];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `tx_${Date.now()}_${i}`,
    type: types[Math.floor(Math.random() * types.length)]!,
    amount: Math.floor(Math.random() * 150) + 10,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

export function useRealtimeData(options: UseRealtimeDataOptions = {}): UseRealtimeDataReturn {
  const {
    festivalId,
    autoConnect = true,
    pollingFallback = true,
    pollingInterval = 30000,
  } = options;

  const [stats, setStats] = useState<RealtimeStats>(initialStats);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Socket.IO connection for zones namespace
  const {
    isConnected: zonesConnected,
    connectionState: zonesConnectionState,
    connect: zonesConnect,
    disconnect: zonesDisconnect,
    emit: zonesEmit,
    on: zonesOn,
    off: zonesOff,
  } = useSocketIO({
    namespace: '/zones',
    autoConnect: false,
    onConnect: () => {
      // Connected to zones gateway
      // Subscribe to festival zones
      if (festivalId) {
        zonesEmit('subscribe_zone', { festivalId });
        zonesEmit('get_all_occupancy', { festivalId });
      }
      // Stop polling when connected
      stopPolling();
    },
    onDisconnect: () => {
      // Disconnected from zones gateway
      // Start polling fallback
      if (pollingFallback && festivalId && isMounted.current) {
        startPolling();
      }
    },
    onError: (error) => {
      console.error('[RealtimeData] Socket error:', error);
      setError(error.message);
      // Start polling fallback on error
      if (pollingFallback && festivalId && isMounted.current) {
        startPolling();
      }
    },
  });

  // Socket.IO connection for events namespace (transactions, alerts)
  const {
    isConnected: eventsConnected,
    connect: eventsConnect,
    disconnect: eventsDisconnect,
    emit: eventsEmit,
    on: eventsOn,
    off: eventsOff,
  } = useSocketIO({
    namespace: '/events',
    autoConnect: false,
    onConnect: () => {
      // Connected to events gateway
      // Join festival room
      if (festivalId) {
        eventsEmit('join_room', { room: 'dashboard', festivalId });
      }
    },
  });

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) { return; }
    // Starting polling fallback
    pollingRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchData();
      }
    }, pollingInterval);
  }, [pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      // Stopping polling
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!isMounted.current) { return; }

    setIsLoading(true);
    setError(null);

    try {
      const newStats = await fetchRealtimeStats(festivalId);
      if (isMounted.current) {
        // Calculate percentages for zone occupancy
        const zoneOccupancy = { ...newStats.zoneOccupancy };
        Object.keys(zoneOccupancy).forEach((key) => {
          const zone = zoneOccupancy[key]!;
          zone.percentage = Math.round((zone.current / zone.capacity) * 100);
        });
        newStats.zoneOccupancy = zoneOccupancy;

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

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!zonesConnected) { return; }

    // Zone occupancy updates
    const handleOccupancyUpdate = (data: ZoneOccupancyData) => {
      if (!isMounted.current) { return; }
      setStats((prev) => ({
        ...prev,
        zoneOccupancy: {
          ...prev.zoneOccupancy,
          [data.zoneId]: {
            ...data,
            percentage: Math.round((data.current / data.capacity) * 100),
          },
        },
        currentAttendees: Object.values({
          ...prev.zoneOccupancy,
          [data.zoneId]: data,
        }).reduce((sum, z) => sum + z.current, 0),
      }));
      setLastUpdate(new Date());
    };

    // Zone alerts
    const handleZoneAlert = (alert: RealtimeAlert) => {
      if (!isMounted.current) { return; }
      setStats((prev) => ({
        ...prev,
        alerts: [
          {
            ...alert,
            acknowledged: false,
            type: alert.level === 'critical' ? 'error' : alert.level === 'warning' ? 'warning' : 'info',
          },
          ...prev.alerts.filter((a) => a.id !== alert.id),
        ],
      }));
    };

    // All occupancy data
    const handleAllOccupancy = (data: { zones: ZoneOccupancyData[] }) => {
      if (!isMounted.current) { return; }
      const zoneOccupancy: Record<string, ZoneOccupancyData> = {};
      let totalAttendees = 0;

      data.zones.forEach((zone) => {
        zoneOccupancy[zone.zoneId] = {
          ...zone,
          percentage: Math.round((zone.current / zone.capacity) * 100),
        };
        totalAttendees += zone.current;
      });

      setStats((prev) => ({
        ...prev,
        zoneOccupancy,
        currentAttendees: totalAttendees,
      }));
      setLastUpdate(new Date());
    };

    zonesOn('occupancy_update', handleOccupancyUpdate);
    zonesOn('zone_alert', handleZoneAlert);
    zonesOn('zones', handleAllOccupancy);

    return () => {
      zonesOff('occupancy_update');
      zonesOff('zone_alert');
      zonesOff('zones');
    };
  }, [zonesConnected, zonesOn, zonesOff]);

  // Setup events gateway listeners
  useEffect(() => {
    if (!eventsConnected) { return; }

    // Notification/transaction events
    const handleNotification = (data: { type: string; payload: unknown }) => {
      if (!isMounted.current) { return; }

      switch (data.type) {
        case 'ticket_sale':
        case 'cashless_topup':
        case 'cashless_payment':
        case 'refund': {
          const transaction = data.payload as RealtimeTransaction;
          setStats((prev) => ({
            ...prev,
            recentTransactions: [transaction, ...prev.recentTransactions.slice(0, 9)],
            ticketsSoldToday:
              data.type === 'ticket_sale' ? prev.ticketsSoldToday + 1 : prev.ticketsSoldToday,
            revenueToday:
              data.type === 'ticket_sale' || data.type === 'cashless_topup'
                ? prev.revenueToday + transaction.amount
                : data.type === 'refund'
                  ? prev.revenueToday - transaction.amount
                  : prev.revenueToday,
          }));
          setLastUpdate(new Date());
          break;
        }

        case 'stats_update': {
          const statsUpdate = data.payload as Partial<RealtimeStats>;
          setStats((prev) => ({ ...prev, ...statsUpdate }));
          setLastUpdate(new Date());
          break;
        }
      }
    };

    eventsOn('notification', handleNotification);

    return () => {
      eventsOff('notification');
    };
  }, [eventsConnected, eventsOn, eventsOff]);

  // Connect on mount
  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    fetchData();

    if (autoConnect) {
      zonesConnect();
      eventsConnect();
    }

    // Start polling if not connected
    if (pollingFallback && !zonesConnected) {
      startPolling();
    }

    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, [autoConnect, zonesConnect, eventsConnect, fetchData, pollingFallback, startPolling, stopPolling, zonesConnected]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setStats((prev) => ({
        ...prev,
        alerts: prev.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ),
      }));
      // Also notify the server
      if (zonesConnected) {
        zonesEmit('acknowledge_alert', { alertId });
      }
    },
    [zonesConnected, zonesEmit]
  );

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData();
    // Request fresh data from WebSocket
    if (zonesConnected && festivalId) {
      zonesEmit('get_all_occupancy', { festivalId });
    }
  }, [fetchData, zonesConnected, zonesEmit, festivalId]);

  // Connect function for external use
  const connect = useCallback(() => {
    zonesConnect();
    eventsConnect();
  }, [zonesConnect, eventsConnect]);

  // Disconnect function for external use
  const disconnect = useCallback(() => {
    zonesDisconnect();
    eventsDisconnect();
    startPolling();
  }, [zonesDisconnect, eventsDisconnect, startPolling]);

  return {
    stats,
    isConnected: zonesConnected || eventsConnected,
    connectionState: zonesConnectionState,
    lastUpdate,
    isLoading,
    error,
    connect,
    disconnect,
    acknowledgeAlert,
    refresh,
  };
}

export default useRealtimeData;
