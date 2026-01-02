/**
 * Payment DTO
 *
 * DTO for making cashless payments
 */

import {
  IsNumber,
  IsOptional,
  IsUUID,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentDto {
  @ApiProperty({
    description: 'Payment amount in EUR',
    example: 12.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be at least 0.01 EUR' })
  amount!: number;

  @ApiProperty({
    description: 'Festival ID for the payment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  festivalId!: string;

  @ApiPropertyOptional({
    description: 'Vendor ID receiving the payment',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Description of the payment',
    example: '2x Beer, 1x Burger',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Transaction type' })
  type!: string;

  @ApiProperty({ description: 'Payment amount' })
  amount!: number;

  @ApiProperty({ description: 'Balance before payment' })
  balanceBefore!: number;

  @ApiProperty({ description: 'Balance after payment' })
  balanceAfter!: number;

  @ApiProperty({ description: 'Transaction description' })
  description!: string | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt!: Date;
}
