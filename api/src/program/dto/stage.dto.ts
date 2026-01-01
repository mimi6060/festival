import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new stage
 */
export class CreateStageDto {
  @ApiProperty({
    description: 'Stage name',
    example: 'Main Stage',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Stage description',
    example: 'The main performance area with capacity for 50,000 people',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Stage capacity (number of people)',
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Stage location within the festival',
    example: 'North Field',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

/**
 * DTO for updating a stage
 */
export class UpdateStageDto extends PartialType(CreateStageDto) {}

/**
 * DTO for stage query parameters
 */
export class StageQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name or location',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
 * Stage response DTO
 */
export class StageResponseDto {
  @ApiProperty({ description: 'Stage UUID' })
  id: string;

  @ApiProperty({ description: 'Festival UUID' })
  festivalId: string;

  @ApiProperty({ description: 'Stage name' })
  name: string;

  @ApiPropertyOptional({ description: 'Stage description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Stage capacity' })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Stage location within festival' })
  location?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Paginated stages response
 */
export class PaginatedStagesDto {
  @ApiProperty({ type: [StageResponseDto] })
  data: StageResponseDto[];

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
