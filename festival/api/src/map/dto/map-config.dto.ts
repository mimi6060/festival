import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MapBoundsDto {
  @ApiProperty({
    description: 'South-west corner latitude',
    example: 48.8466,
  })
  southWestLat: number;

  @ApiProperty({
    description: 'South-west corner longitude',
    example: 2.3322,
  })
  southWestLng: number;

  @ApiProperty({
    description: 'North-east corner latitude',
    example: 48.8666,
  })
  northEastLat: number;

  @ApiProperty({
    description: 'North-east corner longitude',
    example: 2.3722,
  })
  northEastLng: number;
}

export class MapCenterDto {
  @ApiProperty({
    description: 'Center latitude',
    example: 48.8566,
  })
  latitude: number;

  @ApiProperty({
    description: 'Center longitude',
    example: 2.3522,
  })
  longitude: number;
}

export class MapConfigResponseDto {
  @ApiProperty({
    description: 'Festival ID',
  })
  festivalId: string;

  @ApiProperty({
    description: 'Festival name',
  })
  festivalName: string;

  @ApiProperty({
    description: 'Map center coordinates',
    type: MapCenterDto,
  })
  center: MapCenterDto;

  @ApiProperty({
    description: 'Map bounds based on POI locations',
    type: MapBoundsDto,
  })
  bounds: MapBoundsDto;

  @ApiProperty({
    description: 'Recommended default zoom level',
    example: 16,
  })
  defaultZoom: number;

  @ApiProperty({
    description: 'Minimum allowed zoom level',
    example: 14,
  })
  minZoom: number;

  @ApiProperty({
    description: 'Maximum allowed zoom level',
    example: 20,
  })
  maxZoom: number;

  @ApiPropertyOptional({
    description: 'Custom map style URL (optional)',
    example: 'mapbox://styles/festival/map-style',
  })
  mapStyleUrl?: string;

  @ApiProperty({
    description: 'Total number of POIs on the map',
    example: 45,
  })
  totalPois: number;

  @ApiProperty({
    description: 'Count of POIs by type',
    example: { STAGE: 3, FOOD: 15, DRINK: 8, TOILET: 10 },
  })
  poiCountByType: Record<string, number>;
}
