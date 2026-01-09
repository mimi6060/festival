import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Supported language codes (matches Prisma enum)
 */
export const SUPPORTED_LANGUAGES = ['FR', 'EN', 'DE', 'ES', 'IT', 'NL'] as const;
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Default language when none can be determined
 */
export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'FR';

/**
 * Request locale key
 */
export const REQUEST_LOCALE_KEY = 'locale';

/**
 * Extended request interface with locale
 */
export interface RequestWithLocale extends Request {
  [REQUEST_LOCALE_KEY]?: SupportedLanguageCode;
  detectedLocale?: SupportedLanguageCode;
  localeSource?: 'query' | 'header' | 'cookie' | 'default';
}

/**
 * Language Middleware
 *
 * Detects the user's preferred language from:
 * 1. Query parameter (?lang=fr)
 * 2. Accept-Language header
 * 3. Cookie (FESTIVAL_LOCALE)
 * 4. Default language (FR)
 *
 * Sets the detected locale on the request object for use by controllers.
 */
@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LanguageMiddleware.name);

  use(req: RequestWithLocale, res: Response, next: NextFunction): void {
    let detectedLocale: SupportedLanguageCode = DEFAULT_LANGUAGE;
    let localeSource: 'query' | 'header' | 'cookie' | 'default' = 'default';

    // 1. Check query parameter first (highest priority)
    const queryLang = req.query['lang'] as string | undefined;
    if (queryLang && this.isValidLocale(queryLang.toUpperCase())) {
      detectedLocale = queryLang.toUpperCase() as SupportedLanguageCode;
      localeSource = 'query';
      this.logger.debug(`Locale from query param: ${detectedLocale}`);
    }
    // 2. Check Accept-Language header
    else if (req.headers['accept-language']) {
      const headerLocale = this.parseAcceptLanguage(req.headers['accept-language']);
      if (headerLocale) {
        detectedLocale = headerLocale;
        localeSource = 'header';
        this.logger.debug(`Locale from Accept-Language header: ${detectedLocale}`);
      }
    }
    // 3. Check cookie
    else if (req.cookies?.['FESTIVAL_LOCALE']) {
      const cookieLocale = req.cookies['FESTIVAL_LOCALE'].toUpperCase();
      if (this.isValidLocale(cookieLocale)) {
        detectedLocale = cookieLocale as SupportedLanguageCode;
        localeSource = 'cookie';
        this.logger.debug(`Locale from cookie: ${detectedLocale}`);
      }
    }

    // Set locale on request
    req[REQUEST_LOCALE_KEY] = detectedLocale;
    req.detectedLocale = detectedLocale;
    req.localeSource = localeSource;

    // Set Content-Language response header
    res.setHeader('Content-Language', detectedLocale.toLowerCase());

    next();
  }

  /**
   * Parse Accept-Language header and find best match
   */
  private parseAcceptLanguage(header: string): SupportedLanguageCode | null {
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
      if (this.isValidLocale(lang.code)) {
        return lang.code as SupportedLanguageCode;
      }
    }

    return null;
  }

  /**
   * Check if a locale code is valid
   */
  private isValidLocale(locale: string): locale is SupportedLanguageCode {
    return SUPPORTED_LANGUAGES.includes(locale as SupportedLanguageCode);
  }
}

/**
 * Helper function to get locale from request
 */
export function getLocaleFromRequest(req: Request): SupportedLanguageCode {
  return (req as RequestWithLocale)[REQUEST_LOCALE_KEY] ?? DEFAULT_LANGUAGE;
}

/**
 * Helper function to get locale source from request
 */
export function getLocaleSourceFromRequest(
  req: Request
): 'query' | 'header' | 'cookie' | 'default' {
  return (req as RequestWithLocale).localeSource ?? 'default';
}
