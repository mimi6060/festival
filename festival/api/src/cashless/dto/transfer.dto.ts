import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for transferring balance to another account
 *
 * @example
 * {
 *   "toAccountId": "550e8400-e29b-41d4-a716-446655440099",
 *   "amount": 25.00,
 *   "festivalId": "550e8400-e29b-41d4-a716-446655440000",
 *   "description": "For concert tickets"
 * }
 */
export class TransferDto {
  @ApiProperty({
    description: 'Recipient cashless account UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  toAccountId: string;

  @ApiProperty({
    description: 'Amount to transfer in EUR',
    example: 25.00,
    minimum: 0.01,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Festival UUID for the transfer context',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  festivalId: string;

  @ApiPropertyOptional({
    description: 'Optional note for the transfer',
    example: 'For concert tickets',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
