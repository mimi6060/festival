/**
 * Webhooks Controller
 *
 * REST API endpoints for webhook management.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookQueryDto,
  WebhookDeliveryQueryDto,
  TestWebhookDto,
  WebhookResponseDto,
  WebhookWithSecretResponseDto,
  WebhookDeliveryResponseDto,
  WebhookDeliveryDetailDto,
  RegenerateSecretResponseDto,
  AvailableEventsResponseDto,
  WebhookStatsDto,
} from './dto';
import {
  WebhookEvent,
  WEBHOOK_EVENT_CATEGORIES,
  WEBHOOK_EVENT_DESCRIPTIONS,
  getAllWebhookEvents,
  getWebhookEventsGroupedByCategory,
} from './webhook-events.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ============================================================================
// Controller
// ============================================================================

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('festivals/:festivalId/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ORGANIZER')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly deliveryService: WebhookDeliveryService,
    private readonly dispatcherService: WebhookDispatcherService,
  ) {}

  // ============================================================================
  // Webhook Management
  // ============================================================================

  @Post()
  @ApiOperation({
    summary: 'Create a new webhook',
    description: 'Register a new webhook to receive event notifications. Returns the webhook secret (shown only once).',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiBody({ type: CreateWebhookDto })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: WebhookWithSecretResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Webhook URL already exists for this festival' })
  async create(
    @Param('festivalId') festivalId: string,
    @Body() createWebhookDto: CreateWebhookDto,
    @CurrentUser() user: any,
  ): Promise<WebhookWithSecretResponseDto> {
    const webhook = await this.webhooksService.create(
      festivalId,
      createWebhookDto,
      user.id,
    );
    return this.mapToResponseWithSecret(webhook);
  }

  @Get()
  @ApiOperation({
    summary: 'List all webhooks',
    description: 'Get all webhooks registered for a festival with pagination',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
  })
  async findAll(
    @Param('festivalId') festivalId: string,
    @Query() query: WebhookQueryDto,
  ) {
    const result = await this.webhooksService.findAll(festivalId, query);
    return {
      ...result,
      items: result.items.map(this.mapToResponse),
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get webhook statistics',
    description: 'Get statistics about webhooks and their deliveries',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook statistics',
    type: WebhookStatsDto,
  })
  async getStats(
    @Param('festivalId') festivalId: string,
  ): Promise<WebhookStatsDto> {
    return this.webhooksService.getStats(festivalId);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get available webhook events',
    description: 'List all available webhook events that can be subscribed to',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available webhook events',
    type: AvailableEventsResponseDto,
  })
  async getAvailableEvents(): Promise<AvailableEventsResponseDto> {
    const events = getAllWebhookEvents().map((event) => ({
      event,
      category: WEBHOOK_EVENT_CATEGORIES[event],
      description: WEBHOOK_EVENT_DESCRIPTIONS[event],
    }));

    const byCategory: Record<string, string[]> = {};
    const grouped = getWebhookEventsGroupedByCategory();
    for (const [category, eventList] of Object.entries(grouped)) {
      byCategory[category] = eventList;
    }

    return { events, byCategory };
  }

  @Get(':webhookId')
  @ApiOperation({
    summary: 'Get webhook details',
    description: 'Get details of a specific webhook',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
  ): Promise<WebhookResponseDto> {
    const webhook = await this.webhooksService.findOne(webhookId, festivalId);
    return this.mapToResponse(webhook);
  }

  @Put(':webhookId')
  @ApiOperation({
    summary: 'Update a webhook',
    description: 'Update webhook configuration',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiBody({ type: UpdateWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 409, description: 'Webhook URL already exists' })
  async update(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const webhook = await this.webhooksService.update(
      webhookId,
      festivalId,
      updateWebhookDto,
    );
    return this.mapToResponse(webhook);
  }

  @Delete(':webhookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a webhook',
    description: 'Remove a webhook and all its delivery history',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async delete(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
  ): Promise<void> {
    await this.webhooksService.delete(webhookId, festivalId);
  }

  @Post(':webhookId/regenerate-secret')
  @ApiOperation({
    summary: 'Regenerate webhook secret',
    description: 'Generate a new secret for signing webhooks. The old secret will be invalidated immediately.',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'New secret generated',
    type: RegenerateSecretResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async regenerateSecret(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
  ): Promise<RegenerateSecretResponseDto> {
    const secret = await this.webhooksService.regenerateSecret(webhookId, festivalId);
    return {
      secret,
      message: 'Secret regenerated successfully. Please update your integration.',
    };
  }

  @Post(':webhookId/test')
  @ApiOperation({
    summary: 'Test webhook',
    description: 'Send a test event to the webhook endpoint to verify it is working correctly',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiBody({ type: TestWebhookDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Test event sent',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async testWebhook(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
    @Body() testDto?: TestWebhookDto,
  ): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    const webhook = await this.webhooksService.findOne(webhookId, festivalId);
    const event = testDto?.event || WebhookEvent.TICKET_PURCHASED;

    // Dispatch a test event
    await this.dispatcherService.dispatch({
      festivalId,
      event,
      data: {
        test: true,
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `Test event "${event}" queued for delivery to ${webhook.url}`,
    };
  }

  // ============================================================================
  // Delivery Management
  // ============================================================================

  @Get(':webhookId/deliveries')
  @ApiOperation({
    summary: 'List webhook deliveries',
    description: 'Get delivery history for a webhook with pagination',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'List of deliveries',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getDeliveries(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    const result = await this.webhooksService.getDeliveries(
      webhookId,
      festivalId,
      query,
    );
    return {
      ...result,
      items: result.items.map(this.mapDeliveryToResponse),
    };
  }

  @Get(':webhookId/deliveries/:deliveryId')
  @ApiOperation({
    summary: 'Get delivery details',
    description: 'Get details of a specific delivery including payload and response',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery details',
    type: WebhookDeliveryDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async getDelivery(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<WebhookDeliveryDetailDto> {
    const delivery = await this.webhooksService.getDelivery(
      deliveryId,
      webhookId,
      festivalId,
    );
    return this.mapDeliveryToDetail(delivery);
  }

  @Post(':webhookId/deliveries/:deliveryId/retry')
  @ApiOperation({
    summary: 'Retry a failed delivery',
    description: 'Manually retry a failed webhook delivery',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Retry initiated',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async retryDelivery(
    @Param('festivalId') festivalId: string,
    @Param('webhookId') webhookId: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify access
    await this.webhooksService.getDelivery(deliveryId, webhookId, festivalId);

    const result = await this.deliveryService.retryDelivery(deliveryId);

    return {
      success: result.success,
      message: result.success
        ? 'Delivery completed successfully'
        : `Delivery failed: ${result.errorMessage}`,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapToResponse(webhook: any): WebhookResponseDto {
    return {
      id: webhook.id,
      festivalId: webhook.festivalId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      description: webhook.description,
      headers: webhook.headers ? this.redactSensitiveHeaders(webhook.headers) : undefined,
      lastTriggeredAt: webhook.lastTriggeredAt,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private mapToResponseWithSecret(webhook: any): WebhookWithSecretResponseDto {
    return {
      ...this.mapToResponse(webhook),
      secret: webhook.secret,
    };
  }

  private mapDeliveryToResponse(delivery: any): WebhookDeliveryResponseDto {
    return {
      id: delivery.id,
      webhookId: delivery.webhookId,
      event: delivery.event,
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts,
      responseCode: delivery.responseCode,
      errorMessage: delivery.errorMessage,
      duration: delivery.duration,
      lastAttemptAt: delivery.lastAttemptAt,
      nextRetryAt: delivery.nextRetryAt,
      completedAt: delivery.completedAt,
      createdAt: delivery.createdAt,
    };
  }

  private mapDeliveryToDetail(delivery: any): WebhookDeliveryDetailDto {
    return {
      ...this.mapDeliveryToResponse(delivery),
      payload: delivery.payload,
      responseBody: delivery.responseBody,
      responseHeaders: delivery.responseHeaders,
    };
  }

  private redactSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveKeys = ['authorization', 'x-api-key', 'x-secret', 'bearer'];
    const redacted: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}
