/**
 * Webhooks Module
 *
 * Provides outgoing webhook functionality for external integrations.
 *
 * Features:
 * - Webhook registration and management
 * - Event-to-webhook routing
 * - Delivery with exponential backoff retries
 * - HMAC-SHA256 payload signing
 * - Delivery history and monitoring
 *
 * @example
 * // Import in AppModule
 * @Module({
 *   imports: [WebhooksModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // Emit webhook events from services
 * @Injectable()
 * export class PaymentsService {
 *   constructor(private readonly webhookHelper: WebhookEventHelper) {}
 *
 *   async completePayment(payment: Payment) {
 *     // ... payment logic ...
 *     this.webhookHelper.emitPaymentCompleted({
 *       festivalId: payment.festivalId,
 *       paymentId: payment.id,
 *       userId: payment.userId,
 *       amount: payment.amount,
 *       currency: payment.currency,
 *       provider: 'stripe',
 *       completedAt: new Date(),
 *     });
 *   }
 * }
 */

import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookEventEmitter, WebhookEventHelper } from './webhook-event.emitter';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcard events for flexible event handling
      wildcard: false,
      // Keep event names delimiter simple
      delimiter: '.',
      // Don't add newListener events
      newListener: false,
      // Don't add removeListener events
      removeListener: false,
      // Maximum listeners per event
      maxListeners: 20,
      // Show verbose errors
      verboseMemoryLeak: true,
      // Ignore unhandled errors
      ignoreErrors: false,
    }),
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookDeliveryService,
    WebhookDispatcherService,
    WebhookEventEmitter,
    WebhookEventHelper,
  ],
  exports: [
    WebhooksService,
    WebhookDeliveryService,
    WebhookDispatcherService,
    WebhookEventHelper,
  ],
})
export class WebhooksModule {}
