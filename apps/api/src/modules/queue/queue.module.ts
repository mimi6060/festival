import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor, NotificationProcessor } from './processors';

/**
 * Queue Module
 *
 * Provides BullMQ-based job queue functionality for the application.
 *
 * Features:
 * - Multiple queues for different job types (email, notification, payment, etc.)
 * - Priority-based job processing
 * - Retry with exponential backoff
 * - Job scheduling with cron patterns
 * - Queue monitoring via admin endpoints
 * - Graceful shutdown handling
 *
 * Dependencies:
 * - Redis for job storage and queue management
 * - BullMQ for queue processing
 *
 * @example
 * // Import in AppModule
 * @Module({
 *   imports: [QueueModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // Use in a service
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly queueService: QueueService) {}
 *
 *   async sendWelcomeEmail(user: User) {
 *     await this.queueService.addEmailJob({
 *       to: user.email,
 *       subject: 'Welcome to Festival Platform!',
 *       template: 'welcome',
 *       context: { name: user.firstName },
 *     });
 *   }
 * }
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [QueueController],
  providers: [
    QueueService,
    EmailProcessor,
    NotificationProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule implements OnModuleInit {
  constructor(
    private readonly emailProcessor: EmailProcessor,
    private readonly notificationProcessor: NotificationProcessor,
  ) {}

  /**
   * Register all processors when module initializes
   */
  onModuleInit(): void {
    // Register job processors
    // Uncomment when Redis is available
    // this.emailProcessor.register();
    // this.notificationProcessor.register();
  }
}
