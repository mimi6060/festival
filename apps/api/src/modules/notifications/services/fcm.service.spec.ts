/**
 * FcmService Unit Tests
 *
 * Comprehensive tests for Firebase Cloud Messaging functionality including:
 * - Initialization
 * - Sending notifications to single token
 * - Sending notifications to multiple tokens
 * - Sending notifications to topics
 * - Topic subscription management
 * - Error handling
 * - Channel ID mapping
 * - Data stringification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { NotificationPayload } from '../interfaces';
import { NotificationType } from '@prisma/client';

// Create mock functions at module level so they persist across beforeEach
const mockSend = jest.fn();
const mockSendEachForMulticast = jest.fn();
const mockSubscribeToTopic = jest.fn();
const mockUnsubscribeFromTopic = jest.fn();
const mockInitializeApp = jest.fn();
const mockCredentialCert = jest.fn();
let mockApps: any[] = [];

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  get apps() {
    return mockApps;
  },
  set apps(value: any[]) {
    mockApps = value;
  },
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  credential: {
    cert: (...args: any[]) => mockCredentialCert(...args),
  },
  messaging: () => ({
    send: mockSend,
    sendEachForMulticast: mockSendEachForMulticast,
    subscribeToTopic: mockSubscribeToTopic,
    unsubscribeFromTopic: mockUnsubscribeFromTopic,
  }),
}));

describe('FcmService', () => {
  let fcmService: FcmService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPayload: NotificationPayload = {
    title: 'Test Notification',
    body: 'Test notification body',
    type: NotificationType.TICKET_PURCHASED,
    festivalId: 'festival-uuid-123',
    data: { ticketId: 'ticket-123' },
    imageUrl: 'https://example.com/image.jpg',
    actionUrl: '/tickets/ticket-123',
  };

  const mockToken = 'fcm-token-abc123';
  const mockTokens = ['token-1', 'token-2', 'token-3'];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockApps = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    fcmService = module.get<FcmService>(FcmService);
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(fcmService).toBeDefined();
    });

    it('should not initialize Firebase when config is missing', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(false);
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });

    it('should not initialize Firebase when FCM_PROJECT_ID is missing', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return undefined;
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(false);
    });

    it('should not initialize Firebase when FCM_PRIVATE_KEY is missing', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return undefined;
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(false);
    });

    it('should not initialize Firebase when FCM_CLIENT_EMAIL is missing', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return undefined;
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(false);
    });

    it('should initialize Firebase when all config is provided', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key\\nwith-newlines';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(true);
      expect(mockInitializeApp).toHaveBeenCalled();
    });

    it('should not reinitialize if Firebase is already initialized', () => {
      // Arrange
      mockApps = [{ name: 'existing-app' }];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(true);
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });

    it('should handle Firebase initialization error', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      mockInitializeApp.mockImplementationOnce(() => {
        throw new Error('Firebase init error');
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(false);
    });
  });

  // ==========================================================================
  // isEnabled Tests
  // ==========================================================================

  describe('isEnabled', () => {
    it('should return false when not initialized', () => {
      expect(fcmService.isEnabled()).toBe(false);
    });

    it('should return true when initialized', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });

      // Act
      fcmService.onModuleInit();

      // Assert
      expect(fcmService.isEnabled()).toBe(true);
    });
  });

  // ==========================================================================
  // sendToToken Tests
  // ==========================================================================

  describe('sendToToken', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should return null when FCM is not initialized', async () => {
      // Arrange - create new instance without initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      const uninitializedService = module.get<FcmService>(FcmService);

      // Act
      const result = await uninitializedService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should send notification to single token successfully', async () => {
      // Arrange
      const mockResponse = 'projects/project-id/messages/123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: mockToken,
          notification: expect.objectContaining({
            title: mockPayload.title,
            body: mockPayload.body,
          }),
        }),
      );
    });

    it('should include android config in message', async () => {
      // Arrange
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              channelId: 'tickets',
              sound: 'default',
            }),
          }),
        }),
      );
    });

    it('should include apns config in message', async () => {
      // Arrange
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          apns: expect.objectContaining({
            payload: expect.objectContaining({
              aps: expect.objectContaining({
                sound: 'default',
                badge: 1,
              }),
            }),
          }),
        }),
      );
    });

    it('should include webpush config in message', async () => {
      // Arrange
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          webpush: expect.objectContaining({
            notification: expect.objectContaining({
              icon: '/icons/notification-icon.png',
            }),
            fcmOptions: expect.objectContaining({
              link: mockPayload.actionUrl,
            }),
          }),
        }),
      );
    });

    it('should handle FCM send error gracefully', async () => {
      // Arrange
      mockSend.mockRejectedValue(new Error('FCM send failed'));

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle invalid registration token error', async () => {
      // Arrange
      const error = { code: 'messaging/invalid-registration-token', message: 'Invalid token' };
      mockSend.mockRejectedValue(error);

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle unregistered token error', async () => {
      // Arrange
      const error = { code: 'messaging/registration-token-not-registered', message: 'Token not registered' };
      mockSend.mockRejectedValue(error);

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle rate limit error', async () => {
      // Arrange
      const error = { code: 'messaging/message-rate-exceeded', message: 'Rate limit exceeded' };
      mockSend.mockRejectedValue(error);

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle server unavailable error', async () => {
      // Arrange
      const error = { code: 'messaging/server-unavailable', message: 'Server unavailable' };
      mockSend.mockRejectedValue(error);

      // Act
      const result = await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should include data in message', async () => {
      // Arrange
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, mockPayload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: mockPayload.type,
            festivalId: mockPayload.festivalId,
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // sendToTokens Tests
  // ==========================================================================

  describe('sendToTokens', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should return failure count when FCM is not initialized', async () => {
      // Arrange - create new instance without initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      const uninitializedService = module.get<FcmService>(FcmService);

      // Act
      const result = await uninitializedService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(3);
      expect(result.invalidTokens).toEqual([]);
    });

    it('should return zeros for empty token array', async () => {
      // Act
      const result = await fcmService.sendToTokens([], mockPayload);

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.invalidTokens).toEqual([]);
    });

    it('should send notification to multiple tokens successfully', async () => {
      // Arrange
      const mockResponse = {
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true },
          { success: true },
          { success: true },
        ],
      };
      mockSendEachForMulticast.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.invalidTokens).toEqual([]);
    });

    it('should identify invalid tokens in response', async () => {
      // Arrange
      const mockResponse = {
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      };
      mockSendEachForMulticast.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(2);
      expect(result.invalidTokens).toEqual(['token-2', 'token-3']);
    });

    it('should handle partial failures', async () => {
      // Arrange
      const mockResponse = {
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          { success: false, error: { code: 'messaging/unknown-error' } },
        ],
      };
      mockSendEachForMulticast.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.invalidTokens).toEqual([]); // Unknown error doesn't mark token as invalid
    });

    it('should handle multicast send error', async () => {
      // Arrange
      mockSendEachForMulticast.mockRejectedValue(new Error('Batch send failed'));

      // Act
      const result = await fcmService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(3);
      expect(result.invalidTokens).toEqual([]);
    });

    it('should include multicast message with all tokens', async () => {
      // Arrange
      const mockResponse = {
        successCount: 3,
        failureCount: 0,
        responses: mockTokens.map(() => ({ success: true })),
      };
      mockSendEachForMulticast.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToTokens(mockTokens, mockPayload);

      // Assert
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: mockTokens,
          notification: expect.objectContaining({
            title: mockPayload.title,
            body: mockPayload.body,
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // sendToTopic Tests
  // ==========================================================================

  describe('sendToTopic', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should return null when FCM is not initialized', async () => {
      // Arrange - create new instance without initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      const uninitializedService = module.get<FcmService>(FcmService);

      // Act
      const result = await uninitializedService.sendToTopic('test-topic', mockPayload);

      // Assert
      expect(result).toBeNull();
    });

    it('should send notification to topic successfully', async () => {
      // Arrange
      const mockResponse = 'projects/project-id/messages/123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToTopic('festival-updates', mockPayload);

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'festival-updates',
          notification: expect.objectContaining({
            title: mockPayload.title,
            body: mockPayload.body,
          }),
        }),
      );
    });

    it('should include android config in topic message', async () => {
      // Arrange
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToTopic('test-topic', mockPayload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
          }),
        }),
      );
    });

    it('should handle topic send error', async () => {
      // Arrange
      mockSend.mockRejectedValue(new Error('Topic send failed'));

      // Act
      const result = await fcmService.sendToTopic('test-topic', mockPayload);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // subscribeToTopic Tests
  // ==========================================================================

  describe('subscribeToTopic', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should do nothing when FCM is not initialized', async () => {
      // Arrange - create new instance without initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      const uninitializedService = module.get<FcmService>(FcmService);

      // Act
      await uninitializedService.subscribeToTopic(mockTokens, 'test-topic');

      // Assert
      expect(mockSubscribeToTopic).not.toHaveBeenCalled();
    });

    it('should subscribe tokens to topic successfully', async () => {
      // Arrange
      mockSubscribeToTopic.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
      });

      // Act
      await fcmService.subscribeToTopic(mockTokens, 'festival-updates');

      // Assert
      expect(mockSubscribeToTopic).toHaveBeenCalledWith(
        mockTokens,
        'festival-updates',
      );
    });

    it('should handle subscription error gracefully', async () => {
      // Arrange
      mockSubscribeToTopic.mockRejectedValue(new Error('Subscription failed'));

      // Act & Assert - should not throw
      await expect(
        fcmService.subscribeToTopic(mockTokens, 'test-topic'),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // unsubscribeFromTopic Tests
  // ==========================================================================

  describe('unsubscribeFromTopic', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should do nothing when FCM is not initialized', async () => {
      // Arrange - create new instance without initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      const uninitializedService = module.get<FcmService>(FcmService);

      // Act
      await uninitializedService.unsubscribeFromTopic(mockTokens, 'test-topic');

      // Assert
      expect(mockUnsubscribeFromTopic).not.toHaveBeenCalled();
    });

    it('should unsubscribe tokens from topic successfully', async () => {
      // Arrange
      mockUnsubscribeFromTopic.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
      });

      // Act
      await fcmService.unsubscribeFromTopic(mockTokens, 'festival-updates');

      // Assert
      expect(mockUnsubscribeFromTopic).toHaveBeenCalledWith(
        mockTokens,
        'festival-updates',
      );
    });

    it('should handle unsubscription error gracefully', async () => {
      // Arrange
      mockUnsubscribeFromTopic.mockRejectedValue(new Error('Unsubscription failed'));

      // Act & Assert - should not throw
      await expect(
        fcmService.unsubscribeFromTopic(mockTokens, 'test-topic'),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Channel ID Mapping Tests
  // ==========================================================================

  describe('getChannelId (via sendToToken)', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it.each([
      [NotificationType.TICKET_PURCHASED, 'tickets'],
      [NotificationType.PAYMENT_SUCCESS, 'payments'],
      [NotificationType.PAYMENT_FAILED, 'payments'],
      [NotificationType.CASHLESS_TOPUP, 'cashless'],
      [NotificationType.ARTIST_REMINDER, 'program'],
      [NotificationType.FESTIVAL_UPDATE, 'updates'],
      [NotificationType.SCHEDULE_CHANGE, 'updates'],
      [NotificationType.SECURITY_ALERT, 'security'],
      [NotificationType.PROMO, 'promotions'],
      [NotificationType.VENDOR_ORDER, 'orders'],
      [NotificationType.SYSTEM, 'general'],
    ])('should map %s to channel %s', async (type, expectedChannel) => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type,
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            notification: expect.objectContaining({
              channelId: expectedChannel,
            }),
          }),
        }),
      );
    });

    it('should use general channel for unknown notification types', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: 'UNKNOWN_TYPE' as NotificationType,
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            notification: expect.objectContaining({
              channelId: 'general',
            }),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Data Stringification Tests
  // ==========================================================================

  describe('stringifyData (via sendToToken)', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should stringify object values in data', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: {
          nested: { key: 'value' },
          array: [1, 2, 3],
        },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.data.nested).toBe('{"key":"value"}');
      expect(callArg.data.array).toBe('[1,2,3]');
    });

    it('should keep string values as-is', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: { stringValue: 'already a string' },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.data.stringValue).toBe('already a string');
    });

    it('should handle null and undefined values in data', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: {
          nullValue: null,
          undefinedValue: undefined,
          validValue: 'valid',
        },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.data.validValue).toBe('valid');
      expect(callArg.data.nullValue).toBeUndefined();
      expect(callArg.data.undefinedValue).toBeUndefined();
    });

    it('should handle numeric values in data', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: { numericValue: 42, floatValue: 3.14 },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.data.numericValue).toBe('42');
      expect(callArg.data.floatValue).toBe('3.14');
    });

    it('should handle boolean values in data', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: { boolTrue: true, boolFalse: false },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.data.boolTrue).toBe('true');
      expect(callArg.data.boolFalse).toBe('false');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FCM_PROJECT_ID') return 'project-id';
        if (key === 'FCM_PRIVATE_KEY') return 'private-key';
        if (key === 'FCM_CLIENT_EMAIL') return 'test@example.com';
        return undefined;
      });
      fcmService.onModuleInit();
    });

    it('should handle empty data object', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
        data: {},
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle undefined data', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test',
        body: 'Test body',
        type: NotificationType.SYSTEM,
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await fcmService.sendToToken(mockToken, payload);

      // Assert
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle payload without optional fields', async () => {
      // Arrange
      const minimalPayload: NotificationPayload = {
        title: 'Minimal',
        body: 'Minimal body',
        type: NotificationType.SYSTEM,
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToToken(mockToken, minimalPayload);

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Minimal',
            body: 'Minimal body',
            imageUrl: undefined,
          }),
        }),
      );
    });

    it('should handle special characters in payload', async () => {
      // Arrange
      const payload: NotificationPayload = {
        title: 'Test <script>alert("xss")</script>',
        body: 'Body with "quotes" and \'apostrophes\'',
        type: NotificationType.SYSTEM,
        data: { emoji: 'Test message emoji' },
      };
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToToken(mockToken, payload);

      // Assert
      expect(result).toBe(mockResponse);
    });

    it('should handle very long token', async () => {
      // Arrange
      const longToken = 'a'.repeat(500);
      const mockResponse = 'message-123';
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await fcmService.sendToToken(longToken, mockPayload);

      // Assert
      expect(result).toBe(mockResponse);
    });
  });
});
