/**
 * Create Checkout Session DTO
 *
 * DTO for creating Stripe Checkout Sessions with comprehensive validation
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CheckoutMode {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  SETUP = 'setup',
}

export class LineItemDto {
  @ApiProperty({ description: 'Product name', example: 'Festival Pass - VIP' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Access to all VIP areas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Unit price in cents', example: 15000 })
  @IsNumber()
  @Min(50) // Stripe minimum is 50 cents
  unitAmount!: number;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Product image URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Product metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'User ID making the purchase' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Festival ID for the purchase' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiProperty({
    description: 'Checkout mode',
    enum: CheckoutMode,
    default: CheckoutMode.PAYMENT,
  })
  @IsEnum(CheckoutMode)
  mode!: CheckoutMode;

  @ApiProperty({
    description: 'Line items for the checkout session',
    type: [LineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems!: LineItemDto[];

  @ApiProperty({ description: 'Success redirect URL after payment', example: 'https://festival.com/success' })
  @IsUrl()
  successUrl!: string;

  @ApiProperty({ description: 'Cancel redirect URL', example: 'https://festival.com/cancel' })
  @IsUrl()
  cancelUrl!: string;

  @ApiPropertyOptional({ description: 'Customer email for receipts' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'eur', example: 'eur' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Allow promotion codes', default: true })
  @IsOptional()
  @IsBoolean()
  allowPromotionCodes?: boolean;

  @ApiPropertyOptional({ description: 'Session expiration in minutes (30-1440)', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(1440)
  expiresAfterMinutes?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Stripe Connect account ID for vendors' })
  @IsOptional()
  @IsString()
  connectedAccountId?: string;

  @ApiPropertyOptional({ description: 'Application fee amount in cents for Connect' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFeeAmount?: number;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({ description: 'Internal payment ID' })
  paymentId!: string;

  @ApiProperty({ description: 'Stripe Checkout Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'Checkout URL to redirect the user' })
  checkoutUrl!: string;

  @ApiProperty({ description: 'Session expiration timestamp' })
  expiresAt!: Date;
}
