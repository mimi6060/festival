import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'New order status' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'Estimated ready time (for CONFIRMED status)' })
  @IsOptional()
  @IsDateString()
  estimatedReadyAt?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason (for CANCELLED status)' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
