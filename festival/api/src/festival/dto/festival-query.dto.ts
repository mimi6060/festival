import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FestivalStatus } from '../entities/festival.entity';

/**
 * Sort order enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Available fields for sorting
 */
export enum FestivalSortField {
  NAME = 'name',
  START_DATE = 'startDate',
  END_DATE = 'endDate',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  MAX_CAPACITY = 'maxCapacity',
  CURRENT_ATTENDEES = 'currentAttendees',
}

/**
 * DTO for festival list query parameters (filtering, pagination, sorting)
 */
export class FestivalQueryDto {
  // Pagination
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Sorting
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: FestivalSortField,
    default: FestivalSortField.START_DATE,
  })
  @IsOptional()
  @IsEnum(FestivalSortField)
  sortBy?: FestivalSortField = FestivalSortField.START_DATE;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  // Filters
  @ApiPropertyOptional({
    description: 'Search term (searches in name, description, location)',
    example: 'rock',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by festival status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(FestivalStatus)
  status?: FestivalStatus;

  @ApiPropertyOptional({
    description: 'Filter by multiple statuses (comma-separated)',
    example: 'PUBLISHED,ONGOING',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(',').map((s: string) => s.trim()))
  statuses?: FestivalStatus[];

  @ApiPropertyOptional({
    description: 'Filter festivals starting after this date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter festivals starting before this date (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter festivals ending after this date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter festivals ending before this date (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by organizer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by location (partial match)',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  location?: string;

  @ApiPropertyOptional({
    description: 'Include only upcoming festivals (startDate > now)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  upcoming?: boolean;

  @ApiPropertyOptional({
    description: 'Include only ongoing festivals (startDate <= now <= endDate)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ongoing?: boolean;

  @ApiPropertyOptional({
    description: 'Include only past festivals (endDate < now)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  past?: boolean;

  @ApiPropertyOptional({
    description: 'Include deleted festivals (admin only)',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false;
}
