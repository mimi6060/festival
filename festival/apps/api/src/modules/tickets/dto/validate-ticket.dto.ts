import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for validating a ticket QR code
 */
export class ValidateTicketDto {
  @ApiProperty({
    description: 'QR code string from the ticket',
    example: 'QR-550E8400-A1B2C3D4E5F6G7H8',
  })
  @IsString()
  @IsNotEmpty()
  qrCode!: string;

  @ApiPropertyOptional({
    description: 'Zone ID to check access permissions',
    example: '550e8400-e29b-41d4-a716-446655440004',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

/**
 * DTO for scanning a ticket at entry
 */
export class ScanTicketDto {
  @ApiProperty({
    description: 'QR code string from the ticket',
    example: 'QR-550E8400-A1B2C3D4E5F6G7H8',
  })
  @IsString()
  @IsNotEmpty()
  qrCode!: string;

  @ApiPropertyOptional({
    description: 'Zone ID where the ticket is being scanned',
    example: '550e8400-e29b-41d4-a716-446655440004',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

/**
 * Response DTO for ticket validation result
 */
export class ValidationResultDto {
  @ApiProperty({
    description: 'Whether the ticket is valid',
    example: true,
  })
  valid!: boolean;

  @ApiProperty({
    description: 'Validation result message',
    example: 'Ticket is valid',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Whether access was granted (for scanning)',
    example: true,
  })
  accessGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Ticket information if valid',
  })
  ticket?: {
    id: string;
    festivalId: string;
    categoryId: string;
    userId: string;
    qrCode: string;
    status: string;
    purchasePrice: number;
    usedAt: Date | null;
    festival?: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
    };
    category?: {
      id: string;
      name: string;
      type: string;
    };
  };
}

/**
 * Response DTO for QR code image
 */
export class QrCodeImageResponseDto {
  @ApiProperty({
    description: 'Base64 encoded QR code image (data URL format)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCodeImage!: string;
}
