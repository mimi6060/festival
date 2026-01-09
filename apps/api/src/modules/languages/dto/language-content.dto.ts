import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength, IsObject } from 'class-validator';
import { SupportedLanguage } from './festival-language-settings.dto';

/**
 * Create or update localized content DTO
 */
export class UpsertLocalizedContentDto {
  @ApiPropertyOptional({
    description: 'Localized festival name',
    example: 'Summer Vibes Festival 2025',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Localized full description (supports Markdown)',
    example: '## About Summer Vibes\n\nJoin us for 3 days of incredible music...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Localized short description',
    example: 'The biggest electronic music festival in France',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Localized rules and terms',
    example: '## Festival Rules\n\n1. No glass bottles allowed...',
  })
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({
    description: 'Localized welcome message',
    example: 'Welcome to Summer Vibes 2025! We are excited to have you...',
  })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional localized metadata (JSON object)',
    example: { faq: [{ question: 'What time does it start?', answer: '2 PM' }] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether this content is published',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * Localized content response DTO
 */
export class LocalizedContentResponseDto {
  @ApiProperty({
    description: 'Content UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Language settings UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  languageSettingsId!: string;

  @ApiProperty({
    description: 'Language code',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
  })
  language!: SupportedLanguage;

  @ApiPropertyOptional({
    description: 'Localized festival name',
    example: 'Summer Vibes Festival 2025',
  })
  name?: string | null;

  @ApiPropertyOptional({
    description: 'Localized full description',
    example: '## About Summer Vibes\n\nJoin us for 3 days...',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Localized short description',
    example: 'The biggest electronic music festival in France',
  })
  shortDescription?: string | null;

  @ApiPropertyOptional({
    description: 'Localized rules and terms',
    example: '## Festival Rules\n\n1. No glass bottles allowed...',
  })
  rules?: string | null;

  @ApiPropertyOptional({
    description: 'Localized welcome message',
    example: 'Welcome to Summer Vibes 2025!',
  })
  welcomeMessage?: string | null;

  @ApiPropertyOptional({
    description: 'Additional localized metadata',
    example: { faq: [] },
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Whether this content is published',
    example: true,
  })
  isPublished!: boolean;

  @ApiPropertyOptional({
    description: 'When the content was published',
    example: '2025-01-02T12:00:00.000Z',
  })
  publishedAt?: Date | null;

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
 * Festival with localized content response DTO
 */
export class LocalizedFestivalResponseDto {
  @ApiProperty({
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival name (localized if available)',
    example: 'Summer Vibes Festival 2025',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'summer-vibes-festival-2025',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Short description (localized if available)',
    example: 'The biggest electronic music festival in France',
  })
  shortDescription?: string | null;

  @ApiPropertyOptional({
    description: 'Full description (localized if available)',
    example: '## About Summer Vibes...',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Rules (localized if available)',
    example: '## Festival Rules...',
  })
  rules?: string | null;

  @ApiPropertyOptional({
    description: 'Welcome message (localized if available)',
    example: 'Welcome to Summer Vibes 2025!',
  })
  welcomeMessage?: string | null;

  @ApiProperty({
    description: 'Current language of the response',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
  })
  currentLanguage!: SupportedLanguage;

  @ApiProperty({
    description: 'Whether content is from default language fallback',
    example: false,
  })
  isFallback!: boolean;

  @ApiProperty({
    description: 'Available languages for this festival',
    enum: SupportedLanguage,
    isArray: true,
    example: [SupportedLanguage.FR, SupportedLanguage.EN],
  })
  availableLanguages!: SupportedLanguage[];
}
