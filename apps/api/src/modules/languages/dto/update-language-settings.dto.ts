import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { SupportedLanguage } from './festival-language-settings.dto';

/**
 * Update festival language settings DTO
 */
export class UpdateLanguageSettingsDto {
  @ApiPropertyOptional({
    description: 'Default language for the festival',
    enum: SupportedLanguage,
    example: SupportedLanguage.FR,
  })
  @IsOptional()
  @IsEnum(SupportedLanguage)
  defaultLanguage?: SupportedLanguage;

  @ApiPropertyOptional({
    description: 'Languages supported by this festival',
    enum: SupportedLanguage,
    isArray: true,
    example: [SupportedLanguage.FR, SupportedLanguage.EN, SupportedLanguage.DE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SupportedLanguage, { each: true })
  @ArrayMinSize(1)
  supportedLanguages?: SupportedLanguage[];

  @ApiPropertyOptional({
    description: 'Automatically detect language from Accept-Language header',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoDetect?: boolean;

  @ApiPropertyOptional({
    description: 'Fall back to default language if requested language is not available',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fallbackToDefault?: boolean;
}
