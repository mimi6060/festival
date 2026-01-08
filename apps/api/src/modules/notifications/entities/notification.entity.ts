import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Expose } from 'class-transformer';

/**
 * Notification entity representing a notification in the system.
 * Used for Swagger documentation and API responses.
 */
export class NotificationEntity {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'User ID who owns this notification',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId!: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Festival ID associated with this notification',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  festivalId!: string | null;

  @Expose()
  @ApiProperty({
    description: 'Notification title',
    example: 'Ticket Purchase Confirmed',
  })
  title!: string;

  @Expose()
  @ApiProperty({
    description: 'Notification body',
    example: 'Your ticket for Summer Festival has been confirmed.',
  })
  body!: string;

  @Expose()
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.TICKET_PURCHASED,
  })
  type!: NotificationType;

  @Expose()
  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { ticketId: '123', orderId: '456' },
  })
  data!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({
    description: 'Image URL for rich notifications',
    example: 'https://example.com/image.jpg',
  })
  imageUrl!: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: 'Action URL or deep link',
    example: '/tickets/123',
  })
  actionUrl!: string | null;

  @Expose()
  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead!: boolean;

  @Expose()
  @ApiPropertyOptional({
    description: 'When the notification was read',
    example: '2024-01-15T10:30:00.000Z',
  })
  readAt!: Date | null;

  @Expose()
  @ApiPropertyOptional({
    description: 'When the notification was sent via push',
    example: '2024-01-15T10:30:00.000Z',
  })
  sentAt!: Date | null;

  @Expose()
  @ApiProperty({
    description: 'When the notification was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  constructor(partial: Partial<NotificationEntity>) {
    Object.assign(this, partial);
  }
}

/**
 * Paginated notifications response
 */
export class PaginatedNotificationsResponse {
  @ApiProperty({
    description: 'List of notifications',
    type: [NotificationEntity],
  })
  notifications!: NotificationEntity[];

  @ApiProperty({
    description: 'Total number of notifications',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of unread notifications',
    example: 5,
  })
  unreadCount!: number;
}

/**
 * Mark all as read response
 */
export class MarkAllAsReadResponse {
  @ApiProperty({
    description: 'Number of notifications marked as read',
    example: 10,
  })
  count!: number;
}
