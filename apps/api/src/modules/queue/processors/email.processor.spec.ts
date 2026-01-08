/**
 * Email Processor Unit Tests
 *
 * Comprehensive tests for email queue processor including:
 * - Worker registration
 * - Email processing with various templates
 * - Validation of email data
 * - Error handling
 * - Progress updates
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';
import { QueueService } from '../queue.service';
import { QueueName, EmailJobData } from '../queue.types';

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

describe('EmailProcessor', () => {
  let emailProcessor: EmailProcessor;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    emailProcessor = module.get<EmailProcessor>(EmailProcessor);
    queueService = module.get(QueueService);
  });

  // ==========================================================================
  // Registration Tests
  // ==========================================================================

  describe('register', () => {
    it('should register the worker with the queue service', () => {
      // Act
      emailProcessor.register();

      // Assert
      expect(queueService.registerWorker).toHaveBeenCalledWith(
        QueueName.EMAIL,
        expect.any(Function),
        { concurrency: 5 },
      );
    });

    it('should register with EMAIL queue name', () => {
      // Act
      emailProcessor.register();

      // Assert
      expect(queueService.registerWorker).toHaveBeenCalledWith(
        'email',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // Email Processing Tests
  // ==========================================================================

  describe('process', () => {
    let processorFunction: (job: MockJob<EmailJobData>) => Promise<unknown>;

    beforeEach(() => {
      // Register the processor and capture the function
      emailProcessor.register();
      processorFunction = mockQueueService.registerWorker.mock.calls[0][1];
    });

    it('should successfully process a valid email job', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Welcome!',
        template: 'welcome',
        context: { name: 'John' },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          sentTo: 'user@example.com',
          subject: 'Welcome!',
          template: 'welcome',
        },
      });
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should process email with multiple recipients', async () => {
      // Arrange
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const mockJob = createMockJob({
        to: recipients,
        subject: 'Newsletter',
        template: 'newsletter',
        context: { month: 'January' },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          sentTo: recipients,
          subject: 'Newsletter',
          template: 'newsletter',
        },
      });
    });

    it('should process email with attachments', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Your Ticket',
        template: 'ticket',
        context: { ticketId: 'TKT-001' },
        attachments: [
          { filename: 'ticket.pdf', path: '/tmp/ticket.pdf' },
        ],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sentTo: 'user@example.com',
          template: 'ticket',
        }),
      });
    });

    it('should process email with CC and BCC', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Important Notice',
        template: 'notice',
        context: {},
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc@example.com'],
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sentTo: 'user@example.com',
        }),
      });
    });

    it('should process email with replyTo', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Support Response',
        template: 'support',
        context: { ticketNumber: 'SUP-001' },
        replyTo: 'support@example.com',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sentTo: 'user@example.com',
        }),
      });
    });

    // ========================================================================
    // Validation Tests
    // ========================================================================

    it('should fail when "to" field is missing', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: '',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Missing required email fields: to, subject, or template',
      });
    });

    it('should fail when "subject" field is missing', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: '',
        template: 'test',
        context: {},
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Missing required email fields: to, subject, or template',
      });
    });

    it('should fail when "template" field is missing', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Test',
        template: '',
        context: {},
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Missing required email fields: to, subject, or template',
      });
    });

    // ========================================================================
    // Template Processing Tests
    // ========================================================================

    it('should process welcome email template', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'newuser@example.com',
        subject: 'Welcome to Festival App!',
        template: 'welcome',
        context: {
          name: 'Alice',
          activationLink: 'https://festival.app/activate/token123',
        },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          sentTo: 'newuser@example.com',
          subject: 'Welcome to Festival App!',
          template: 'welcome',
        },
      });
    });

    it('should process password reset template', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Password Reset Request',
        template: 'password-reset',
        context: {
          resetLink: 'https://festival.app/reset/token456',
          expiresIn: '24 hours',
        },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          template: 'password-reset',
        }),
      });
    });

    it('should process order confirmation template', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'buyer@example.com',
        subject: 'Order Confirmation #12345',
        template: 'order-confirmation',
        context: {
          orderId: '12345',
          items: [
            { name: 'VIP Ticket', quantity: 2, price: 150 },
          ],
          total: 300,
        },
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          template: 'order-confirmation',
        }),
      });
    });

    // ========================================================================
    // Progress Update Tests
    // ========================================================================

    it('should update progress at correct checkpoints', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      // Act
      await processorFunction(mockJob);

      // Assert - verify progress updates in order
      const progressCalls = mockJob.updateProgress.mock.calls;
      expect(progressCalls[0][0]).toBe(10);  // Start
      expect(progressCalls[1][0]).toBe(30);  // After validation
      expect(progressCalls[2][0]).toBe(100); // Complete
    });

    // ========================================================================
    // Job Metadata Tests
    // ========================================================================

    it('should handle job with userId', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
        userId: 'user-123',
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
        to: 'user@example.com',
        subject: 'Festival Update',
        template: 'festival-update',
        context: { festivalName: 'Summer Fest 2024' },
        festivalId: 'festival-123',
      });

      // Act
      const result = await processorFunction(mockJob);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.any(Object),
      });
    });

    it('should handle job with metadata', async () => {
      // Arrange
      const mockJob = createMockJob({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
        metadata: { source: 'api', campaign: 'summer2024' },
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

function createMockJob(data: EmailJobData): MockJob<EmailJobData> {
  return {
    id: 'job-' + Math.random().toString(36).substr(2, 9),
    data,
    updateProgress: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };
}
