import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

/**
 * Supported email languages
 */
export type EmailLanguage = 'fr' | 'en' | 'de' | 'es' | 'it' | 'ar';

/**
 * Email template types
 */
export type EmailTemplateType =
  | 'welcome'
  | 'verify-email'
  | 'password-reset'
  | 'ticket-confirmation'
  | 'ticket-reminder'
  | 'payment-receipt'
  | 'refund-confirmation'
  | 'cashless-topup'
  | 'order-ready';

/**
 * Loaded email template
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Rendered email content
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base variables common to all email templates
 */
export interface BaseEmailVariables {
  firstName: string;
  lastName?: string;
  email?: string;
}

/**
 * Welcome email variables
 */
export interface WelcomeEmailVariables extends BaseEmailVariables {
  festivalName?: string;
  loginUrl: string;
}

/**
 * Verify email variables
 */
export interface VerifyEmailVariables extends BaseEmailVariables {
  verificationUrl: string;
  expiresIn?: string;
}

/**
 * Password reset variables
 */
export interface PasswordResetVariables extends BaseEmailVariables {
  resetUrl: string;
  expiresIn?: string;
}

/**
 * Ticket confirmation variables
 */
export interface TicketConfirmationVariables extends BaseEmailVariables {
  ticketType: string;
  ticketId: string;
  festivalName: string;
  festivalLocation?: string;
  eventDate: string;
  eventTime?: string;
  qrCodeUrl: string;
  ticketUrl: string;
  quantity?: number;
  totalPrice?: string;
  currency?: string;
}

/**
 * Ticket reminder variables
 */
export interface TicketReminderVariables extends BaseEmailVariables {
  festivalName: string;
  eventDate: string;
  eventTime?: string;
  festivalLocation?: string;
  daysUntilEvent?: number;
  ticketUrl: string;
  qrCodeUrl?: string;
}

/**
 * Payment receipt variables
 */
export interface PaymentReceiptVariables extends BaseEmailVariables {
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  transactionId: string;
  invoiceUrl?: string;
  items?: {
    name: string;
    quantity: number;
    price: string;
  }[];
  subtotal?: string;
  tax?: string;
  total?: string;
}

/**
 * Refund confirmation variables
 */
export interface RefundConfirmationVariables extends BaseEmailVariables {
  amount: string;
  currency: string;
  refundDate: string;
  originalPaymentDate: string;
  reason?: string;
  transactionId: string;
  refundMethod: string;
  estimatedArrival?: string;
}

/**
 * Cashless top-up variables
 */
export interface CashlessTopupVariables extends BaseEmailVariables {
  amount: string;
  currency: string;
  newBalance: string;
  topupDate: string;
  paymentMethod: string;
  transactionId: string;
  festivalName?: string;
}

/**
 * Order ready variables
 */
export interface OrderReadyVariables extends BaseEmailVariables {
  orderNumber: string;
  vendorName: string;
  vendorLocation?: string;
  items: {
    name: string;
    quantity: number;
    price?: string;
  }[];
  totalAmount?: string;
  currency?: string;
  pickupInstructions?: string;
  festivalName?: string;
}

/**
 * Union type for all email variables
 */
export type EmailVariables =
  | WelcomeEmailVariables
  | VerifyEmailVariables
  | PasswordResetVariables
  | TicketConfirmationVariables
  | TicketReminderVariables
  | PaymentReceiptVariables
  | RefundConfirmationVariables
  | CashlessTopupVariables
  | OrderReadyVariables;

/**
 * Supported languages list
 */
export const SUPPORTED_EMAIL_LANGUAGES: EmailLanguage[] = ['fr', 'en', 'de', 'es', 'it', 'ar'];

/**
 * Default language fallback
 */
export const DEFAULT_EMAIL_LANGUAGE: EmailLanguage = 'fr';

/**
 * Language configurations
 */
export const EMAIL_LANGUAGE_CONFIG: Record<
  EmailLanguage,
  { name: string; direction: 'ltr' | 'rtl' }
> = {
  fr: { name: 'Francais', direction: 'ltr' },
  en: { name: 'English', direction: 'ltr' },
  de: { name: 'Deutsch', direction: 'ltr' },
  es: { name: 'Espanol', direction: 'ltr' },
  it: { name: 'Italiano', direction: 'ltr' },
  ar: { name: 'Arabic', direction: 'rtl' },
};

