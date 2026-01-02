import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO for linking an NFC wristband to a cashless account
 *
 * @example
 * {
 *   "nfcTagId": "NFC-TAG-12345678",
 *   "festivalId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
export class LinkNfcDto {
  @ApiProperty({
    description: 'NFC tag identifier from the wristband',
    example: 'NFC-TAG-12345678',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nfcTagId: string;

  @ApiPropertyOptional({
    description: 'Festival UUID for context (optional)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  festivalId?: string;
}
