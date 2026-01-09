/**
 * Notification Model
 * WatermelonDB model for notification data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';

// Notification type enum matching backend
export type NotificationType =
  | 'TICKET_PURCHASED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'CASHLESS_TOPUP'
  | 'ARTIST_REMINDER'
  | 'FESTIVAL_UPDATE'
  | 'SCHEDULE_CHANGE'
  | 'SECURITY_ALERT'
  | 'PROMO'
  | 'VENDOR_ORDER'
  | 'SYSTEM';

/**
 * Notification model for local database
 */
export default class Notification extends Model {
  static table = TableNames.NOTIFICATIONS;

  static associations: Associations = {};

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Relations
  @text('user_id') userId!: string;
  @text('festival_id') festivalId?: string;

  // Content
  @text('title') title!: string;
  @text('body') body!: string;
  @text('type') type!: NotificationType;
  @text('data') data?: string; // JSON string
  @text('image_url') imageUrl?: string;
  @text('action_url') actionUrl?: string;

  // Read status
  @field('is_read') isRead!: boolean;
  @field('read_at') readAt?: number;
  @field('sent_at') sentAt?: number;

  // Server timestamp
  @field('server_created_at') serverCreatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties

  /**
   * Parse data JSON
   */
  get parsedData(): Record<string, unknown> | null {
    if (!this.data) return null;
    try {
      return JSON.parse(this.data);
    } catch {
      return null;
    }
  }

  /**
   * Notification date
   */
  get notificationDate(): Date {
    return new Date(this.serverCreatedAt);
  }

  /**
   * Read date
   */
  get readDateTime(): Date | null {
    return this.readAt ? new Date(this.readAt) : null;
  }

  /**
   * Check if unread
   */
  get isUnread(): boolean {
    return !this.isRead;
  }

  /**
   * Check if has action
   */
  get hasAction(): boolean {
    return !!this.actionUrl || !!this.parsedData?.actionType;
  }

  /**
   * Check if has image
   */
  get hasImage(): boolean {
    return !!this.imageUrl;
  }

  /**
   * Time ago string
   */
  get timeAgo(): string {
    const now = Date.now();
    const diff = now - this.serverCreatedAt;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return this.notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Get notification type display name
   */
  getTypeDisplayName(): string {
    const typeNames: Record<NotificationType, string> = {
      TICKET_PURCHASED: 'Ticket Purchase',
      PAYMENT_SUCCESS: 'Payment',
      PAYMENT_FAILED: 'Payment Failed',
      CASHLESS_TOPUP: 'Top Up',
      ARTIST_REMINDER: 'Artist Reminder',
      FESTIVAL_UPDATE: 'Festival Update',
      SCHEDULE_CHANGE: 'Schedule Change',
      SECURITY_ALERT: 'Security Alert',
      PROMO: 'Promotion',
      VENDOR_ORDER: 'Order Update',
      SYSTEM: 'System',
    };
    return typeNames[this.type] || this.type;
  }

  /**
   * Get notification icon name (for UI)
   */
  getIconName(): string {
    const icons: Record<NotificationType, string> = {
      TICKET_PURCHASED: 'ticket',
      PAYMENT_SUCCESS: 'check-circle',
      PAYMENT_FAILED: 'x-circle',
      CASHLESS_TOPUP: 'plus-circle',
      ARTIST_REMINDER: 'music',
      FESTIVAL_UPDATE: 'info',
      SCHEDULE_CHANGE: 'calendar',
      SECURITY_ALERT: 'alert-triangle',
      PROMO: 'tag',
      VENDOR_ORDER: 'shopping-bag',
      SYSTEM: 'settings',
    };
    return icons[this.type] || 'bell';
  }

  /**
   * Get notification color (for UI)
   */
  getColor(): string {
    const colors: Record<NotificationType, string> = {
      TICKET_PURCHASED: '#3b82f6', // blue
      PAYMENT_SUCCESS: '#22c55e', // green
      PAYMENT_FAILED: '#ef4444', // red
      CASHLESS_TOPUP: '#22c55e', // green
      ARTIST_REMINDER: '#8b5cf6', // purple
      FESTIVAL_UPDATE: '#3b82f6', // blue
      SCHEDULE_CHANGE: '#f59e0b', // amber
      SECURITY_ALERT: '#ef4444', // red
      PROMO: '#ec4899', // pink
      VENDOR_ORDER: '#6366f1', // indigo
      SYSTEM: '#6b7280', // gray
    };
    return colors[this.type] || '#6b7280';
  }

  /**
   * Get priority level
   */
  getPriority(): 'high' | 'normal' | 'low' {
    const highPriority: NotificationType[] = ['SECURITY_ALERT', 'PAYMENT_FAILED'];
    const lowPriority: NotificationType[] = ['PROMO', 'SYSTEM'];

    if (highPriority.includes(this.type)) return 'high';
    if (lowPriority.includes(this.type)) return 'low';
    return 'normal';
  }

  /**
   * Format date for display
   */
  getDateFormatted(locale = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return this.notificationDate.toLocaleDateString(locale, options);
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      userId: this.userId,
      festivalId: this.festivalId,
      title: this.title,
      body: this.body,
      type: this.type,
      data: this.parsedData,
      imageUrl: this.imageUrl,
      actionUrl: this.actionUrl,
      isRead: this.isRead,
      readAt: this.readAt ? new Date(this.readAt).toISOString() : null,
      sentAt: this.sentAt ? new Date(this.sentAt).toISOString() : null,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
    };
  }

  /**
   * Update notification from server data
   */
  @writer async updateFromServer(data: {
    title?: string;
    body?: string;
    type?: NotificationType;
    data?: Record<string, unknown>;
    imageUrl?: string;
    actionUrl?: string;
    isRead?: boolean;
    readAt?: string;
  }): Promise<void> {
    await this.update((notification) => {
      if (data.title !== undefined) notification.title = data.title;
      if (data.body !== undefined) notification.body = data.body;
      if (data.type !== undefined) notification.type = data.type;
      if (data.data !== undefined) notification.data = JSON.stringify(data.data);
      if (data.imageUrl !== undefined) notification.imageUrl = data.imageUrl;
      if (data.actionUrl !== undefined) notification.actionUrl = data.actionUrl;
      if (data.isRead !== undefined) notification.isRead = data.isRead;
      if (data.readAt) notification.readAt = new Date(data.readAt).getTime();
      notification.isSynced = true;
      notification.lastSyncedAt = Date.now();
      notification.needsPush = false;
    });
  }

  /**
   * Mark notification as read
   */
  @writer async markAsRead(): Promise<void> {
    if (this.isRead) return;

    await this.update((notification) => {
      notification.isRead = true;
      notification.readAt = Date.now();
      notification.isSynced = false;
      notification.needsPush = true;
    });
  }

  /**
   * Mark notification as unread
   */
  @writer async markAsUnread(): Promise<void> {
    if (!this.isRead) return;

    await this.update((notification) => {
      notification.isRead = false;
      notification.readAt = undefined;
      notification.isSynced = false;
      notification.needsPush = true;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((notification) => {
      notification.isSynced = false;
      notification.needsPush = true;
    });
  }
}
