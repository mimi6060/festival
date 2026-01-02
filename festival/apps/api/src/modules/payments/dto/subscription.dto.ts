/**
 * Subscription DTOs
 *
 * DTOs for managing subscriptions (season passes, recurring payments)
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDate,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Season Pass 2025' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Statement descriptor' })
  @IsOptional()
  @IsString()
  statementDescriptor?: string;
}

export class CreatePriceDto {
  @ApiProperty({ description: 'Stripe Product ID' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Unit amount in cents', example: 9900 })
  @IsNumber()
  @Min(50)
  unitAmount!: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'eur' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Billing interval', enum: SubscriptionInterval })
  @IsEnum(SubscriptionInterval)
  interval!: SubscriptionInterval;

  @ApiPropertyOptional({ description: 'Interval count', default: 1, example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  intervalCount?: number;

  @ApiPropertyOptional({ description: 'Trial period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(730)
  trialPeriodDays?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Festival ID for season pass' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiProperty({ description: 'Stripe Price ID' })
  @IsString()
  priceId!: string;

  @ApiPropertyOptional({ description: 'Trial end date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trialEnd?: Date;

  @ApiPropertyOptional({ description: 'Cancel at period end', default: false })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Promotion code to apply' })
  @IsOptional()
  @IsString()
  promotionCode?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Collection method', default: 'charge_automatically' })
  @IsOptional()
  @IsString()
  collectionMethod?: string;

  @ApiPropertyOptional({ description: 'Days until due (for invoices)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  daysUntilDue?: number;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'New Price ID' })
  @IsOptional()
  @IsString()
  priceId?: string;

  @ApiPropertyOptional({ description: 'Cancel at period end' })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({ description: 'Pause collection' })
  @IsOptional()
  @IsBoolean()
  pauseCollection?: boolean;

  @ApiPropertyOptional({ description: 'Resume date for paused subscription' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resumeAt?: Date;

  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Proration behavior', default: 'create_prorations' })
  @IsOptional()
  @IsString()
  prorationBehavior?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel immediately or at period end', default: false })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Feedback for cancellation' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Offer coupon instead of canceling' })
  @IsOptional()
  @IsString()
  retentionCouponCode?: string;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Stripe Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Product name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description?: string;

  @ApiProperty({ description: 'Whether product is active' })
  active!: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class PriceResponseDto {
  @ApiProperty({ description: 'Stripe Price ID' })
  priceId!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Unit amount in cents' })
  unitAmount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Billing interval' })
  interval!: string;

  @ApiProperty({ description: 'Interval count' })
  intervalCount!: number;

  @ApiPropertyOptional({ description: 'Trial period days' })
  trialPeriodDays?: number;

  @ApiProperty({ description: 'Whether price is active' })
  active!: boolean;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Stripe Subscription ID' })
  subscriptionId!: string;

  @ApiProperty({ description: 'Subscription status', enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Stripe Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Current period start' })
  currentPeriodStart!: Date;

  @ApiProperty({ description: 'Current period end' })
  currentPeriodEnd!: Date;

  @ApiPropertyOptional({ description: 'Cancel at date' })
  cancelAt?: Date;

  @ApiPropertyOptional({ description: 'Canceled at date' })
  canceledAt?: Date;

  @ApiProperty({ description: 'Cancel at period end' })
  cancelAtPeriodEnd!: boolean;

  @ApiPropertyOptional({ description: 'Trial start date' })
  trialStart?: Date;

  @ApiPropertyOptional({ description: 'Trial end date' })
  trialEnd?: Date;

  @ApiProperty({ description: 'Items in subscription' })
  items!: SubscriptionItemDto[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class SubscriptionItemDto {
  @ApiProperty({ description: 'Subscription item ID' })
  id!: string;

  @ApiProperty({ description: 'Price ID' })
  priceId!: string;

  @ApiProperty({ description: 'Quantity' })
  quantity!: number;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiProperty({ description: 'Unit amount in cents' })
  unitAmount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Billing interval' })
  interval!: string;
}

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Stripe Invoice ID' })
  invoiceId!: string;

  @ApiProperty({ description: 'Invoice number' })
  number!: string;

  @ApiProperty({ description: 'Invoice status' })
  status!: string;

  @ApiProperty({ description: 'Amount due in cents' })
  amountDue!: number;

  @ApiProperty({ description: 'Amount paid in cents' })
  amountPaid!: number;

  @ApiProperty({ description: 'Amount remaining in cents' })
  amountRemaining!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Hosted invoice URL' })
  hostedInvoiceUrl?: string;

  @ApiPropertyOptional({ description: 'PDF download URL' })
  invoicePdf?: string;

  @ApiProperty({ description: 'Due date' })
  dueDate?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}
