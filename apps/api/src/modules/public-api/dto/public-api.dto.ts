import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// Query DTOs
// ============================================================================

export class PublicPaginationDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PublicFestivalsQueryDto extends PublicPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status (upcoming, ongoing, past)' })
  @IsOptional()
  @IsString()
  status?: 'upcoming' | 'ongoing' | 'past';

  @ApiPropertyOptional({ description: 'Filter by country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PublicScheduleQueryDto extends PublicPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by stage ID' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Filter by artist ID' })
  @IsOptional()
  @IsString()
  artistId?: string;
}

export class PublicArtistsQueryDto extends PublicPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by genre' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class PublicMetaDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

export class PublicPaginatedResponseDto<T> {
  data: T[];
  meta: PublicMetaDto;
}

export class PublicFestivalDto {
  @ApiProperty({ description: 'Festival ID' })
  id: string;

  @ApiProperty({ description: 'Festival name' })
  name: string;

  @ApiProperty({ description: 'Festival slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Festival description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Festival website URL' })
  websiteUrl?: string;

  @ApiProperty({ description: 'Start date' })
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  endDate: Date;

  @ApiPropertyOptional({ description: 'Location/venue name' })
  location?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Festival cover image URL' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Festival logo URL' })
  logoUrl?: string;

  @ApiProperty({ description: 'Whether the festival is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Number of artists' })
  artistCount: number;

  @ApiProperty({ description: 'Number of stages' })
  stageCount: number;
}

export class PublicArtistDto {
  @ApiProperty({ description: 'Artist ID' })
  id: string;

  @ApiProperty({ description: 'Artist name' })
  name: string;

  @ApiPropertyOptional({ description: 'Artist bio' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Genre' })
  genre?: string;

  @ApiPropertyOptional({ description: 'Country of origin' })
  country?: string;

  @ApiPropertyOptional({ description: 'Artist photo URL' })
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Spotify URL' })
  spotifyUrl?: string;

  @ApiPropertyOptional({ description: 'Apple Music URL' })
  appleMusicUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram handle' })
  instagram?: string;

  @ApiPropertyOptional({ description: 'Twitter/X handle' })
  twitter?: string;
}

export class PublicStageDto {
  @ApiProperty({ description: 'Stage ID' })
  id: string;

  @ApiProperty({ description: 'Stage name' })
  name: string;

  @ApiPropertyOptional({ description: 'Stage description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Stage capacity' })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Stage location/area' })
  location?: string;

  @ApiPropertyOptional({ description: 'Stage image URL' })
  imageUrl?: string;
}

export class PublicPerformanceDto {
  @ApiProperty({ description: 'Performance ID' })
  id: string;

  @ApiProperty({ description: 'Stage ID' })
  stageId: string;

  @ApiProperty({ description: 'Stage name' })
  stageName: string;

  @ApiProperty({ description: 'Artist ID' })
  artistId: string;

  @ApiProperty({ description: 'Artist name' })
  artistName: string;

  @ApiProperty({ description: 'Start time' })
  startTime: Date;

  @ApiProperty({ description: 'End time' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Performance description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is a headline performance' })
  isHeadliner?: boolean;
}

export class PublicVenueDto {
  @ApiProperty({ description: 'Venue/POI ID' })
  id: string;

  @ApiProperty({ description: 'Venue name' })
  name: string;

  @ApiProperty({ description: 'Venue type (stage, food, restroom, etc.)' })
  type: string;

  @ApiPropertyOptional({ description: 'Venue description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  icon?: string;
}

export class PublicTicketCategoryDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string;

  @ApiProperty({ description: 'Price in cents' })
  price: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Whether tickets are available' })
  available: boolean;

  @ApiPropertyOptional({ description: 'Number of tickets remaining' })
  remaining?: number;

  @ApiPropertyOptional({ description: 'Sale start date' })
  saleStart?: Date;

  @ApiPropertyOptional({ description: 'Sale end date' })
  saleEnd?: Date;
}
