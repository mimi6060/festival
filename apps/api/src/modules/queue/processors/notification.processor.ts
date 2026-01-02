import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueName, NotificationJobData, JobResult } from '../queue.types';
import { QueueService } from '../queue.service';

/**
 * Notification Queue Processor
 *
 * Processes notification jobs for push, in-app, and SMS notifications.
 */
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly queueService: QueueService) {}

  /**
   * Register the processor with the queue service
   */
  register(): void {
    this.queueService.registerWorker<NotificationJobData>(
      QueueName.NOTIFICATION,
      async (job) => this.process(job),
      { concurrency: 10 },
    );
    this.logger.log('Notification processor registered');
  }

  /**
   * Process a notification job
   */
  private async process(job: Job<NotificationJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing notification job ${job.id}: ${data.type} - ${data.title}`);

    try {
      await job.updateProgress(10);

      const results: Record<string, { success: boolean; count: number }> = {};

      // Process based on notification type
      switch (data.type) {
        case 'push':
          results.push = await this.sendPushNotification(data);
          break;
        case 'in-app':
          results.inApp = await this.sendInAppNotification(data);
          break;
        case 'sms':
          results.sms = await this.sendSmsNotification(data);
          break;
        case 'all':
          await job.updateProgress(30);
          results.push = await this.sendPushNotification(data);
          await job.updateProgress(50);
          results.inApp = await this.sendInAppNotification(data);
          await job.updateProgress(70);
          results.sms = await this.sendSmsNotification(data);
          break;
      }

      await job.updateProgress(100);

      this.logger.log(`Notification job ${job.id} completed`);
      return {
        success: true,
        data: {
          type: data.type,
          title: data.title,
          results,
        },
      };
    } catch (error) {
      this.logger.error(`Notification job ${job.id} failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send push notification via FCM/APNS
   */
  private async sendPushNotification(
    data: NotificationJobData,
  ): Promise<{ success: boolean; count: number }> {
    // In real implementation, use FCM service
    // await this.fcmService.sendToUsers(data.targetUserIds, {
    //   title: data.title,
    //   body: data.body,
    //   data: data.data,
    // });

    await new Promise((resolve) => setTimeout(resolve, 50));
    const count = data.targetUserIds?.length || 0;
    this.logger.debug(`Sent push notification to ${count} users`);
    return { success: true, count };
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    data: NotificationJobData,
  ): Promise<{ success: boolean; count: number }> {
    // In real implementation, store in database and emit via WebSocket
    // await this.notificationsService.create({
    //   userIds: data.targetUserIds,
    //   title: data.title,
    //   body: data.body,
    //   data: data.data,
    // });
    // this.eventsGateway.emitToUsers(data.targetUserIds, 'notification', { ... });

    await new Promise((resolve) => setTimeout(resolve, 30));
    const count = data.targetUserIds?.length || 0;
    this.logger.debug(`Sent in-app notification to ${count} users`);
    return { success: true, count };
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(
    data: NotificationJobData,
  ): Promise<{ success: boolean; count: number }> {
    // In real implementation, use SMS provider (Twilio, etc.)
    // await this.smsService.sendToUsers(data.targetUserIds, data.body);

    await new Promise((resolve) => setTimeout(resolve, 100));
    const count = data.targetUserIds?.length || 0;
    this.logger.debug(`Sent SMS notification to ${count} users`);
    return { success: true, count };
  }
}
