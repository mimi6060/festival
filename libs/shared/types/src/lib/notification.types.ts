/**
 * Notification Types
 * Types for push notifications, in-app notifications, and alerts
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Notification type
 */
export enum NotificationType {
  SYSTEM = 'system',
  FESTIVAL = 'festival',
  TICKET = 'ticket',
  PAYMENT = 'payment',
  CASHLESS = 'cashless',
  PROGRAM = 'program',
  ARTIST = 'artist',
  EMERGENCY = 'emergency',
  WEATHER = 'weather',
  PROMOTION = 'promotion',
  REMINDER = 'reminder',
  SOCIAL = 'social',
  SUPPORT = 'support',
  STAFF = 'staff',
}

/**
 * Notification priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Notification channel
 */
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  WEBSOCKET = 'websocket',
}

/**
 * Notification action type
 */
export enum NotificationActionType {
  OPEN_URL = 'open_url',
  OPEN_SCREEN = 'open_screen',
  OPEN_TICKET = 'open_ticket',
  OPEN_FESTIVAL = 'open_festival',
  OPEN_ARTIST = 'open_artist',
  OPEN_CASHLESS = 'open_cashless',
  OPEN_SUPPORT = 'open_support',
  DISMISS = 'dismiss',
  CUSTOM = 'custom',
}

/**
 * Notification target type
 */
