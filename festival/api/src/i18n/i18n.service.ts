import { Injectable } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';

/**
 * Custom I18n service that provides helper methods for translations.
 * This service wraps the nestjs-i18n service with additional functionality.
 */
@Injectable()
export class I18nCustomService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * Translate a key with optional arguments.
   * Uses the current request context language or falls back to the default.
   */
  t(key: string, args?: Record<string, unknown>): string {
    const lang = I18nContext.current()?.lang || 'fr';
    return this.i18n.t(key, { lang, args });
  }

  /**
   * Translate a key with a specific language.
   */
  translate(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args });
  }

  /**
   * Get current language from context.
   */
  getCurrentLanguage(): string {
    return I18nContext.current()?.lang || 'fr';
  }

  /**
   * Translate validation error messages.
   */
  translateValidationError(
    field: string,
    constraint: string,
    args?: Record<string, unknown>,
  ): string {
    const key = `common.validation.${constraint}`;
    return this.t(key, { field, ...args });
  }

  /**
   * Translate HTTP error messages.
   */
  translateHttpError(statusCode: number): string {
    return this.t(`errors.http.${statusCode}`);
  }

  /**
   * Translate auth messages.
   */
  translateAuth(key: string, args?: Record<string, unknown>): string {
    return this.t(`auth.${key}`, args);
  }

  /**
   * Translate email templates.
   */
  translateEmail(
    template: string,
    key: string,
    args?: Record<string, unknown>,
  ): string {
    return this.t(`emails.${template}.${key}`, args);
  }

  /**
   * Get full email translation for a template.
   */
  getEmailTranslation(
    template: string,
    lang: string,
    args?: Record<string, unknown>,
  ): {
    subject: string;
    title: string;
    body: string;
    button?: string;
  } {
    return {
      subject: this.translate(`emails.${template}.subject`, lang, args),
      title: this.translate(`emails.${template}.title`, lang, args),
      body: this.translate(`emails.${template}.body`, lang, args),
      button: this.translate(`emails.${template}.button`, lang, args),
    };
  }

  /**
   * Translate notification messages.
   */
  translateNotification(
    type: 'push' | 'inApp' | 'sms',
    key: string,
    args?: Record<string, unknown>,
  ): { title?: string; body?: string; message?: string } {
    const prefix = `notifications.${type}.${key}`;

    if (type === 'sms') {
      return { message: this.t(prefix, args) };
    }

    return {
      title: this.t(`${prefix}.title`, args),
      body: type === 'push' ? this.t(`${prefix}.body`, args) : undefined,
      message: type === 'inApp' ? this.t(`${prefix}.message`, args) : undefined,
    };
  }

  /**
   * Translate error messages from the errors.json file.
   */
  translateError(
    category: string,
    key: string,
    args?: Record<string, unknown>,
  ): string {
    return this.t(`errors.${category}.${key}`, args);
  }
}
