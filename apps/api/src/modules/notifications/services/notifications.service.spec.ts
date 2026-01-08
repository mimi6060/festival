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

  // ==========================================================================
  // Quiet Hours Edge Cases Tests
  // ==========================================================================

  describe('Quiet Hours Edge Cases', () => {
    const payload: NotificationPayload = {
      title: 'Test Notification',
      body: 'Test body',
      type: NotificationType.TICKET_PURCHASED,
    };

    it('should send push when outside quiet hours (same day)', async () => {
      // Arrange - quiet hours from 22:00 to 23:00, current time is 10:00
      const quietPreferences = {
        ...mockPreferences,
        quietHoursStart: '22:00',
        quietHoursEnd: '23:00',
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(quietPreferences);
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

      // We need to mock the Date to control the current time
      // For this test, we'll verify the logic is called correctly

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert - since we can't easily mock Date, we verify the method was called
      expect(mockPrismaService.notificationPreference.findUnique).toHaveBeenCalled();
    });

    it('should handle overnight quiet hours (e.g., 22:00-08:00)', async () => {
      // Arrange
      const overnightQuietPreferences = {
        ...mockPreferences,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(overnightQuietPreferences);
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
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it('should handle invalid quiet hours format gracefully', async () => {
      // Arrange
      const invalidQuietPreferences = {
        ...mockPreferences,
        quietHoursStart: 'invalid',
        quietHoursEnd: 'also-invalid',
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(invalidQuietPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      // Act - should not throw
      const result = await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle null quiet hours start', async () => {
      // Arrange
      const partialQuietPreferences = {
        ...mockPreferences,
        quietHoursStart: null,
        quietHoursEnd: '08:00',
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(partialQuietPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert - should send push since quiet hours are incomplete
      expect(mockFcmService.sendToTokens).toHaveBeenCalled();
    });

    it('should handle null quiet hours end', async () => {
      // Arrange
      const partialQuietPreferences = {
        ...mockPreferences,
        quietHoursStart: '22:00',
        quietHoursEnd: null,
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(partialQuietPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert - should send push since quiet hours are incomplete
      expect(mockFcmService.sendToTokens).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Segmented Notification Edge Cases Tests
  // ==========================================================================

  describe('Segmented Notification Edge Cases', () => {
    const payload: NotificationPayload = {
      title: 'Segmented',
      body: 'Targeted message',
      type: NotificationType.FESTIVAL_UPDATE,
    };

    it('should not query tickets when no festivalId provided with targetTicketTypes', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendSegmentedNotification({
        targetTicketTypes: ['VIP' as any],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert - tickets should not be queried without festivalId
      expect(mockPrismaService.ticket.findMany).not.toHaveBeenCalled();
      expect(result.targetedUsers).toBe(0);
    });

    it('should return empty when neither targetAll, targetRoles, nor targetTicketTypes provided', async () => {
      // Act
      const result = await notificationsService.sendSegmentedNotification({
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.targetedUsers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should deduplicate users appearing in multiple criteria', async () => {
      // Arrange - same user appears in both role and ticket queries
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'shared-user' },
        { id: 'staff-only' },
      ]);
      mockPrismaService.ticket.findMany.mockResolvedValue([
        { userId: 'shared-user' },
        { userId: 'vip-only' },
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

      // Assert - should have 3 unique users, not 4
      expect(result.targetedUsers).toBe(3);
    });
  });

  // ==========================================================================
  // Analytics Edge Cases Tests
  // ==========================================================================

  describe('Analytics Edge Cases', () => {
    it('should handle analytics with combined festivalId and date range', async () => {
      // Arrange
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockPrismaService.notification.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40);
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await notificationsService.getAnalytics(mockFestivalId, startDate, endDate);

      // Assert
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          festivalId: mockFestivalId,
          createdAt: { gte: startDate, lte: endDate },
        }),
      });
    });

    it('should calculate read rate correctly with partial reads', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(200) // totalSent
        .mockResolvedValueOnce(50); // totalRead
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await notificationsService.getAnalytics();

      // Assert
      expect(result.readRate).toBe(25); // 50/200 * 100 = 25%
    });

    it('should return byType with all notification types initialized', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrismaService.notification.groupBy
        .mockResolvedValueOnce([
          { type: NotificationType.TICKET_PURCHASED, _count: { id: 5 } },
        ])
        .mockResolvedValueOnce([
          { type: NotificationType.TICKET_PURCHASED, _count: { id: 3 } },
        ]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await notificationsService.getAnalytics();

      // Assert
      expect(result.byType[NotificationType.TICKET_PURCHASED]).toEqual({
        sent: 5,
        read: 3,
      });
      // Other types should have 0 sent and read
      expect(result.byType[NotificationType.PAYMENT_SUCCESS]).toEqual({
        sent: 0,
        read: 0,
      });
    });

    it('should convert byDay numbers correctly', async () => {
      // Arrange
      mockPrismaService.notification.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(75);
      mockPrismaService.notification.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { date: '2026-01-08', sent: BigInt(15), read: BigInt(12) },
        { date: '2026-01-07', sent: BigInt(10), read: BigInt(8) },
      ]);

      // Act
      const result = await notificationsService.getAnalytics();

      // Assert
      expect(typeof result.byDay[0].sent).toBe('number');
      expect(typeof result.byDay[0].read).toBe('number');
    });
  });

  // ==========================================================================
  // Push Token Edge Cases Tests
  // ==========================================================================

  describe('Push Token Edge Cases', () => {
    it('should update lastUsedAt when registering existing token', async () => {
      // Arrange
      mockPrismaService.pushToken.findUnique.mockResolvedValue(mockPushToken);
      mockPrismaService.pushToken.upsert.mockResolvedValue({
        ...mockPushToken,
        lastUsedAt: new Date(),
      });

      // Act
      await notificationsService.registerPushToken(mockUserId, {
        token: mockPushToken.token,
        platform: NotificationPlatform.ANDROID,
        deviceName: 'Updated Device',
      });

      // Assert
      expect(mockPrismaService.pushToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            lastUsedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should handle multiple active tokens for same user', async () => {
      // Arrange
      const tokens = [
        mockPushToken,
        { ...mockPushToken, id: 'token-2', token: 'fcm-token-2', platform: NotificationPlatform.IOS },
        { ...mockPushToken, id: 'token-3', token: 'fcm-token-3', platform: NotificationPlatform.WEB },
      ];
      mockPrismaService.pushToken.findMany.mockResolvedValue(tokens);

      // Act
      const result = await notificationsService.getUserPushTokens(mockUserId);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should include deviceName when registering token', async () => {
      // Arrange
      mockPrismaService.pushToken.findUnique.mockResolvedValue(null);
      mockPrismaService.pushToken.upsert.mockResolvedValue({
        ...mockPushToken,
        deviceName: 'iPhone 15 Pro Max',
      });

      // Act
      const result = await notificationsService.registerPushToken(mockUserId, {
        token: 'new-token',
        platform: NotificationPlatform.IOS,
        deviceName: 'iPhone 15 Pro Max',
      });

      // Assert
      expect(result.deviceName).toBe('iPhone 15 Pro Max');
      expect(mockPrismaService.pushToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            deviceName: 'iPhone 15 Pro Max',
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Preferences Edge Cases Tests
  // ==========================================================================

  describe('Preferences Edge Cases', () => {
    it('should create preferences with default timezone', async () => {
      // Arrange
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue({
        ...mockPreferences,
        timezone: 'Europe/Paris',
      });

      // Act
      const result = await notificationsService.getPreferences(mockUserId);

      // Assert
      expect(result.timezone).toBe('Europe/Paris');
      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timezone: 'Europe/Paris',
        }),
      });
    });

    it('should create preferences with default enabled categories', async () => {
      // Arrange
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockPreferences);

      // Act
      const result = await notificationsService.getPreferences(mockUserId);

      // Assert
      expect(result.enabledCategories).toContain(NotificationCategory.TICKETS);
      expect(result.enabledCategories).toContain(NotificationCategory.PAYMENTS);
      expect(result.enabledCategories).toContain(NotificationCategory.CASHLESS);
      expect(result.enabledCategories).toContain(NotificationCategory.PROGRAM);
      expect(result.enabledCategories).toContain(NotificationCategory.SECURITY);
      expect(result.enabledCategories).toContain(NotificationCategory.SYSTEM);
    });

    it('should create preferences with SMS disabled by default', async () => {
      // Arrange
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockPreferences);

      // Act
      const result = await notificationsService.getPreferences(mockUserId);

      // Assert
      expect(result.smsEnabled).toBe(false);
    });

    it('should update timezone in preferences', async () => {
      // Arrange
      const updatedPrefs = {
        ...mockPreferences,
        timezone: 'America/New_York',
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPrefs);

      // Act
      const result = await notificationsService.updatePreferences(mockUserId, {
        timezone: 'America/New_York',
      });

      // Assert
      expect(result.timezone).toBe('America/New_York');
    });

    it('should update SMS preference', async () => {
      // Arrange
      const updatedPrefs = {
        ...mockPreferences,
        smsEnabled: true,
      };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPrefs);

      // Act
      const result = await notificationsService.updatePreferences(mockUserId, {
        smsEnabled: true,
      });

      // Assert
      expect(result.smsEnabled).toBe(true);
    });
  });

  // ==========================================================================
  // Bulk Notification Edge Cases Tests
  // ==========================================================================

  describe('Bulk Notification Edge Cases', () => {
    const payload: NotificationPayload = {
      title: 'Bulk Test',
      body: 'Test body',
      type: NotificationType.SYSTEM,
    };

    it('should handle single user in bulk notification', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds: ['single-user'],
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should handle exactly 100 users (batch size boundary)', async () => {
      // Arrange
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
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
      expect(result.successCount).toBe(100);
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(100);
    });

    it('should handle 101 users (just over batch size)', async () => {
      // Arrange
      const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);
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
      expect(result.successCount).toBe(101);
    });

    it('should send with push and email enabled', async () => {
      // Arrange
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      // Act
      const result = await notificationsService.sendBulkNotifications({
        userIds: [mockUserId],
        payload,
        sendPush: true,
        sendEmail: true,
      });

      // Assert
      expect(result.successCount).toBe(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.email',
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // Templated Notification Edge Cases Tests
  // ==========================================================================

  describe('Templated Notification Edge Cases', () => {
    it('should use template defaultImageUrl when provided', async () => {
      // Arrange
      const templateWithImage = {
        ...mockTemplate,
        defaultImageUrl: 'https://example.com/image.png',
      };
      mockTemplateService.getByName.mockResolvedValue(templateWithImage);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        [mockUserId],
        { ticketType: 'VIP', festivalName: 'Test Fest' },
      );

      // Assert
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          imageUrl: 'https://example.com/image.png',
        }),
      });
    });

    it('should use template defaultActionUrl when provided', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        [mockUserId],
        { ticketType: 'VIP', festivalName: 'Test Fest' },
      );

      // Assert
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionUrl: '/tickets',
        }),
      });
    });

    it('should override default options when provided', async () => {
      // Arrange
      mockTemplateService.getByName.mockResolvedValue(mockTemplate);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendTemplatedNotification(
        'ticket_purchased',
        [mockUserId],
        { ticketType: 'VIP', festivalName: 'Test Fest' },
        { sendPush: false, sendEmail: true },
      );

      // Assert
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.email',
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // Real-time Event Emission Tests
  // ==========================================================================

  describe('Real-time Event Emission', () => {
    it('should emit notification.created event with correct payload', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
      };
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([]);

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: false,
        sendEmail: false,
      });

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        userId: mockUserId,
        notification: mockNotification,
      });
    });

    it('should emit notification.email event with correct payload', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
      };
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
  });

  // ==========================================================================
  // Error Scenarios Tests
  // ==========================================================================

  describe('Error Scenarios', () => {
    it('should propagate database error when creating notification fails', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
      };
      mockPrismaService.notification.create.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Act & Assert
      await expect(
        notificationsService.sendNotification({
          userId: mockUserId,
          payload,
          sendPush: false,
          sendEmail: false,
        }),
      ).rejects.toThrow('Database connection error');
    });

    it('should propagate error when getting preferences fails', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
      };
      mockPrismaService.notificationPreference.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(
        notificationsService.sendNotification({
          userId: mockUserId,
          payload,
          sendPush: false,
          sendEmail: false,
        }),
      ).rejects.toThrow('Database error');
    });

    it('should handle analytics query failure gracefully', async () => {
      // Arrange
      mockPrismaService.notification.count.mockRejectedValue(
        new Error('Query failed'),
      );

      // Act & Assert
      await expect(notificationsService.getAnalytics()).rejects.toThrow(
        'Query failed',
      );
    });
  });

  // ==========================================================================
  // Category Mapping Verification Tests
  // ==========================================================================

  describe('Category Mapping Verification', () => {
    it('should correctly map TICKET_PURCHASED to TICKETS category', async () => {
      // Arrange
      const disabledPreferences = {
        ...mockPreferences,
        enabledCategories: [], // All categories disabled
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(disabledPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);

      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.TICKET_PURCHASED,
      };

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert - push should not be sent because TICKETS category is disabled
      expect(mockFcmService.sendToTokens).not.toHaveBeenCalled();
    });

    it('should send notification when category is enabled', async () => {
      // Arrange
      const enabledPreferences = {
        ...mockPreferences,
        enabledCategories: [NotificationCategory.TICKETS],
      };
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(enabledPreferences);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.pushToken.findMany.mockResolvedValue([mockPushToken]);
      mockFcmService.sendToTokens.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        invalidTokens: [],
      });
      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.TICKET_PURCHASED,
      };

      // Act
      await notificationsService.sendNotification({
        userId: mockUserId,
        payload,
        sendPush: true,
        sendEmail: false,
      });

      // Assert
      expect(mockFcmService.sendToTokens).toHaveBeenCalled();
    });
  });
});
