/**
 * Sanitization Validators for Festival Platform
 *
 * Provides comprehensive input sanitization and validation:
 * - HTML/XSS sanitization
 * - SQL injection prevention
 * - NoSQL injection prevention
 * - Path traversal prevention
 * - Unicode normalization
 * - Email sanitization
 * - Phone number sanitization
 *
 * @module SanitizeValidator
 * @security Critical - Input sanitization prevents injection attacks
 */

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  /** Strip HTML tags */
  stripHtml?: boolean;
  /** Encode HTML entities */
  encodeHtml?: boolean;
  /** Remove SQL keywords */
  preventSqlInjection?: boolean;
  /** Remove NoSQL operators */
  preventNoSqlInjection?: boolean;
  /** Prevent path traversal */
  preventPathTraversal?: boolean;
  /** Trim whitespace */
  trim?: boolean;
  /** Normalize unicode */
  normalizeUnicode?: boolean;
  /** Convert to lowercase */
  lowercase?: boolean;
  /** Maximum length (truncate if exceeded) */
  maxLength?: number;
  /** Remove null bytes */
  removeNullBytes?: boolean;
  /** Remove control characters */
  removeControlChars?: boolean;
}

/**
 * Default sanitization options
 */
const defaultOptions: SanitizationOptions = {
  stripHtml: true,
  encodeHtml: false,
  preventSqlInjection: true,
  preventNoSqlInjection: true,
  preventPathTraversal: true,
  trim: true,
  normalizeUnicode: true,
  lowercase: false,
  removeNullBytes: true,
  removeControlChars: true,
};

/**
 * SQL injection patterns to detect and block
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|HAVING|ORDER BY|GROUP BY)\b)/gi,
  /('|"|;|--|\/\*|\*\/|xp_|sp_|0x)/gi,
  /(\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*')/gi,
  /WAITFOR\s+DELAY/gi,
  /BENCHMARK\s*\(/gi,
  /SLEEP\s*\(/gi,
];

/**
 * NoSQL injection patterns (MongoDB operators)
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$gt/gi,
  /\$gte/gi,
  /\$lt/gi,
  /\$lte/gi,
  /\$ne/gi,
  /\$nin/gi,
  /\$or/gi,
  /\$and/gi,
  /\$not/gi,
  /\$nor/gi,
  /\$exists/gi,
  /\$type/gi,
  /\$regex/gi,
  /\$options/gi,
  /\$text/gi,
  /\$search/gi,
  /\$expr/gi,
];

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
  /\.\.%252f/gi,
  /\.\.%255c/gi,
  /%2e%2e\//gi,
  /%2e%2e%2f/gi,
  /\.\.\\/g,
  /\.\.%5c/gi,
];

/**
 * XSS attack patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /<base/gi,
  /<form/gi,
  /document\./gi,
  /window\./gi,
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,
];

/**
 * Sanitization Service
 */
export class SanitizationService {
  private readonly options: SanitizationOptions;

  constructor(options?: Partial<SanitizationOptions>) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Sanitize a string value
   */
  sanitize(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;

    // Remove null bytes first
    if (this.options.removeNullBytes) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Remove control characters (except newlines and tabs)
    if (this.options.removeControlChars) {
      // eslint-disable-next-line no-control-regex
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    // Normalize unicode
    if (this.options.normalizeUnicode) {
      sanitized = sanitized.normalize('NFC');
    }

    // Trim whitespace
    if (this.options.trim) {
      sanitized = sanitized.trim();
    }

    // Strip HTML tags
    if (this.options.stripHtml) {
      sanitized = this.stripHtml(sanitized);
    }

    // Encode HTML entities
    if (this.options.encodeHtml) {
      sanitized = this.encodeHtmlEntities(sanitized);
    }

    // Prevent path traversal
    if (this.options.preventPathTraversal) {
      sanitized = this.preventPathTraversal(sanitized);
    }

    // Convert to lowercase
    if (this.options.lowercase) {
      sanitized = sanitized.toLowerCase();
    }

    // Truncate if needed
    if (this.options.maxLength && sanitized.length > this.options.maxLength) {
      sanitized = sanitized.substring(0, this.options.maxLength);
    }

    return sanitized;
  }

  /**
   * Check if a value contains potential SQL injection
   */
  hasSqlInjection(value: string): boolean {
    return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
  }

  /**
   * Check if a value contains potential NoSQL injection
   */
  hasNoSqlInjection(value: string): boolean {
    return NOSQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
  }

  /**
   * Check if a value contains potential XSS
   */
  hasXss(value: string): boolean {
    return XSS_PATTERNS.some((pattern) => pattern.test(value));
  }

  /**
   * Check if a value contains path traversal attempts
   */
  hasPathTraversal(value: string): boolean {
    return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(value));
  }

  /**
   * Validate that value is safe (no injection patterns)
   */
  isSafe(value: string): boolean {
    if (this.options.preventSqlInjection && this.hasSqlInjection(value)) {
      return false;
    }
    if (this.options.preventNoSqlInjection && this.hasNoSqlInjection(value)) {
      return false;
    }
    if (this.options.preventPathTraversal && this.hasPathTraversal(value)) {
      return false;
    }
    return !this.hasXss(value);
  }

