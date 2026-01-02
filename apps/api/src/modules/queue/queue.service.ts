import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import {
  QueueName,
  QueueJobOptions,
  QueueStats,
  JobPriority,
  JobData,
  JobResult,
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

/**
 * Queue Service
 *
 * Central service for managing BullMQ queues across the application.
 *
 * Features:
 * - Multiple queues for different job types
 * - Priority-based job processing
 * - Retry with exponential backoff
 * - Job scheduling (cron patterns)
 * - Queue monitoring and statistics
 * - Graceful shutdown
 *
 * @example
 * // Add a job to the email queue
 * await queueService.addEmailJob({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   template: 'welcome',
 *   context: { name: 'John' }
 * });
 *
 * @example
 * // Add a high priority payment job
 * await queueService.addPaymentJob(
 *   { paymentId: '123', action: 'process' },
 *   { priority: JobPriority.HIGH }
 * );
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();

  private readonly redisConfig: { host: string; port: number; password?: string };

  constructor(private readonly configService: ConfigService) {
    this.redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing queue service...');

    // Initialize all queues
    for (const queueName of Object.values(QueueName)) {
      await this.initializeQueue(queueName);
    }

    this.logger.log(`Initialized ${this.queues.size} queues`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down queue service...');

    // Close all workers gracefully
    for (const [name, worker] of this.workers.entries()) {
      this.logger.log(`Closing worker for queue: ${name}`);
      await worker.close();
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents.entries()) {
      this.logger.log(`Closing events for queue: ${name}`);
      await events.close();
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      this.logger.log(`Closing queue: ${name}`);
      await queue.close();
    }

    this.logger.log('Queue service shut down complete');
  }

  /**
   * Initialize a queue with its worker and events
   */
  private async initializeQueue(name: QueueName): Promise<void> {
    const queue = new Queue(name, {
      connection: this.redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 1000, // Keep last 1000 failed jobs
      },
    });

    const events = new QueueEvents(name, {
      connection: this.redisConfig,
    });

    // Set up event listeners
    events.on('completed', ({ jobId, returnvalue }) => {
      this.logger.debug(`Job ${jobId} completed in queue ${name}`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Job ${jobId} failed in queue ${name}: ${failedReason}`);
    });

    events.on('stalled', ({ jobId }) => {
      this.logger.warn(`Job ${jobId} stalled in queue ${name}`);
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, events);
  }

  /**
   * Register a worker for a specific queue
   */
  registerWorker<T extends JobData>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<JobResult>,
    options: {
      concurrency?: number;
      limiter?: { max: number; duration: number };
    } = {},
  ): void {
    const worker = new Worker<T>(
      queueName,
      async (job) => {
        const startTime = Date.now();
        try {
          const result = await processor(job);
          return {
            ...result,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          this.logger.error(`Job ${job.id} processing error: ${error}`);
          throw error;
        }
      },
      {
        connection: this.redisConfig,
        concurrency: options.concurrency || 5,
        limiter: options.limiter,
      },
    );

    worker.on('error', (err) => {
      this.logger.error(`Worker error in ${queueName}: ${err.message}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Registered worker for queue: ${queueName}`);
  }

  /**
   * Add a job to a queue
   */
  private async addJob<T extends JobData>(
    queueName: QueueName,
    data: T,
    options: QueueJobOptions = {},
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobOptions: JobsOptions = {
      priority: options.priority || JobPriority.NORMAL,
      delay: options.delay,
      attempts: options.attempts,
      backoff: options.backoff,
      removeOnComplete: options.removeOnComplete,
      removeOnFail: options.removeOnFail,
      jobId: options.jobId,
      repeat: options.repeat,
    };

    const job = await queue.add(queueName, data, jobOptions);
    this.logger.debug(`Added job ${job.id} to queue ${queueName}`);
    return job as Job<T>;
  }

  // ============================================
  // Queue-specific methods
  // ============================================

  /**
   * Add email job
   */
  async addEmailJob(data: EmailJobData, options?: QueueJobOptions): Promise<Job<EmailJobData>> {
    return this.addJob(QueueName.EMAIL, data, options);
  }

  /**
   * Add notification job
   */
  async addNotificationJob(
    data: NotificationJobData,
    options?: QueueJobOptions,
  ): Promise<Job<NotificationJobData>> {
    return this.addJob(QueueName.NOTIFICATION, data, options);
  }

  /**
   * Add payment job
   */
  async addPaymentJob(
    data: PaymentJobData,
    options?: QueueJobOptions,
  ): Promise<Job<PaymentJobData>> {
    return this.addJob(QueueName.PAYMENT, {
      ...data,
      createdAt: new Date(),
    }, {
      priority: JobPriority.HIGH,
      ...options,
    });
  }

  /**
   * Add ticket job
   */
  async addTicketJob(data: TicketJobData, options?: QueueJobOptions): Promise<Job<TicketJobData>> {
    return this.addJob(QueueName.TICKET, data, options);
  }

  /**
   * Add PDF generation job
   */
  async addPdfJob(data: PdfJobData, options?: QueueJobOptions): Promise<Job<PdfJobData>> {
    return this.addJob(QueueName.PDF, data, options);
  }

  /**
   * Add analytics job
   */
  async addAnalyticsJob(
    data: AnalyticsJobData,
    options?: QueueJobOptions,
  ): Promise<Job<AnalyticsJobData>> {
    return this.addJob(QueueName.ANALYTICS, data, {
      priority: JobPriority.LOW,
      ...options,
    });
  }

  /**
   * Add cashless job
   */
  async addCashlessJob(
    data: CashlessJobData,
    options?: QueueJobOptions,
  ): Promise<Job<CashlessJobData>> {
    return this.addJob(QueueName.CASHLESS, data, {
      priority: JobPriority.HIGH,
      ...options,
    });
  }

  /**
   * Add webhook job
   */
  async addWebhookJob(
    data: WebhookJobData,
    options?: QueueJobOptions,
  ): Promise<Job<WebhookJobData>> {
    return this.addJob(QueueName.WEBHOOK, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      ...options,
    });
  }

  /**
   * Add report job
   */
  async addReportJob(data: ReportJobData, options?: QueueJobOptions): Promise<Job<ReportJobData>> {
    return this.addJob(QueueName.REPORT, data, {
      priority: JobPriority.LOW,
      ...options,
    });
  }

  /**
   * Add export job
   */
  async addExportJob(data: ExportJobData, options?: QueueJobOptions): Promise<Job<ExportJobData>> {
    return this.addJob(QueueName.EXPORT, data, options);
  }

  /**
   * Add import job
   */
  async addImportJob(data: ImportJobData, options?: QueueJobOptions): Promise<Job<ImportJobData>> {
    return this.addJob(QueueName.IMPORT, data, options);
  }

  /**
   * Add maintenance job
   */
  async addMaintenanceJob(
    data: MaintenanceJobData,
    options?: QueueJobOptions,
  ): Promise<Job<MaintenanceJobData>> {
    return this.addJob(QueueName.MAINTENANCE, data, {
      priority: JobPriority.BACKGROUND,
      ...options,
    });
  }

  /**
   * Schedule a recurring job
   */
  async scheduleRecurringJob<T extends JobData>(
    queueName: QueueName,
    jobId: string,
    data: T,
    cronPattern: string,
  ): Promise<Job<T>> {
    return this.addJob(queueName, data, {
      jobId,
      repeat: { pattern: cronPattern },
    });
  }

  // ============================================
  // Queue management methods
  // ============================================

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    const isPaused = await queue.isPaused();

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Get all queues statistics
   */
  async getAllQueuesStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];
    for (const queueName of this.queues.keys()) {
      stats.push(await this.getQueueStats(queueName));
    }
    return stats;
  }

  /**
   * Get a specific job
   */
  async getJob<T extends JobData>(queueName: QueueName, jobId: string): Promise<Job<T> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    const job = await queue.getJob(jobId);
    return job as Job<T> | null;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.pause();
    this.logger.log(`Paused queue: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  /**
   * Clear all jobs from a queue
   */
  async clearQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    await queue.obliterate();
    this.logger.log(`Cleared queue: ${queueName}`);
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName: QueueName): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failed = await queue.getFailed();
    let retried = 0;

    for (const job of failed) {
      await job.retry();
      retried++;
    }

    this.logger.log(`Retried ${retried} failed jobs in queue: ${queueName}`);
    return retried;
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs<T extends JobData>(
    queueName: QueueName,
    start = 0,
    end = 50,
  ): Promise<Job<T>[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue.getFailed(start, end) as Promise<Job<T>[]>;
  }

  /**
   * Remove a job
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Removed job ${jobId} from queue ${queueName}`);
    }
  }
}