/**
 * Service for loading and rendering multilingual email templates
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templatesPath: string;
  private readonly templateCache = new Map<string, EmailTemplate>();

  constructor() {
    this.templatesPath = join(__dirname, '..', 'templates', 'emails');
    this.registerHandlebarsHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Helper for conditional rendering
    Handlebars.registerHelper('ifEqual', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Helper for formatting currency
    Handlebars.registerHelper(
      'formatCurrency',
      function (amount: string | number, currency: string) {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: currency || 'EUR',
        }).format(num);
      }
    );

    // Helper for formatting dates
    Handlebars.registerHelper('formatDate', function (date: string, locale: string) {
      return new Date(date).toLocaleDateString(locale || 'fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper for iterating with index
    Handlebars.registerHelper('eachWithIndex', function (context, options) {
      let ret = '';
      for (let i = 0; i < context.length; i++) {
        ret += options.fn({
          ...context[i],
          index: i,
          isFirst: i === 0,
          isLast: i === context.length - 1,
        });
      }
      return ret;
    });

    // Helper for RTL languages
    Handlebars.registerHelper('isRtl', function (lang: EmailLanguage, options) {
      return EMAIL_LANGUAGE_CONFIG[lang]?.direction === 'rtl'
        ? options.fn(this)
        : options.inverse(this);
    });
  }

  /**
   * Get template cache key
   */
  private getCacheKey(type: EmailTemplateType, language: EmailLanguage): string {
    return `${type}:${language}`;
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): language is EmailLanguage {
    return SUPPORTED_EMAIL_LANGUAGES.includes(language as EmailLanguage);
  }

  /**
   * Normalize language code to supported language
   */
  normalizeLanguage(language: string | null | undefined): EmailLanguage {
    if (!language) {
      return DEFAULT_EMAIL_LANGUAGE;
    }

    const normalizedLang = language.toLowerCase().split('-')[0] as EmailLanguage;

    if (this.isLanguageSupported(normalizedLang)) {
      return normalizedLang;
    }

    return DEFAULT_EMAIL_LANGUAGE;
  }

  /**
   * Load template from file system
   */
  private async loadTemplateFile(
    type: EmailTemplateType,
    language: EmailLanguage,
    file: string
  ): Promise<string> {
    const filePath = join(this.templatesPath, type, language, file);

    if (!existsSync(filePath)) {
      // Try fallback to default language
      if (language !== DEFAULT_EMAIL_LANGUAGE) {
        const fallbackPath = join(this.templatesPath, type, DEFAULT_EMAIL_LANGUAGE, file);
        if (existsSync(fallbackPath)) {
          this.logger.warn(
            `Template ${type}/${language}/${file} not found, using fallback ${DEFAULT_EMAIL_LANGUAGE}`
          );
          return readFile(fallbackPath, 'utf-8');
        }
      }
      throw new NotFoundException(`Email template not found: ${type}/${language}/${file}`);
    }

    return readFile(filePath, 'utf-8');
  }

  /**
   * Load complete email template (subject, HTML, text)
   */
  async loadTemplate(type: EmailTemplateType, language: EmailLanguage): Promise<EmailTemplate> {
    const cacheKey = this.getCacheKey(type, language);

    // Check cache first
    const cached = this.templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [subject, html, text] = await Promise.all([
        this.loadTemplateFile(type, language, 'subject.txt'),
        this.loadTemplateFile(type, language, 'body.html'),
        this.loadTemplateFile(type, language, 'body.txt'),
      ]);

      const template: EmailTemplate = {
        subject: subject.trim(),
        html,
        text,
      };

      // Cache the template
      this.templateCache.set(cacheKey, template);

      return template;
    } catch (error) {
      this.logger.error(`Failed to load template ${type}/${language}: ${error}`);
      throw error;
    }
  }

  /**
   * Render email template with variables
   */
  async renderTemplate(
    type: EmailTemplateType,
    language: EmailLanguage,
    variables: Record<string, unknown>
  ): Promise<RenderedEmail> {
    const template = await this.loadTemplate(type, language);

    // Add common variables
    const commonVariables = {
      ...variables,
      language,
      direction: EMAIL_LANGUAGE_CONFIG[language]?.direction || 'ltr',
      year: new Date().getFullYear(),
      companyName: 'Festival',
      supportEmail: 'support@festival.fr',
    };

    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const htmlTemplate = Handlebars.compile(template.html);
      const textTemplate = Handlebars.compile(template.text);

      return {
        subject: subjectTemplate(commonVariables),
        html: htmlTemplate(commonVariables),
        text: textTemplate(commonVariables),
      };
    } catch (error) {
      this.logger.error(`Failed to render template ${type}/${language}: ${error}`);
      throw error;
    }
  }

  /**
   * Convert HTML to plain text (simple conversion)
   */
  htmlToText(html: string): string {
    return (
      html
        // Remove HTML tags
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    );
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Email template cache cleared');
  }

  /**
   * Clear cache for specific template
   */
  clearTemplateCache(type: EmailTemplateType, language?: EmailLanguage): void {
    if (language) {
      this.templateCache.delete(this.getCacheKey(type, language));
    } else {
      // Clear all languages for this template type
      for (const lang of SUPPORTED_EMAIL_LANGUAGES) {
        this.templateCache.delete(this.getCacheKey(type, lang));
      }
    }
  }

  /**
   * Get all supported template types
   */
  getTemplateTypes(): EmailTemplateType[] {
    return [
      'welcome',
      'verify-email',
      'password-reset',
      'ticket-confirmation',
      'ticket-reminder',
      'payment-receipt',
      'refund-confirmation',
      'cashless-topup',
      'order-ready',
    ];
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): EmailLanguage[] {
    return SUPPORTED_EMAIL_LANGUAGES;
  }

  /**
   * Check if template exists
   */
  async templateExists(type: EmailTemplateType, language: EmailLanguage): Promise<boolean> {
    const subjectPath = join(this.templatesPath, type, language, 'subject.txt');
    return existsSync(subjectPath);
  }

  /**
   * Get template preview (for admin preview)
   */
  async getTemplatePreview(
    type: EmailTemplateType,
    language: EmailLanguage,
    sampleVariables?: Record<string, unknown>
  ): Promise<RenderedEmail> {
    const defaultSampleData = this.getSampleDataForType(type);
    const variables = { ...defaultSampleData, ...sampleVariables };
    return this.renderTemplate(type, language, variables);
  }

  /**
   * Get sample data for template type
   */
  private getSampleDataForType(type: EmailTemplateType): Record<string, unknown> {
    const baseSample = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
    };

    switch (type) {
      case 'welcome':
        return {
          ...baseSample,
          festivalName: 'Summer Festival 2026',
          loginUrl: 'https://festival.fr/login',
        };

      case 'verify-email':
        return {
          ...baseSample,
          verificationUrl: 'https://festival.fr/verify?token=abc123',
          expiresIn: '24 heures',
        };

      case 'password-reset':
        return {
          ...baseSample,
          resetUrl: 'https://festival.fr/reset-password?token=xyz789',
          expiresIn: '1 heure',
        };

      case 'ticket-confirmation':
        return {
          ...baseSample,
          ticketType: 'VIP Pass',
          ticketId: 'TKT-2026-001234',
          festivalName: 'Summer Festival 2026',
          festivalLocation: 'Paris, France',
          eventDate: '2026-07-15',
          eventTime: '18:00',
          qrCodeUrl: 'https://festival.fr/qr/TKT-2026-001234',
          ticketUrl: 'https://festival.fr/tickets/TKT-2026-001234',
          quantity: 2,
          totalPrice: '150.00',
          currency: 'EUR',
        };

      case 'ticket-reminder':
        return {
          ...baseSample,
          festivalName: 'Summer Festival 2026',
          eventDate: '2026-07-15',
          eventTime: '18:00',
          festivalLocation: 'Paris, France',
          daysUntilEvent: 3,
          ticketUrl: 'https://festival.fr/tickets/TKT-2026-001234',
          qrCodeUrl: 'https://festival.fr/qr/TKT-2026-001234',
        };

      case 'payment-receipt':
        return {
          ...baseSample,
          amount: '150.00',
          currency: 'EUR',
          paymentMethod: 'Visa ****4242',
          paymentDate: '2026-06-01',
          transactionId: 'PAY-2026-789012',
          invoiceUrl: 'https://festival.fr/invoices/INV-2026-001',
          items: [{ name: 'VIP Pass', quantity: 2, price: '75.00' }],
          subtotal: '150.00',
          tax: '0.00',
          total: '150.00',
        };

      case 'refund-confirmation':
        return {
          ...baseSample,
          amount: '75.00',
          currency: 'EUR',
          refundDate: '2026-06-15',
          originalPaymentDate: '2026-06-01',
          reason: 'Customer request',
          transactionId: 'REF-2026-345678',
          refundMethod: 'Original payment method',
          estimatedArrival: '5-10 jours ouvrables',
        };

      case 'cashless-topup':
        return {
          ...baseSample,
          amount: '50.00',
          currency: 'EUR',
          newBalance: '75.00',
          topupDate: '2026-07-15',
          paymentMethod: 'Apple Pay',
          transactionId: 'TOP-2026-567890',
          festivalName: 'Summer Festival 2026',
        };

      case 'order-ready':
        return {
          ...baseSample,
          orderNumber: 'ORD-2026-123',
          vendorName: 'Le Petit Bistro',
          vendorLocation: 'Zone Food Court - Stand A3',
          items: [
            { name: 'Burger Classic', quantity: 2, price: '12.00' },
            { name: 'Frites', quantity: 1, price: '4.00' },
          ],
          totalAmount: '28.00',
          currency: 'EUR',
          pickupInstructions: 'Presentez votre numero de commande au comptoir',
          festivalName: 'Summer Festival 2026',
        };

      default:
        return baseSample;
    }
  }
}
