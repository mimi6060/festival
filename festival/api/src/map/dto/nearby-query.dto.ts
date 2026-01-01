import {
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PoiType } from '@prisma/client';

export class NearbyQueryDto {
  @ApiProperty({
    description: 'Latitude of the center point',
    example: 48.8566,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the center point',
    example: 2.3522,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Search radius in meters (default: 500m, max: 5000m)',
    example: 500,
    default: 500,
    minimum: 10,
    maximum: 5000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(5000)
  @IsOptional()
  radius?: number = 500;

  @ApiPropertyOptional({
    description: 'Filter by POI type',
    enum: PoiType,
    example: PoiType.FOOD,
  })
  @IsEnum(PoiType)
  @IsOptional()
  type?: PoiType;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 10,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
