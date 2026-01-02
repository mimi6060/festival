import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Refund reason enumeration
 */
export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  EVENT_CANCELLED = 'event_cancelled',
  OTHER = 'other',
}

/**
 * DTO for requesting a refund
 *
 * @example
 * {
 *   "reason": "requested_by_customer",
 *   "description": "Customer unable to attend"
 * }
 */
export class RefundRequestDto {
  @ApiPropertyOptional({
    description: 'Amount to refund in cents. If not provided, full refund is processed.',
    example: 8999,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty({
    description: 'Reason for the refund',
    enum: RefundReason,
    example: 'requested_by_customer',
    enumName: 'RefundReason',
  })
  @IsEnum(RefundReason)
  @IsNotEmpty()
  reason: RefundReason;

  @ApiPropertyOptional({
    description: 'Additional description for the refund',
    example: 'Customer unable to attend due to illness',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