  /**
   * Strip HTML tags from a string
   */
  private stripHtml(value: string): string {
    // First, remove dangerous elements completely
    let sanitized = value;
    for (const pattern of XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Then strip remaining HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    return sanitized;
  }

  /**
   * Encode HTML entities
   */
  private encodeHtmlEntities(value: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;',
    };

    return value.replace(/[&<>"'/`=]/g, (char) => entities[char] || char);
  }

  /**
   * Remove path traversal patterns
   */
  private preventPathTraversal(value: string): string {
    let sanitized = value;
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
  }

  /**
   * Sanitize an email address
   */
  sanitizeEmail(email: string): string {
    if (!email) {return '';}

    let sanitized = email.toLowerCase().trim();

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove any HTML/script
    sanitized = this.stripHtml(sanitized);

    // Remove characters not valid in emails
    sanitized = sanitized.replace(/[^a-z0-9._%+\-@]/g, '');

    // Ensure only one @ symbol
    const parts = sanitized.split('@');
    if (parts.length > 2) {
      sanitized = parts[0] + '@' + parts.slice(1).join('');
    }

    return sanitized;
  }

  /**
   * Sanitize a phone number (keep only digits and +)
   */
  sanitizePhone(phone: string): string {
    if (!phone) {return '';}

    let sanitized = phone.trim();

    // Remove everything except digits and leading +
    sanitized = sanitized.replace(/[^\d+]/g, '');

    // Ensure + is only at the beginning
    if (sanitized.includes('+')) {
      const hasLeadingPlus = sanitized.startsWith('+');
      sanitized = sanitized.replace(/\+/g, '');
      if (hasLeadingPlus) {
        sanitized = '+' + sanitized;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a URL
   */
  sanitizeUrl(url: string): string {
    if (!url) {return '';}

    let sanitized = url.trim();

    // Remove dangerous protocols
    sanitized = sanitized.replace(
      /^(javascript|vbscript|data|file):/gi,
      '',
    );

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Prevent path traversal
    sanitized = this.preventPathTraversal(sanitized);

    return sanitized;
  }

  /**
   * Sanitize a filename
   */
  sanitizeFilename(filename: string): string {
    if (!filename) {return '';}

    let sanitized = filename.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Prevent path traversal
    sanitized = this.preventPathTraversal(sanitized);

    // Remove characters not safe for filenames
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop() || '';
      const name = sanitized.substring(0, 255 - ext.length - 1);
      sanitized = name + '.' + ext;
    }

    return sanitized;
  }

  /**
   * Recursively sanitize an object
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitize(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitize(key);
        sanitized[sanitizedKey] =
          typeof value === 'object'
            ? this.sanitizeObject(value as Record<string, unknown>)
            : typeof value === 'string'
              ? this.sanitize(value)
              : value;
      }
      return sanitized as T;
    }

    return obj;
  }
}

/**
 * Class-validator constraint for safe string validation
 */
@ValidatorConstraint({ name: 'isSafeString', async: false })
export class IsSafeStringConstraint implements ValidatorConstraintInterface {
  private sanitizer: SanitizationService;

  constructor() {
    this.sanitizer = new SanitizationService();
  }

  validate(value: string, args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return true; // Let other validators handle type checking
    }
    const options = args.constraints[0] as SanitizationOptions | undefined;
    const sanitizer = options
      ? new SanitizationService(options)
      : this.sanitizer;
    return sanitizer.isSafe(value);
  }

  defaultMessage(): string {
    return 'Value contains potentially dangerous content';
  }
}

/**
 * Decorator for safe string validation
 *
 * @example
 * class CreatePostDto {
 *   @IsSafeString()
 *   content: string;
 * }
 */
export function IsSafeString(
  options?: SanitizationOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsSafeStringConstraint,
    });
  };
}

/**
 * Class-validator constraint for no SQL injection
 */
@ValidatorConstraint({ name: 'noSqlInjection', async: false })
export class NoSqlInjectionConstraint implements ValidatorConstraintInterface {
  private sanitizer: SanitizationService;

  constructor() {
    this.sanitizer = new SanitizationService();
  }

  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return true;
    }
    return !this.sanitizer.hasSqlInjection(value);
  }

  defaultMessage(): string {
    return 'Value contains potentially dangerous SQL patterns';
  }
}

/**
 * Decorator to prevent SQL injection
 *
 * @example
 * class SearchDto {
 *   @NoSqlInjection()
 *   query: string;
 * }
 */
export function NoSqlInjection(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoSqlInjectionConstraint,
    });
  };
}

/**
 * Class-validator constraint for sanitized email
 */
@ValidatorConstraint({ name: 'isSanitizedEmail', async: false })
export class IsSanitizedEmailConstraint
  implements ValidatorConstraintInterface
{
  private sanitizer: SanitizationService;

  constructor() {
    this.sanitizer = new SanitizationService();
  }

  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return true;
    }
    const sanitized = this.sanitizer.sanitizeEmail(value);
    // Check if email was significantly altered (potential attack)
    return sanitized === value.toLowerCase().trim();
  }

  defaultMessage(): string {
    return 'Email address contains invalid characters';
  }
}

/**
 * Decorator for sanitized email validation
 */
export function IsSanitizedEmail(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSanitizedEmailConstraint,
    });
  };
}

/**
 * Export singleton instance for convenience
 */
export const sanitizer = new SanitizationService();
