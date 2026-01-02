import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  RegisterPushTokenDto,
  NotificationQueryDto,
  CreateNotificationDto,
  BroadcastNotificationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get user's notifications with pagination
   * GET /notifications
   */
  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of notifications',
  })
  async getMyNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ) {
    const result = await this.notificationsService.getNotifications(
      user.id,
      query,
    );

    return {
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get unread notification count
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Returns unread notification count',
  })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);

    return {
      success: true,
      data: { unreadCount: count },
    };
  }

  /**
   * Mark a notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const notification = await this.notificationsService.markAsRead(
      id,
      user.id,
    );

    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  /**
   * Mark all notifications as read
   * PATCH /notifications/read-all
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.markAllAsRead(user.id);

    return {
      success: true,
      message: `${result.count} notification(s) marked as read`,
      data: result,
    };
  }

  /**
   * Register push token for the current user
   * POST /notifications/token
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register push notification token' })
  @ApiResponse({ status: 200, description: 'Push token registered successfully' })
  async registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    const pushToken = await this.notificationsService.registerPushToken(
      user.id,
      dto,
    );

    return {
      success: true,
      message: 'Push token registered successfully',
      data: {
        id: pushToken.id,
        platform: pushToken.platform,
        createdAt: pushToken.createdAt,
      },
    };
  }

  /**
   * Delete push token (logout/disable notifications)
   * DELETE /notifications/token
   */
  @Delete('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete push notification token' })
  @ApiResponse({ status: 200, description: 'Push token deleted successfully' })
  async deletePushToken(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.deletePushToken(user.id);

    return {
      success: true,
      message: 'Push token deleted successfully',
    };
  }
}

/**
 * Admin controller for notification management
 */
@ApiTags('Notifications - Admin')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Send notification to a specific user
   * POST /admin/notifications/send
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification to a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.createNotification(dto);

    return {
      success: true,
      message: 'Notification sent successfully',
      data: notification,
    };
  }

  /**
   * Broadcast notification to all users with push tokens
   * POST /admin/notifications/broadcast
   */
  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast notification to all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Broadcast notification sent successfully',
  })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    const result = await this.notificationsService.broadcastNotification(dto);

    return {
      success: true,
      message: `Notification broadcast to ${result.count} users`,
      data: result,
    };
  }

  /**
   * Clean up old notifications
   * POST /admin/notifications/cleanup
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete old read notifications (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Old notifications deleted successfully',
  })
  async cleanupOldNotifications(@Query('daysOld') daysOld?: string) {
    const days = daysOld ? parseInt(daysOld, 10) : 90;
    const result = await this.notificationsService.deleteOldNotifications(days);

    return {
      success: true,
      message: `Deleted ${result.count} old notifications`,
      data: result,
    };
  }
}
