'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Notification types for admin dashboard
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert';
export type NotificationCategory =
  | 'purchase'
  | 'refund'
  | 'support'
  | 'system'
  | 'festival'
  | 'security';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

// Category configuration with labels and colors
export const categoryConfig: Record<
  NotificationCategory,
  { label: string; color: string; icon: string }
> = {
  purchase: { label: 'Achat', color: 'bg-green-100 text-green-700', icon: 'shopping-cart' },
  refund: { label: 'Remboursement', color: 'bg-orange-100 text-orange-700', icon: 'refresh' },
  support: { label: 'Support', color: 'bg-blue-100 text-blue-700', icon: 'help-circle' },
  system: { label: 'Systeme', color: 'bg-gray-100 text-gray-700', icon: 'settings' },
  festival: { label: 'Festival', color: 'bg-purple-100 text-purple-700', icon: 'music' },
  security: { label: 'Securite', color: 'bg-red-100 text-red-700', icon: 'shield' },
};

// Type colors for notification badges
export const typeColors: Record<NotificationType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  alert: 'bg-purple-50 border-purple-200 text-purple-700',
};

// localStorage key for read notifications
const STORAGE_KEY = 'admin_notifications_read';
const NOTIFICATIONS_KEY = 'admin_notifications';
const MAX_STORED_NOTIFICATIONS = 100;

// Sample notifications for initial state
const sampleNotifications: AdminNotification[] = [
  {
    id: 'sample-1',
    type: 'success',
    category: 'purchase',
    title: 'Nouvel achat',
    message: 'Sophie Petit a achete 2 billets VIP pour Summer Vibes Festival.',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    actionUrl: '/orders',
    actionLabel: 'Voir la commande',
    metadata: { orderId: 'ORD-2026-001', amount: 299.99 },
  },
  {
    id: 'sample-2',
    type: 'warning',
    category: 'refund',
    title: 'Demande de remboursement',
    message: 'Jean Martin demande un remboursement pour sa commande #ORD-2026-042.',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
    actionUrl: '/refunds',
    actionLabel: 'Traiter la demande',
    metadata: { orderId: 'ORD-2026-042', userId: 'user-123' },
  },
  {
    id: 'sample-3',
    type: 'info',
    category: 'support',
    title: 'Nouveau ticket support',
    message: 'Un nouveau ticket de support a ete ouvert par un utilisateur VIP.',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    read: false,
    actionUrl: '/support',
    actionLabel: 'Voir le ticket',
    metadata: { ticketId: 'TKT-2026-015', priority: 'high' },
  },
  {
    id: 'sample-4',
    type: 'alert',
    category: 'festival',
    title: 'Alerte capacite',
    message: 'La zone VIP de Rock en Seine a atteint 85% de sa capacite.',
    timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    read: true,
    actionUrl: '/zones',
    actionLabel: 'Voir les zones',
    metadata: { festivalId: 'fest-001', zoneId: 'zone-vip' },
  },
  {
    id: 'sample-5',
    type: 'error',
    category: 'system',
    title: 'Echec de paiement',
    message: 'Transaction echouee pour la commande #ORD-2026-099. Carte refusee.',
    timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    read: true,
    actionUrl: '/payments',
    actionLabel: 'Voir les details',
    metadata: { orderId: 'ORD-2026-099', reason: 'card_declined' },
  },
];

// Load read notification IDs from localStorage
function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') { return new Set(); }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    console.warn('Failed to load read notification IDs from localStorage');
  }
  return new Set();
}

// Save read notification IDs to localStorage
function saveReadIds(ids: Set<string>): void {
  if (typeof window === 'undefined') { return; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    console.warn('Failed to save read notification IDs to localStorage');
  }
}

// Load notifications from localStorage
function loadNotifications(): AdminNotification[] {
  if (typeof window === 'undefined') { return sampleNotifications; }
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      const notifications = JSON.parse(stored);
      // Apply read state from localStorage
      const readIds = loadReadIds();
      return notifications.map((n: AdminNotification) => ({
        ...n,
        read: readIds.has(n.id),
      }));
    }
  } catch {
    console.warn('Failed to load notifications from localStorage');
  }
  return sampleNotifications;
}

// Save notifications to localStorage
function saveNotifications(notifications: AdminNotification[]): void {
  if (typeof window === 'undefined') { return; }
  try {
    // Keep only the most recent notifications
    const toStore = notifications.slice(0, MAX_STORED_NOTIFICATIONS);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(toStore));
  } catch {
    console.warn('Failed to save notifications to localStorage');
  }
}

export interface UseNotificationsOptions {
  autoLoad?: boolean;
  maxNotifications?: number;
}

export interface UseNotificationsReturn {
  notifications: AdminNotification[];
  unreadCount: number;
  isLoading: boolean;
  // Actions
  addNotification: (notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  // Filters
  filterByCategory: (category: NotificationCategory | 'all') => AdminNotification[];
  filterByRead: (read: boolean) => AdminNotification[];
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { autoLoad = true, maxNotifications = MAX_STORED_NOTIFICATIONS } = options;

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [_readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (autoLoad) {
      const loadedNotifications = loadNotifications();
      const loadedReadIds = loadReadIds();
      setNotifications(loadedNotifications);
      setReadIds(loadedReadIds);
      setIsLoading(false);
    }
  }, [autoLoad]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Add a new notification
  const addNotification = useCallback(
    (notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: AdminNotification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, maxNotifications);
        saveNotifications(updated);
        return updated;
      });
    },
    [maxNotifications]
  );

  // Mark a single notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) {
          return { ...n, read: true };
        }
        return n;
      })
    );

    setReadIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      saveReadIds(updated);
      return updated;
    });
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });

    setReadIds((prev) => {
      const updated = new Set(prev);
      notifications.forEach((n) => updated.add(n.id));
      saveReadIds(updated);
      return updated;
    });
  }, [notifications]);

  // Delete a notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  // Filter by category
  const filterByCategory = useCallback(
    (category: NotificationCategory | 'all') => {
      if (category === 'all') { return notifications; }
      return notifications.filter((n) => n.category === category);
    },
    [notifications]
  );

  // Filter by read status
  const filterByRead = useCallback(
    (read: boolean) => {
      return notifications.filter((n) => n.read === read);
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    filterByCategory,
    filterByRead,
  };
}

export default useNotifications;
