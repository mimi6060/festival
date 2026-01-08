import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PoiType } from '@prisma/client';

/**
 * DTO for querying POIs with filters
 */
export class PoiQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by POI type',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  @IsOptional()
  @IsEnum(PoiType)
  type?: PoiType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (default: 50, max: 100)',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Center latitude for proximity search',
    example: 48.8566,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  nearLatitude?: number;

  @ApiPropertyOptional({
    description: 'Center longitude for proximity search',
    example: 2.3522,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  nearLongitude?: number;

  @ApiPropertyOptional({
    description: 'Radius in meters for proximity search (default: 1000)',
    example: 500,
    minimum: 1,
    maximum: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000)
  @Type(() => Number)
  radiusMeters?: number = 1000;
}
