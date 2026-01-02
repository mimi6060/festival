/**
 * Refund DTOs
 *
 * DTOs for comprehensive refund management
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_POSTPONED = 'event_postponed',
  PARTIAL_ATTENDANCE = 'partial_attendance',
  QUALITY_ISSUE = 'quality_issue',
  OTHER = 'other',
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_ACTION = 'requires_action',
}

export class CreateRefundDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsUUID()
  paymentId!: string;

  @ApiPropertyOptional({ description: 'Amount to refund in cents (full refund if not specified)' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  amount?: number;

  @ApiProperty({ description: 'Refund reason', enum: RefundReason })
  @IsEnum(RefundReason)
  reason!: RefundReason;

  @ApiPropertyOptional({ description: 'Detailed explanation for the refund' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  explanation?: string;

  @ApiPropertyOptional({ description: 'Whether to refund application fee (for Connect)', default: false })
  @IsOptional()
  @IsBoolean()
  refundApplicationFee?: boolean;

  @ApiPropertyOptional({ description: 'Whether to reverse transfer (for Connect)', default: false })
  @IsOptional()
  @IsBoolean()
  reverseTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Request ID for idempotency' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PartialRefundDto {
  @ApiProperty({ description: 'Payment ID to partially refund' })
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ description: 'Amount to refund in cents' })
  @IsNumber()
  @Min(50)
  amount!: number;

  @ApiProperty({ description: 'Refund reason', enum: RefundReason })
  @IsEnum(RefundReason)
  reason!: RefundReason;

  @ApiPropertyOptional({ description: 'Detailed explanation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  explanation?: string;

  @ApiPropertyOptional({ description: 'Line item IDs being refunded' })
  @IsOptional()
  @IsString({ each: true })
  lineItemIds?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class BulkRefundDto {
  @ApiProperty({ description: 'List of payment IDs to refund' })
  @IsUUID('4', { each: true })
  paymentIds!: string[];

  @ApiProperty({ description: 'Refund reason', enum: RefundReason })
  @IsEnum(RefundReason)
  reason!: RefundReason;

  @ApiPropertyOptional({ description: 'Detailed explanation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  explanation?: string;

  @ApiPropertyOptional({ description: 'Percentage of original amount to refund (1-100)', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  percentageToRefund?: number;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Internal refund ID' })
  refundId!: string;

  @ApiProperty({ description: 'Stripe refund ID' })
  stripeRefundId!: string;

  @ApiProperty({ description: 'Original payment ID' })
  paymentId!: string;

  @ApiProperty({ description: 'Refund amount in cents' })
  amount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Refund status', enum: RefundStatus })
  status!: RefundStatus;

  @ApiProperty({ description: 'Refund reason' })
  reason!: string;

  @ApiPropertyOptional({ description: 'Failure reason if failed' })
  failureReason?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class BulkRefundResponseDto {
  @ApiProperty({ description: 'Total number of refunds requested' })
  totalRequested!: number;

  @ApiProperty({ description: 'Number of successful refunds' })
  successCount!: number;

  @ApiProperty({ description: 'Number of failed refunds' })
  failedCount!: number;

  @ApiProperty({ description: 'Total amount refunded in cents' })
  totalAmountRefunded!: number;

  @ApiProperty({ description: 'Individual refund results' })
  results!: RefundResultDto[];
}

export class RefundResultDto {
  @ApiProperty({ description: 'Payment ID' })
  paymentId!: string;

  @ApiProperty({ description: 'Whether refund succeeded' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Refund ID if successful' })
  refundId?: string;

  @ApiPropertyOptional({ description: 'Amount refunded if successful' })
  amount?: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

export class RefundPolicyDto {
  @ApiProperty({ description: 'Whether refunds are allowed' })
  refundsAllowed!: boolean;

  @ApiProperty({ description: 'Days before event refunds allowed', example: 7 })
  daysBeforeEventLimit!: number;

  @ApiProperty({ description: 'Refund percentage if within limit', example: 100 })
  fullRefundPercentage!: number;

  @ApiProperty({ description: 'Partial refund percentage after limit', example: 50 })
  partialRefundPercentage!: number;

  @ApiProperty({ description: 'Minimum refund amount in cents', example: 100 })
  minimumRefundAmount!: number;

  @ApiProperty({ description: 'Processing fee kept in cents', example: 0 })
  processingFeeRetained!: number;

  @ApiProperty({ description: 'Refund processing time in days', example: 5 })
  processingTimeDays!: number;
}

export class RefundEligibilityDto {
  @ApiProperty({ description: 'Whether payment is eligible for refund' })
  eligible!: boolean;

  @ApiProperty({ description: 'Maximum refund amount in cents' })
  maxRefundAmount!: number;

  @ApiProperty({ description: 'Refund percentage available' })
  refundPercentage!: number;

  @ApiPropertyOptional({ description: 'Reason if not eligible' })
  ineligibilityReason?: string;

  @ApiProperty({ description: 'Original payment amount in cents' })
  originalAmount!: number;

  @ApiProperty({ description: 'Already refunded amount in cents' })
  refundedAmount!: number;

  @ApiProperty({ description: 'Days until event (if applicable)' })
  daysUntilEvent?: number;

  @ApiProperty({ description: 'Applicable refund policy' })
  policy!: RefundPolicyDto;
}
