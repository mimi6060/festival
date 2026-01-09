import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportedLanguage as PrismaSupportedLanguage } from '@prisma/client';
import {
  CreateFestivalLanguageSettingsDto,
  UpdateLanguageSettingsDto,
  UpsertLocalizedContentDto,
  SupportedLanguage,
  LanguageDisplayNames,
  LanguageInfoDto,
  FestivalLanguageSettingsResponseDto,
  LocalizedContentResponseDto,
} from './dto';

@Injectable()
export class LanguagesService {
  private readonly logger = new Logger(LanguagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create language settings for a festival
   */
  async createLanguageSettings(
    dto: CreateFestivalLanguageSettingsDto
  ): Promise<FestivalLanguageSettingsResponseDto> {
    // Check if festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId, isDeleted: false },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${dto.festivalId}" not found`);
    }

    // Check if settings already exist
    const existing = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId: dto.festivalId },
    });

    if (existing) {
      throw new ConflictException(
        `Language settings already exist for festival "${dto.festivalId}". Use PUT to update.`
      );
    }

    // Validate default language is in supported languages
    if (!dto.supportedLanguages.includes(dto.defaultLanguage)) {
      throw new BadRequestException(
        `Default language "${dto.defaultLanguage}" must be in supported languages`
      );
    }

    const settings = await this.prisma.festivalLanguageSettings.create({
      data: {
        festivalId: dto.festivalId,
        defaultLanguage: dto.defaultLanguage as PrismaSupportedLanguage,
        supportedLanguages: dto.supportedLanguages as PrismaSupportedLanguage[],
        autoDetect: dto.autoDetect ?? true,
        fallbackToDefault: dto.fallbackToDefault ?? true,
      },
      include: {
        localizedContent: true,
      },
    });

    this.logger.log(`Created language settings for festival ${dto.festivalId}`);

    return this.mapToResponse(settings);
  }

  /**
   * Get language settings for a festival
   */
  async getLanguageSettings(festivalId: string): Promise<FestivalLanguageSettingsResponseDto> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: true,
      },
    });

    if (!settings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    return this.mapToResponse(settings);
  }

  /**
   * Get language settings or create defaults
   */
  async getOrCreateLanguageSettings(
    festivalId: string
  ): Promise<FestivalLanguageSettingsResponseDto> {
    try {
      return await this.getLanguageSettings(festivalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Create default settings
        return this.createLanguageSettings({
          festivalId,
          defaultLanguage: SupportedLanguage.FR,
          supportedLanguages: [SupportedLanguage.FR, SupportedLanguage.EN],
          autoDetect: true,
          fallbackToDefault: true,
        });
      }
      throw error;
    }
  }

  /**
   * Update language settings for a festival
   */
  async updateLanguageSettings(
    festivalId: string,
    dto: UpdateLanguageSettingsDto
  ): Promise<FestivalLanguageSettingsResponseDto> {
    const existingSettings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
    });

    if (!existingSettings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    // Validate default language is in supported languages
    const supportedLanguages = dto.supportedLanguages ?? existingSettings.supportedLanguages;
    const defaultLanguage = dto.defaultLanguage ?? existingSettings.defaultLanguage;

    if (!supportedLanguages.includes(defaultLanguage as SupportedLanguage)) {
      throw new BadRequestException(
        `Default language "${defaultLanguage}" must be in supported languages`
      );
    }

    const settings = await this.prisma.festivalLanguageSettings.update({
      where: { festivalId },
      data: {
        defaultLanguage: dto.defaultLanguage as PrismaSupportedLanguage | undefined,
        supportedLanguages: dto.supportedLanguages as PrismaSupportedLanguage[] | undefined,
        autoDetect: dto.autoDetect,
        fallbackToDefault: dto.fallbackToDefault,
      },
      include: {
        localizedContent: true,
      },
    });

    this.logger.log(`Updated language settings for festival ${festivalId}`);

    return this.mapToResponse(settings);
  }

  /**
   * Delete language settings for a festival
   */
  async deleteLanguageSettings(festivalId: string): Promise<void> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
    });

    if (!settings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    await this.prisma.festivalLanguageSettings.delete({
      where: { festivalId },
    });

    this.logger.log(`Deleted language settings for festival ${festivalId}`);
  }

  /**
   * Get supported languages for a festival
   */
  async getSupportedLanguages(festivalId: string): Promise<LanguageInfoDto[]> {
    const settings = await this.getOrCreateLanguageSettings(festivalId);
    return settings.availableLanguages;
  }

  /**
   * Create or update localized content
   */
  async upsertLocalizedContent(
    festivalId: string,
    language: SupportedLanguage,
    dto: UpsertLocalizedContentDto
  ): Promise<LocalizedContentResponseDto> {
    // Get or create language settings
    const settings = await this.getOrCreateLanguageSettings(festivalId);

    // Validate language is supported
    if (!settings.supportedLanguages.includes(language)) {
      throw new BadRequestException(
        `Language "${language}" is not supported for this festival. Supported: ${settings.supportedLanguages.join(', ')}`
      );
    }

    const existingContent = await this.prisma.festivalLocalizedContent.findUnique({
      where: {
        languageSettingsId_language: {
          languageSettingsId: settings.id,
          language: language as PrismaSupportedLanguage,
        },
      },
    });

    let content;
    if (existingContent) {
      // Update existing content
      content = await this.prisma.festivalLocalizedContent.update({
        where: { id: existingContent.id },
        data: {
          name: dto.name,
          description: dto.description,
          shortDescription: dto.shortDescription,
          rules: dto.rules,
          welcomeMessage: dto.welcomeMessage,
          metadata: dto.metadata as any,
          isPublished: dto.isPublished,
          publishedAt: dto.isPublished && !existingContent.isPublished ? new Date() : undefined,
        },
      });
      this.logger.log(`Updated localized content for festival ${festivalId} in ${language}`);
    } else {
      // Create new content
      content = await this.prisma.festivalLocalizedContent.create({
        data: {
          languageSettingsId: settings.id,
          language: language as PrismaSupportedLanguage,
          name: dto.name,
          description: dto.description,
          shortDescription: dto.shortDescription,
          rules: dto.rules,
          welcomeMessage: dto.welcomeMessage,
          metadata: dto.metadata as any,
          isPublished: dto.isPublished ?? false,
          publishedAt: dto.isPublished ? new Date() : null,
        },
      });
      this.logger.log(`Created localized content for festival ${festivalId} in ${language}`);
    }

    return content as LocalizedContentResponseDto;
  }

  /**
   * Get localized content for a festival in a specific language
   */
  async getLocalizedContent(
    festivalId: string,
    language: SupportedLanguage
  ): Promise<LocalizedContentResponseDto> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: {
          where: { language: language as PrismaSupportedLanguage },
        },
      },
    });

    if (!settings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    const content = settings.localizedContent[0];

    if (!content) {
      throw new NotFoundException(
        `No content found for language "${language}" in festival "${festivalId}"`
      );
    }

    return content as LocalizedContentResponseDto;
  }

  /**
   * Get all localized content for a festival
   */
  async getAllLocalizedContent(festivalId: string): Promise<LocalizedContentResponseDto[]> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: true,
      },
    });

    if (!settings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    return settings.localizedContent as LocalizedContentResponseDto[];
  }

  /**
   * Delete localized content for a specific language
   */
  async deleteLocalizedContent(festivalId: string, language: SupportedLanguage): Promise<void> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
    });

    if (!settings) {
      throw new NotFoundException(`Language settings not found for festival "${festivalId}"`);
    }

    // Don't allow deleting content for the default language
    if (settings.defaultLanguage === language) {
      throw new BadRequestException(`Cannot delete content for the default language "${language}"`);
    }

    const content = await this.prisma.festivalLocalizedContent.findUnique({
      where: {
        languageSettingsId_language: {
          languageSettingsId: settings.id,
          language: language as PrismaSupportedLanguage,
        },
      },
    });

    if (!content) {
      throw new NotFoundException(
        `No content found for language "${language}" in festival "${festivalId}"`
      );
    }

    await this.prisma.festivalLocalizedContent.delete({
      where: { id: content.id },
    });

    this.logger.log(`Deleted localized content for festival ${festivalId} in ${language}`);
  }

  /**
   * Resolve the best language for a request
   */
  async resolveLanguage(
    festivalId: string,
    requestedLanguage?: SupportedLanguage | null,
    acceptLanguageHeader?: string | null
  ): Promise<{ language: SupportedLanguage; isFallback: boolean }> {
    let settings;
    try {
      settings = await this.getLanguageSettings(festivalId);
    } catch {
      // No settings, return default
      return { language: SupportedLanguage.FR, isFallback: false };
    }

    // 1. If specific language requested and supported, use it
    if (requestedLanguage && settings.supportedLanguages.includes(requestedLanguage)) {
      return { language: requestedLanguage, isFallback: false };
    }

    // 2. If auto-detect enabled, try to parse Accept-Language header
    if (settings.autoDetect && acceptLanguageHeader) {
      const detectedLanguage = this.parseAcceptLanguage(
        acceptLanguageHeader,
        settings.supportedLanguages
      );
      if (detectedLanguage) {
        return { language: detectedLanguage, isFallback: false };
      }
    }

    // 3. Fall back to default
    return {
      language: settings.defaultLanguage as SupportedLanguage,
      isFallback: settings.fallbackToDefault,
    };
  }

  /**
   * Parse Accept-Language header and find best match
   */
  private parseAcceptLanguage(
    header: string,
    supportedLanguages: SupportedLanguage[]
  ): SupportedLanguage | null {
    const languages = header
      .split(',')
      .map((lang) => {
        const [code, priority = '1'] = lang.trim().split(';q=');
        return {
          code: code?.split('-')[0]?.toUpperCase() ?? '',
          priority: parseFloat(priority),
        };
      })
      .sort((a, b) => b.priority - a.priority);

    for (const lang of languages) {
      if (supportedLanguages.includes(lang.code as SupportedLanguage)) {
        return lang.code as SupportedLanguage;
      }
    }

    return null;
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(settings: any): FestivalLanguageSettingsResponseDto {
    const availableLanguages: LanguageInfoDto[] = settings.supportedLanguages.map(
      (lang: SupportedLanguage) => ({
        code: lang,
        name: LanguageDisplayNames[lang] || lang,
        isDefault: lang === settings.defaultLanguage,
        hasContent: settings.localizedContent?.some((c: any) => c.language === lang) ?? false,
      })
    );

    return {
      id: settings.id,
      festivalId: settings.festivalId,
      defaultLanguage: settings.defaultLanguage as SupportedLanguage,
      supportedLanguages: settings.supportedLanguages as SupportedLanguage[],
      autoDetect: settings.autoDetect,
      fallbackToDefault: settings.fallbackToDefault,
      availableLanguages,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
