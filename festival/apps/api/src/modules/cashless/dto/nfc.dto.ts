/**
 * NFC DTOs
 *
 * DTOs for NFC tag linking and lookup
 */

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkNfcRequestDto {
  @ApiProperty({
    description: 'NFC tag ID to link to the account',
    example: 'NFC-ABC123',
  })
  @IsString()
  nfcTagId!: string;
}

export class LinkNfcResponseDto {
  @ApiProperty({ description: 'Account ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  userId!: string;

  @ApiProperty({ description: 'Account balance in EUR', example: 125.5 })
  balance!: number;

  @ApiProperty({ description: 'NFC tag ID', example: 'NFC-ABC123' })
  nfcTagId!: string | null;

  @ApiProperty({ description: 'Whether account is active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}
