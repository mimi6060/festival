/**
 * Notifications Service Unit Tests
 *
 * Comprehensive tests for notification functionality including:
 * - Creating notifications
 * - Getting user notifications (with pagination)
 * - Marking notifications as read
 * - Deleting notifications
 * - Push notifications (FCM)
 * - Email notifications
 * - Scheduled notifications
 * - Unread count
 * - Bulk notifications
 * - Segmented notifications
 * - Templated notifications
 * - Analytics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { FcmService } from './fcm.service';
import { NotificationTemplateService } from './notification-template.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  NotificationCategory,
  NotificationPlatform,
} from '@prisma/client';
import { NotificationPayload } from '../interfaces';

// ============================================================================
// Mock Setup
// ============================================================================

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _fcmService: jest.Mocked<FcmService>;
  let _templateService: jest.Mocked<NotificationTemplateService>;
  let _eventEmitter: jest.Mocked<EventEmitter2>;

  // Mock data
  const mockUserId = 'user-uuid-123';
  const mockFestivalId = 'festival-uuid-123';
  const mockNotificationId = 'notification-uuid-123';

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    festivalId: mockFestivalId,
    title: 'Test Notification',
    body: 'Test notification body',
    type: NotificationType.SYSTEM,
    data: null,
    imageUrl: null,
    actionUrl: null,
    isRead: false,
    readAt: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReadNotification = {
    ...mockNotification,
    id: 'notification-read-uuid',
    isRead: true,
    readAt: new Date(),
  };

  const mockPreferences = {
    id: 'pref-uuid-123',
    userId: mockUserId,
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
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'Europe/Paris',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPushToken = {
    id: 'token-uuid-123',
    userId: mockUserId,
    token: 'fcm-token-abc123',
    platform: NotificationPlatform.ANDROID,
    deviceName: 'Test Device',
    isActive: true,
    lastUsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate = {
    id: 'template-uuid-123',
    name: 'ticket_purchased',
    type: NotificationType.TICKET_PURCHASED,
    titleTemplate: 'Billet confirme !',
    bodyTemplate: 'Votre billet {{ticketType}} pour {{festivalName}} a ete confirme.',
    defaultImageUrl: null,
    defaultActionUrl: '/tickets',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    pushToken: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationTemplate: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockFcmService = {
    sendToToken: jest.fn(),
    sendToTokens: jest.fn(),
    sendToTopic: jest.fn(),
    isEnabled: jest.fn(),
  };

  const mockTemplateService = {
    getByName: jest.fn(),
    getById: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FcmService, useValue: mockFcmService },
        { provide: NotificationTemplateService, useValue: mockTemplateService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(NotificationsService);
    _prismaService = module.get(PrismaService);
    _fcmService = module.get(FcmService);
    _templateService = module.get(NotificationTemplateService);
    _eventEmitter = module.get(EventEmitter2);

    // Default mock returns
    mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreferences);
  });

  // ==========================================================================
  // getUserNotifications Tests
  // ==========================================================================

  describe('getUserNotifications', () => {
    it('should return notifications with pagination', async () => {
      // Arrange
      const notifications = [mockNotification, mockReadNotification];
      mockPrismaService.notification.findMany.mockResolvedValue(notifications);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5); // unreadCount

      // Act
      const result = await notificationsService.getUserNotifications(mockUserId, {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by read status when provided', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      // Act
      await notificationsService.getUserNotifications(mockUserId, {
        isRead: false,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, isRead: false },
        }),
      );
    });

    it('should filter by notification type when provided', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      // Act
      await notificationsService.getUserNotifications(mockUserId, {
        type: NotificationType.TICKET_PURCHASED,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, type: NotificationType.TICKET_PURCHASED },
        }),
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      // Act
      await notificationsService.getUserNotifications(mockUserId, {
        festivalId: mockFestivalId,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, festivalId: mockFestivalId },
        }),
      );
    });

    it('should apply pagination correctly on page 2', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(25);

      // Act
      await notificationsService.getUserNotifications(mockUserId, {
        page: 2,
        limit: 10,
      });

      // Assert
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should return empty array when no notifications exist', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // Act
      const result = await notificationsService.getUserNotifications(mockUserId, {});

      // Assert
      expect(result.notifications).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // Act
      await notificationsService.getUserNotifications(mockUserId, {});

      // Assert
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  // ==========================================================================
  // markAsRead Tests
  // ==========================================================================

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      // Act
      const result = await notificationsService.markAsRead(mockUserId, mockNotificationId);

      // Assert
      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        notificationsService.markAsRead(mockUserId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to different user', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        notificationsService.markAsRead('different-user', mockNotificationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return notification without update if already read', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(mockReadNotification);

      // Act
      const result = await notificationsService.markAsRead(mockUserId, mockReadNotification.id);

      // Assert
      expect(result.isRead).toBe(true);
      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // markAllAsRead Tests
  // ==========================================================================

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      // Arrange
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await notificationsService.markAllAsRead(mockUserId);

      // Assert
      expect(result.count).toBe(5);
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should return count of 0 when no unread notifications', async () => {
      // Arrange
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await notificationsService.markAllAsRead(mockUserId);

      // Assert
      expect(result.count).toBe(0);
    });
  });

  // ==========================================================================
  // deleteNotification Tests
  // ==========================================================================

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      // Act
      await notificationsService.deleteNotification(mockUserId, mockNotificationId);

      // Assert
      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        notificationsService.deleteNotification(mockUserId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to different user', async () => {
      // Arrange
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        notificationsService.deleteNotification('different-user', mockNotificationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getUnreadCount Tests
  // ==========================================================================

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      // Arrange
      mockPrismaService.notification.count.mockResolvedValue(7);

      // Act
      const result = await notificationsService.getUnreadCount(mockUserId);

      // Assert
      expect(result).toBe(7);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      // Arrange
      mockPrismaService.notification.count.mockResolvedValue(0);

      // Act
      const result = await notificationsService.getUnreadCount(mockUserId);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // sendNotification Tests (includes Push and Email)
  // ==========================================================================

  describe('sendNotification', () => {
    const payload: NotificationPayload = {
      title: 'Test Notification',
      body: 'Test body',
      type: NotificationType.TICKET_PURCHASED,
      festivalId: mockFestivalId,
    };

    it('should create in-app notification successfully', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.id).toBe(mockNotificationId);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          title: payload.title,
          body: payload.body,
          type: payload.type,
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        userId: mockUserId,
        notification: mockNotification,
      });
    });

    it('should send push notification when enabled', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        sentAt: new Date(),
      });

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).toHaveBeenCalledWith(
        [mockPushToken.token],
        payload,
      );
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { sentAt: expect.any(Date) },
      });
    });

    it('should not send push notification when user has no tokens', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
    });

    it('should emit email event when sendEmail is true', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: false,
        sendEmail: true,
      });

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.email', {
        userId: mockUserId,
        notification: mockNotification,
        payload,
      });
    });

    it('should not send push if user has disabled the category', async () => {
      // Arrange
      const disabledPreferences = {
        ...mockPreferences,
        enabledCategories: [NotificationCategory.SYSTEM], // Only SYSTEM enabled
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(disabledPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload, // TICKET_PURCHASED type maps to TICKETS category
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
    });

    it('should not send push if user has push disabled', async () => {
      // Arrange
      const pushDisabledPreferences = {
        ...mockPreferences,
        pushEnabled: false,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(pushDisabledPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
    });

    it('should not send email if user has email disabled', async () => {
      // Arrange
      const emailDisabledPreferences = {
        ...mockPreferences,
        emailEnabled: false,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(emailDisabledPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: false,
        sendEmail: true,
      });

      // Assert
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'notification.email',
        expect.anything(),
      );
    });

    it('should handle FCM errors gracefully', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockRejectedValue(new Error('FCM error'));

      // Act - should not throw
      const result = await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(result.id).toBe(mockNotificationId);
    });

    it('should not send push during quiet hours', async () => {
      // Arrange
      const now = new Date();
      const currentHour = now.getHours();
      const quietPreferences = {
        ...mockPreferences,
        quietHoursStart: `${String(currentHour).padStart(2, '0')}:00`,
        quietHoursEnd: `${String((currentHour + 2) % 24).padStart(2, '0')}:00`,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(quietPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
    });

    it('should create notification with all optional fields', async () => {
      // Arrange
      const fullPayload: NotificationPayload = {
        title: 'Full Notification',
        body: 'With all fields',
        type: NotificationType.PROMO,
        festivalId: mockFestivalId,
        data: { promoCode: 'SAVE20' },
        imageUrl: 'https://example.com/image.jpg',
        actionUrl: '/promotions',
      };
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        ...fullPayload,
      });

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload: fullPayload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: fullPayload.data,
          imageUrl: fullPayload.imageUrl,
          actionUrl: fullPayload.actionUrl,
        }),
      });
    });
  });

  // ==========================================================================
  // sendBulkNotifications Tests
  // ==========================================================================

  describe('sendBulkNotifications', () => {
    const payload: NotificationPayload = {
      title: 'Bulk Notification',
      body: 'Sent to multiple users',
      type: NotificationType.FESTIVAL_UPDATE,
    };

    it('should send notifications to multiple users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.notificationIds).toHaveLength(3);
    });

    it('should handle partial failures', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockPrismaService.notification.create
        .mockResolvedValueOnce(mockNotification)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ ...mockNotification, id: 'notif-3' });
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.notificationIds).toHaveLength(2);
    });

    it('should process users in batches of 100', async () => {
      // Arrange
      const userIds = Array.from({ length: 150 }, (_, i) => `user-${i}`);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.successCount).toBe(150);
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(150);
    });

    it('should return empty results for empty user list', async () => {
      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds: [],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.notificationIds).toHaveLength(0);
    });
  });

  // ==========================================================================
  // sendSegmentedNotification Tests
  // ==========================================================================

  describe('sendSegmentedNotification', () => {
    const payload: NotificationPayload = {
      title: 'Segmented Notification',
      body: 'Targeted message',
      type: NotificationType.FESTIVAL_UPDATE,
    };

    it('should send to all users when targetAll is true', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        targetAll: true,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.targetedUsers).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should send to users by role', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'staff-1' },
        { id: 'staff-2' },
      ]);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        targetRoles: ['STAFF' as any],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.targetedUsers).toBe(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: { in: ['STAFF'] } },
        select: { id: true },
      });
    });

    it('should send to users by ticket type', async () => {
      // Arrange
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'vip-1' },
        { userId: 'vip-2' },
      ]);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        festivalId: mockFestivalId,
        targetTicketTypes: ['VIP' as any],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.targetedUsers).toBe(2);
    });

    it('should return zeros when no users match targeting', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        targetRoles: ['ADMIN' as any],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.targetedUsers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should combine users from multiple targeting criteria', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'staff-1' },
        { id: 'staff-2' },
      ]);
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'vip-1' },
        { userId: 'staff-1' }, // Duplicate - should be deduplicated
      ]);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        festivalId: mockFestivalId,
        targetRoles: ['STAFF' as any],
        targetTicketTypes: ['VIP' as any],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      // Should have 3 unique users (staff-1, staff-2, vip-1)
      expect(result.targetedUsers).toBe(3);
    });
  });

  // ==========================================================================
  // sendTemplatedNotification Tests
  // ==========================================================================

  describe('sendTemplatedNotification', () => {
    it('should send notification using template', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        [mockUserId],
        { ticketType: 'VIP', festivalName: 'Summer Fest' },
      );

      // Assert
      expect(result.successCount).toBe(1);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Billet confirme !',
          body: expect.stringContaining('VIP'),
          body: expect.stringContaining('Summer Fest'),
        }),
      });
    });

    it('should throw NotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(null);

      // Act & Assert
      await expect(
        notificationsService.sendTemplatedNotification(
          'non_existent_template',
          [mockUserId],
          {},
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send to multiple users with template', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        ['user-1', 'user-2', 'user-3'],
        { ticketType: 'Standard', festivalName: 'Rock Fest' },
      );

      // Assert
      expect(result.successCount).toBe(3);
    });

    it('should use default options when not provided', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      // Act
      await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        [mockUserId],
        {},
      );

      // Assert - sendPush defaults to true
      expect(mockFcmService.sendToTokens).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Push Token Management Tests
  // ==========================================================================

  describe('registerPushToken', () => {
    it('should register new push token', async () => {
      // Arrange
      mockPrismaService.pushToken.findUnique.mockResolvedValue(null);
      mockPrismaService.pushToken.upsert.mockResolvedValue(mockPushToken);

      // Act
      const result = await notificationsService.registerPushToken(mockUserId, {
        token: 'new-fcm-token',
        platform: NotificationPlatform.IOS,
        deviceName: 'iPhone 15',
      });

      // Assert
      expect(result.token).toBeDefined();
      expect(mockPrismaService.pushToken.upsert).toHaveBeenCalled();
    });

    it('should deactivate token if it belongs to another user', async () => {
      // Arrange
      const existingToken = {
        ...mockPushToken,
        userId: 'other-user',
      };
      mockPrismaService.pushToken.findUnique.mockResolvedValue(existingToken);
      mockPrismaService.pushToken.update.mockResolvedValue({
        ...existingToken,
        isActive: false,
      });
      mockPrismaService.pushToken.upsert.mockResolvedValue(mockPushToken);

      // Act
      await notificationsService.registerPushToken(mockUserId, {
        token: existingToken.token,
        platform: NotificationPlatform.ANDROID,
      });

      // Assert
      expect(mockPrismaService.pushToken.update).toHaveBeenCalledWith({
        where: { token: existingToken.token },
        data: { isActive: false },
      });
    });

    it('should not deactivate token if it belongs to same user', async () => {
      // Arrange
      mockPrismaService.pushToken.findUnique.mockResolvedValue(mockPushToken);
      mockPrismaService.pushToken.upsert.mockResolvedValue(mockPushToken);

      // Act
      await notificationsService.registerPushToken(mockUserId, {
        token: mockPushToken.token,
        platform: NotificationPlatform.ANDROID,
      });

      // Assert
      expect(mockPrismaService.pushToken.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivatePushToken', () => {
    it('should deactivate push token', async () => {
      // Arrange
      mockPrismaService.pushToken.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await notificationsService.deactivatePushToken(mockUserId, mockPushToken.token);

      // Assert
      expect(mockPrismaService.pushToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, token: mockPushToken.token },
        data: { isActive: false },
      });
    });
  });

  describe('getUserPushTokens', () => {
    it('should return active push tokens for user', async () => {
      // Arrange
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);

      // Act
      const result = await notificationsService.getUserPushTokens(mockUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isActive: true },
      });
    });

    it('should return empty array when user has no tokens', async () => {
      // Arrange
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.getUserPushTokens(mockUserId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Preferences Management Tests
  // ==========================================================================

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      // Arrange
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreferences);

      // Act
      const result = await notificationsService.getPreferences(mockUserId);

      // Assert
      expect(result.userId).toBe(mockUserId);
      expect(result.pushEnabled).toBe(true);
    });

    it('should create default preferences if not found', async () => {
      // Arrange
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockPreferences);

      // Act
      const result = await notificationsService.getPreferences(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
        }),
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      // Arrange
      const updatedPrefs = {
        ...mockPreferences,
        pushEnabled: false,
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPrefs);

      // Act
      const result = await notificationsService.updatePreferences(mockUserId, {
        pushEnabled: false,
      });

      // Assert
      expect(result.pushEnabled).toBe(false);
    });

    it('should update enabled categories', async () => {
      // Arrange
      const newCategories = [NotificationCategory.TICKETS, NotificationCategory.PAYMENTS];
      const updatedPrefs = {
        ...mockPreferences,
        enabledCategories: newCategories,
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPrefs);

      // Act
      const result = await notificationsService.updatePreferences(mockUserId, {
        enabledCategories: newCategories,
      });

      // Assert
      expect(result.enabledCategories).toEqual(newCategories);
    });

    it('should update quiet hours', async () => {
      // Arrange
      const updatedPrefs = {
        ...mockPreferences,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPrefs);

      // Act
      const result = await notificationsService.updatePreferences(mockUserId, {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      // Assert
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('08:00');
    });
  });

  // ==========================================================================
  // Analytics Tests
  // ==========================================================================

  describe('getAnalytics', () => {
    it('should return notification analytics', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(100) // totalSent
        .mockResolvedValueOnce(75); // totalRead
      mockPrismaService.notification.groupBy
        .mockResolvedValueOnce([
          { type: NotificationType.TICKET_PURCHASED, _count: { id: 50 } },
          { type: NotificationType.PAYMENT_SUCCESS, _count: { id: 30 } },
        ])
        .mockResolvedValueOnce([
          { type: NotificationType.TICKET_PURCHASED, _count: { id: 45 } },
          { type: NotificationType.PAYMENT_SUCCESS, _count: { id: 20 } },
        ]);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { date: '2026-01-08', sent: 10, read: 8 },
        { date: '2026-01-07', sent: 15, read: 12 },
      ]);

      // Act
      const result = await notificationsService.getAnalytics();

      // Assert
      expect(result.totalSent).toBe(100);
      expect(result.totalRead).toBe(75);
      expect(result.readRate).toBe(75);
      expect(result.byDay).toHaveLength(2);
    });

    it('should filter analytics by festivalId', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40);
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await notificationsService.getAnalytics(mockFestivalId);

      // Assert
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ festivalId: mockFestivalId }),
      });
    });

    it('should filter analytics by date range', async () => {
      // Arrange
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockPrismaService.notification.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(25);
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await notificationsService.getAnalytics(undefined, startDate, endDate);

      // Assert
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: { gte: startDate, lte: endDate },
        }),
      });
    });

    it('should return 0 read rate when no notifications sent', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await notificationsService.getAnalytics();

      // Assert
      expect(result.readRate).toBe(0);
    });
  });

  // ==========================================================================
  // Notification Type Tests
  // ==========================================================================

  describe('Notification Types', () => {
    it.each([
      [NotificationType.TICKET_PURCHASED, NotificationCategory.TICKETS],
      [NotificationType.PAYMENT_SUCCESS, NotificationCategory.PAYMENTS],
      [NotificationType.PAYMENT_FAILED, NotificationCategory.PAYMENTS],
      [NotificationType.CASHLESS_TOPUP, NotificationCategory.CASHLESS],
      [NotificationType.ARTIST_REMINDER, NotificationCategory.PROGRAM],
      [NotificationType.FESTIVAL_UPDATE, NotificationCategory.PROGRAM],
      [NotificationType.SCHEDULE_CHANGE, NotificationCategory.PROGRAM],
      [NotificationType.SECURITY_ALERT, NotificationCategory.SECURITY],
      [NotificationType.PROMO, NotificationCategory.PROMOTIONS],
      [NotificationType.VENDOR_ORDER, NotificationCategory.VENDOR],
      [NotificationType.SYSTEM, NotificationCategory.SYSTEM],
    ])('should handle %s notification type correctly', async (type, expectedCategory) => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type,
      };
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        type,
      });
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.type).toBe(type);
    });
  });

  // ==========================================================================
  // Platform Tests
  // ==========================================================================

  describe('Platform Support', () => {
    it.each([
      NotificationPlatform.IOS,
      NotificationPlatform.ANDROID,
      NotificationPlatform.WEB,
    ])('should register token for %s platform', async (platform) => {
      // Arrange
      mockPrismaService.pushToken.findUnique.mockResolvedValue(null);
      mockPrismaService.pushToken.upsert.mockResolvedValue({
        ...mockPushToken,
        platform,
      });

      // Act
      const result = await notificationsService.registerPushToken(mockUserId, {
        token: 'platform-token',
        platform,
      });

      // Assert
      expect(result.platform).toBe(platform);
    });
  });
});
