import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for validating a ticket at entrance
 *
 * @example
 * {
 *   "qrCodeData": "FEST-2025-ABC123-CHECKSUM"
 * }
 */
export class ValidateTicketDto {
  @ApiProperty({
    description: 'QR code data scanned from the ticket',
    example: 'FEST-2025-ABC123-5f4dcc3b5aa765d61d8327deb882cf99',
  })
  @IsString()
  @IsNotEmpty()
  qrCodeData: string;

  @ApiPropertyOptional({
    description: 'Zone ID for zone-specific access validation',
    example: '550e8400-e29b-41d4-a716-446655440099',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

/**
 * Response DTO for ticket validation
 */
export class ValidateTicketResponseDto {
  @ApiProperty({
    description: 'Whether the ticket is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Validation result message',
    example: 'Ticket validated successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Ticket information if validation was successful',
  })
  ticket?: {
    id: string;
    categoryName: string;
    categoryType: string;
    userName: string;
    userEmail: string;
    festivalName: string;
    status: string;
  };
}
