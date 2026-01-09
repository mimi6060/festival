import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsEnum, IsArray, IsUUID, ArrayMinSize } from 'class-validator';

/**
 * Supported language enumeration (matches Prisma enum)
 */
export enum SupportedLanguage {
  FR = 'FR',
  EN = 'EN',
  DE = 'DE',
  ES = 'ES',
  IT = 'IT',
  NL = 'NL',
}

/**
 * Language code to display name mapping
 */
export const LanguageDisplayNames: Record<SupportedLanguage, string> = {
  [SupportedLanguage.FR]: 'Francais',
  [SupportedLanguage.EN]: 'English',
  [SupportedLanguage.DE]: 'Deutsch',
  [SupportedLanguage.ES]: 'Espanol',
  [SupportedLanguage.IT]: 'Italiano',
  [SupportedLanguage.NL]: 'Nederlands',
};

/**
 * Language info DTO for API responses
 */
export class LanguageInfoDto {
  @ApiProperty({
    description: 'Language code',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
  })
  code!: SupportedLanguage;

  @ApiProperty({
    description: 'Language display name',
    example: 'Francais',
  })
  name!: string;

  @ApiProperty({
    description: 'Whether this is the default language',
    example: true,
  })
  isDefault!: boolean;

  @ApiPropertyOptional({
    description: 'Whether localized content exists for this language',
    example: true,
  })
  hasContent?: boolean;
}

/**
 * Create festival language settings DTO
 */
export class CreateFestivalLanguageSettingsDto {
  @ApiProperty({
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  festivalId!: string;

  @ApiProperty({
    description: 'Default language for the festival',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
    default: SupportedLanguage.FR,
  })
  @IsEnum(SupportedLanguage)
  defaultLanguage!: SupportedLanguage;

  @ApiProperty({
    description: 'Languages supported by this festival',
    enum: SupportedLanguage,
    isArray: true,
    example: [SupportedLanguage.FR, SupportedLanguage.EN],
    default: [SupportedLanguage.FR, SupportedLanguage.EN],
  })
  @IsArray()
  @IsEnum(SupportedLanguage, { each: true })
  @ArrayMinSize(1)
  supportedLanguages!: SupportedLanguage[];

  @ApiPropertyOptional({
    description: 'Automatically detect language from Accept-Language header',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoDetect?: boolean;

  @ApiPropertyOptional({
    description: 'Fall back to default language if requested language is not available',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  fallbackToDefault?: boolean;
}

/**
 * Festival language settings response DTO
 */
export class FestivalLanguageSettingsResponseDto {
  @ApiProperty({
    description: 'Language settings UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'Default language',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
  })
  defaultLanguage!: SupportedLanguage;

  @ApiProperty({
    description: 'Supported languages',
    enum: SupportedLanguage,
    isArray: true,
    example: [SupportedLanguage.FR, SupportedLanguage.EN],
  })
  supportedLanguages!: SupportedLanguage[];

  @ApiProperty({
    description: 'Auto-detect language from Accept-Language header',
    example: true,
  })
  autoDetect!: boolean;

  @ApiProperty({
    description: 'Fall back to default language if requested not available',
    example: true,
  })
  fallbackToDefault!: boolean;

  @ApiProperty({
    description: 'Available languages with their info',
    type: [LanguageInfoDto],
  })
  availableLanguages!: LanguageInfoDto[];

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
