import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  REQUEST_LOCALE_KEY,
  SupportedLanguageCode,
  DEFAULT_LANGUAGE,
  RequestWithLocale,
} from '../middleware/language.middleware';

/**
 * Locale information interface
 */
export interface LocaleInfo {
  /** Current locale code (e.g., 'FR', 'EN') */
  code: SupportedLanguageCode;
  /** Source of the locale detection */
  source: 'query' | 'header' | 'cookie' | 'default';
  /** Accept-Language header value (if present) */
  acceptLanguageHeader?: string;
}

/**
 * @Locale() Parameter Decorator
 *
 * Extracts the current locale from the request.
 * Must be used after LanguageMiddleware is applied.
 *
 * @example
 * ```typescript
 * // Get full locale info
 * @Get('content')
 * getContent(@Locale() locale: LocaleInfo) {
 *   console.log(locale.code); // 'FR'
 *   console.log(locale.source); // 'header'
 * }
 *
 * // Get just the locale code
 * @Get('content')
 * getContent(@Locale('code') localeCode: SupportedLanguageCode) {
 *   console.log(localeCode); // 'FR'
 * }
 * ```
 */
export const Locale = createParamDecorator(
  (
    data: keyof LocaleInfo | undefined,
    ctx: ExecutionContext
  ): LocaleInfo | SupportedLanguageCode | string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithLocale>();

    const localeInfo: LocaleInfo = {
      code: request[REQUEST_LOCALE_KEY] ?? DEFAULT_LANGUAGE,
      source: request.localeSource ?? 'default',
      acceptLanguageHeader: request.headers['accept-language'],
    };

    // If a specific property is requested, return just that
    if (data) {
      return localeInfo[data];
    }

    return localeInfo;
  }
);

/**
 * @LocaleCode() Parameter Decorator
 *
 * Shorthand for @Locale('code') - extracts just the locale code.
 *
 * @example
 * ```typescript
 * @Get('content')
 * getContent(@LocaleCode() locale: SupportedLanguageCode) {
 *   console.log(locale); // 'FR'
 * }
 * ```
 */
export const LocaleCode = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupportedLanguageCode => {
    const request = ctx.switchToHttp().getRequest<RequestWithLocale>();
    return request[REQUEST_LOCALE_KEY] ?? DEFAULT_LANGUAGE;
  }
);

/**
 * @AcceptLanguage() Parameter Decorator
 *
 * Extracts the Accept-Language header value.
 *
 * @example
 * ```typescript
 * @Get('content')
 * getContent(@AcceptLanguage() acceptLanguage: string | undefined) {
 *   console.log(acceptLanguage); // 'fr-FR,fr;q=0.9,en;q=0.8'
 * }
 * ```
 */
export const AcceptLanguage = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['accept-language'];
  }
);
