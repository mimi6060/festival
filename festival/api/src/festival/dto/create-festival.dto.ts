import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsPositive,
  IsEmail,
  IsUrl,
  MaxLength,
  MinLength,
  IsEnum,
  IsTimeZone,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FestivalStatus } from '../entities/festival.entity';

/**
 * DTO for creating a new festival
 */
export class CreateFestivalDto {
  @ApiProperty({
    description: 'Festival name',
    example: 'Rock en Seine 2025',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Custom URL slug (auto-generated if not provided)',
    example: 'rock-en-seine-2025',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  @MaxLength(250)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Festival description',
    example: 'Le plus grand festival rock de la region parisienne',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Festival location/venue name',
    example: 'Domaine national de Saint-Cloud',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  location: string;

  @ApiPropertyOptional({
    description: 'Full address',
    example: '1 Avenue de la Grille d\'Honneur, 92210 Saint-Cloud',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiProperty({
    description: 'Festival start date and time (ISO 8601)',
    example: '2025-08-22T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Festival end date and time (ISO 8601)',
    example: '2025-08-24T23:59:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Maximum venue capacity',
    example: 40000,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxCapacity: number;

  @ApiPropertyOptional({
    description: 'Festival logo URL',
    example: 'https://cdn.example.com/logos/rock-en-seine.png',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Festival banner image URL',
    example: 'https://cdn.example.com/banners/rock-en-seine.jpg',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Official website URL',
    example: 'https://www.rockenseine.com',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@rockenseine.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Festival timezone (IANA timezone)',
    example: 'Europe/Paris',
    default: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'EUR',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid 3-letter ISO 4217 code',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Initial festival status',
    enum: FestivalStatus,
    default: FestivalStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(FestivalStatus)
  status?: FestivalStatus;
}
