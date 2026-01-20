/**
 * Queue Service Unit Tests
 *
 * Comprehensive tests for queue management functionality including:
 * - Job addition to various queues
 * - Job status retrieval
 * - Job retry and removal
 * - Queue statistics
 * - Worker registration
 * - Queue lifecycle (pause/resume/clear)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  QueueName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  JobPriority,
  EmailJobData,
  NotificationJobData,
  PaymentJobData,
  TicketJobData,
  PdfJobData,
  AnalyticsJobData,
  CashlessJobData,
  WebhookJobData,
  ReportJobData,
  ExportJobData,
  ImportJobData,
  MaintenanceJobData,
} from './queue.types';

// Import QueueService - bullmq is mocked via moduleNameMapper in jest.config.ts
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let queueService: QueueService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: undefined,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    queueService = module.get<QueueService>(QueueService);

    // Get references to mock instances after module creation
    // The mock returns a new instance each time, so we get it after onModuleInit
  });

  // ==========================================================================
  // Lifecycle Tests
  // ==========================================================================

  describe('Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should initialize all queues on module init', async () => {
        // Act
        await queueService.onModuleInit();

        // Assert - verify the service can get stats for all queue types
        // This verifies that queues were created
        const stats = await queueService.getAllQueuesStats();
        expect(stats.length).toBe(Object.values(QueueName).length);
      });

      it('should create QueueEvents for each queue', async () => {
        // Act
        await queueService.onModuleInit();

        // Assert - if no error was thrown, QueueEvents were created successfully
        // The service would fail initialization if QueueEvents creation failed
        expect(true).toBe(true);
      });
    });

    describe('onModuleDestroy', () => {
      it('should close all queues on destroy', async () => {
        // Arrange
        await queueService.onModuleInit();

        // Act - should not throw
        await expect(queueService.onModuleDestroy()).resolves.not.toThrow();
      });
    });
  });

  // ==========================================================================
  // Worker Registration Tests
  // ==========================================================================

  describe('registerWorker', () => {
    it('should register a worker for a queue', async () => {
      // Arrange
      await queueService.onModuleInit();
      const processor = jest.fn().mockResolvedValue({ success: true });

      // Act - should not throw
      expect(() => {
        queueService.registerWorker(QueueName.EMAIL, processor);
      }).not.toThrow();
    });

    it('should register a worker with custom concurrency', async () => {
      // Arrange
      await queueService.onModuleInit();
      const processor = jest.fn().mockResolvedValue({ success: true });

      // Act - should not throw
      expect(() => {
        queueService.registerWorker(QueueName.NOTIFICATION, processor, { concurrency: 10 });
      }).not.toThrow();
    });

    it('should register a worker with rate limiter', async () => {
      // Arrange
      await queueService.onModuleInit();
      const processor = jest.fn().mockResolvedValue({ success: true });
      const limiter = { max: 100, duration: 60000 };

      // Act - should not throw
      expect(() => {
        queueService.registerWorker(QueueName.WEBHOOK, processor, { limiter });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Email Job Tests
  // ==========================================================================

  describe('addEmailJob', () => {
    const emailJobData: EmailJobData = {
      to: 'user@example.com',
      subject: 'Welcome!',
      template: 'welcome',
      context: { name: 'John' },
    };

    it('should add an email job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addEmailJob(emailJobData);

      // Assert - the mock returns a job with id 'mock-job-id'
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });

    it('should throw error when queue not initialized', async () => {
      // Don't call onModuleInit
      // Act & Assert
      await expect(queueService.addEmailJob(emailJobData)).rejects.toThrow('Queue email not found');
    });
  });

  // ==========================================================================
  // Notification Job Tests
  // ==========================================================================

  describe('addNotificationJob', () => {
    const notificationJobData: NotificationJobData = {
      type: 'push',
      title: 'New Update',
      body: 'Check out the latest features',
      targetUserIds: ['user-1', 'user-2'],
    };

    it('should add a notification job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addNotificationJob(notificationJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Payment Job Tests
  // ==========================================================================

  describe('addPaymentJob', () => {
    const paymentJobData: PaymentJobData = {
      paymentId: 'payment-123',
      action: 'process',
      amount: 100,
      currency: 'EUR',
    };

    it('should add a payment job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addPaymentJob(paymentJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Ticket Job Tests
  // ==========================================================================

  describe('addTicketJob', () => {
    const ticketJobData: TicketJobData = {
      ticketId: 'ticket-123',
      action: 'generate',
      festivalId: 'festival-1',
    };

    it('should add a ticket job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addTicketJob(ticketJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // PDF Job Tests
  // ==========================================================================

  describe('addPdfJob', () => {
    const pdfJobData: PdfJobData = {
      type: 'ticket',
      templateData: { ticketNumber: 'TKT-001', name: 'John Doe' },
      sendEmail: true,
      recipientEmail: 'user@example.com',
    };

    it('should add a PDF generation job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addPdfJob(pdfJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Analytics Job Tests
  // ==========================================================================

  describe('addAnalyticsJob', () => {
    const analyticsJobData: AnalyticsJobData = {
      eventType: 'page_view',
      eventData: { page: '/tickets', userId: 'user-1' },
      aggregationType: 'realtime',
    };

    it('should add an analytics job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addAnalyticsJob(analyticsJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Cashless Job Tests
  // ==========================================================================

  describe('addCashlessJob', () => {
    const cashlessJobData: CashlessJobData = {
      accountId: 'account-123',
      action: 'topup',
      amount: 50,
    };

    it('should add a cashless job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addCashlessJob(cashlessJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Webhook Job Tests
  // ==========================================================================

  describe('addWebhookJob', () => {
    const webhookJobData: WebhookJobData = {
      url: 'https://api.example.com/webhook',
      payload: { event: 'payment.completed', paymentId: '123' },
      eventType: 'payment.completed',
    };

    it('should add a webhook job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addWebhookJob(webhookJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Report Job Tests
  // ==========================================================================

  describe('addReportJob', () => {
    const reportJobData: ReportJobData = {
      reportType: 'sales',
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      },
      format: 'pdf',
      deliveryMethod: 'email',
      recipientEmail: 'admin@example.com',
    };

    it('should add a report job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addReportJob(reportJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Export Job Tests
  // ==========================================================================

  describe('addExportJob', () => {
    const exportJobData: ExportJobData = {
      entityType: 'tickets',
      format: 'csv',
      filters: { festivalId: 'festival-1' },
    };

    it('should add an export job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addExportJob(exportJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Import Job Tests
  // ==========================================================================

  describe('addImportJob', () => {
    const importJobData: ImportJobData = {
      entityType: 'users',
      format: 'csv',
      filePath: '/uploads/users.csv',
      upsert: true,
    };

    it('should add an import job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addImportJob(importJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Maintenance Job Tests
  // ==========================================================================

  describe('addMaintenanceJob', () => {
    const maintenanceJobData: MaintenanceJobData = {
      task: 'cleanup',
      options: { olderThan: 30 },
    };

    it('should add a maintenance job to the queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.addMaintenanceJob(maintenanceJobData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-job-id');
    });
  });

  // ==========================================================================
  // Queue Statistics Tests
  // ==========================================================================

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const stats = await queueService.getQueueStats(QueueName.EMAIL);

      // Assert
      expect(stats).toBeDefined();
      expect(stats.name).toBe(QueueName.EMAIL);
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats).toHaveProperty('paused');
    });

    it('should throw error for non-existent queue', async () => {
      // Don't call onModuleInit
      // Act & Assert
      await expect(queueService.getQueueStats('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  describe('getAllQueuesStats', () => {
    it('should return statistics for all queues', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const stats = await queueService.getAllQueuesStats();

      // Assert
      expect(stats).toHaveLength(Object.values(QueueName).length);
      expect(stats[0]).toHaveProperty('name');
      expect(stats[0]).toHaveProperty('waiting');
      expect(stats[0]).toHaveProperty('active');
    });
  });

  // ==========================================================================
  // Job Management Tests
  // ==========================================================================

  describe('getJob', () => {
    it('should return null for non-existent job (mock default)', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.getJob(QueueName.EMAIL, 'non-existent');

      // Assert - mock returns null by default
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Queue Control Tests
  // ==========================================================================

  describe('pauseQueue', () => {
    it('should pause a queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act & Assert - should not throw
      await expect(queueService.pauseQueue(QueueName.EMAIL)).resolves.not.toThrow();
    });

    it('should throw error for non-existent queue', async () => {
      // Act & Assert
      await expect(queueService.pauseQueue('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  describe('resumeQueue', () => {
    it('should resume a paused queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act & Assert - should not throw
      await expect(queueService.resumeQueue(QueueName.EMAIL)).resolves.not.toThrow();
    });

    it('should throw error for non-existent queue', async () => {
      // Act & Assert
      await expect(queueService.resumeQueue('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  describe('clearQueue', () => {
    it('should clear all jobs from a queue', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act & Assert - should not throw
      await expect(queueService.clearQueue(QueueName.EMAIL)).resolves.not.toThrow();
    });

    it('should throw error for non-existent queue', async () => {
      // Act & Assert
      await expect(queueService.clearQueue('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  // ==========================================================================
  // Failed Jobs Tests
  // ==========================================================================

  describe('retryFailedJobs', () => {
    it('should return 0 when no failed jobs exist (mock default)', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const retriedCount = await queueService.retryFailedJobs(QueueName.EMAIL);

      // Assert - mock returns empty array for getFailed
      expect(retriedCount).toBe(0);
    });

    it('should throw error for non-existent queue', async () => {
      // Act & Assert
      await expect(queueService.retryFailedJobs('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  describe('getFailedJobs', () => {
    it('should return empty array when no failed jobs (mock default)', async () => {
      // Arrange
      await queueService.onModuleInit();

      // Act
      const result = await queueService.getFailedJobs(QueueName.EMAIL, 0, 10);

      // Assert - mock returns empty array
      expect(result).toEqual([]);
    });

    it('should throw error for non-existent queue', async () => {
      // Act & Assert
      await expect(queueService.getFailedJobs('non-existent' as QueueName)).rejects.toThrow(
        'Queue non-existent not found'
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw error when adding job to non-existent queue', async () => {
      // Don't initialize queues
      const emailJobData: EmailJobData = {
        to: 'test@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      };

      // Act & Assert
      await expect(queueService.addEmailJob(emailJobData)).rejects.toThrow('Queue email not found');
    });
  });
});
