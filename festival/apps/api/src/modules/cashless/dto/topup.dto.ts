/**
 * Top-up DTO
 *
 * DTO for topping up cashless account balance
 */

import {
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
}

export class TopupRequestDto {
  @ApiProperty({
    description: 'Amount to top up in EUR',
    example: 50,
    minimum: 5,
    maximum: 500,
  })
  @IsNumber()
  @Min(5, { message: 'Minimum top-up amount is 5 EUR' })
  @Max(500, { message: 'Maximum top-up amount is 500 EUR' })
  amount!: number;

  @ApiProperty({
    description: 'Festival ID for the top-up',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  festivalId!: string;

  @ApiPropertyOptional({
    description: 'Payment method for the top-up',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
    example: PaymentMethod.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class TopupResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Transaction type' })
  type!: string;

  @ApiProperty({ description: 'Top-up amount' })
  amount!: number;

  @ApiProperty({ description: 'Balance before top-up' })
  balanceBefore!: number;

  @ApiProperty({ description: 'Balance after top-up' })
  balanceAfter!: number;

  @ApiProperty({ description: 'Transaction description' })
  description!: string | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt!: Date;
}
