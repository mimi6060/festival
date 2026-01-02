/**
 * Transaction DTOs
 *
 * DTOs for transaction history queries
 */

import { IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TransactionHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by festival ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of transactions to return',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of transactions to skip (for pagination)',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class TransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Transaction type', example: 'TOPUP' })
  type!: string;

  @ApiProperty({ description: 'Transaction amount in EUR' })
  amount!: number;

  @ApiProperty({ description: 'Balance before transaction' })
  balanceBefore!: number;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter!: number;

  @ApiProperty({ description: 'Transaction description', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt!: Date;
}
