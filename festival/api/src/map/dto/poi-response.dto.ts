import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';

export class PoiResponseDto {
  @ApiProperty({
    description: 'POI unique identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Festival ID this POI belongs to',
  })
  festivalId: string;

  @ApiProperty({
    description: 'Name of the Point of Interest',
    example: 'Main Stage',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the POI',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  type: PoiType;

  @ApiPropertyOptional({
    description: 'Description of the POI',
    example: 'The main stage for headliner performances',
  })
  description?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
  })
  longitude: number;

  @ApiPropertyOptional({
    description: 'URL to the POI icon',
  })
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the POI',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the POI is active',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class NearbyPoiResponseDto extends PoiResponseDto {
  @ApiProperty({
    description: 'Distance from the search point in meters',
    example: 150.5,
  })
  distance: number;
}
