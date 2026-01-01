import { Process, Processor, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PushService } from './push.service';
import { NotificationType } from '@prisma/client';

export interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
}

export interface BroadcastJobData {
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
}

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly pushService: PushService) {}

  /**
   * Process individual push notification jobs
   */
  @Process('send-push')
  async handleSendPush(job: Job<NotificationJobData>): Promise<void> {
    const { userId, title, body, data } = job.data;

    this.logger.debug(`Processing push notification for user ${userId}`);

    const result = await this.pushService.sendPushToUser(
      userId,
      title,
      body,
      data,
    );

    if (!result.success) {
      this.logger.warn(
        `Failed to send push to user ${userId}: ${result.error}`,
      );
      // Don't throw - we don't want to retry if the token is invalid
      if (result.error !== 'No push token registered') {
        throw new Error(result.error);
      }
    }
  }

  /**
   * Process broadcast push notification jobs
   */
  @Process('broadcast-push')
  async handleBroadcastPush(job: Job<BroadcastJobData>): Promise<void> {
    const { userIds, title, body, data } = job.data;

    this.logger.debug(`Processing broadcast push to ${userIds.length} users`);

    // Process in batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await this.pushService.sendPushToUsers(batch, title, body, data);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Process topic-based push notification
   */
  @Process('topic-push')
  async handleTopicPush(
    job: Job<{ topic: string; title: string; body: string; data?: Record<string, string> }>,
  ): Promise<void> {
    const { topic, title, body, data } = job.data;

    this.logger.debug(`Processing topic push to ${topic}`);

    const result = await this.pushService.sendToTopic(topic, title, body, data);

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Handle scheduled notification cleanup
   */
  @Process('cleanup-old-notifications')
  async handleCleanup(job: Job<{ daysOld: number }>): Promise<void> {
    this.logger.log('Starting notification cleanup job');
    // This will be called from the NotificationsService
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.debug(`Job ${job.id} completed: ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed: ${job.name}`, error.stack);
  }
}
