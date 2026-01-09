/**
 * Webhook Dispatcher Service
 *
 * Central service for dispatching webhook events:
 * - Queues webhook deliveries for async processing
 * - Handles event-to-webhook routing
 * - Manages payload construction
 */

import { Injectable, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService, DeliveryPayload } from './webhook-delivery.service';
import { WebhookEvent } from './webhook-events.enum';
import { QueueService } from '../queue/queue.service';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface WebhookEventData {
  /** Festival ID for multi-tenant context */
  festivalId: string;
  /** The event type */
  event: WebhookEvent;
  /** The event payload data */
  data: Record<string, unknown>;
  /** Optional idempotency key */
  idempotencyKey?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly deliveryService: WebhookDeliveryService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Dispatch a webhook event to all subscribed webhooks
   *
   * This is the main entry point for triggering webhook events.
   * It finds all webhooks subscribed to the event and queues deliveries.
   */
  async dispatch(eventData: WebhookEventData): Promise<void> {
    const { festivalId, event, data, idempotencyKey } = eventData;

    try {
      // Find all active webhooks subscribed to this event
      const webhooks = await this.webhooksService.findWebhooksForEvent(
        festivalId,
        event,
      );

      if (webhooks.length === 0) {
        this.logger.debug(`No webhooks subscribed to ${event} for festival ${festivalId}`);
        return;
      }

      this.logger.debug(
        `Dispatching ${event} to ${webhooks.length} webhook(s) for festival ${festivalId}`,
      );

      // Create delivery payload
      const payload = this.buildPayload(event, data, festivalId, idempotencyKey);

      // Queue deliveries for each webhook
      for (const webhook of webhooks) {
        await this.queueDelivery(webhook.id, webhook.url, webhook.secret, webhook.headers, event, payload);
      }
    } catch (error) {
      this.logger.error(`Failed to dispatch webhook event ${event}: ${error}`);
      // Don't throw - webhook delivery failures shouldn't break the main flow
    }
  }

  /**
   * Dispatch multiple events at once (for batch operations)
   */
  async dispatchBatch(events: WebhookEventData[]): Promise<void> {
    for (const eventData of events) {
      await this.dispatch(eventData);
    }
  }

  /**
   * Build the webhook payload
   */
  private buildPayload(
    event: WebhookEvent,
    data: Record<string, unknown>,
    festivalId: string,
    idempotencyKey?: string,
  ): DeliveryPayload {
    return {
      id: idempotencyKey || uuidv4(),
      event,
      timestamp: new Date().toISOString(),
      data,
      festivalId,
    };
  }

  /**
   * Queue a webhook delivery for async processing
   */
  private async queueDelivery(
    webhookId: string,
    url: string,
    secret: string,
    headers: Record<string, string> | null,
    event: WebhookEvent,
    payload: DeliveryPayload,
  ): Promise<void> {
    try {
      // Create delivery record
      const deliveryId = await this.deliveryService.createDelivery(
        webhookId,
        event,
        payload,
      );

      // Queue for async processing
      await this.queueService.addWebhookJob({
        url,
        payload: payload as unknown as Record<string, unknown>,
        headers: headers || undefined,
        eventType: event,
        metadata: {
          webhookId,
          deliveryId,
          secret,
        },
      });

      this.logger.debug(`Queued webhook delivery ${deliveryId} for ${event}`);
    } catch (error) {
      this.logger.error(`Failed to queue webhook delivery: ${error}`);
    }
  }

  /**
   * Process a queued webhook delivery
   * Called by the webhook queue processor
   */
  async processQueuedDelivery(
    deliveryId: string,
    webhookId: string,
    url: string,
    secret: string,
    headers?: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.deliveryService.executeDelivery(deliveryId, {
        id: webhookId,
        url,
        secret,
        headers,
      });

      return {
        success: result.success,
        error: result.errorMessage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process delivery ${deliveryId}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process pending retries
   * Should be called periodically by a scheduled job
   */
  async processPendingRetries(): Promise<number> {
    const pendingRetries = await this.deliveryService.getPendingRetries(50);

    if (pendingRetries.length === 0) {
      return 0;
    }

    this.logger.debug(`Processing ${pendingRetries.length} pending retries`);

    let processed = 0;
    for (const retry of pendingRetries) {
      await this.deliveryService.executeDelivery(retry.deliveryId, {
        id: retry.webhookId,
        url: retry.url,
        secret: retry.secret,
        headers: retry.headers || undefined,
      });
      processed++;
    }

    return processed;
  }

  // ============================================================================
  // Helper Methods for Common Events
  // ============================================================================

  /**
   * Dispatch a ticket purchased event
   */
  async dispatchTicketPurchased(
    festivalId: string,
    data: {
      ticketId: string;
      userId: string;
      categoryId: string;
      categoryName: string;
      price: number;
      currency: string;
      purchasedAt: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.TICKET_PURCHASED,
      data,
    });
  }

  /**
   * Dispatch a ticket validated event
   */
  async dispatchTicketValidated(
    festivalId: string,
    data: {
      ticketId: string;
      userId: string;
      validatedAt: string;
      zoneId?: string;
      zoneName?: string;
      staffId?: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.TICKET_VALIDATED,
      data,
    });
  }

  /**
   * Dispatch a ticket refunded event
   */
  async dispatchTicketRefunded(
    festivalId: string,
    data: {
      ticketId: string;
      userId: string;
      refundedAt: string;
      refundAmount: number;
      currency: string;
      reason?: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.TICKET_REFUNDED,
      data,
    });
  }

  /**
   * Dispatch a payment completed event
   */
  async dispatchPaymentCompleted(
    festivalId: string,
    data: {
      paymentId: string;
      userId: string;
      amount: number;
      currency: string;
      provider: string;
      providerPaymentId?: string;
      completedAt: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.PAYMENT_COMPLETED,
      data,
    });
  }

  /**
   * Dispatch a payment failed event
   */
  async dispatchPaymentFailed(
    festivalId: string,
    data: {
      paymentId: string;
      userId: string;
      amount: number;
      currency: string;
      provider: string;
      failedAt: string;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.PAYMENT_FAILED,
      data,
    });
  }

  /**
   * Dispatch a payment refunded event
   */
  async dispatchPaymentRefunded(
    festivalId: string,
    data: {
      paymentId: string;
      userId: string;
      refundAmount: number;
      currency: string;
      refundedAt: string;
      reason?: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.PAYMENT_REFUNDED,
      data,
    });
  }

  /**
   * Dispatch a cashless topup event
   */
  async dispatchCashlessTopup(
    festivalId: string,
    data: {
      accountId: string;
      userId: string;
      amount: number;
      currency: string;
      balanceAfter: number;
      transactionId: string;
      toppedUpAt: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.CASHLESS_TOPUP,
      data,
    });
  }

  /**
   * Dispatch a cashless payment event
   */
  async dispatchCashlessPayment(
    festivalId: string,
    data: {
      accountId: string;
      userId: string;
      amount: number;
      currency: string;
      balanceAfter: number;
      transactionId: string;
      vendorId?: string;
      vendorName?: string;
      paidAt: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.CASHLESS_PAYMENT,
      data,
    });
  }

  /**
   * Dispatch a festival updated event
   */
  async dispatchFestivalUpdated(
    festivalId: string,
    data: {
      name: string;
      status: string;
      updatedFields: string[];
      updatedAt: string;
      updatedBy?: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.FESTIVAL_UPDATED,
      data,
    });
  }

  /**
   * Dispatch a festival published event
   */
  async dispatchFestivalPublished(
    festivalId: string,
    data: {
      name: string;
      publishedAt: string;
      publishedBy?: string;
      startDate: string;
      endDate: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.FESTIVAL_PUBLISHED,
      data,
    });
  }

  /**
   * Dispatch a user registered event
   */
  async dispatchUserRegistered(
    festivalId: string,
    data: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      registeredAt: string;
    },
  ): Promise<void> {
    await this.dispatch({
      festivalId,
      event: WebhookEvent.USER_REGISTERED,
      data,
    });
  }
}
