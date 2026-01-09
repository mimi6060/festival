/**
 * Webhooks Service
 *
 * Handles webhook registration and management including:
 * - CRUD operations for webhooks
 * - Secret generation
 * - Event subscription management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WebhookDeliveryStatus } from '@prisma/client';
import * as crypto from 'crypto';

import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookQueryDto,
  WebhookDeliveryQueryDto,
} from './dto';
import { WebhookEvent, isValidWebhookEvent } from './webhook-events.enum';

import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/exceptions/base.exception';

// ============================================================================
// Types
// ============================================================================

export interface WebhookEntity {
  id: string;
  festivalId: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  headers: Record<string, string> | null;
  description: string | null;
  createdById: string | null;
  lastTriggeredAt: Date | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDeliveryEntity {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseCode: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  errorMessage: string | null;
  duration: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new webhook
   */
  async create(
    festivalId: string,
    dto: CreateWebhookDto,
    userId?: string,
  ): Promise<WebhookEntity> {
    // Validate all events
    for (const event of dto.events) {
      if (!isValidWebhookEvent(event)) {
        throw new ValidationException('Invalid webhook event', [
          { field: 'events', message: `Invalid event: ${event}`, value: event },
        ]);
      }
    }

    // Check for duplicate URL for this festival
    const existing = await this.prisma.webhook.findUnique({
      where: {
        festivalId_url: {
          festivalId,
          url: dto.url,
        },
      },
    });

    if (existing) {
      throw ConflictException.webhookUrl(dto.url);
    }

    // Generate a secure secret for HMAC signing
    const secret = this.generateSecret();

    const webhook = await this.prisma.webhook.create({
      data: {
        festivalId,
        name: dto.name,
        url: dto.url,
        secret,
        events: dto.events,
        isActive: dto.isActive ?? true,
        headers: dto.headers ?? undefined,
        description: dto.description ?? null,
        createdById: userId ?? null,
      },
    });

    this.logger.log(
      `Webhook created: ${webhook.id} for festival ${festivalId} (${dto.events.length} events)`,
    );

    return this.mapToEntity(webhook);
  }

  /**
   * Get all webhooks for a festival
   */
  async findAll(
    festivalId: string,
    query: WebhookQueryDto,
  ): Promise<PaginatedResult<WebhookEntity>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.WebhookWhereInput = { festivalId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.event) {
      where.events = { has: query.event };
    }

    const [webhooks, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhook.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: webhooks.map(this.mapToEntity),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Get a webhook by ID
   */
  async findOne(id: string, festivalId: string): Promise<WebhookEntity> {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, festivalId },
    });

    if (!webhook) {
      throw NotFoundException.webhook(id);
    }

    return this.mapToEntity(webhook);
  }

  /**
   * Update a webhook
   */
  async update(
    id: string,
    festivalId: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookEntity> {
    // Check webhook exists
    await this.findOne(id, festivalId);

    // Validate events if provided
    if (dto.events) {
      for (const event of dto.events) {
        if (!isValidWebhookEvent(event)) {
          throw new ValidationException('Invalid webhook event', [
            { field: 'events', message: `Invalid event: ${event}`, value: event },
          ]);
        }
      }
    }

    // Check for URL conflict if URL is being changed
    if (dto.url) {
      const existing = await this.prisma.webhook.findFirst({
        where: {
          festivalId,
          url: dto.url,
          id: { not: id },
        },
      });

      if (existing) {
        throw ConflictException.webhookUrl(dto.url);
      }
    }

    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        isActive: dto.isActive,
        headers: dto.headers,
        description: dto.description,
      },
    });

    this.logger.log(`Webhook updated: ${id}`);

    return this.mapToEntity(webhook);
  }

  /**
   * Delete a webhook
   */
  async delete(id: string, festivalId: string): Promise<void> {
    // Check webhook exists
    await this.findOne(id, festivalId);

    await this.prisma.webhook.delete({
      where: { id },
    });

    this.logger.log(`Webhook deleted: ${id}`);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id: string, festivalId: string): Promise<string> {
    // Check webhook exists
    await this.findOne(id, festivalId);

    const newSecret = this.generateSecret();

    await this.prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    this.logger.log(`Webhook secret regenerated: ${id}`);

    return newSecret;
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(
    webhookId: string,
    festivalId: string,
    query: WebhookDeliveryQueryDto,
  ): Promise<PaginatedResult<WebhookDeliveryEntity>> {
    // Verify webhook belongs to festival
    await this.findOne(webhookId, festivalId);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.WebhookDeliveryWhereInput = { webhookId };

    if (query.status) {
      where.status = query.status as WebhookDeliveryStatus;
    }

    if (query.event) {
      where.event = query.event;
    }

    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: deliveries.map(this.mapDeliveryToEntity),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Get a specific delivery
   */
  async getDelivery(
    deliveryId: string,
    webhookId: string,
    festivalId: string,
  ): Promise<WebhookDeliveryEntity> {
    // Verify webhook belongs to festival
    await this.findOne(webhookId, festivalId);

    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, webhookId },
    });

    if (!delivery) {
      throw NotFoundException.webhookDelivery(deliveryId);
    }

    return this.mapDeliveryToEntity(delivery);
  }

  /**
   * Get webhook statistics for a festival
   */
  async getStats(festivalId: string): Promise<{
    totalWebhooks: number;
    activeWebhooks: number;
    deliveriesLast24h: number;
    successfulDeliveriesLast24h: number;
    failedDeliveriesLast24h: number;
    successRate: number;
  }> {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const [
      totalWebhooks,
      activeWebhooks,
      deliveryStats,
    ] = await Promise.all([
      this.prisma.webhook.count({ where: { festivalId } }),
      this.prisma.webhook.count({ where: { festivalId, isActive: true } }),
      this.prisma.webhookDelivery.groupBy({
        by: ['status'],
        where: {
          webhook: { festivalId },
          createdAt: { gte: yesterday },
        },
        _count: true,
      }),
    ]);

    const deliveriesLast24h = deliveryStats.reduce((sum, s) => sum + s._count, 0);
    const successfulDeliveriesLast24h =
      deliveryStats.find((s) => s.status === WebhookDeliveryStatus.SUCCESS)?._count ?? 0;
    const failedDeliveriesLast24h =
      deliveryStats.find((s) => s.status === WebhookDeliveryStatus.FAILED)?._count ?? 0;

    const successRate =
      deliveriesLast24h > 0
        ? Math.round((successfulDeliveriesLast24h / deliveriesLast24h) * 10000) / 100
        : 100;

    return {
      totalWebhooks,
      activeWebhooks,
      deliveriesLast24h,
      successfulDeliveriesLast24h,
      failedDeliveriesLast24h,
      successRate,
    };
  }

  /**
   * Find all active webhooks subscribed to a specific event
   */
  async findWebhooksForEvent(
    festivalId: string,
    event: WebhookEvent,
  ): Promise<WebhookEntity[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        festivalId,
        isActive: true,
        events: { has: event },
      },
    });

    return webhooks.map(this.mapToEntity);
  }

  /**
   * Update webhook last triggered timestamp
   */
  async updateLastTriggered(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { lastTriggeredAt: new Date() },
    });
  }

  /**
   * Increment failure count
   */
  async incrementFailureCount(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    });
  }

  /**
   * Reset failure count on success
   */
  async resetFailureCount(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: 0 },
    });
  }

  /**
   * Disable webhook after too many failures
   */
  async disableWebhookForFailures(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    });

    this.logger.warn(`Webhook ${webhookId} disabled due to consecutive failures`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a secure webhook secret
   */
  private generateSecret(): string {
    // Generate a 32-byte random secret and encode as base64
    const randomBytes = crypto.randomBytes(32);
    return `whsec_${randomBytes.toString('base64').replace(/[+/=]/g, '')}`;
  }

  /**
   * Map Prisma webhook to entity
   */
  private mapToEntity(webhook: any): WebhookEntity {
    return {
      id: webhook.id,
      festivalId: webhook.festivalId,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.isActive,
      headers: webhook.headers as Record<string, string> | null,
      description: webhook.description,
      createdById: webhook.createdById,
      lastTriggeredAt: webhook.lastTriggeredAt,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  /**
   * Map Prisma webhook delivery to entity
   */
  private mapDeliveryToEntity(delivery: any): WebhookDeliveryEntity {
    return {
      id: delivery.id,
      webhookId: delivery.webhookId,
      event: delivery.event,
      payload: delivery.payload as Record<string, unknown>,
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts,
      lastAttemptAt: delivery.lastAttemptAt,
      nextRetryAt: delivery.nextRetryAt,
      responseCode: delivery.responseCode,
      responseBody: delivery.responseBody,
      responseHeaders: delivery.responseHeaders as Record<string, string> | null,
      errorMessage: delivery.errorMessage,
      duration: delivery.duration,
      completedAt: delivery.completedAt,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }
}
