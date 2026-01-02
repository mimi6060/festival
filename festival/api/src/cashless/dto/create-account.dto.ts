import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a cashless account
 *
 * @example
 * {
 *   "nfcTagId": "NFC-TAG-12345678"
 * }
 */
export class CreateAccountDto {
  @ApiPropertyOptional({
    description: 'NFC tag ID to link during account creation (optional)',
    example: 'NFC-TAG-12345678',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;
}
