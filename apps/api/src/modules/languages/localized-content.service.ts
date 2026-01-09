import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportedLanguage as PrismaSupportedLanguage } from '@prisma/client';
import { SupportedLanguage, LocalizedFestivalResponseDto } from './dto';
import { LanguagesService } from './languages.service';

/**
 * Service for retrieving and merging localized content with base festival data.
 * This service is designed to be used by other modules to get localized festival content.
 */
@Injectable()
export class LocalizedContentService {
  private readonly logger = new Logger(LocalizedContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly languagesService: LanguagesService
  ) {}

  /**
   * Get festival with localized content merged
   *
   * @param festivalId - Festival UUID
   * @param requestedLanguage - Explicitly requested language (from query param)
   * @param acceptLanguageHeader - Accept-Language HTTP header value
   * @returns Festival with localized content in the best matching language
   */
  async getFestivalWithLocalizedContent(
    festivalId: string,
    requestedLanguage?: SupportedLanguage | null,
    acceptLanguageHeader?: string | null
  ): Promise<LocalizedFestivalResponseDto | null> {
    // Get the base festival data
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId, isDeleted: false },
      include: {
        languageSettings: {
          include: {
            localizedContent: true,
          },
        },
      },
    });

    if (!festival) {
      return null;
    }

    return this.mergeLocalizedContent(festival, requestedLanguage, acceptLanguageHeader);
  }

  /**
   * Get festival by slug with localized content merged
   */
  async getFestivalBySlugWithLocalizedContent(
    slug: string,
    requestedLanguage?: SupportedLanguage | null,
    acceptLanguageHeader?: string | null
  ): Promise<LocalizedFestivalResponseDto | null> {
    const festival = await this.prisma.festival.findUnique({
      where: { slug, isDeleted: false },
      include: {
        languageSettings: {
          include: {
            localizedContent: true,
          },
        },
      },
    });

    if (!festival) {
      return null;
    }

    return this.mergeLocalizedContent(festival, requestedLanguage, acceptLanguageHeader);
  }

  /**
   * Merge localized content with base festival data
   */
  private async mergeLocalizedContent(
    festival: any,
    requestedLanguage?: SupportedLanguage | null,
    acceptLanguageHeader?: string | null
  ): Promise<LocalizedFestivalResponseDto> {
    const languageSettings = festival.languageSettings;

    // If no language settings, return base content
    if (!languageSettings) {
      return {
        id: festival.id,
        name: festival.name,
        slug: festival.slug,
        shortDescription: festival.description?.substring(0, 500) || null,
        description: festival.description,
        rules: null,
        welcomeMessage: null,
        currentLanguage: SupportedLanguage.FR,
        isFallback: false,
        availableLanguages: [SupportedLanguage.FR],
      };
    }

    // Resolve the best language
    const { language, isFallback } = await this.languagesService.resolveLanguage(
      festival.id,
      requestedLanguage,
      acceptLanguageHeader
    );

    // Find content for the resolved language
    let content = languageSettings.localizedContent?.find(
      (c: any) => c.language === language && c.isPublished
    );

    // If no content for resolved language and fallback is enabled, try default
    if (!content && languageSettings.fallbackToDefault) {
      content = languageSettings.localizedContent?.find(
        (c: any) => c.language === languageSettings.defaultLanguage && c.isPublished
      );
    }

    // Build available languages list
    const availableLanguages = languageSettings.supportedLanguages as SupportedLanguage[];

    return {
      id: festival.id,
      name: content?.name || festival.name,
      slug: festival.slug,
      shortDescription:
        content?.shortDescription || festival.description?.substring(0, 500) || null,
      description: content?.description || festival.description,
      rules: content?.rules || null,
      welcomeMessage: content?.welcomeMessage || null,
      currentLanguage: language,
      isFallback: !content || isFallback,
      availableLanguages,
    };
  }

  /**
   * Get localized content for a specific field
   *
   * @param festivalId - Festival UUID
   * @param field - Field name to get (name, description, shortDescription, rules, welcomeMessage)
   * @param requestedLanguage - Explicitly requested language
   * @param acceptLanguageHeader - Accept-Language header
   * @returns Localized field value or null
   */
  async getLocalizedField(
    festivalId: string,
    field: 'name' | 'description' | 'shortDescription' | 'rules' | 'welcomeMessage',
    requestedLanguage?: SupportedLanguage | null,
    acceptLanguageHeader?: string | null
  ): Promise<string | null> {
    const localized = await this.getFestivalWithLocalizedContent(
      festivalId,
      requestedLanguage,
      acceptLanguageHeader
    );

    if (!localized) {
      return null;
    }

    return localized[field] ?? null;
  }

  /**
   * Check if a festival has localized content for a specific language
   */
  async hasLocalizedContent(festivalId: string, language: SupportedLanguage): Promise<boolean> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: {
          where: {
            language: language as PrismaSupportedLanguage,
            isPublished: true,
          },
        },
      },
    });

    return (settings?.localizedContent?.length ?? 0) > 0;
  }

  /**
   * Get all available languages for a festival (with published content)
   */
  async getAvailableLanguagesWithContent(festivalId: string): Promise<SupportedLanguage[]> {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: {
          where: { isPublished: true },
          select: { language: true },
        },
      },
    });

    if (!settings) {
      return [SupportedLanguage.FR]; // Default
    }

    const languagesWithContent = settings.localizedContent.map(
      (c) => c.language as SupportedLanguage
    );

    // Return all supported languages, but mark which have content
    return settings.supportedLanguages.filter(
      (lang) =>
        languagesWithContent.includes(lang as SupportedLanguage) ||
        lang === settings.defaultLanguage
    ) as SupportedLanguage[];
  }

  /**
   * Get content completion status for all languages
   */
  async getContentCompletionStatus(
    festivalId: string
  ): Promise<
    Record<SupportedLanguage, { hasContent: boolean; isPublished: boolean; completeness: number }>
  > {
    const settings = await this.prisma.festivalLanguageSettings.findUnique({
      where: { festivalId },
      include: {
        localizedContent: true,
      },
    });

    if (!settings) {
      return {} as Record<
        SupportedLanguage,
        { hasContent: boolean; isPublished: boolean; completeness: number }
      >;
    }

    const result: Record<
      SupportedLanguage,
      { hasContent: boolean; isPublished: boolean; completeness: number }
    > = {} as any;
    const fields = ['name', 'description', 'shortDescription', 'rules', 'welcomeMessage'];

    for (const lang of settings.supportedLanguages) {
      const content = settings.localizedContent.find((c) => c.language === lang);

      if (!content) {
        result[lang as SupportedLanguage] = {
          hasContent: false,
          isPublished: false,
          completeness: 0,
        };
      } else {
        const filledFields = fields.filter(
          (field) => (content as any)[field] !== null && (content as any)[field] !== ''
        ).length;
        const completeness = Math.round((filledFields / fields.length) * 100);

        result[lang as SupportedLanguage] = {
          hasContent: true,
          isPublished: content.isPublished,
          completeness,
        };
      }
    }

    return result;
  }
}
