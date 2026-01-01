import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ArtistResponseDto } from './artist.dto';
import { StageResponseDto } from './stage.dto';

/**
 * DTO for creating a new performance
 */
export class CreatePerformanceDto {
  @ApiProperty({
    description: 'Artist UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  artistId: string;

  @ApiProperty({
    description: 'Stage UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  stageId: string;

  @ApiProperty({
    description: 'Performance start time (ISO 8601)',
    example: '2025-07-15T20:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Performance end time (ISO 8601)',
    example: '2025-07-15T22:00:00Z',
  })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Additional performance description',
    example: 'Special acoustic set featuring new material',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

/**
 * DTO for updating a performance
 */
export class UpdatePerformanceDto extends PartialType(CreatePerformanceDto) {
  @ApiPropertyOptional({
    description: 'Whether the performance is cancelled',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}

/**
 * DTO for performance query parameters
 */
export class PerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by artist ID',
  })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({
    description: 'Filter by stage ID',
  })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({
    description: 'Filter performances starting from this date',
    example: '2025-07-15',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter performances until this date',
    example: '2025-07-16',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Include cancelled performances',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCancelled?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 50,
  })
  @IsOptional()
  limit?: number = 50;
}

/**
 * Performance response DTO
 */
export class PerformanceResponseDto {
  @ApiProperty({ description: 'Performance UUID' })
  id: string;

  @ApiProperty({ description: 'Artist UUID' })
  artistId: string;

  @ApiProperty({ description: 'Stage UUID' })
  stageId: string;

  @ApiProperty({ description: 'Performance start time' })
  startTime: Date;

  @ApiProperty({ description: 'Performance end time' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Performance description' })
  description?: string;

  @ApiProperty({ description: 'Whether the performance is cancelled' })
  isCancelled: boolean;

  @ApiPropertyOptional({ description: 'Artist details', type: ArtistResponseDto })
  artist?: ArtistResponseDto;

  @ApiPropertyOptional({ description: 'Stage details', type: StageResponseDto })
  stage?: StageResponseDto;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Paginated performances response
 */
export class PaginatedPerformancesDto {
  @ApiProperty({ type: [PerformanceResponseDto] })
  data: PerformanceResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
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
