import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';

/**
 * Entity representing a Point of Interest
 */
export class PoiEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival ID this POI belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'POI name',
    example: 'Main Stage',
  })
  name!: string;

  @ApiProperty({
    description: 'POI type',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  type!: PoiType;

  @ApiPropertyOptional({
    description: 'POI description',
    example: 'The main stage for headliner performances',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
  })
  longitude!: number;

  @ApiPropertyOptional({
    description: 'URL to the POI icon image',
    example: 'https://example.com/icons/stage.png',
  })
  iconUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { openingHours: '10:00-02:00' },
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Whether the POI is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Entity representing a POI with festival relation
 */
export class PoiWithFestivalEntity extends PoiEntity {
  @ApiProperty({
    description: 'Festival information',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Summer Festival 2024',
      organizerId: '550e8400-e29b-41d4-a716-446655440002',
    },
  })
  festival!: {
    id: string;
    name: string;
    organizerId: string;
  };
}

/**
 * Entity representing POI categories with counts
 */
export class PoiCategoryCountEntity {
  @ApiProperty({
    description: 'POI type',
    enum: PoiType,
    example: PoiType.STAGE,
  })
  type!: PoiType;

  @ApiProperty({
    description: 'Count of POIs of this type',
    example: 5,
  })
  count!: number;
}
