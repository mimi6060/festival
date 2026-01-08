import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Max,
  Min,
  MinLength,
  IsEnum,
} from 'class-validator';

/**
 * Sort options for program search results.
 */
export enum ProgramSortBy {
  START_TIME = 'startTime',
  ARTIST_NAME = 'artistName',
  STAGE_NAME = 'stageName',
}

/**
 * Sort order.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for searching the festival program.
 * Supports filtering by query string, genre, date, and stage.
 */
export class ProgramSearchDto {
  @ApiProperty({
    description: 'Festival ID to search within',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'festivalId must be a valid UUID' })
  festivalId!: string;

  @ApiPropertyOptional({
    description: 'Search query (matches artist name or description, minimum 2 characters)',
    example: 'Daft Punk',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by genre (partial match, case insensitive)',
    example: 'Electronic',
  })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiPropertyOptional({
    description: 'Filter by date (YYYY-MM-DD format)',
    example: '2026-07-15',
  })
  @IsDateString({}, { message: 'date must be a valid date in YYYY-MM-DD format' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter by stage ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'stageId must be a valid UUID' })
  @IsOptional()
  stageId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ProgramSortBy,
    default: ProgramSortBy.START_TIME,
    example: ProgramSortBy.START_TIME,
  })
  @IsEnum(ProgramSortBy, { message: 'sortBy must be a valid field' })
  @IsOptional()
  sortBy?: ProgramSortBy = ProgramSortBy.START_TIME;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
    example: SortOrder.ASC,
  })
  @IsEnum(SortOrder, { message: 'sortOrder must be asc or desc' })
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.ASC;

  /**
   * Calculate the number of records to skip for pagination.
   */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }

  /**
   * Get the number of records to take.
   */
  get take(): number {
    return this.limit || 20;
  }
}

/**
 * Search result item for a performance.
 */
export class ProgramSearchResultDto {
  @ApiProperty({ description: 'Performance ID' })
  id!: string;

  @ApiProperty({ description: 'Artist information' })
  artist!: {
    id: string;
    name: string;
    genre: string | null;
    imageUrl: string | null;
  };

  @ApiProperty({ description: 'Stage information' })
  stage!: {
    id: string;
    name: string;
    location: string | null;
    capacity: number | null;
  };

  @ApiProperty({ description: 'Performance start time (ISO 8601)' })
  startTime!: string;

  @ApiProperty({ description: 'Performance end time (ISO 8601)' })
  endTime!: string;

  @ApiProperty({ description: 'Performance description', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Day of the performance' })
  day!: string;

  @ApiProperty({ description: 'Whether the performance is cancelled' })
  isCancelled!: boolean;

  @ApiPropertyOptional({ description: 'Whether this artist is a user favorite' })
  isFavorite?: boolean;
}

/**
 * Paginated response for program search.
 */
export class PaginatedProgramSearchResponse {
  @ApiProperty({ type: [ProgramSearchResultDto], description: 'Search results' })
  data!: ProgramSearchResultDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: false,
    },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
