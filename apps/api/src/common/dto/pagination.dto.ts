import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Pagination query parameters DTO
 * @description Used for paginated list endpoints
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * Paginated response wrapper
 * @description Generic wrapper for paginated responses
 */
export class PaginatedResponseDto<T> {
  data!: T[];

  @ApiPropertyOptional({
    description: 'Total number of items',
    example: 150,
  })
  total!: number;

  @ApiPropertyOptional({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  limit!: number;

  @ApiPropertyOptional({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages!: number;

  @ApiPropertyOptional({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage!: boolean;

  @ApiPropertyOptional({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage!: boolean;
}
