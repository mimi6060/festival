import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ZoneAccessAction } from '@prisma/client';

/**
 * DTO for checking zone access
 */
export class CheckAccessDto {
  @ApiProperty({
    description: 'Ticket ID to check access for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiPropertyOptional({
    description: 'QR code data for additional validation',
    example: 'eyJ0aWNrZXRJZCI6ImExYjJjM2Q0Li4uIn0=',
  })
  @IsOptional()
  @IsString()
  qrCodeData?: string;
}

/**
 * DTO for logging zone access
 */
export class LogAccessDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({
    description: 'Access action type',
    enum: ZoneAccessAction,
    example: 'ENTRY',
  })
  @IsEnum(ZoneAccessAction)
  action: ZoneAccessAction;
}

/**
 * Response DTO for access check
 */
export class AccessCheckResponseDto {
  @ApiProperty({
    description: 'Whether access is granted',
    example: true,
  })
  granted: boolean;

  @ApiProperty({
    description: 'Message explaining the access decision',
    example: 'Access granted - VIP ticket verified',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Ticket holder information',
  })
  ticketHolder?: {
    name: string;
    ticketType: string;
    ticketStatus: string;
  };

  @ApiPropertyOptional({
    description: 'Zone information',
  })
  zone?: {
    name: string;
    currentOccupancy: number;
    capacity: number | null;
  };
}
