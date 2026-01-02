/**
 * Refund DTO
 *
 * DTO for processing cashless refunds (STAFF only)
 */

import {
  IsOptional,
  IsUUID,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundRequestDto {
  @ApiProperty({
    description: 'Original transaction ID to refund',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  transactionId!: string;

  @ApiProperty({
    description: 'User ID of the account to refund',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Reason for the refund',
    example: 'Wrong order delivered',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Refund transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Transaction type' })
  type!: string;

  @ApiProperty({ description: 'Refund amount' })
  amount!: number;

  @ApiProperty({ description: 'Balance before refund' })
  balanceBefore!: number;

  @ApiProperty({ description: 'Balance after refund' })
  balanceAfter!: number;

  @ApiProperty({ description: 'Refund reason/description' })
  description!: string | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt!: Date;
}
