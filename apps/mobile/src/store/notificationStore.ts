import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification } from '../types';

export type ReminderMinutes = 5 | 10 | 15 | 30 | 60;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  pushEnabled: boolean;
  announcementsEnabled: boolean;
  eventReminderMinutes: ReminderMinutes;
  isLoading: boolean;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  setPushEnabled: (enabled: boolean) => void;
  setAnnouncementsEnabled: (enabled: boolean) => void;
  setEventReminderMinutes: (minutes: ReminderMinutes) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, _get) => ({
      notifications: [],
      unreadCount: 0,
      pushEnabled: true,
      announcementsEnabled: true,
      eventReminderMinutes: 15 as ReminderMinutes,
      isLoading: false,

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + (notification.read ? 0 : 1),
        })),

      markAsRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notificationId);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      deleteNotification: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notificationId);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== notificationId),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
          };
        }),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      setPushEnabled: (enabled) => set({ pushEnabled: enabled }),

      setAnnouncementsEnabled: (enabled) => set({ announcementsEnabled: enabled }),

      setEventReminderMinutes: (minutes) => set({ eventReminderMinutes: minutes }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        pushEnabled: state.pushEnabled,
        announcementsEnabled: state.announcementsEnabled,
        eventReminderMinutes: state.eventReminderMinutes,
      }),
    }
  )
);
