import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './services/notifications.service';
import { GetNotificationsQueryDto } from './dto';
import {
  NotificationEntity,
  PaginatedNotificationsResponse,
  MarkAllAsReadResponse,
} from './entities';

/**
 * Notifications controller handling user notification endpoints.
 * Base path: /notifications
 *
 * All endpoints require authentication via JWT.
 * Users can only access their own notifications.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Get paginated list of user's notifications.
   */
  @Get()
  @ApiOperation({
    summary: 'List user notifications',
    description:
      'Returns a paginated list of notifications for the authenticated user with optional filters for read status, type, and festival.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
    type: PaginatedNotificationsResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetNotificationsQueryDto
  ): Promise<PaginatedNotificationsResponse> {
    const result = await this.notificationsService.getUserNotifications(user.id, query);
    return {
      notifications: result.notifications.map((n) => new NotificationEntity(n)),
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * GET /notifications/unread-count
   * Get the count of unread notifications.
   * NOTE: Must be defined before :id route to avoid being matched as an ID.
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the number of unread notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  /**
   * PATCH /notifications/read-all
   * Mark all user's notifications as read.
   * NOTE: Must be defined before :id/read route to avoid being matched as an ID.
   */
  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications for the authenticated user as read.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkAllAsReadResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<MarkAllAsReadResponse> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * GET /notifications/:id
   * Get a single notification by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Returns a single notification if it belongs to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification details',
    type: NotificationEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsService.findOne(user.id, id);
    return new NotificationEntity(notification);
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read.
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a single notification as read. Returns the updated notification.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsService.markAsRead(user.id, id);
    return new NotificationEntity(notification);
  }

  /**
   * DELETE /notifications/:id
   * Delete a notification.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Permanently deletes a notification. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.notificationsService.deleteNotification(user.id, id);
  }
}
