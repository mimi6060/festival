/**
 * Notification Processor Unit Tests
 *
 * Comprehensive tests for notification queue processor including:
 * - Worker registration
 * - Push notification processing
 * - In-app notification processing
 * - SMS notification processing
 * - Combined notification types
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessor } from './notification.processor';
import { QueueService } from '../queue.service';
import { QueueName, NotificationJobData } from '../queue.types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Job interface
interface MockJob<T> {
  id: string;
  data: T;
  updateProgress: jest.Mock;
  log: jest.Mock;
}

const mockQueueService = {
  registerWorker: jest.fn(),
};

describe('NotificationProcessor', () => {
  let notificationProcessor: NotificationProcessor;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    notificationProcessor = module.get<NotificationProcessor>(NotificationProcessor);
    queueService = module.get(QueueService);
  });

  // ==========================================================================
  // Registration Tests
  // ==========================================================================

  describe('register', () => {
    it('should register the worker with the queue service', () => {
      // Act
      notificationProcessor.register();

      // Assert
      expect(queueService.registerWorker).toHaveBeenCalledWith(
        QueueName.NOTIFICATION,
        expect.any(Function),
        { concurrency: 10 },
      );
    });

    it('should register with NOTIFICATION queue name', () => {
      // Act
      notificationProcessor.register();

      // Assert
      expect(queueService.registerWorker).toHaveBeenCalledWith(
        'notification',
        expect.any(Function),
        expect.any(Object),
      );
    });

    it('should register with concurrency of 10', () => {
      // Act
      notificationProcessor.register();

      // Assert
      expect(queueService.registerWorker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        { concurrency: 10 },
      );
    });
  });

  // ==========================================================================
  // Push Notification Tests
  // ==========================================================================

  describe('process - push notifications', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should successfully process a push notification', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'New Event!',
        body: 'Check out the latest festival updates',
        targetUserIds: ['user-1', 'user-2', 'user-3'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          type: 'push',
          title: 'New Event!',
          results: {
            push: { success: true, count: 3 },
          },
        },
      });
    });

    it('should handle push notification with empty target users', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Broadcast',
        body: 'Important announcement',
        targetUserIds: [],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          type: 'push',
          title: 'Broadcast',
          results: {
            push: { success: true, count: 0 },
          },
        },
      });
    });

    it('should handle push notification without targetUserIds', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Global Notification',
        body: 'Message for all users',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'push',
          results: {
            push: { success: true, count: 0 },
          },
        }),
      });
    });

    it('should include custom data in push notification', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'New Message',
        body: 'You have a new message',
        targetUserIds: ['user-1'],
        data: {
          messageId: 'msg-123',
          senderId: 'user-2',
        },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'push',
        }),
      });
    });

    it('should handle push notification with image', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Photo Update',
        body: 'New photos from the festival',
        targetUserIds: ['user-1'],
        imageUrl: 'https://example.com/image.jpg',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'push',
        }),
      });
    });
  });

  // ==========================================================================
  // In-App Notification Tests
  // ==========================================================================

  describe('process - in-app notifications', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should successfully process an in-app notification', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'in-app',
        title: 'Welcome!',
        body: 'Thanks for joining the festival',
        targetUserIds: ['user-1'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          type: 'in-app',
          title: 'Welcome!',
          results: {
            inApp: { success: true, count: 1 },
          },
        },
      });
    });

    it('should handle in-app notification with action URL', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'in-app',
        title: 'New Feature',
        body: 'Check out our new cashless payment system',
        targetUserIds: ['user-1', 'user-2'],
        actionUrl: '/cashless',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'in-app',
          results: {
            inApp: { success: true, count: 2 },
          },
        }),
      });
    });

    it('should handle in-app notification for festival', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'in-app',
        title: 'Festival Update',
        body: 'Schedule has been updated',
        targetFestivalId: 'festival-123',
        targetUserIds: ['user-1', 'user-2', 'user-3', 'user-4'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'in-app',
          results: {
            inApp: { success: true, count: 4 },
          },
        }),
      });
    });
  });

  // ==========================================================================
  // SMS Notification Tests
  // ==========================================================================

  describe('process - SMS notifications', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should successfully process an SMS notification', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'sms',
        title: 'Entry Code',
        body: 'Your entry code is: 1234',
        targetUserIds: ['user-1'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          type: 'sms',
          title: 'Entry Code',
          results: {
            sms: { success: true, count: 1 },
          },
        },
      });
    });

    it('should handle SMS notification to multiple users', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'sms',
        title: 'Emergency Alert',
        body: 'Please proceed to the nearest exit',
        targetUserIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'sms',
          results: {
            sms: { success: true, count: 5 },
          },
        }),
      });
    });
  });

  // ==========================================================================
  // Combined Notification Tests (type: 'all')
  // ==========================================================================

  describe('process - all notification types', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should send all notification types when type is "all"', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'all',
        title: 'Important Update',
        body: 'This message will be sent via all channels',
        targetUserIds: ['user-1', 'user-2'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          type: 'all',
          title: 'Important Update',
          results: {
            push: { success: true, count: 2 },
            inApp: { success: true, count: 2 },
            sms: { success: true, count: 2 },
          },
        },
      });
    });

    it('should update progress at each step for "all" type', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'all',
        title: 'Multi-channel',
        body: 'Test message',
        targetUserIds: ['user-1'],
      });

      // Act
      await processorFunction(mockJob);

      // Assert
      const progressCalls = mockJob.updateProgress.mock.calls;
      expect(progressCalls).toContainEqual([10]);  // Start
      expect(progressCalls).toContainEqual([30]);  // After push
      expect(progressCalls).toContainEqual([50]);  // After in-app
      expect(progressCalls).toContainEqual([70]);  // After SMS
      expect(progressCalls).toContainEqual([100]); // Complete
    });
  });

  // ==========================================================================
  // Progress Update Tests
  // ==========================================================================

  describe('progress updates', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should update progress for single notification type', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Test',
        body: 'Test message',
        targetUserIds: ['user-1'],
      });

      // Act
      await processorFunction(mockJob);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });
  });

  // ==========================================================================
  // Target Role Tests
  // ==========================================================================

  describe('target role notifications', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should handle notification with target role', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Staff Alert',
        body: 'New shift assignment',
        targetRole: 'STAFF',
        targetUserIds: ['staff-1', 'staff-2', 'staff-3'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'push',
          results: {
            push: { success: true, count: 3 },
          },
        }),
      });
    });

    it('should handle notification with target festival', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'in-app',
        title: 'Festival Announcement',
        body: 'Main stage performance starting soon',
        targetFestivalId: 'festival-456',
        targetUserIds: ['user-1', 'user-2'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'in-app',
        }),
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should return error result when processing fails', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Test',
        body: 'Test message',
        targetUserIds: ['user-1'],
      });
      // Make updateProgress throw an error
      mockJob.updateProgress = jest.fn().mockRejectedValue(new Error('Redis connection error'));

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Redis connection error',
      });
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Test',
        body: 'Test message',
        targetUserIds: ['user-1'],
      });
      mockJob.updateProgress = jest.fn().mockRejectedValue('Unknown error string');

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Unknown error',
      });
    });
  });

  // ==========================================================================
  // Job Metadata Tests
  // ==========================================================================

  describe('job metadata', () => {
    let processorFunction: (job: MockJob<NotificationJobData>) => Promise<unknown>;

    beforeEach(() => {
      notificationProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should handle job with userId', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Personal Notification',
        body: 'This is for you',
        targetUserIds: ['user-1'],
        userId: 'sender-123',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.any(Object),
      });
    });

    it('should handle job with festivalId', async () => {
      // Arrange
      const mockJob = createMockJob({
        type: 'push',
        title: 'Festival Notification',
        body: 'From the festival',
        targetUserIds: ['user-1'],
        festivalId: 'festival-789',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.any(Object),
      });
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockJob(data: NotificationJobData): MockJob<NotificationJobData> {
  return {
    id: 'job-' + Math.random().toString(36).substr(2, 9),
    data,
    updateProgress: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };
}
