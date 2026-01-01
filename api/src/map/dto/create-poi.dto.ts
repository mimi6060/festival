import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUrl,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';

export class CreatePoiDto {
  @ApiProperty({
    description: 'Name of the Point of Interest',
    example: 'Main Stage',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the POI',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  @IsEnum(PoiType)
  type: PoiType;

  @ApiPropertyOptional({
    description: 'Description of the POI',
    example: 'The main stage for headliner performances',
  })
  @IsString()
  @IsOptional()
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
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'URL to the POI icon',
    example: 'https://example.com/icons/stage.png',
  })
  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the POI',
    example: { capacity: 5000, sponsor: 'RedBull' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
