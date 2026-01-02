import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationPreference,
  PushToken,
  Prisma,
} from '@prisma/client';
import {
  NotificationPayload,
  SendNotificationOptions,
  BulkSendNotificationOptions,
  SegmentedNotificationOptions,
  NotificationAnalytics,
  NOTIFICATION_TYPE_CATEGORY_MAP,
} from '../interfaces';
import {
  GetNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
  RegisterPushTokenDto,
} from '../dto';
import { FcmService } from './fcm.service';
import { NotificationTemplateService } from './notification-template.service';
import * as Handlebars from 'handlebars';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly templateService: NotificationTemplateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============== User Methods ==============

  async getUserNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { isRead, type, festivalId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
      ...(festivalId && { festivalId }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ============== Push Token Management ==============

  async registerPushToken(userId: string, dto: RegisterPushTokenDto): Promise<PushToken> {
    const { token, platform, deviceName } = dto;

    // Check if token already exists for another user
    const existingToken = await this.prisma.pushToken.findUnique({
      where: { token },
    });

    if (existingToken && existingToken.userId !== userId) {
      // Token belongs to another user, deactivate it
      await this.prisma.pushToken.update({
        where: { token },
        data: { isActive: false },
      });
    }

    // Upsert the token for this user
    return this.prisma.pushToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      create: {
        userId,
        token,
        platform,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        platform,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async deactivatePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    return this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });
  }

  // ============== Preferences Management ==============

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          enabledCategories: [
            NotificationCategory.TICKETS,
            NotificationCategory.PAYMENTS,
            NotificationCategory.CASHLESS,
            NotificationCategory.PROGRAM,
            NotificationCategory.SECURITY,
            NotificationCategory.SYSTEM,
          ],
          timezone: 'Europe/Paris',
        },
      });
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  // ============== Core Notification Methods ==============

  async sendNotification(options: SendNotificationOptions): Promise<Notification> {
    const { userId, payload, sendPush = true, sendEmail = false } = options;

    // Check user preferences
    const preferences = await this.getPreferences(userId);
    const category = NOTIFICATION_TYPE_CATEGORY_MAP[payload.type];

    if (!preferences.enabledCategories.includes(category)) {
      this.logger.debug(`User ${userId} has disabled category ${category}`);
      // Still create in-app notification but skip push/email
    }

    // Check quiet hours
    const isQuietHours = this.isWithinQuietHours(preferences);

    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        festivalId: payload.festivalId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data as Prisma.InputJsonValue,
        imageUrl: payload.imageUrl,
        actionUrl: payload.actionUrl,
      },
    });

    // Emit real-time event for WebSocket
    this.eventEmitter.emit('notification.created', {
      userId,
      notification,
    });

    // Send push notification if enabled and not in quiet hours
    if (
      sendPush &&
      preferences.pushEnabled &&
      preferences.enabledCategories.includes(category) &&
      !isQuietHours
    ) {
      const tokens = await this.getUserPushTokens(userId);
      if (tokens.length > 0) {
        try {
          await this.fcmService.sendToTokens(
            tokens.map((t) => t.token),
            payload,
          );
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });
        } catch (error) {
          this.logger.error(`Failed to send push notification: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Send email notification if enabled
    if (
      sendEmail &&
      preferences.emailEnabled &&
      preferences.enabledCategories.includes(category)
    ) {
      this.eventEmitter.emit('notification.email', {
        userId,
        notification,
        payload,
      });
    }

    return notification;
  }

  async sendBulkNotifications(options: BulkSendNotificationOptions): Promise<{
    successCount: number;
    failedCount: number;
    notificationIds: string[];
  }> {
    const { userIds, payload, sendPush = true, sendEmail = false } = options;

    let successCount = 0;
    let failedCount = 0;
    const notificationIds: string[] = [];

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((userId) =>
          this.sendNotification({ userId, payload, sendPush, sendEmail }),
        ),
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
          notificationIds.push(result.value.id);
        } else {
          failedCount++;
          this.logger.error(`Failed to send notification: ${result.reason}`);
        }
      });
    }

    return { successCount, failedCount, notificationIds };
  }

  async sendSegmentedNotification(options: SegmentedNotificationOptions): Promise<{
    targetedUsers: number;
    successCount: number;
    failedCount: number;
  }> {
    const {
      festivalId,
      targetAll,
      targetRoles,
      targetTicketTypes,
      payload,
      sendPush,
      sendEmail,
    } = options;

    // Build user query based on targeting
    const userIds = await this.getTargetedUserIds({
      festivalId,
      targetAll,
      targetRoles,
      targetTicketTypes,
    });

    if (userIds.length === 0) {
      return { targetedUsers: 0, successCount: 0, failedCount: 0 };
    }

    const { successCount, failedCount } = await this.sendBulkNotifications({
      userIds,
      payload,
      sendPush,
      sendEmail,
    });

    return { targetedUsers: userIds.length, successCount, failedCount };
  }

  async sendTemplatedNotification(
    templateName: string,
    userIds: string[],
    variables: Record<string, unknown>,
    options: { sendPush?: boolean; sendEmail?: boolean } = {},
  ): Promise<{ successCount: number; failedCount: number }> {
    const template = await this.templateService.getByName(templateName);
    if (!template) {
      throw new NotFoundException(`Template '${templateName}' not found`);
    }

    const titleCompiled = Handlebars.compile(template.titleTemplate);
    const bodyCompiled = Handlebars.compile(template.bodyTemplate);

    const payload: NotificationPayload = {
      title: titleCompiled(variables),
      body: bodyCompiled(variables),
      type: template.type,
      imageUrl: template.defaultImageUrl || undefined,
      actionUrl: template.defaultActionUrl || undefined,
    };

    return this.sendBulkNotifications({
      userIds,
      payload,
      sendPush: options.sendPush ?? true,
      sendEmail: options.sendEmail ?? false,
    });
  }

  // ============== Analytics ==============

  async getAnalytics(
    festivalId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<NotificationAnalytics> {
    const where: Prisma.NotificationWhereInput = {
      ...(festivalId && { festivalId }),
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const [totalSent, totalRead, byTypeData, byDayData] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: true } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      this.prisma.$queryRaw<Array<{ date: string; sent: number; read: number }>>`
        SELECT
          DATE("createdAt") as date,
          COUNT(*)::int as sent,
          COUNT(*) FILTER (WHERE "isRead" = true)::int as read
        FROM "Notification"
        WHERE ${festivalId ? Prisma.sql`"festivalId" = ${festivalId} AND` : Prisma.empty}
          "createdAt" >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND "createdAt" <= ${endDate || new Date()}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
    ]);

    // Get read counts by type
    const readByType = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { ...where, isRead: true },
      _count: { id: true },
    });

    const readByTypeMap = new Map(
      readByType.map((r) => [r.type, r._count.id]),
    );

    const byType = Object.values(NotificationType).reduce(
      (acc, type) => {
        const typeData = byTypeData.find((d) => d.type === type);
        acc[type] = {
          sent: typeData?._count.id || 0,
          read: readByTypeMap.get(type) || 0,
        };
        return acc;
      },
      {} as Record<NotificationType, { sent: number; read: number }>,
    );

    return {
      totalSent,
      totalRead,
      readRate: totalSent > 0 ? (totalRead / totalSent) * 100 : 0,
      byType,
      byDay: byDayData.map((d) => ({
        date: d.date,
        sent: Number(d.sent),
        read: Number(d.read),
      })),
    };
  }

  // ============== Helper Methods ==============

  private async getTargetedUserIds(options: {
    festivalId?: string;
    targetAll?: boolean;
    targetRoles?: string[];
    targetTicketTypes?: string[];
  }): Promise<string[]> {
    const { festivalId, targetAll, targetRoles, targetTicketTypes } = options;

    if (targetAll) {
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    const userIds = new Set<string>();

    // Get users by role
    if (targetRoles && targetRoles.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { role: { in: targetRoles as any[] } },
        select: { id: true },
      });
      users.forEach((u) => userIds.add(u.id));
    }

    // Get users by ticket type (for specific festival)
    if (targetTicketTypes && targetTicketTypes.length > 0 && festivalId) {
      const tickets = await this.prisma.ticket.findMany({
        where: {
          festivalId,
          category: {
            type: { in: targetTicketTypes as any[] },
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      tickets.forEach((t) => userIds.add(t.userId));
    }

    return Array.from(userIds);
  }

  private isWithinQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    try {
      const now = new Date();
      const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes < endMinutes) {
        // Same day quiet hours (e.g., 22:00 - 23:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight quiet hours (e.g., 22:00 - 08:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }
}
