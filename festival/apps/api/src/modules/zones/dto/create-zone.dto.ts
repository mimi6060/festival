import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TicketType } from '@prisma/client';

/**
 * Coordinates for zone polygon/area definition
 */
export class ZoneCoordinatesDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

/**
 * Access level enumeration for zones
 */
export enum AccessLevel {
  PUBLIC = 'PUBLIC',
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  BACKSTAGE = 'BACKSTAGE',
  STAFF_ONLY = 'STAFF_ONLY',
  RESTRICTED = 'RESTRICTED',
}

/**
 * DTO for creating a new zone
 */
export class CreateZoneDto {
  @ApiProperty({
    description: 'Zone name',
    example: 'VIP Lounge',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({
    description: 'Zone description',
    example: 'Exclusive area for VIP ticket holders with premium amenities',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum capacity of the zone',
    example: 500,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Access level of the zone',
    enum: AccessLevel,
    example: AccessLevel.VIP,
    default: AccessLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({
    description: 'List of ticket types that grant access to this zone',
    example: ['VIP', 'BACKSTAGE'],
    isArray: true,
    enum: TicketType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketType, { each: true })
  requiresTicketType?: TicketType[];

  @ApiPropertyOptional({
    description: 'List of staff role IDs that have access to this zone',
    example: ['security', 'organizer'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedStaffRoles?: string[];

  @ApiPropertyOptional({
    description: 'Zone boundary coordinates (polygon points)',
    type: [ZoneCoordinatesDto],
    example: [
      { latitude: 48.8566, longitude: 2.3522 },
      { latitude: 48.8567, longitude: 2.3523 },
    ],
  })
  @IsOptional()
  @IsArray()
  @Type(() => ZoneCoordinatesDto)
  coordinates?: ZoneCoordinatesDto[];

  @ApiPropertyOptional({
    description: 'Threshold percentage for capacity warning alerts (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
    default: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  capacityWarningThreshold?: number;

  @ApiPropertyOptional({
    description: 'Whether the zone is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
