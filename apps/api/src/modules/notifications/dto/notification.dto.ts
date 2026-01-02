import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationCategory,
  NotificationPlatform,
  UserRole,
  TicketType,
} from '@prisma/client';

// ============== User DTOs ==============

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter by notification type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class MarkNotificationReadDto {
  @ApiProperty({ description: 'Notification ID' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'FCM push token' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  token!: string;

  @ApiProperty({ enum: NotificationPlatform, description: 'Platform type' })
  @IsEnum(NotificationPlatform)
  platform!: NotificationPlatform;

  @ApiPropertyOptional({ description: 'Device name for identification' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    enum: NotificationCategory,
    isArray: true,
    description: 'Enabled notification categories',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationCategory, { each: true })
  enabledCategories?: NotificationCategory[];

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:MM format)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:MM format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:MM format)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:MM format',
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'User timezone (e.g., Europe/Paris)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

// ============== Admin DTOs ==============

export class NotificationPayloadDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ description: 'Notification body' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  body!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Image URL for rich notifications' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Action URL or deep link' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}

export class SendNotificationDto {
  @ApiProperty({ description: 'Target user IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiProperty({ type: NotificationPayloadDto })
  @ValidateNested()
  @Type(() => NotificationPayloadDto)
  payload!: NotificationPayloadDto;

  @ApiPropertyOptional({ description: 'Send push notification' })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean = true;

  @ApiPropertyOptional({ description: 'Send email notification' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;
}

export class SendBroadcastNotificationDto {
  @ApiPropertyOptional({ description: 'Festival ID to target' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({ description: 'Send to all users' })
  @IsOptional()
  @IsBoolean()
  targetAll?: boolean = false;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    description: 'Target users by role',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  targetRoles?: UserRole[];

  @ApiPropertyOptional({
    enum: TicketType,
    isArray: true,
    description: 'Target users by ticket type',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketType, { each: true })
  targetTicketTypes?: TicketType[];

  @ApiProperty({ type: NotificationPayloadDto })
  @ValidateNested()
  @Type(() => NotificationPayloadDto)
  payload!: NotificationPayloadDto;

  @ApiPropertyOptional({ description: 'Send push notification' })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean = true;

  @ApiPropertyOptional({ description: 'Send email notification' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;
}

export class ScheduleNotificationDto extends SendBroadcastNotificationDto {
  @ApiProperty({ description: 'Scheduled send time (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  scheduledFor!: string;
}

export class CancelScheduledNotificationDto {
  @ApiProperty({ description: 'Scheduled notification ID' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class GetNotificationAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Festival ID filter' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ============== Template DTOs ==============

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Unique template name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ description: 'Title template (Handlebars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleTemplate!: string;

  @ApiProperty({ description: 'Body template (Handlebars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  bodyTemplate!: string;

  @ApiPropertyOptional({ description: 'Default image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultImageUrl?: string;

  @ApiPropertyOptional({ description: 'Default action URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultActionUrl?: string;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ description: 'Title template (Handlebars)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleTemplate?: string;

  @ApiPropertyOptional({ description: 'Body template (Handlebars)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bodyTemplate?: string;

  @ApiPropertyOptional({ description: 'Default image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultImageUrl?: string;

  @ApiPropertyOptional({ description: 'Default action URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultActionUrl?: string;

  @ApiPropertyOptional({ description: 'Is template active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendTemplatedNotificationDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @ApiProperty({ description: 'Target user IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Send push notification' })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean = true;

  @ApiPropertyOptional({ description: 'Send email notification' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;
}
