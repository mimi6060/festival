/**
 * Webhook DTOs
 *
 * Data Transfer Objects for webhook management endpoints.
 */

import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEvent, WebhookEventCategory } from '../webhook-events.enum';

/**
 * Create webhook DTO
 */
export class CreateWebhookDto {
  @ApiProperty({
    description: 'Human-readable name for this webhook',
    example: 'Order Notification System',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Destination URL for webhook delivery (must be HTTPS in production)',
    example: 'https://api.example.com/webhooks/festival',
    format: 'uri',
  })
  @IsUrl({ require_tld: false }) // Allow localhost for development
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Array of event types to subscribe to',
    example: ['ticket.purchased', 'payment.completed', 'cashless.topup'],
    type: [String],
    enum: WebhookEvent,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEvent, { each: true })
  events!: WebhookEvent[];

  @ApiPropertyOptional({
    description: 'Optional description of the webhook purpose',
    example: 'Sends order notifications to our CRM system',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers to include in webhook requests',
    example: { 'X-Custom-Header': 'my-value', Authorization: 'Bearer token123' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Whether the webhook is active (default: true)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update webhook DTO
 */
export class UpdateWebhookDto extends PartialType(
  OmitType(CreateWebhookDto, [] as const),
) {}

/**
 * Webhook response DTO
 */
export class WebhookResponseDto {
  @ApiProperty({
    description: 'Webhook unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival this webhook belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'Webhook name',
    example: 'Order Notification System',
  })
  name!: string;

  @ApiProperty({
    description: 'Destination URL',
    example: 'https://api.example.com/webhooks/festival',
  })
  url!: string;

  @ApiProperty({
    description: 'Subscribed events',
    example: ['ticket.purchased', 'payment.completed'],
    type: [String],
  })
  events!: string[];

  @ApiProperty({
    description: 'Whether the webhook is active',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Sends order notifications to our CRM system',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom headers (secrets redacted)',
    example: { 'X-Custom-Header': 'my-value' },
  })
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Last time webhook was triggered',
    example: '2025-01-02T12:00:00.000Z',
  })
  lastTriggeredAt?: Date;

  @ApiProperty({
    description: 'Consecutive failure count',
    example: 0,
  })
  failureCount!: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Webhook with secret DTO (only shown once at creation)
 */
export class WebhookWithSecretResponseDto extends WebhookResponseDto {
  @ApiProperty({
    description: 'Webhook signing secret (only shown once at creation)',
    example: 'whsec_abc123xyz789...',
  })
  secret!: string;
}

/**
 * Webhook delivery status enum
 */
export enum WebhookDeliveryStatusDto {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

/**
 * Webhook delivery response DTO
 */
export class WebhookDeliveryResponseDto {
  @ApiProperty({
    description: 'Delivery unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Webhook ID this delivery belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  webhookId!: string;

  @ApiProperty({
    description: 'Event type that triggered this delivery',
    example: 'ticket.purchased',
  })
  event!: string;

  @ApiProperty({
    description: 'Delivery status',
    enum: WebhookDeliveryStatusDto,
    example: WebhookDeliveryStatusDto.SUCCESS,
  })
  status!: WebhookDeliveryStatusDto;

  @ApiProperty({
    description: 'Number of delivery attempts',
    example: 1,
  })
  attempts!: number;

  @ApiProperty({
    description: 'Maximum number of attempts',
    example: 5,
  })
  maxAttempts!: number;

  @ApiPropertyOptional({
    description: 'HTTP response code from last attempt',
    example: 200,
  })
  responseCode?: number;

  @ApiPropertyOptional({
    description: 'Error message if delivery failed',
    example: 'Connection timeout',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Request duration in milliseconds',
    example: 245,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Last attempt timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  lastAttemptAt?: Date;

  @ApiPropertyOptional({
    description: 'Next scheduled retry time',
    example: '2025-01-02T12:05:00.000Z',
  })
  nextRetryAt?: Date;

  @ApiPropertyOptional({
    description: 'When delivery completed successfully',
    example: '2025-01-02T12:00:00.000Z',
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Webhook delivery detail DTO (includes payload)
 */
export class WebhookDeliveryDetailDto extends WebhookDeliveryResponseDto {
  @ApiProperty({
    description: 'Full payload sent to webhook',
    example: {
      event: 'ticket.purchased',
      timestamp: '2025-01-02T12:00:00.000Z',
      data: { ticketId: '123', userId: '456' },
    },
  })
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Response body from webhook (truncated)',
    example: '{"status":"ok"}',
  })
  responseBody?: string;

  @ApiPropertyOptional({
    description: 'Response headers from webhook',
    example: { 'content-type': 'application/json' },
  })
  responseHeaders?: Record<string, string>;
}

/**
 * Webhook query DTO for listing webhooks
 */
export class WebhookQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by event type',
    example: 'ticket.purchased',
    enum: WebhookEvent,
  })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * Webhook delivery query DTO
 */
export class WebhookDeliveryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by delivery status',
    example: WebhookDeliveryStatusDto.SUCCESS,
    enum: WebhookDeliveryStatusDto,
  })
  @IsOptional()
  @IsEnum(WebhookDeliveryStatusDto)
  status?: WebhookDeliveryStatusDto;

  @ApiPropertyOptional({
    description: 'Filter by event type',
    example: 'ticket.purchased',
  })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * Test webhook DTO
 */
export class TestWebhookDto {
  @ApiPropertyOptional({
    description: 'Event type to simulate',
    example: 'ticket.purchased',
    enum: WebhookEvent,
    default: 'ticket.purchased',
  })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;
}

/**
 * Regenerate secret response DTO
 */
export class RegenerateSecretResponseDto {
  @ApiProperty({
    description: 'New webhook signing secret',
    example: 'whsec_abc123xyz789...',
  })
  secret!: string;

  @ApiProperty({
    description: 'Message',
    example: 'Secret regenerated successfully. Please update your integration.',
  })
  message!: string;
}

/**
 * Webhook event info DTO for documentation
 */
export class WebhookEventInfoDto {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'ticket.purchased',
  })
  event!: string;

  @ApiProperty({
    description: 'Event category',
    example: 'tickets',
    enum: WebhookEventCategory,
  })
  category!: WebhookEventCategory;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Triggered when a ticket is purchased',
  })
  description!: string;
}

/**
 * Available events response DTO
 */
export class AvailableEventsResponseDto {
  @ApiProperty({
    description: 'List of all available webhook events',
    type: [WebhookEventInfoDto],
  })
  events!: WebhookEventInfoDto[];

  @ApiProperty({
    description: 'Events grouped by category',
    example: {
      tickets: ['ticket.purchased', 'ticket.validated'],
      payments: ['payment.completed', 'payment.failed'],
    },
  })
  byCategory!: Record<string, string[]>;
}

/**
 * Webhook statistics DTO
 */
export class WebhookStatsDto {
  @ApiProperty({
    description: 'Total webhooks count',
    example: 5,
  })
  totalWebhooks!: number;

  @ApiProperty({
    description: 'Active webhooks count',
    example: 4,
  })
  activeWebhooks!: number;

  @ApiProperty({
    description: 'Total deliveries in last 24 hours',
    example: 150,
  })
  deliveriesLast24h!: number;

  @ApiProperty({
    description: 'Successful deliveries in last 24 hours',
    example: 145,
  })
  successfulDeliveriesLast24h!: number;

  @ApiProperty({
    description: 'Failed deliveries in last 24 hours',
    example: 5,
  })
  failedDeliveriesLast24h!: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 96.67,
  })
  successRate!: number;
}
