import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Checkout type enumeration
 */
export enum CheckoutType {
  TICKET = 'ticket',
  CASHLESS = 'cashless',
}

/**
 * Checkout line item
 *
 * @example
 * {
 *   "itemId": "550e8400-e29b-41d4-a716-446655440001",
 *   "quantity": 2,
 *   "name": "Pass 3 Jours",
 *   "unitPrice": 8999
 * }
 */
export class CheckoutItemDto {
  @ApiProperty({
    description: 'Item identifier (ticket category ID for tickets, festival ID for cashless)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    description: 'Quantity of items to purchase',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Item display name for Stripe checkout',
    example: 'Pass 3 Jours',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Unit price in cents (e.g., 8999 = 89.99 EUR). Required for cashless top-ups.',
    example: 8999,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

/**
 * DTO for creating a Stripe checkout session
 *
 * @example
 * {
 *   "type": "ticket",
 *   "items": [{ "itemId": "uuid", "quantity": 2 }],
 *   "festivalId": "uuid",
 *   "successUrl": "https://festival.io/success",
 *   "cancelUrl": "https://festival.io/cancel"
 * }
 */
export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Type of checkout session',
    enum: CheckoutType,
    example: 'ticket',
    enumName: 'CheckoutType',
  })
  @IsEnum(CheckoutType)
  @IsNotEmpty()
  type: CheckoutType;

  @ApiProperty({
    description: 'Array of items to include in checkout',
    type: [CheckoutItemDto],
    example: [
      {
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 2,
        name: 'Pass 3 Jours',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiPropertyOptional({
    description: 'URL to redirect after successful payment',
    example: 'https://festival.io/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    format: 'uri',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to redirect if payment is cancelled',
    example: 'https://festival.io/checkout/cancel',
    format: 'uri',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({
    description: 'Festival UUID for the checkout context',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217). Defaults to EUR.',
    example: 'eur',
    default: 'eur',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
