import {
  NotificationType,
  NotificationCategory,
  NotificationPlatform,
  UserRole,
  TicketType,
} from '@prisma/client';

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
  festivalId?: string;
}

export interface PushNotificationPayload extends NotificationPayload {
  tokens: string[];
  platform?: NotificationPlatform;
}

export interface SendNotificationOptions {
  userId: string;
  payload: NotificationPayload;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendSms?: boolean;
}

export interface BulkSendNotificationOptions {
  userIds: string[];
  payload: NotificationPayload;
  sendPush?: boolean;
  sendEmail?: boolean;
}

export interface SegmentedNotificationOptions {
  festivalId?: string;
  targetAll?: boolean;
  targetRoles?: UserRole[];
  targetTicketTypes?: TicketType[];
  payload: NotificationPayload;
  sendPush?: boolean;
  sendEmail?: boolean;
}

export interface ScheduleNotificationOptions extends SegmentedNotificationOptions {
  scheduledFor: Date;
  createdById: string;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalRead: number;
  readRate: number;
  byType: Record<NotificationType, { sent: number; read: number }>;
  byDay: Array<{ date: string; sent: number; read: number }>;
}

export interface NotificationPreferencesInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  enabledCategories?: NotificationCategory[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface FCMMessage {
  notification?: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  token?: string;
  tokens?: string[];
  topic?: string;
  android?: {
    priority: 'high' | 'normal';
    notification?: {
      clickAction?: string;
      channelId?: string;
      sound?: string;
    };
  };
  apns?: {
    payload?: {
      aps?: {
        sound?: string;
        badge?: number;
        'content-available'?: number;
      };
    };
  };
  webpush?: {
    notification?: {
      icon?: string;
      badge?: string;
    };
    fcmOptions?: {
      link?: string;
    };
  };
}

export const NOTIFICATION_TYPE_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  [NotificationType.TICKET_PURCHASED]: NotificationCategory.TICKETS,
  [NotificationType.PAYMENT_SUCCESS]: NotificationCategory.PAYMENTS,
  [NotificationType.PAYMENT_FAILED]: NotificationCategory.PAYMENTS,
  [NotificationType.CASHLESS_TOPUP]: NotificationCategory.CASHLESS,
  [NotificationType.ARTIST_REMINDER]: NotificationCategory.PROGRAM,
  [NotificationType.FESTIVAL_UPDATE]: NotificationCategory.PROGRAM,
  [NotificationType.SCHEDULE_CHANGE]: NotificationCategory.PROGRAM,
  [NotificationType.SECURITY_ALERT]: NotificationCategory.SECURITY,
  [NotificationType.PROMO]: NotificationCategory.PROMOTIONS,
  [NotificationType.VENDOR_ORDER]: NotificationCategory.VENDOR,
  [NotificationType.SYSTEM]: NotificationCategory.SYSTEM,
};
