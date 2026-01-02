import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueName, EmailJobData, JobResult } from '../queue.types';
import { QueueService } from '../queue.service';

/**
 * Email Queue Processor
 *
 * Processes email jobs from the email queue.
 * Integrates with the EmailService to send emails.
 *
 * @example
 * // Register in module
 * @Module({
 *   providers: [EmailProcessor],
 * })
 * export class QueueModule implements OnModuleInit {
 *   constructor(
 *     private queueService: QueueService,
 *     private emailProcessor: EmailProcessor,
 *   ) {}
 *
 *   onModuleInit() {
 *     this.emailProcessor.register();
 *   }
 * }
 */
@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly queueService: QueueService) {}

  /**
   * Register the processor with the queue service
   */
  register(): void {
    this.queueService.registerWorker<EmailJobData>(
      QueueName.EMAIL,
      async (job) => this.process(job),
      { concurrency: 5 },
    );
    this.logger.log('Email processor registered');
  }

  /**
   * Process an email job
   */
  private async process(job: Job<EmailJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing email job ${job.id}: ${data.subject} to ${data.to}`);

    try {
      // Update progress
      await job.updateProgress(10);

      // Validate email data
      if (!data.to || !data.subject || !data.template) {
        throw new Error('Missing required email fields: to, subject, or template');
      }

      await job.updateProgress(30);

      // In a real implementation, this would call the EmailService
      // await this.emailService.send({
      //   to: data.to,
      //   subject: data.subject,
      //   template: data.template,
      //   context: data.context,
      //   attachments: data.attachments,
      // });

      // Simulate email sending
      await this.simulateEmailSend(data);

      await job.updateProgress(100);

      this.logger.log(`Email job ${job.id} completed successfully`);
      return {
        success: true,
        data: {
          sentTo: data.to,
          subject: data.subject,
          template: data.template,
        },
      };
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Simulate email sending (for development/testing)
   */
  private async simulateEmailSend(data: EmailJobData): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.debug(`Simulated email sent to ${data.to}`);
  }
}
