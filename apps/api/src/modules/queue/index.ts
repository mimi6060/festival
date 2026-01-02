/**
 * Queue Module
 *
 * BullMQ-based job queue system for asynchronous task processing.
 *
 * Available queues:
 * - EMAIL: Email sending
 * - NOTIFICATION: Push/in-app/SMS notifications
 * - PAYMENT: Payment processing
 * - TICKET: Ticket generation
 * - PDF: PDF generation
 * - ANALYTICS: Analytics processing
 * - CASHLESS: Cashless transactions
 * - WEBHOOK: Webhook delivery
 * - REPORT: Report generation
 * - EXPORT: Data export
 * - IMPORT: Data import
 * - MAINTENANCE: Cleanup tasks
 *
 * @example
 * import { QueueService, QueueName, JobPriority } from './modules/queue';
 *
 * // Add email job
 * await queueService.addEmailJob({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   template: 'welcome',
 *   context: { name: 'John' }
 * });
 *
 * // Add high priority payment job
 * await queueService.addPaymentJob(
 *   { paymentId: '123', action: 'process' },
 *   { priority: JobPriority.HIGH }
 * );
 *
 * // Schedule recurring job
 * await queueService.scheduleRecurringJob(
 *   QueueName.MAINTENANCE,
 *   'daily-cleanup',
 *   { task: 'cleanup' },
 *   '0 3 * * *' // Every day at 3 AM
 * );
 */

// Types
export * from './queue.types';

// Service
export { QueueService } from './queue.service';

// Module
export { QueueModule } from './queue.module';

// Controller
export { QueueController } from './queue.controller';

// Processors
export * from './processors';
