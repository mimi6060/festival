import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// Enum matching Prisma schema
export enum AccommodationType {
  TENT = 'TENT',
  CARAVAN = 'CARAVAN',
  GLAMPING = 'GLAMPING',
  CABIN = 'CABIN',
  CAMPERVAN = 'CAMPERVAN',
}

// ===== Camping Zone DTOs =====

export class CreateCampingZoneDto {
  @ApiProperty({ description: 'Festival ID' })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({
    description: 'Zone name',
    example: 'Zone A - Tentes',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Zone description',
    example: 'Zone ombragee proche des sanitaires',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Accommodation type',
    enum: AccommodationType,
    example: AccommodationType.TENT,
  })
  @IsEnum(AccommodationType)
  type!: AccommodationType;

  @ApiProperty({
    description: 'Total capacity (number of spots)',
    example: 50,
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity!: number;

  @ApiProperty({
    description: 'Price per night in EUR',
    example: 25.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  pricePerNight!: number;

  @ApiPropertyOptional({
    description: 'Available amenities',
    example: ['electricity', 'water', 'wifi', 'showers'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'Zone-specific rules',
    example: 'Silence apres 23h. Animaux non autorises.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rules?: string;

  @ApiPropertyOptional({
    description: 'Latitude for map display',
    example: 48.8566,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for map display',
    example: 2.3522,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Image URL',
    example: 'https://cdn.festival.com/zones/zone-a.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCampingZoneDto extends PartialType(CreateCampingZoneDto) {
  @ApiPropertyOptional({
    description: 'Whether the zone is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CampingZoneResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  festivalId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: AccommodationType })
  type!: AccommodationType;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  pricePerNight!: number;

  @ApiProperty({ type: [String] })
  amenities!: string[];

  @ApiPropertyOptional()
  rules?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Computed fields
  @ApiPropertyOptional({ description: 'Number of spots in this zone' })
  spotsCount?: number;

  @ApiPropertyOptional({ description: 'Number of available spots' })
  availableSpotsCount?: number;
}

export class CampingZoneQueryDto {
  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by accommodation type',
    enum: AccommodationType,
  })
  @IsOptional()
  @IsEnum(AccommodationType)
  type?: AccommodationType;

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

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'sortOrder',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
