export { useAuth } from './useAuth';
export { usePagination } from './usePagination';
export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useSocketIO } from './useSocketIO';
export type { SocketIOOptions, ConnectionState, UseSocketIOReturn } from './useSocketIO';
export { useRealtimeData } from './useRealTimeData';
export type {
  RealtimeStats,
  RealtimeTransaction,
  RealtimeAlert,
  ZoneOccupancyData,
  UseRealtimeDataOptions,
  UseRealtimeDataReturn,
} from './useRealTimeData';

// Notifications hooks
export { useNotifications } from './useNotifications';
export type {
  AdminNotification,
  NotificationType,
  NotificationCategory,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from './useNotifications';
export { categoryConfig, typeColors } from './useNotifications';
export { useSocketNotifications } from './useSocketNotifications';
export type {
  UseSocketNotificationsOptions,
  UseSocketNotificationsReturn,
} from './useSocketNotifications';

// API hooks
export * from './api';
