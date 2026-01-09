/**
 * Webhook Delivery Service
 *
 * Handles webhook deliveries including:
 * - HTTP delivery to webhook endpoints
 * - Retry logic with exponential backoff
 * - Delivery status tracking
 * - Response logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDeliveryStatus } from '@prisma/client';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface DeliveryPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  festivalId: string;
}

export interface DeliveryResult {
  success: boolean;
  responseCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  duration?: number;
  errorMessage?: string;
}

export interface WebhookTarget {
  id: string;
  url: string;
  secret: string;
  headers?: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

const DELIVERY_CONFIG = {
  /** Maximum attempts per delivery */
  MAX_ATTEMPTS: 5,
  /** Initial retry delay in milliseconds */
  INITIAL_RETRY_DELAY: 5000, // 5 seconds
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 3600000, // 1 hour
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000, // 30 seconds
  /** Maximum response body length to store */
  MAX_RESPONSE_LENGTH: 1024,
  /** Number of consecutive failures before disabling webhook */
  FAILURE_THRESHOLD: 10,
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new delivery record
   */
  async createDelivery(
    webhookId: string,
    event: string,
    payload: DeliveryPayload,
  ): Promise<string> {
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as any,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        maxAttempts: DELIVERY_CONFIG.MAX_ATTEMPTS,
      },
    });

    this.logger.debug(`Delivery created: ${delivery.id} for webhook ${webhookId}`);

    return delivery.id;
  }

  /**
   * Execute a webhook delivery
   */
  async executeDelivery(
    deliveryId: string,
    webhook: WebhookTarget,
  ): Promise<DeliveryResult> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      return { success: false, errorMessage: 'Delivery not found' };
    }

    // Update attempt count
    const newAttemptCount = delivery.attempts + 1;
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: newAttemptCount,
        lastAttemptAt: new Date(),
        status: WebhookDeliveryStatus.RETRYING,
      },
    });

    // Execute HTTP request
    const result = await this.sendWebhook(
      webhook.url,
      delivery.payload as Record<string, unknown>,
      webhook.secret,
      webhook.headers,
    );

    // Update delivery based on result
    if (result.success) {
      await this.markDeliverySuccess(deliveryId, result);
      await this.resetWebhookFailureCount(webhook.id);
    } else {
      if (newAttemptCount >= delivery.maxAttempts) {
        await this.markDeliveryFailed(deliveryId, result);
        await this.incrementWebhookFailureCount(webhook.id);
      } else {
        await this.scheduleRetry(deliveryId, newAttemptCount, result);
      }
    }

    return result;
  }

  /**
   * Send HTTP request to webhook endpoint
   */
  private async sendWebhook(
    url: string,
    payload: Record<string, unknown>,
    secret: string,
    customHeaders?: Record<string, string>,
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Festival-Webhook/1.0',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...customHeaders,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        DELIVERY_CONFIG.REQUEST_TIMEOUT,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await this.safeReadResponseBody(response);
      const responseHeaders = this.extractResponseHeaders(response);

      // Consider 2xx status codes as success
      const success = response.status >= 200 && response.status < 300;

      this.logger.debug(
        `Webhook delivery to ${url}: ${response.status} (${duration}ms)`,
      );

      return {
        success,
        responseCode: response.status,
        responseBody,
        responseHeaders,
        duration,
        errorMessage: success ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.warn(`Webhook delivery failed to ${url}: ${errorMessage}`);

      return {
        success: false,
        duration,
        errorMessage,
      };
    }
  }

  /**
   * Generate HMAC-SHA256 signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verify a webhook signature (for external callers to verify our webhooks)
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    tolerance = 300, // 5 minutes
  ): boolean {
    try {
      const parts = signature.split(',');
      const timestampPart = parts.find((p) => p.startsWith('t='));
      const signaturePart = parts.find((p) => p.startsWith('v1='));

      if (!timestampPart || !signaturePart) {
        return false;
      }

      const timestamp = parseInt(timestampPart.slice(2), 10);
      const expectedSignature = signaturePart.slice(3);

      // Check timestamp is within tolerance
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > tolerance) {
        return false;
      }

      // Calculate expected signature
      const signaturePayload = `${timestamp}.${payload}`;
      const calculatedSignature = crypto
        .createHmac('sha256', secret)
        .update(signaturePayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(calculatedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Mark delivery as successful
   */
  private async markDeliverySuccess(
    deliveryId: string,
    result: DeliveryResult,
  ): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.SUCCESS,
        responseCode: result.responseCode,
        responseBody: result.responseBody,
        responseHeaders: result.responseHeaders as any,
        duration: result.duration,
        completedAt: new Date(),
        nextRetryAt: null,
        errorMessage: null,
      },
    });
  }

  /**
   * Mark delivery as permanently failed
   */
  private async markDeliveryFailed(
    deliveryId: string,
    result: DeliveryResult,
  ): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        responseCode: result.responseCode,
        responseBody: result.responseBody,
        responseHeaders: result.responseHeaders as any,
        duration: result.duration,
        errorMessage: result.errorMessage,
        nextRetryAt: null,
      },
    });
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    deliveryId: string,
    attemptNumber: number,
    result: DeliveryResult,
  ): Promise<void> {
    // Calculate exponential backoff: 5s, 10s, 20s, 40s, 80s, ...
    const delay = Math.min(
      DELIVERY_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber - 1),
      DELIVERY_CONFIG.MAX_RETRY_DELAY,
    );
    const nextRetryAt = new Date(Date.now() + delay);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.RETRYING,
        responseCode: result.responseCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        duration: result.duration,
        nextRetryAt,
      },
    });

    this.logger.debug(
      `Scheduled retry ${attemptNumber} for delivery ${deliveryId} at ${nextRetryAt.toISOString()}`,
    );
  }

  /**
   * Reset webhook failure count on successful delivery
   */
  private async resetWebhookFailureCount(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: 0,
        lastTriggeredAt: new Date(),
      },
    });
  }

  /**
   * Increment webhook failure count and disable if threshold reached
   */
  private async incrementWebhookFailureCount(webhookId: string): Promise<void> {
    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });

    if (webhook.failureCount >= DELIVERY_CONFIG.FAILURE_THRESHOLD) {
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive: false },
      });
      this.logger.warn(
        `Webhook ${webhookId} disabled after ${webhook.failureCount} consecutive failures`,
      );
    }
  }

  /**
   * Get pending retries that are due
   */
  async getPendingRetries(limit = 100): Promise<
    Array<{
      deliveryId: string;
      webhookId: string;
      url: string;
      secret: string;
      headers: Record<string, string> | null;
    }>
  > {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: WebhookDeliveryStatus.RETRYING,
        nextRetryAt: { lte: new Date() },
        webhook: { isActive: true },
      },
      include: {
        webhook: {
          select: { id: true, url: true, secret: true, headers: true },
        },
      },
      take: limit,
      orderBy: { nextRetryAt: 'asc' },
    });

    return deliveries.map((d) => ({
      deliveryId: d.id,
      webhookId: d.webhook.id,
      url: d.webhook.url,
      secret: d.webhook.secret,
      headers: d.webhook.headers as Record<string, string> | null,
    }));
  }

  /**
   * Retry a specific delivery manually
   */
  async retryDelivery(deliveryId: string): Promise<DeliveryResult> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: {
          select: { id: true, url: true, secret: true, headers: true, isActive: true },
        },
      },
    });

    if (!delivery) {
      return { success: false, errorMessage: 'Delivery not found' };
    }

    if (!delivery.webhook.isActive) {
      return { success: false, errorMessage: 'Webhook is disabled' };
    }

    // Reset attempt count for manual retry
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: 0,
        status: WebhookDeliveryStatus.PENDING,
        errorMessage: null,
      },
    });

    return this.executeDelivery(deliveryId, {
      id: delivery.webhook.id,
      url: delivery.webhook.url,
      secret: delivery.webhook.secret,
      headers: delivery.webhook.headers as Record<string, string> | undefined,
    });
  }

  /**
   * Safely read response body with size limit
   */
  private async safeReadResponseBody(response: Response): Promise<string> {
    try {
      const text = await response.text();
      return text.slice(0, DELIVERY_CONFIG.MAX_RESPONSE_LENGTH);
    } catch {
      return '';
    }
  }

  /**
   * Extract relevant headers from response
   */
  private extractResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const relevantHeaders = ['content-type', 'x-request-id', 'x-trace-id'];

    for (const header of relevantHeaders) {
      const value = response.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    return headers;
  }

  /**
   * Extract error message from error object
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'Request timeout';
      }
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Clean up old delivery records
   */
  async cleanupOldDeliveries(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: [WebhookDeliveryStatus.SUCCESS, WebhookDeliveryStatus.FAILED] },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old webhook deliveries`);

    return result.count;
  }
}
