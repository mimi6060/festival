import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '@prisma/client';

/**
 * Individual ticket item in a purchase request
 */
export class TicketPurchaseItemDto {
  @ApiProperty({
    description: 'Ticket category UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Number of tickets to purchase (1-10)',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10)
  quantity: number;
}

/**
 * DTO for purchasing tickets
 *
 * @example
 * {
 *   "festivalId": "550e8400-e29b-41d4-a716-446655440000",
 *   "items": [
 *     { "categoryId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 2 }
 *   ],
 *   "paymentProvider": "STRIPE"
 * }
 */
export class PurchaseTicketsDto {
  @ApiProperty({
    description: 'Festival UUID to purchase tickets for',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @ApiProperty({
    description: 'Array of ticket items to purchase',
    type: [TicketPurchaseItemDto],
    example: [
      { categoryId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 },
      { categoryId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPurchaseItemDto)
  items: TicketPurchaseItemDto[];

  @ApiProperty({
    description: 'Payment provider to use',
    enum: PaymentProvider,
    example: 'STRIPE',
    enumName: 'PaymentProvider',
  })
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Payment token from provider (for direct charge)',
    example: 'tok_visa',
  })
  @IsString()
  @IsOptional()
  paymentToken?: string;
}
