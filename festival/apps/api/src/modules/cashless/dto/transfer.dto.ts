/**
 * Transfer DTO
 *
 * DTO for transferring balance between users
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

export class TransferRequestDto {
  @ApiProperty({
    description: 'User ID to transfer to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  toUserId!: string;

  @ApiProperty({
    description: 'Amount to transfer in EUR',
    example: 20,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Transfer amount must be at least 0.01 EUR' })
  amount!: number;

  @ApiProperty({
    description: 'Festival ID for the transfer',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  festivalId!: string;

  @ApiPropertyOptional({
    description: 'Description of the transfer',
    example: 'Lunch payment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class TransferResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID (sender)' })
  accountId!: string;

  @ApiProperty({ description: 'Festival ID' })
  festivalId!: string;

  @ApiProperty({ description: 'Transaction type' })
  type!: string;

  @ApiProperty({ description: 'Transfer amount' })
  amount!: number;

  @ApiProperty({ description: 'Balance before transfer' })
  balanceBefore!: number;

  @ApiProperty({ description: 'Balance after transfer' })
  balanceAfter!: number;

  @ApiProperty({ description: 'Transaction description' })
  description!: string | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt!: Date;
}
