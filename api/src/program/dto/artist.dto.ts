import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new artist
 */
export class CreateArtistDto {
  @ApiProperty({
    description: 'Artist name',
    example: 'The Weeknd',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Music genre',
    example: 'R&B / Pop',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiPropertyOptional({
    description: 'Artist biography',
    example: 'Abel Makkonen Tesfaye, known professionally as the Weeknd...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'URL to artist image',
    example: 'https://example.com/artist.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Spotify profile URL',
    example: 'https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ',
  })
  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL',
    example: 'https://instagram.com/theweeknd',
  })
  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  @ApiPropertyOptional({
    description: 'Official website URL',
    example: 'https://theweeknd.com',
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;
}

/**
 * DTO for updating an artist
 */
export class UpdateArtistDto extends PartialType(CreateArtistDto) {}

/**
 * DTO for artist query parameters
 */
export class ArtistQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name or genre',
    example: 'rock',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by genre',
    example: 'Electronic',
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;
}

/**
 * Artist response DTO
 */
export class ArtistResponseDto {
  @ApiProperty({ description: 'Artist UUID' })
  id: string;

  @ApiProperty({ description: 'Artist name' })
  name: string;

  @ApiPropertyOptional({ description: 'Music genre' })
  genre?: string;

  @ApiPropertyOptional({ description: 'Artist biography' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Artist image URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Spotify profile URL' })
  spotifyUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'Official website URL' })
  websiteUrl?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Paginated artists response
 */
export class PaginatedArtistsDto {
  @ApiProperty({ type: [ArtistResponseDto] })
  data: ArtistResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
