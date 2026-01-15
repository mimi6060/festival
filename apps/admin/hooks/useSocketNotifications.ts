'use client';

import { useEffect, useCallback } from 'react';
import { useSocketIO, type ConnectionState } from './useSocketIO';
import type { AdminNotification, NotificationCategory, NotificationType } from './useNotifications';

// WebSocket event types from the events gateway
interface WsNotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// Map notification data to category based on event type
function mapToCategory(data?: Record<string, unknown>): NotificationCategory {
  if (!data) { return 'system'; }

  // Check for specific event types
  if (data.eventType === 'purchase' || data.orderId) { return 'purchase'; }
  if (data.eventType === 'refund' || data.refundId) { return 'refund'; }
  if (data.eventType === 'support' || data.ticketId) { return 'support'; }
  if (data.eventType === 'festival' || data.festivalId) { return 'festival'; }
  if (data.eventType === 'security') { return 'security'; }

  return 'system';
}

// Convert WebSocket notification to AdminNotification
function wsToAdminNotification(event: WsNotificationEvent): AdminNotification {
  const category = mapToCategory(event.data);

  // Generate action URL based on category
  let actionUrl: string | undefined;
  let actionLabel: string | undefined;

  switch (category) {
    case 'purchase':
      actionUrl = '/orders';
      actionLabel = 'Voir les commandes';
      break;
    case 'refund':
      actionUrl = '/refunds';
      actionLabel = 'Traiter le remboursement';
      break;
    case 'support':
      actionUrl = '/support';
      actionLabel = 'Voir le ticket';
      break;
    case 'festival':
      actionUrl = event.data?.festivalId ? `/festivals/${event.data.festivalId}` : '/festivals';
      actionLabel = 'Voir le festival';
      break;
    case 'security':
      actionUrl = '/security';
      actionLabel = 'Voir les alertes';
      break;
    default:
      break;
  }

  return {
    id: event.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: event.type,
    category,
    title: event.title,
    message: event.message,
    timestamp: event.timestamp || new Date().toISOString(),
    read: false,
    actionUrl,
    actionLabel,
    metadata: event.data,
  };
}

export interface UseSocketNotificationsOptions {
  /** Enable/disable auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when a new notification is received */
  onNotification?: (notification: AdminNotification) => void;
  /** Callback when connection state changes */
  onConnectionChange?: (state: ConnectionState) => void;
}

export interface UseSocketNotificationsReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether currently connected */
  isConnected: boolean;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Join a room (e.g., festival-specific notifications) */
  joinRoom: (room: string, festivalId?: string) => void;
  /** Leave a room */
  leaveRoom: (room: string, festivalId?: string) => void;
  /** Last error message */
  lastError: string | null;
}

export function useSocketNotifications(
  options: UseSocketNotificationsOptions = {}
): UseSocketNotificationsReturn {
  const { autoConnect = true, onNotification, onConnectionChange } = options;

  // Use the existing Socket.io hook
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    emit,
    on,
    off,
  } = useSocketIO({
    namespace: '/events',
    autoConnect,
    onConnect: () => {
      onConnectionChange?.('connected');
    },
    onDisconnect: () => {
      onConnectionChange?.('disconnected');
    },
    onError: () => {
      onConnectionChange?.('error');
    },
  });

  // Handle incoming notification events
  useEffect(() => {
    if (!onNotification) { return; }

    // Generic notification event
    const handleNotification = (data: WsNotificationEvent) => {
      const notification = wsToAdminNotification(data);
      onNotification(notification);
    };

    // New purchase event
    const handleNewPurchase = (data: Record<string, unknown>) => {
      onNotification({
        id: `purchase-${Date.now()}`,
        type: 'success',
        category: 'purchase',
        title: 'Nouvel achat',
        message: data.message?.toString() || 'Un nouvel achat a ete effectue',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders',
        actionLabel: 'Voir la commande',
        metadata: data,
      });
    };

    // Refund request event
    const handleRefundRequest = (data: Record<string, unknown>) => {
      onNotification({
        id: `refund-${Date.now()}`,
        type: 'warning',
        category: 'refund',
        title: 'Demande de remboursement',
        message: data.message?.toString() || 'Une demande de remboursement a ete soumise',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/refunds',
        actionLabel: 'Traiter la demande',
        metadata: data,
      });
    };

    // Support ticket event
    const handleSupportTicket = (data: Record<string, unknown>) => {
      onNotification({
        id: `support-${Date.now()}`,
        type: 'info',
        category: 'support',
        title: 'Nouveau ticket support',
        message: data.message?.toString() || 'Un nouveau ticket de support a ete cree',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/support',
        actionLabel: 'Voir le ticket',
        metadata: data,
      });
    };

    // Zone capacity alert
    const handleZoneAlert = (data: Record<string, unknown>) => {
      onNotification({
        id: `zone-${Date.now()}`,
        type: 'alert',
        category: 'festival',
        title: 'Alerte capacite',
        message: data.message?.toString() || 'Une zone a atteint sa capacite critique',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/zones',
        actionLabel: 'Voir les zones',
        metadata: data,
      });
    };

    // System alert
    const handleSystemAlert = (data: Record<string, unknown>) => {
      onNotification({
        id: `system-${Date.now()}`,
        type: data.type === 'error' ? 'error' : 'warning',
        category: 'system',
        title: data.title?.toString() || 'Alerte systeme',
        message: data.message?.toString() || 'Une alerte systeme a ete declenchee',
        timestamp: new Date().toISOString(),
        read: false,
        metadata: data,
      });
    };

    // Subscribe to events
    on('notification', handleNotification);
    on('new_purchase', handleNewPurchase);
    on('refund_request', handleRefundRequest);
    on('support_ticket', handleSupportTicket);
    on('zone_alert', handleZoneAlert);
    on('system_alert', handleSystemAlert);

    // Cleanup
    return () => {
      off('notification');
      off('new_purchase');
      off('refund_request');
      off('support_ticket');
      off('zone_alert');
      off('system_alert');
    };
  }, [on, off, onNotification]);

  // Join a room
  const joinRoom = useCallback(
    (room: string, festivalId?: string) => {
      emit('join_room', { room, festivalId });
    },
    [emit]
  );

  // Leave a room
  const leaveRoom = useCallback(
    (room: string, festivalId?: string) => {
      emit('leave_room', { room, festivalId });
    },
    [emit]
  );

  return {
    connectionState,
    isConnected,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    lastError: connectionState === 'error' ? 'Erreur de connexion WebSocket' : null,
  };
}

export default useSocketNotifications;