export enum NotificationTargetType {
  ALL_USERS = 'all_users',
  FESTIVAL_ATTENDEES = 'festival_attendees',
  TICKET_HOLDERS = 'ticket_holders',
  VIP_HOLDERS = 'vip_holders',
  SPECIFIC_USERS = 'specific_users',
  USER_SEGMENT = 'user_segment',
  TOPIC_SUBSCRIBERS = 'topic_subscribers',
  ROLE_BASED = 'role_based',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Notification
 */
export interface Notification {
  id: string;
  festivalId?: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  body: string;
  shortBody?: string;
  imageUrl?: string;
  iconUrl?: string;
  channels: NotificationChannel[];
  action?: NotificationAction;
  data?: NotificationData;
  scheduling?: NotificationScheduling;
  targeting: NotificationTargeting;
  analytics: NotificationAnalytics;
  expiresAt?: string;
  sentAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification action
 */
export interface NotificationAction {
  type: NotificationActionType;
  label?: string;
  url?: string;
  screen?: string;
  params?: Record<string, unknown>;
}

/**
 * Additional notification data
 */
export interface NotificationData {
  festivalId?: string;
  festivalName?: string;
  ticketId?: string;
  artistId?: string;
  artistName?: string;
  performanceId?: string;
  orderId?: string;
  transactionId?: string;
  supportTicketId?: string;
  deepLink?: string;
  custom?: Record<string, unknown>;
}

/**
 * Notification scheduling
 */
export interface NotificationScheduling {
  scheduledAt?: string;
  timezone?: string;
  localTime?: boolean;
  repeatInterval?: NotificationRepeatInterval;
  repeatUntil?: string;
  deliveryWindow?: DeliveryWindow;
}

/**
 * Notification repeat interval
 */
export interface NotificationRepeatInterval {
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  value: number;
  days?: number[];
}

/**
 * Delivery window for notifications
 */
export interface DeliveryWindow {
  startHour: number;
  endHour: number;
  timezone: string;
}

/**
 * Notification targeting
 */
export interface NotificationTargeting {
  type: NotificationTargetType;
  festivalId?: string;
  userIds?: string[];
  segmentId?: string;
  topicId?: string;
  roles?: string[];
  ticketTypes?: string[];
  filters?: NotificationFilters;
  excludeUserIds?: string[];
}

/**
 * Notification filters for targeting
 */
export interface NotificationFilters {
  hasTicket?: boolean;
  hasCashless?: boolean;
  hasCheckedIn?: boolean;
  purchasedAfter?: string;
  lastActiveAfter?: string;
  language?: string[];
  country?: string[];
  platform?: ('ios' | 'android' | 'web')[];
}

/**
 * Notification analytics
 */
export interface NotificationAnalytics {
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  clickedCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
}

/**
 * User notification (delivered to specific user)
 */
export interface UserNotification {
  id: string;
  notificationId: string;
  userId: string;
  status: NotificationStatus;
  channels: NotificationChannelDelivery[];
  readAt?: string;
  clickedAt?: string;
  dismissedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

/**
 * Channel delivery status
 */
export interface NotificationChannelDelivery {
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  messageId?: string;
}

/**
 * Push notification device
 */
export interface PushDevice {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
  pushEnabled: boolean;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification preferences per user
 */
export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  channels: ChannelPreferences;
  types: TypePreferences;
  quietHours?: QuietHours;
  language: string;
  timezone: string;
  updatedAt: string;
}

/**
 * Channel preferences
 */
export interface ChannelPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

/**
 * Type preferences
 */
export interface TypePreferences {
  system: boolean;
  festival: boolean;
  ticket: boolean;
  payment: boolean;
  cashless: boolean;
  program: boolean;
  artist: boolean;
  emergency: boolean;
  weather: boolean;
  promotion: boolean;
  reminder: boolean;
  social: boolean;
  support: boolean;
}

/**
 * Quiet hours settings
 */
export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  allowUrgent: boolean;
  days?: number[];
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  slug: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  variables: TemplateVariable[];
  defaultAction?: NotificationAction;
  defaultPriority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  translations: Record<string, TemplateTranslation>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * Template translation
 */
export interface TemplateTranslation {
  language: string;
  title: string;
  body: string;
}

/**
 * Notification topic for subscriptions
 */
export interface NotificationTopic {
  id: string;
  festivalId?: string;
  name: string;
  slug: string;
  description?: string;
  type: NotificationType;
  subscriberCount: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Topic subscription
 */
export interface TopicSubscription {
  id: string;
  userId: string;
  topicId: string;
  subscribedAt: string;
}

/**
 * Notification with user status
 */
export interface NotificationWithUserStatus extends Notification {
  userNotification?: UserNotification;
}

/**
 * Notification summary
 */
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  shortBody?: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  festivalId?: string;
  period: { start: string; end: string };
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  byType: TypeNotificationStats[];
  byChannel: ChannelNotificationStats[];
  byPriority: PriorityNotificationStats[];
  dailyStats: DailyNotificationStats[];
}

/**
 * Type notification statistics
 */
export interface TypeNotificationStats {
  type: NotificationType;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
}

/**
 * Channel notification statistics
 */
export interface ChannelNotificationStats {
  channel: NotificationChannel;
  sent: number;
  delivered: number;
  failed: number;
}

/**
 * Priority notification statistics
 */
export interface PriorityNotificationStats {
  priority: NotificationPriority;
  sent: number;
  deliveryRate: number;
  readRate: number;
}

/**
 * Daily notification statistics
 */
export interface DailyNotificationStats {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a notification
 */
export interface CreateNotificationDto {
  festivalId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  shortBody?: string;
  imageUrl?: string;
  channels?: NotificationChannel[];
  action?: NotificationAction;
  data?: NotificationData;
  scheduling?: NotificationScheduling;
  targeting: NotificationTargeting;
  expiresAt?: string;
}

/**
 * DTO for sending notification from template
 */
export interface SendTemplateNotificationDto {
  templateId: string;
  variables: Record<string, unknown>;
  targeting: NotificationTargeting;
  scheduling?: NotificationScheduling;
  overrides?: {
    title?: string;
    body?: string;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
  };
}

/**
 * DTO for sending quick notification
 */
export interface SendQuickNotificationDto {
  userIds: string[];
  title: string;
  body: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  action?: NotificationAction;
  data?: NotificationData;
}

/**
 * DTO for registering push device
 */
export interface RegisterPushDeviceDto {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
}

/**
 * DTO for updating notification preferences
 */
export interface UpdateNotificationPreferencesDto {
  enabled?: boolean;
  channels?: Partial<ChannelPreferences>;
  types?: Partial<TypePreferences>;
  quietHours?: QuietHours;
  language?: string;
  timezone?: string;
}

/**
 * DTO for creating notification template
 */
export interface CreateNotificationTemplateDto {
  name: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  variables?: Omit<TemplateVariable, 'name'>[];
  defaultAction?: NotificationAction;
  defaultPriority?: NotificationPriority;
  defaultChannels?: NotificationChannel[];
  translations?: Record<string, TemplateTranslation>;
}

/**
 * DTO for subscribing to topic
 */
export interface SubscribeTopicDto {
  topicId: string;
}

/**
 * Notification list filters
 */
export interface NotificationListFilters {
  festivalId?: string;
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  status?: NotificationStatus | NotificationStatus[];
  channel?: NotificationChannel;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * User notification list filters
 */
export interface UserNotificationFilters {
  userId: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  festivalId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid NotificationType
 */
export function isNotificationType(value: unknown): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType);
}

/**
 * Check if value is a valid NotificationPriority
 */
export function isNotificationPriority(value: unknown): value is NotificationPriority {
  return Object.values(NotificationPriority).includes(value as NotificationPriority);
}

/**
 * Check if value is a valid NotificationStatus
 */
export function isNotificationStatus(value: unknown): value is NotificationStatus {
  return Object.values(NotificationStatus).includes(value as NotificationStatus);
}

/**
 * Check if value is a valid NotificationChannel
 */
export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return Object.values(NotificationChannel).includes(value as NotificationChannel);
}

/**
 * Check if notification is urgent
 */
export function isUrgentNotification(notification: Notification): boolean {
  return [NotificationPriority.URGENT, NotificationPriority.CRITICAL].includes(notification.priority);
}

/**
 * Check if notification is read
 */
export function isNotificationRead(userNotification: UserNotification): boolean {
  return userNotification.status === NotificationStatus.READ || !!userNotification.readAt;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get notification type display name
 */
export function getNotificationTypeDisplayName(type: NotificationType): string {
  const names: Record<NotificationType, string> = {
    [NotificationType.SYSTEM]: 'Systeme',
    [NotificationType.FESTIVAL]: 'Festival',
    [NotificationType.TICKET]: 'Billet',
    [NotificationType.PAYMENT]: 'Paiement',
    [NotificationType.CASHLESS]: 'Cashless',
    [NotificationType.PROGRAM]: 'Programme',
    [NotificationType.ARTIST]: 'Artiste',
    [NotificationType.EMERGENCY]: 'Urgence',
    [NotificationType.WEATHER]: 'Meteo',
    [NotificationType.PROMOTION]: 'Promotion',
    [NotificationType.REMINDER]: 'Rappel',
    [NotificationType.SOCIAL]: 'Social',
    [NotificationType.SUPPORT]: 'Support',
    [NotificationType.STAFF]: 'Staff',
  };
  return names[type];
}

/**
 * Get notification priority display name
 */
export function getNotificationPriorityDisplayName(priority: NotificationPriority): string {
  const names: Record<NotificationPriority, string> = {
    [NotificationPriority.LOW]: 'Basse',
    [NotificationPriority.NORMAL]: 'Normale',
    [NotificationPriority.HIGH]: 'Haute',
    [NotificationPriority.URGENT]: 'Urgente',
    [NotificationPriority.CRITICAL]: 'Critique',
  };
  return names[priority];
}

/**
 * Get notification status display name
 */
export function getNotificationStatusDisplayName(status: NotificationStatus): string {
  const names: Record<NotificationStatus, string> = {
    [NotificationStatus.PENDING]: 'En attente',
    [NotificationStatus.SENT]: 'Envoyee',
    [NotificationStatus.DELIVERED]: 'Delivree',
    [NotificationStatus.READ]: 'Lue',
    [NotificationStatus.FAILED]: 'Echouee',
    [NotificationStatus.CANCELLED]: 'Annulee',
    [NotificationStatus.EXPIRED]: 'Expiree',
  };
  return names[status];
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channel: NotificationChannel): string {
  const names: Record<NotificationChannel, string> = {
    [NotificationChannel.PUSH]: 'Notification push',
    [NotificationChannel.EMAIL]: 'Email',
    [NotificationChannel.SMS]: 'SMS',
    [NotificationChannel.IN_APP]: 'In-app',
    [NotificationChannel.WEBSOCKET]: 'Temps reel',
  };
  return names[channel];
}

/**
 * Get notification priority color
 */
export function getNotificationPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    [NotificationPriority.LOW]: '#9CA3AF',
    [NotificationPriority.NORMAL]: '#3B82F6',
    [NotificationPriority.HIGH]: '#F59E0B',
    [NotificationPriority.URGENT]: '#EF4444',
    [NotificationPriority.CRITICAL]: '#DC2626',
  };
  return colors[priority];
}

/**
 * Get notification type icon
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    [NotificationType.SYSTEM]: 'settings',
    [NotificationType.FESTIVAL]: 'festival',
    [NotificationType.TICKET]: 'confirmation_number',
    [NotificationType.PAYMENT]: 'payment',
    [NotificationType.CASHLESS]: 'account_balance_wallet',
    [NotificationType.PROGRAM]: 'event',
    [NotificationType.ARTIST]: 'mic',
    [NotificationType.EMERGENCY]: 'warning',
    [NotificationType.WEATHER]: 'cloud',
    [NotificationType.PROMOTION]: 'local_offer',
    [NotificationType.REMINDER]: 'notifications',
    [NotificationType.SOCIAL]: 'people',
    [NotificationType.SUPPORT]: 'help',
    [NotificationType.STAFF]: 'badge',
  };
  return icons[type];
}

/**
 * Calculate delivery rate
 */
export function calculateDeliveryRate(analytics: NotificationAnalytics): number {
  if (analytics.sentCount === 0) return 0;
  return Math.round((analytics.deliveredCount / analytics.sentCount) * 100);
}

/**
 * Calculate read rate
 */
export function calculateReadRate(analytics: NotificationAnalytics): number {
  if (analytics.deliveredCount === 0) return 0;
  return Math.round((analytics.readCount / analytics.deliveredCount) * 100);
}

/**
 * Calculate click rate
 */
export function calculateClickRate(analytics: NotificationAnalytics): number {
  if (analytics.readCount === 0) return 0;
  return Math.round((analytics.clickedCount / analytics.readCount) * 100);
}

/**
 * Check if quiet hours are active
 */
export function isInQuietHours(
  quietHours: QuietHours,
  now: Date = new Date()
): boolean {
  if (!quietHours.enabled) return false;

  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinutes;

  const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
  const startTimeMinutes = startHour * 60 + startMin;
  const endTimeMinutes = endHour * 60 + endMin;

  if (startTimeMinutes <= endTimeMinutes) {
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
  } else {
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
  }
}

/**
 * Format notification timestamp
 */
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'A l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
  notifications: NotificationSummary[]
): Map<string, NotificationSummary[]> {
  const grouped = new Map<string, NotificationSummary[]>();

  for (const notification of notifications) {
    const date = new Date(notification.createdAt).toISOString().split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(notification);
  }

  return grouped;
}

/**
 * Get unread count
 */
export function getUnreadCount(notifications: NotificationSummary[]): number {
  return notifications.filter((n) => !n.isRead).length;
}
