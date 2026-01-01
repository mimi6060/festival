import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: 'uuid-here',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Payment successful',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'Your payment of 50.00 EUR has been processed.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.PAYMENT_SUCCESS,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { paymentId: 'uuid', amount: 50.0 },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Festival Update',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'The main stage performance has been rescheduled.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.FESTIVAL_UPDATE,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { festivalId: 'uuid' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
