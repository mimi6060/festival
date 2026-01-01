import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';
import {
  CreateNotificationDto,
  BroadcastNotificationDto,
  NotificationQueryDto,
  RegisterPushTokenDto,
} from './dto';
import { Notification, NotificationType, PushToken } from '@prisma/client';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  sendPush?: boolean;
}

export interface NotificationsResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Translate a key with the specified language.
   */
  private t(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args }) as string;
  }

  /**
   * Get translated notification content for push notifications.
   */
  private getTranslatedPushNotification(
    key: string,
    lang: string,
    args?: Record<string, unknown>,
  ): { title: string; body: string } {
    return {
      title: this.t(`notifications.push.${key}.title`, lang, args),
      body: this.t(`notifications.push.${key}.body`, lang, args),
    };
  }

  /**
   * Get translated notification content for in-app notifications.
   */
  private getTranslatedInAppNotification(
    key: string,
    lang: string,
    args?: Record<string, unknown>,
  ): { title: string; message: string } {
    return {
      title: this.t(`notifications.inApp.${key}.title`, lang, args),
      message: this.t(`notifications.inApp.${key}.message`, lang, args),
    };
  }

  /**
   * Get notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationsResult> {
    const where: any = { userId };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: Math.ceil(total / (query.limit || 20)),
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  /**
   * Register or update a push token for a user
   */
  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushToken> {
    const existing = await this.prisma.pushToken.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.pushToken.update({
        where: { userId },
        data: {
          token: dto.token,
          platform: dto.platform,
        },
      });
    }

    return this.prisma.pushToken.create({
      data: {
        userId,
        token: dto.token,
        platform: dto.platform,
      },
    });
  }

  /**
   * Delete push token for a user (logout)
   */
  async deletePushToken(userId: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Create a notification and optionally send push notification
   */
  async createNotification(
    dto: CreateNotificationDto,
    sendPush: boolean = true,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        data: dto.data,
      },
    });

    if (sendPush) {
      await this.queuePushNotification({
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        data: dto.data,
        sendPush: true,
      });
    }

    return notification;
  }

  /**
   * Send notification to user (creates DB record and queues push)
   */
  async sendNotification(payload: NotificationPayload): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data,
      },
    });

    if (payload.sendPush !== false) {
      await this.queuePushNotification(payload);
    }

    this.logger.log(
      `Notification created for user ${payload.userId}: ${payload.title}`,
    );

    return notification;
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToMany(
    userIds: string[],
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<{ count: number }> {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        body,
        type,
        data,
      })),
    });

    // Queue push notifications for all users
    await this.notificationsQueue.addBulk(
      userIds.map((userId) => ({
        name: 'send-push',
        data: { userId, title, body, type, data },
      })),
    );

    this.logger.log(`Broadcast notification sent to ${userIds.length} users`);

    return { count: notifications.count };
  }

  /**
   * Broadcast notification to all users with push tokens
   */
  async broadcastNotification(
    dto: BroadcastNotificationDto,
  ): Promise<{ count: number }> {
    const pushTokens = await this.prisma.pushToken.findMany({
      select: { userId: true },
    });

    const userIds = pushTokens.map((pt) => pt.userId);

    if (userIds.length === 0) {
      return { count: 0 };
    }

    return this.sendNotificationToMany(
      userIds,
      dto.title,
      dto.body,
      dto.type,
      dto.data,
    );
  }

  /**
   * Queue a push notification for async processing
   */
  private async queuePushNotification(payload: NotificationPayload): Promise<void> {
    await this.notificationsQueue.add('send-push', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);

    return { count: result.count };
  }

  // ============================================
  // Helper methods for common notification types
  // ============================================

  async notifyTicketPurchased(
    userId: string,
    ticketCount: number,
    festivalName: string,
    paymentId: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      title: 'Tickets Purchased!',
      body: `You have successfully purchased ${ticketCount} ticket(s) for ${festivalName}.`,
      type: NotificationType.TICKET_PURCHASED,
      data: { ticketCount, festivalName, paymentId },
    });
  }

  async notifyPaymentSuccess(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      title: 'Payment Successful',
      body: `Your payment of ${amount.toFixed(2)} ${currency} for ${description} has been processed.`,
      type: NotificationType.PAYMENT_SUCCESS,
      data: { amount, currency, paymentId },
    });
  }

  async notifyPaymentFailed(
    userId: string,
    amount: number,
    currency: string,
    reason: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      title: 'Payment Failed',
      body: `Your payment of ${amount.toFixed(2)} ${currency} could not be processed. Reason: ${reason}`,
      type: NotificationType.PAYMENT_FAILED,
      data: { amount, currency, reason },
    });
  }

  async notifyCashlessTopup(
    userId: string,
    amount: number,
    newBalance: number,
    currency: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      title: 'Cashless Account Topped Up',
      body: `${amount.toFixed(2)} ${currency} has been added to your cashless account. New balance: ${newBalance.toFixed(2)} ${currency}`,
      type: NotificationType.CASHLESS_TOPUP,
      data: { amount, newBalance, currency },
    });
  }

  async notifyArtistReminder(
    userId: string,
    artistName: string,
    stageName: string,
    startTime: Date,
  ): Promise<Notification> {
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return this.sendNotification({
      userId,
      title: 'Artist Performance Reminder',
      body: `${artistName} is performing at ${stageName} in 15 minutes (${timeString})!`,
      type: NotificationType.ARTIST_REMINDER,
      data: { artistName, stageName, startTime: startTime.toISOString() },
    });
  }

  async notifyFestivalUpdate(
    userIds: string[],
    title: string,
    message: string,
    festivalId: string,
  ): Promise<{ count: number }> {
    return this.sendNotificationToMany(
      userIds,
      title,
      message,
      NotificationType.FESTIVAL_UPDATE,
      { festivalId },
    );
  }
}
