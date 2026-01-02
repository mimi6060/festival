import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './services/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  GetNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
  RegisterPushTokenDto,
} from './dto/notification.dto';
import { Notification, NotificationPreference, PushToken } from '@prisma/client';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============== Notification Endpoints ==============

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of notifications with pagination',
  })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    const result = await this.notificationsService.getUserNotifications(userId, query);
    return {
      ...result,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns count of unread notifications',
  })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ): Promise<void> {
    await this.notificationsService.deleteNotification(userId, notificationId);
  }

  // ============== Preferences Endpoints ==============

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Returns notification preferences',
  })
  async getMyPreferences(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationPreference> {
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update my notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  async updateMyPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  // ============== Push Token Endpoints ==============

  @Post('push-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register FCM/APNs push token' })
  @ApiResponse({
    status: 201,
    description: 'Push token registered successfully',
  })
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<PushToken> {
    return this.notificationsService.registerPushToken(userId, dto);
  }

  @Delete('push-token/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove push token' })
  @ApiParam({ name: 'token', description: 'Push token to remove' })
  @ApiResponse({
    status: 204,
    description: 'Push token deactivated successfully',
  })
  async removePushToken(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ): Promise<void> {
    await this.notificationsService.deactivatePushToken(userId, token);
  }
}
