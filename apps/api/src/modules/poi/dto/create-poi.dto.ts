import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PoiType } from '@prisma/client';

/**
 * DTO for creating a new Point of Interest
 */
export class CreatePoiDto {
  @ApiProperty({
    description: 'POI name',
    example: 'Main Stage',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({
    description: 'POI type',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  @IsEnum(PoiType)
  type!: PoiType;

  @ApiPropertyOptional({
    description: 'POI description',
    example: 'The main stage for headliner performances',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
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
  @Type(() => Number)
  longitude!: number;

  @ApiPropertyOptional({
    description: 'URL to the POI icon image',
    example: 'https://example.com/icons/stage.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the POI (JSON object)',
    example: { openingHours: '10:00-02:00', accessibility: true },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether the POI is active/visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
