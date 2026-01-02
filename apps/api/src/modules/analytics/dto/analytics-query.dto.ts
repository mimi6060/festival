import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base query DTO for time-based analytics
 */
export class AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Start date for the analytics period (ISO 8601)',
    example: '2024-07-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for the analytics period (ISO 8601)',
    example: '2024-07-07T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Dashboard KPIs query
 */
export class DashboardQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Include trend data for charts',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTrends?: boolean = true;
}

/**
 * Sales analytics query
 */
export class SalesQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Group sales by time period',
    enum: ['hour', 'day', 'week'],
    default: 'day',
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week'])
  groupBy?: 'hour' | 'day' | 'week' = 'day';

  @ApiPropertyOptional({
    description: 'Filter by ticket category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Include comparison with previous period',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeComparison?: boolean = false;

  @ApiPropertyOptional({
    description: 'Comparison type',
    enum: ['previous_day', 'previous_week', 'previous_edition'],
  })
  @IsOptional()
  @IsEnum(['previous_day', 'previous_week', 'previous_edition'])
  comparisonType?: 'previous_day' | 'previous_week' | 'previous_edition';
}

/**
 * Cashless analytics query
 */
export class CashlessQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: ['TOPUP', 'PAYMENT', 'REFUND', 'TRANSFER'],
  })
  @IsOptional()
  @IsEnum(['TOPUP', 'PAYMENT', 'REFUND', 'TRANSFER'])
  transactionType?: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'TRANSFER';

  @ApiPropertyOptional({
    description: 'Filter by vendor ID (for payments)',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Group transactions by time period',
    enum: ['hour', 'day'],
    default: 'hour',
  })
  @IsOptional()
  @IsEnum(['hour', 'day'])
  groupBy?: 'hour' | 'day' = 'hour';
}

/**
 * Attendance analytics query
 */
export class AttendanceQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Time granularity for attendance data',
    enum: ['15min', '30min', 'hour', 'day'],
    default: 'hour',
  })
  @IsOptional()
  @IsEnum(['15min', '30min', 'hour', 'day'])
  granularity?: '15min' | '30min' | 'hour' | 'day' = 'hour';

  @ApiPropertyOptional({
    description: 'Include flow analysis (entries/exits over time)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeFlow?: boolean = true;
}

/**
 * Zone analytics query
 */
export class ZoneQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by specific zone ID',
  })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({
    description: 'Include heatmap data',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeHeatmap?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include zone transition analysis',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTransitions?: boolean = false;
}

/**
 * Vendor analytics query
 */
export class VendorQueryDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by vendor ID',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by vendor type',
    enum: ['FOOD', 'DRINK', 'MERCHANDISE'],
  })
  @IsOptional()
  @IsEnum(['FOOD', 'DRINK', 'MERCHANDISE'])
  vendorType?: 'FOOD' | 'DRINK' | 'MERCHANDISE';

  @ApiPropertyOptional({
    description: 'Number of top vendors to return',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  topLimit?: number = 10;

  @ApiPropertyOptional({
    description: 'Number of top products to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  topProductsLimit?: number = 20;
}

/**
 * Real-time analytics query
 */
export class RealtimeQueryDto {
  @ApiPropertyOptional({
    description: 'Include real-time alerts',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAlerts?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include zone breakdown',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeZones?: boolean = true;
}

/**
 * Export analytics data
 */
export class ExportQueryDto extends AnalyticsTimeRangeDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'pdf'],
  })
  @IsEnum(['csv', 'pdf'])
  format!: 'csv' | 'pdf';

  @ApiProperty({
    description: 'Type of data to export',
    enum: ['dashboard', 'sales', 'cashless', 'attendance', 'zones', 'vendors'],
  })
  @IsEnum(['dashboard', 'sales', 'cashless', 'attendance', 'zones', 'vendors'])
  dataType!: 'dashboard' | 'sales' | 'cashless' | 'attendance' | 'zones' | 'vendors';

  @ApiPropertyOptional({
    description: 'Include charts in PDF export',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCharts?: boolean = false;
}

/**
 * Alert threshold configuration
 */
export class AlertThresholdsDto {
  @ApiPropertyOptional({
    description: 'Capacity warning threshold (percentage)',
    default: 80,
    minimum: 50,
    maximum: 95,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(50)
  @Max(95)
  capacityWarning?: number = 80;

  @ApiPropertyOptional({
    description: 'Capacity critical threshold (percentage)',
    default: 95,
    minimum: 80,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(80)
  @Max(100)
  capacityCritical?: number = 95;

  @ApiPropertyOptional({
    description: 'Zone capacity warning threshold (percentage)',
    default: 85,
    minimum: 50,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(50)
  @Max(100)
  zoneCapacityWarning?: number = 85;

  @ApiPropertyOptional({
    description: 'Sales drop threshold (percentage drop from average)',
    default: 30,
    minimum: 10,
    maximum: 80,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(10)
  @Max(80)
  salesDropThreshold?: number = 30;

  @ApiPropertyOptional({
    description: 'Sales spike threshold (percentage increase from average)',
    default: 50,
    minimum: 20,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(20)
  @Max(200)
  salesSpikeThreshold?: number = 50;
}
