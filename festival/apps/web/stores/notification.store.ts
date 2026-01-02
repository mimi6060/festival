'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'ticket'
  | 'payment'
  | 'festival'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  metadata?: NotificationMetadata;
  actions?: NotificationAction[];
}

export interface NotificationMetadata {
  festivalId?: string;
  festivalName?: string;
  ticketId?: string;
  orderId?: string;
  paymentId?: string;
  link?: string;
  imageUrl?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'link' | 'action' | 'dismiss';
  href?: string;
  action?: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  types: Record<NotificationType, boolean>;
}

// ============================================================================
// State Interface
// ============================================================================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences;
  lastFetchedAt: number | null;
}

interface NotificationActions {
  // CRUD operations
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => string;
  addNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  clearExpired: () => void;

  // Read status
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markAsUnread: (id: string) => void;

  // Filtering
  getFilteredNotifications: (filters: NotificationFilters) => Notification[];
  getNotificationById: (id: string) => Notification | undefined;

  // Fetching
  fetchNotifications: () => Promise<void>;
  setNotifications: (notifications: Notification[]) => void;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  toggleTypePreference: (type: NotificationType) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getUnreadByType: (type: NotificationType) => number;
  hasUnread: () => boolean;
}

export type NotificationStore = NotificationState & NotificationActions;

// ============================================================================
// Constants
// ============================================================================

const STORE_NAME = 'festival-notifications';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const MAX_NOTIFICATIONS = 100;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  desktop: true,
  types: {
    info: true,
    success: true,
    warning: true,
    error: true,
    ticket: true,
    payment: true,
    festival: true,
    system: true,
  },
};

// ============================================================================
// Helpers
// ============================================================================

const generateId = (): string => {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const calculateUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter((n) => !n.read).length;
};

// ============================================================================
// Store
// ============================================================================

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        preferences: DEFAULT_PREFERENCES,
        lastFetchedAt: null,

        // CRUD operations
        addNotification: (notification) => {
          const id = generateId();
          const newNotification: Notification = {
            ...notification,
            id,
            read: false,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            // Add to beginning of array
            state.notifications.unshift(newNotification);

            // Trim to max notifications
            if (state.notifications.length > MAX_NOTIFICATIONS) {
              state.notifications = state.notifications.slice(0, MAX_NOTIFICATIONS);
            }

            state.unreadCount = calculateUnreadCount(state.notifications);
          });

          return id;
        },

        addNotifications: (notifications) => {
          set((state) => {
            // Merge with existing, avoiding duplicates
            const existingIds = new Set(state.notifications.map((n) => n.id));
            const newNotifications = notifications.filter((n) => !existingIds.has(n.id));

            state.notifications = [...newNotifications, ...state.notifications]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, MAX_NOTIFICATIONS);

            state.unreadCount = calculateUnreadCount(state.notifications);
          });
        },

        removeNotification: (id) => {
          set((state) => {
            state.notifications = state.notifications.filter((n) => n.id !== id);
            state.unreadCount = calculateUnreadCount(state.notifications);
          });
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          });
        },

        clearExpired: () => {
          const now = new Date();
          set((state) => {
            state.notifications = state.notifications.filter((n) => {
              if (!n.expiresAt) {return true;}
              return new Date(n.expiresAt) > now;
            });
            state.unreadCount = calculateUnreadCount(state.notifications);
          });
        },

        // Read status
        markAsRead: (id) => {
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          });
        },

        markAllAsRead: () => {
          set((state) => {
            state.notifications.forEach((n) => {
              n.read = true;
            });
            state.unreadCount = 0;
          });
        },

        markAsUnread: (id) => {
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification?.read) {
              notification.read = false;
              state.unreadCount += 1;
            }
          });
        },

        // Filtering
        getFilteredNotifications: (filters) => {
          const { notifications } = get();

          return notifications.filter((n) => {
            if (filters.type && n.type !== filters.type) {return false;}
            if (filters.priority && n.priority !== filters.priority) {return false;}
            if (filters.read !== undefined && n.read !== filters.read) {return false;}
            return true;
          });
        },

        getNotificationById: (id) => {
          return get().notifications.find((n) => n.id === id);
        },

        // Fetching
        fetchNotifications: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const response = await fetch(`${API_URL}/v1/notifications`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();

            set((state) => {
              state.notifications = data.notifications || data.data || [];
              state.unreadCount = calculateUnreadCount(state.notifications);
              state.isLoading = false;
              state.lastFetchedAt = Date.now();
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Failed to fetch notifications';
            });
          }
        },

        setNotifications: (notifications) => {
          set((state) => {
            state.notifications = notifications
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, MAX_NOTIFICATIONS);
            state.unreadCount = calculateUnreadCount(state.notifications);
          });
        },

        // Preferences
        updatePreferences: (preferences) => {
          set((state) => {
            state.preferences = { ...state.preferences, ...preferences };
          });
        },

        toggleTypePreference: (type) => {
          set((state) => {
            state.preferences.types[type] = !state.preferences.types[type];
          });
        },

        // State management
        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        // Computed
        getUnreadByType: (type) => {
          return get().notifications.filter((n) => n.type === type && !n.read).length;
        },

        hasUnread: () => {
          return get().unreadCount > 0;
        },
      })),
      {
        name: STORE_NAME,
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setItem: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            removeItem: () => {},
          };
        }),
        partialize: (state) => ({
          notifications: state.notifications.slice(0, 50), // Only persist last 50
          preferences: state.preferences,
          lastFetchedAt: state.lastFetchedAt,
        }),
      }
    ),
    { name: 'NotificationStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectNotifications = (state: NotificationStore) => state.notifications;
export const selectUnreadCount = (state: NotificationStore) => state.unreadCount;
export const selectUnreadNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => !n.read);
export const selectReadNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => n.read);
export const selectNotificationPreferences = (state: NotificationStore) => state.preferences;
export const selectIsLoading = (state: NotificationStore) => state.isLoading;
export const selectHasUnread = (state: NotificationStore) => state.unreadCount > 0;

// Notification type selectors
export const selectTicketNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => n.type === 'ticket');
export const selectPaymentNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => n.type === 'payment');
export const selectFestivalNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => n.type === 'festival');

// Priority selectors
export const selectUrgentNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => n.priority === 'urgent' && !n.read);
export const selectHighPriorityNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => ['urgent', 'high'].includes(n.priority) && !n.read);
