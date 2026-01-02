import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsUrl,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Festival status enumeration
 */
export enum FestivalStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Festival location DTO
 */
export class FestivalLocationDto {
  @ApiProperty({
    description: 'Venue name',
    example: 'Parc des Expositions',
  })
  @IsString()
  @IsNotEmpty()
  venueName!: string;

  @ApiProperty({
    description: 'Street address',
    example: '1 Place de la Porte de Versailles',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    description: 'City',
    example: 'Paris',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({
    description: 'State/Province/Region',
    example: 'Ile-de-France',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Country (ISO 3166-1 alpha-2)',
    example: 'FR',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country!: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '75015',
  })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 48.8323,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 2.2885,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

/**
 * Create festival DTO
 */
export class CreateFestivalDto {
  @ApiProperty({
    description: 'Festival name',
    example: 'Summer Vibes Festival 2025',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'summer-vibes-festival-2025',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    description: 'Short description (for previews)',
    example: 'The biggest electronic music festival in France',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  shortDescription!: string;

  @ApiPropertyOptional({
    description: 'Full description (supports Markdown)',
    example: '## About Summer Vibes\n\nJoin us for 3 days of incredible music...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Festival start date and time (ISO 8601)',
    example: '2025-07-15T14:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Festival end date and time (ISO 8601)',
    example: '2025-07-17T23:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    description: 'Festival location',
    type: FestivalLocationDto,
  })
  @ValidateNested()
  @Type(() => FestivalLocationDto)
  location!: FestivalLocationDto;

  @ApiPropertyOptional({
    description: 'Maximum attendee capacity',
    example: 50000,
    minimum: 1,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Festival website URL',
    example: 'https://summervibes.example.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://cdn.example.com/festivals/summer-vibes-cover.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Logo image URL',
    example: 'https://cdn.example.com/festivals/summer-vibes-logo.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Primary theme color (hex)',
    example: '#FF6B35',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Festival tags for categorization',
    example: ['electronic', 'techno', 'house', 'outdoor'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Contact email for the festival',
    example: 'contact@summervibes.com',
    format: 'email',
  })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Support phone number',
    example: '+33123456789',
  })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the festival (IANA timezone)',
    example: 'Europe/Paris',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Default currency for prices (ISO 4217)',
    example: 'EUR',
    default: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;
}

/**
 * Update festival DTO
 */
export class UpdateFestivalDto extends PartialType(
  OmitType(CreateFestivalDto, ['slug'] as const),
) {
  @ApiPropertyOptional({
    description: 'Festival status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(FestivalStatus)
  status?: FestivalStatus;
}

/**
 * Festival statistics DTO
 */
export class FestivalStatsDto {
  @ApiProperty({
    description: 'Total tickets sold',
    example: 25430,
  })
  ticketsSold!: number;

  @ApiProperty({
    description: 'Total revenue in cents',
    example: 2543000,
  })
  totalRevenue!: number;

  @ApiProperty({
    description: 'Number of ticket categories',
    example: 5,
  })
  ticketCategories!: number;

  @ApiProperty({
    description: 'Number of active cashless accounts',
    example: 18500,
  })
  cashlessAccounts!: number;

  @ApiProperty({
    description: 'Total cashless transactions',
    example: 125000,
  })
  cashlessTransactions!: number;

  @ApiProperty({
    description: 'Percentage of capacity sold',
    example: 50.86,
  })
  capacityPercentage!: number;

  @ApiProperty({
    description: 'Check-in rate percentage',
    example: 75.5,
  })
  checkInRate!: number;
}

/**
 * Festival response DTO
 */
export class FestivalResponseDto {
  @ApiProperty({
    description: 'Festival unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival name',
    example: 'Summer Vibes Festival 2025',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'summer-vibes-festival-2025',
  })
  slug!: string;

  @ApiProperty({
    description: 'Short description',
    example: 'The biggest electronic music festival in France',
  })
  shortDescription!: string;

  @ApiPropertyOptional({
    description: 'Full description',
    example: '## About Summer Vibes\n\nJoin us for 3 days of incredible music...',
  })
  description?: string;

  @ApiProperty({
    description: 'Festival start date',
    example: '2025-07-15T14:00:00.000Z',
  })
  startDate!: Date;

  @ApiProperty({
    description: 'Festival end date',
    example: '2025-07-17T23:00:00.000Z',
  })
  endDate!: Date;

  @ApiProperty({
    description: 'Festival location',
    type: FestivalLocationDto,
  })
  location!: FestivalLocationDto;

  @ApiProperty({
    description: 'Festival status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  status!: FestivalStatus;

  @ApiPropertyOptional({
    description: 'Maximum capacity',
    example: 50000,
  })
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://cdn.example.com/festivals/summer-vibes-cover.jpg',
  })
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://cdn.example.com/festivals/summer-vibes-logo.png',
  })
  logo?: string;

  @ApiPropertyOptional({
    description: 'Primary color',
    example: '#FF6B35',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Tags',
    example: ['electronic', 'techno'],
  })
  tags?: string[];

  @ApiProperty({
    description: 'Currency',
    example: 'EUR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Timezone',
    example: 'Europe/Paris',
  })
  timezone!: string;

  @ApiProperty({
    description: 'Organizer user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  organizerId!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-02T12:00:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Festival list query DTO
 */
export class FestivalQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name',
    example: 'summer',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(FestivalStatus)
  status?: FestivalStatus;

  @ApiPropertyOptional({
    description: 'Filter by country (ISO code)',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (from)',
    example: '2025-06-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (to)',
    example: '2025-08-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'electronic,outdoor',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'startDate',
    enum: ['name', 'startDate', 'createdAt', 'capacity'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
