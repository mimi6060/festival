import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// Enum matching Prisma schema
export enum CampingSpotStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
}

// ===== Camping Spot DTOs =====

export class CreateCampingSpotDto {
  @ApiProperty({ description: 'Zone ID' })
  @IsUUID()
  zoneId!: string;

  @ApiProperty({
    description: 'Spot number/identifier',
    example: 'A1',
  })
  @IsString()
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional({
    description: 'Spot size',
    example: 'medium',
    enum: ['small', 'medium', 'large'],
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Latitude for precise location',
    example: 48.8566,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for precise location',
    example: 2.3522,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Has electricity hook-up',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  electricityHook?: boolean;

  @ApiPropertyOptional({
    description: 'Has water hook-up',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waterHook?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum vehicle length in meters (for caravans/campervans)',
    example: 8.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  maxVehicleLength?: number;

  @ApiPropertyOptional({
    description: 'Staff notes about this spot',
    example: 'Corner spot with good shade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCampingSpotDto extends PartialType(CreateCampingSpotDto) {
  @ApiPropertyOptional({
    description: 'Spot status',
    enum: CampingSpotStatus,
  })
  @IsOptional()
  @IsEnum(CampingSpotStatus)
  status?: CampingSpotStatus;

  @ApiPropertyOptional({
    description: 'Whether the spot is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateSpotsDto {
  @ApiProperty({ description: 'Zone ID' })
  @IsUUID()
  zoneId!: string;

  @ApiProperty({
    description: 'Prefix for spot numbers',
    example: 'A',
  })
  @IsString()
  @MaxLength(10)
  prefix!: string;

  @ApiProperty({
    description: 'Number of spots to create',
    example: 20,
  })
  @IsInt()
  @Min(1)
  @Max(500)
  count!: number;

  @ApiPropertyOptional({
    description: 'Starting number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  startNumber?: number;

  @ApiPropertyOptional({
    description: 'Default spot size',
    example: 'medium',
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'All spots have electricity',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  electricityHook?: boolean;

  @ApiPropertyOptional({
    description: 'All spots have water',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waterHook?: boolean;
}

export class CampingSpotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  zoneId!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty({ enum: CampingSpotStatus })
  status!: CampingSpotStatus;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  size?: string;

  @ApiProperty()
  electricityHook!: boolean;

  @ApiProperty()
  waterHook!: boolean;

  @ApiPropertyOptional()
  maxVehicleLength?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Computed fields
  @ApiPropertyOptional({ description: 'Zone details' })
  zone?: {
    id: string;
    name: string;
    type: string;
    pricePerNight: number;
  };

  @ApiPropertyOptional({ description: 'Current booking if occupied' })
  currentBooking?: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    guestName: string;
  };
}

export class CampingSpotQueryDto {
  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ description: 'Filter by festival ID (through zone)' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: CampingSpotStatus,
  })
  @IsOptional()
  @IsEnum(CampingSpotStatus)
  status?: CampingSpotStatus;

  @ApiPropertyOptional({ description: 'Filter by electricity availability' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  electricityHook?: boolean;

  @ApiPropertyOptional({ description: 'Filter by water availability' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  waterHook?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;
}

export class AvailableSpotsQueryDto {
  @ApiProperty({ description: 'Festival ID' })
  @IsUUID()
  festivalId!: string;

  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiProperty({ description: 'Check-in date' })
  @Type(() => Date)
  checkIn!: Date;

  @ApiProperty({ description: 'Check-out date' })
  @Type(() => Date)
  checkOut!: Date;

  @ApiPropertyOptional({ description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestCount?: number;

  @ApiPropertyOptional({ description: 'Require electricity' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requireElectricity?: boolean;

  @ApiPropertyOptional({ description: 'Require water' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requireWater?: boolean;

  @ApiPropertyOptional({ description: 'Vehicle length requirement in meters' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  vehicleLength?: number;
}
