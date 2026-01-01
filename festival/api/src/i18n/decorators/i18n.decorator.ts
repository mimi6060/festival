import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

/**
 * Custom I18n decorator that provides the I18n context in controllers.
 *
 * Usage:
 * @Get()
 * async findAll(@I18n() i18n: I18nContext) {
 *   return this.service.findAll(i18n.lang);
 * }
 */
export const I18n = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): I18nContext | undefined => {
    return I18nContext.current(ctx);
  },
);

/**
 * Decorator to get the current language from the request.
 *
 * Usage:
 * @Get()
 * async findAll(@Lang() lang: string) {
 *   return this.service.findAll(lang);
 * }
 */
export const Lang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const i18nContext = I18nContext.current(ctx);
    return i18nContext?.lang || 'fr';
  },
);

/**
 * Decorator to get the translated message directly.
 * Useful for simple translations in controllers.
 *
 * Usage:
 * @Get()
 * async getMessage(@Translate('common.welcome') message: string) {
 *   return { message };
 * }
 */
export const Translate = createParamDecorator(
  (key: string, ctx: ExecutionContext): string => {
    const i18nContext = I18nContext.current(ctx);
    if (!i18nContext) {
      return key;
    }
    return i18nContext.t(key) as string;
  },
);

/**
 * Metadata key for the language preference.
 */
export const LANG_KEY = 'lang';

/**
 * Decorator to set a specific language for a route.
 * Overrides the detected language.
 *
 * Usage:
 * @UseLang('fr')
 * @Get()
 * async getInFrench() {
 *   return this.service.getMessage();
 * }
 */
export const UseLang = (lang: string) => SetMetadata(LANG_KEY, lang);

/**
 * Interface for controller methods that need i18n context.
 */
export interface I18nRequestContext {
  lang: string;
  t: (key: string, args?: Record<string, unknown>) => string;
}

/**
 * Helper decorator to create a request context with i18n.
 *
 * Usage:
 * @Get()
 * async getMessage(@I18nCtx() ctx: I18nRequestContext) {
 *   return { message: ctx.t('common.welcome') };
 * }
 */
export const I18nCtx = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): I18nRequestContext => {
    const i18nContext = I18nContext.current(ctx);
    const lang = i18nContext?.lang || 'fr';

    return {
      lang,
      t: (key: string, args?: Record<string, unknown>) => {
        if (!i18nContext) {
          return key;
        }
        return i18nContext.t(key, { args }) as string;
      },
    };
  },
);
