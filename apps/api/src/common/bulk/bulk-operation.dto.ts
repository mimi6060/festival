import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Bulk operation types
 */
export enum BulkOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPSERT = 'UPSERT',
}

/**
 * Bulk operation status
 */
export enum BulkOperationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

/**
 * Individual operation result status
 */
export enum OperationResultStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Base DTO for bulk operations
 */
export class BulkOperationDto<T = Record<string, unknown>> {
  @ApiProperty({
    description: 'Type of bulk operation',
    enum: BulkOperationType,
    example: BulkOperationType.CREATE,
  })
  @IsEnum(BulkOperationType)
  @IsNotEmpty()
  operation!: BulkOperationType;

  @ApiProperty({
    description: 'Array of items to process',
    type: 'array',
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ArrayMaxSize(1000, { message: 'Maximum 1000 items per bulk operation' })
  @ValidateNested({ each: true })
  items!: T[];

  @ApiPropertyOptional({
    description: 'Continue processing on individual item failures',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;

  @ApiPropertyOptional({
    description: 'Use database transaction for atomic operations',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  atomic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Validate all items before processing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validateFirst?: boolean = true;
}

/**
 * Bulk delete operation DTO
 */
export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of IDs to delete',
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ID is required' })
  @ArrayMaxSize(1000, { message: 'Maximum 1000 items per bulk delete' })
  @IsUUID('4', { each: true, message: 'All IDs must be valid UUIDs' })
  ids!: string[];

  @ApiPropertyOptional({
    description: 'Soft delete instead of hard delete',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  softDelete?: boolean = true;

  @ApiPropertyOptional({
    description: 'Continue processing on individual failures',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;
}

/**
 * Bulk update operation DTO
 */
export class BulkUpdateItemDto {
  @ApiProperty({
    description: 'ID of the item to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'Fields to update',
    type: 'object',
  })
  @IsNotEmpty()
  data!: Record<string, unknown>;
}

export class BulkUpdateDto {
  @ApiProperty({
    description: 'Array of items with ID and update data',
    type: [BulkUpdateItemDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  items!: BulkUpdateItemDto[];

  @ApiPropertyOptional({
    description: 'Continue processing on individual failures',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;

  @ApiPropertyOptional({
    description: 'Use atomic transaction',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  atomic?: boolean = false;
}

/**
 * Individual operation result
 */
export class OperationResult {
  @ApiProperty({
    description: 'Index of the item in the original array',
    example: 0,
  })
  index!: number;

  @ApiPropertyOptional({
    description: 'ID of the processed item (if applicable)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id?: string;

  @ApiProperty({
    description: 'Status of this operation',
    enum: OperationResultStatus,
    example: OperationResultStatus.SUCCESS,
  })
  status!: OperationResultStatus;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Validation error: email is required',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Created or updated data',
    type: 'object',
  })
  data?: Record<string, unknown>;
}

/**
 * Bulk operation response DTO
 */
export class BulkOperationResponseDto {
  @ApiProperty({
    description: 'Overall operation status',
    enum: BulkOperationStatus,
    example: BulkOperationStatus.COMPLETED,
  })
  status!: BulkOperationStatus;

  @ApiProperty({
    description: 'Total number of items processed',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of successful operations',
    example: 98,
  })
  successful!: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 2,
  })
  failed!: number;

  @ApiProperty({
    description: 'Number of skipped operations',
    example: 0,
  })
  skipped!: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1234,
  })
  processingTimeMs!: number;

  @ApiProperty({
    description: 'Individual operation results',
    type: [OperationResult],
  })
  results!: OperationResult[];

  @ApiPropertyOptional({
    description: 'Summary of errors encountered',
    type: 'object',
  })
  errorSummary?: Record<string, number>;
}

/**
 * Bulk import CSV/JSON DTO
 */
export class BulkImportDto {
  @ApiProperty({
    description: 'Import format',
    enum: ['csv', 'json'],
    example: 'json',
  })
  @IsEnum(['csv', 'json'])
  @IsNotEmpty()
  format!: 'csv' | 'json';

  @ApiProperty({
    description: 'Raw data to import (CSV string or JSON string)',
    example: '[{"email":"user@example.com","firstName":"John"}]',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000000) // 10MB max
  data!: string;

  @ApiPropertyOptional({
    description: 'Field mapping (for CSV imports)',
    type: 'object',
    example: { email: 0, firstName: 1, lastName: 2 },
  })
  @IsOptional()
  fieldMapping?: Record<string, number | string>;

  @ApiPropertyOptional({
    description: 'Skip first row (header row for CSV)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  skipHeader?: boolean = true;

  @ApiPropertyOptional({
    description: 'Update existing records on conflict',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  upsert?: boolean = false;
}

/**
 * Bulk export query DTO
 */
export class BulkExportDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'json', 'xlsx'],
    example: 'csv',
  })
  @IsEnum(['csv', 'json', 'xlsx'])
  @IsNotEmpty()
  format!: 'csv' | 'json' | 'xlsx';

  @ApiPropertyOptional({
    description: 'Fields to include in export',
    type: [String],
    example: ['id', 'email', 'firstName', 'lastName'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({
    description: 'Filter conditions',
    type: 'object',
  })
  @IsOptional()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Maximum number of records to export',
    example: 10000,
  })
  @IsOptional()
  limit?: number = 10000;
}
