import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ExportFormat, ExportSection } from '../interfaces';

export class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date for the query range',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for the query range',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SalesQueryDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'Time period granularity',
    enum: ['hour', 'day', 'week', 'month'],
    default: 'day',
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  period?: 'hour' | 'day' | 'week' | 'month' = 'day';

  @ApiPropertyOptional({
    description: 'Filter by ticket category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class AttendanceQueryDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'Time period granularity',
    enum: ['hour', 'day'],
    default: 'hour',
  })
  @IsOptional()
  @IsEnum(['hour', 'day'])
  period?: 'hour' | 'day' = 'hour';

  @ApiPropertyOptional({
    description: 'Filter by zone ID',
  })
  @IsOptional()
  @IsString()
  zoneId?: string;
}

export class CashlessQueryDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;
}

export class ZoneQueryDto {
  @ApiPropertyOptional({
    description: 'Include historical data',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeHistory?: boolean = false;
}

export class ExportQueryDto extends DateRangeDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'xlsx', 'json'],
    default: 'csv',
  })
  @IsEnum(['csv', 'xlsx', 'json'])
  format: ExportFormat = 'csv';

  @ApiPropertyOptional({
    description: 'Sections to include in the export',
    type: [String],
    enum: ['overview', 'sales', 'attendance', 'cashless', 'zones', 'tickets'],
    default: ['overview', 'sales'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['overview', 'sales', 'attendance', 'cashless', 'zones', 'tickets'], { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  sections?: ExportSection[] = ['overview', 'sales'];

  @ApiPropertyOptional({
    description: 'Include detailed breakdown',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDetails?: boolean = false;
}
