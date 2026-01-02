// Application-wide constants

export const APP_NAME = 'Festival Platform';
export const APP_VERSION = '1.0.0';

// Default locale and timezone
export const DEFAULT_LOCALE = 'fr-FR';
export const DEFAULT_TIMEZONE = 'Europe/Paris';
export const DEFAULT_CURRENCY = 'EUR';

// Supported languages
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
} as const;

// Image sizes for responsive images
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 300, height: 300 },
  MEDIUM: { width: 600, height: 600 },
  LARGE: { width: 1200, height: 1200 },
  HERO: { width: 1920, height: 1080 },
} as const;

// Session and token configuration
export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_RESET_EXPIRY: '1h',
  EMAIL_VERIFICATION_EXPIRY: '24h',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

// Ticket configuration
export const TICKET = {
  MAX_PER_ORDER: 10,
  RESERVATION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  QR_CODE_SIZE: 256,
} as const;

// Event configuration
export const EVENT = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_TAGS: 10,
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 100000,
} as const;
