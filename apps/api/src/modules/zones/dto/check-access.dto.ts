import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ZoneAccessAction } from '@prisma/client';

/**
 * DTO for checking zone access via QR code scan
 */
export class CheckAccessDto {
  @ApiPropertyOptional({
    description: 'Ticket ID to check access for (use this OR qrCode)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({
    description: 'QR code data for validation (use this OR ticketId)',
    example: 'FEST-2024-ABC123XYZ',
  })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

/**
 * DTO for logging zone access (entry/exit)
 */
export class LogAccessDto {
  @ApiPropertyOptional({
    description: 'Ticket ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({
    description: 'QR code data (alternative to ticketId)',
    example: 'FEST-2024-ABC123XYZ',
  })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiProperty({
    description: 'Access action type',
    enum: ZoneAccessAction,
    example: 'ENTRY',
  })
  @IsEnum(ZoneAccessAction)
  action!: ZoneAccessAction;
}

/**
 * DTO for configuring zone access rules
 */
export class ConfigureAccessDto {
  @ApiPropertyOptional({
    description: 'Ticket category IDs that can access this zone',
    example: ['cat-uuid-1', 'cat-uuid-2'],
    isArray: true,
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  ticketCategoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Staff role IDs that can access this zone',
    example: ['SECURITY', 'ORGANIZER'],
    isArray: true,
  })
  @IsOptional()
  @IsString({ each: true })
  staffRoleIds?: string[];
}

/**
 * Response DTO for access check result
 */
export class AccessCheckResponseDto {
  @ApiProperty({
    description: 'Whether access is granted',
    example: true,
  })
  granted!: boolean;

  @ApiProperty({
    description: 'Message explaining the access decision',
    example: 'Access granted - VIP ticket verified',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Ticket holder information',
  })
  ticketHolder?: {
    name: string;
    ticketType: string;
    ticketStatus: string;
    ticketId: string;
  };

  @ApiPropertyOptional({
    description: 'Zone information',
  })
  zone?: {
    id: string;
    name: string;
    currentOccupancy: number;
    capacity: number | null;
    capacityPercentage: number | null;
    isAtCapacity: boolean;
    isNearCapacity: boolean;
  };

  @ApiPropertyOptional({
    description: 'Alert information if zone is near or at capacity',
  })
  alert?: {
    type: 'WARNING' | 'CRITICAL';
    message: string;
  };
}

/**
 * Response DTO for zone capacity status
 */
export class ZoneCapacityResponseDto {
  @ApiProperty({
    description: 'Zone ID',
    example: 'zone-uuid',
  })
  zoneId!: string;

  @ApiProperty({
    description: 'Zone name',
    example: 'VIP Area',
  })
  zoneName!: string;

  @ApiProperty({
    description: 'Current number of people in the zone',
    example: 150,
  })
  currentOccupancy!: number;

  @ApiPropertyOptional({
    description: 'Maximum capacity of the zone',
    example: 200,
  })
  capacity!: number | null;

  @ApiPropertyOptional({
    description: 'Occupancy percentage (0-100)',
    example: 75,
  })
  occupancyPercentage!: number | null;

  @ApiProperty({
    description: 'Whether the zone is at full capacity',
    example: false,
  })
  isAtCapacity!: boolean;

  @ApiProperty({
    description: 'Whether the zone is near capacity (above warning threshold)',
    example: false,
  })
  isNearCapacity!: boolean;

  @ApiPropertyOptional({
    description: 'Number of available spots',
    example: 50,
  })
  availableSpots!: number | null;
}
