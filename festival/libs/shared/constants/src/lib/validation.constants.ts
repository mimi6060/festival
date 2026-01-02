/**
 * Validation Constants
 * @module @festival/constants/validation
 */

/**
 * String length constraints
 */
export const STRING_LENGTH = {
  /** User */
  USER_FIRST_NAME_MIN: 1,
  USER_FIRST_NAME_MAX: 50,
  USER_LAST_NAME_MIN: 1,
  USER_LAST_NAME_MAX: 50,
  USER_DISPLAY_NAME_MIN: 2,
  USER_DISPLAY_NAME_MAX: 100,
  USER_BIO_MAX: 500,

  /** Email */
  EMAIL_MIN: 5,
  EMAIL_MAX: 254,

  /** Password */
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,

  /** Phone */
  PHONE_MIN: 6,
  PHONE_MAX: 20,

  /** Address */
  ADDRESS_LINE_MIN: 2,
  ADDRESS_LINE_MAX: 200,
  CITY_MIN: 1,
  CITY_MAX: 100,
  POSTAL_CODE_MIN: 2,
  POSTAL_CODE_MAX: 20,
  COUNTRY_CODE_LENGTH: 2,

  /** Festival */
  FESTIVAL_NAME_MIN: 3,
  FESTIVAL_NAME_MAX: 150,
  FESTIVAL_SLUG_MIN: 3,
  FESTIVAL_SLUG_MAX: 100,
  FESTIVAL_DESCRIPTION_MAX: 10000,
  FESTIVAL_SHORT_DESCRIPTION_MAX: 500,
  FESTIVAL_TAGLINE_MAX: 200,

  /** Event/Performance */
  EVENT_TITLE_MIN: 2,
  EVENT_TITLE_MAX: 200,
  EVENT_DESCRIPTION_MAX: 5000,

  /** Artist */
  ARTIST_NAME_MIN: 1,
  ARTIST_NAME_MAX: 100,
  ARTIST_BIO_MAX: 2000,

  /** Venue/Stage */
  VENUE_NAME_MIN: 2,
  VENUE_NAME_MAX: 100,
  STAGE_NAME_MIN: 1,
  STAGE_NAME_MAX: 100,

  /** Ticket */
  TICKET_NAME_MIN: 2,
  TICKET_NAME_MAX: 100,
  TICKET_DESCRIPTION_MAX: 1000,

  /** General */
  TITLE_MIN: 2,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 5000,
  COMMENT_MAX: 2000,
  NOTE_MAX: 1000,
  TAG_MIN: 2,
  TAG_MAX: 50,
  URL_MAX: 2048,
  SLUG_MIN: 2,
  SLUG_MAX: 100,

  /** Search */
  SEARCH_QUERY_MIN: 1,
  SEARCH_QUERY_MAX: 200,

  /** Codes */
  PROMO_CODE_MIN: 4,
  PROMO_CODE_MAX: 20,
  QR_CODE_MAX: 500,
  NFC_TAG_ID_MAX: 50,
} as const;

/**
 * Numeric constraints
 */
export const NUMERIC_LIMITS = {
  /** Age */
  AGE_MIN: 0,
  AGE_MAX: 150,
  AGE_ADULT: 18,
  AGE_SENIOR: 65,

  /** Capacity */
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 500000,

  /** Price (in cents) */
  PRICE_MIN: 0,
  PRICE_MAX: 1000000000,

  /** Quantity */
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 100000,
  ORDER_QUANTITY_MIN: 1,
  ORDER_QUANTITY_MAX: 10,

  /** Duration (in minutes) */
  DURATION_MIN: 1,
  DURATION_MAX: 10080,
  EVENT_DURATION_MIN: 15,
  EVENT_DURATION_MAX: 480,

  /** Rating */
  RATING_MIN: 0,
  RATING_MAX: 5,
  RATING_PRECISION: 1,

  /** Pagination */
  PAGE_MIN: 1,
  PAGE_SIZE_MIN: 1,
  PAGE_SIZE_MAX: 100,
  PAGE_SIZE_DEFAULT: 20,
  OFFSET_MIN: 0,

  /** Coordinates */
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180,
  ALTITUDE_MIN: -500,
  ALTITUDE_MAX: 10000,

  /** Percentage */
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100,
  DISCOUNT_PERCENTAGE_MAX: 100,

  /** Files */
  MAX_FILES_PER_UPLOAD: 10,
  MAX_IMAGES_PER_ENTITY: 50,

  /** Tags/Categories */
  MAX_TAGS: 20,
  MAX_CATEGORIES: 10,

  /** Time (in seconds) */
  SESSION_TIMEOUT_MIN: 60,
  SESSION_TIMEOUT_MAX: 86400,

  /** Retry/Attempts */
  MAX_RETRY_ATTEMPTS: 5,
  MAX_LOGIN_ATTEMPTS: 5,
} as const;

/**
 * File size constraints (in bytes)
 */
export const FILE_SIZE = {
  /** Images */
  IMAGE_MIN: 1024,
  IMAGE_MAX: 10 * 1024 * 1024,
  THUMBNAIL_MAX: 512 * 1024,
  AVATAR_MAX: 2 * 1024 * 1024,
  BANNER_MAX: 5 * 1024 * 1024,
  GALLERY_IMAGE_MAX: 10 * 1024 * 1024,

  /** Documents */
  PDF_MAX: 20 * 1024 * 1024,
  DOCUMENT_MAX: 50 * 1024 * 1024,

  /** Video */
  VIDEO_MAX: 500 * 1024 * 1024,

  /** Audio */
  AUDIO_MAX: 50 * 1024 * 1024,

  /** Total upload */
  TOTAL_UPLOAD_MAX: 100 * 1024 * 1024,
} as const;

/**
 * Image dimension constraints (in pixels)
 */
export const IMAGE_DIMENSIONS = {
  /** Avatar */
  AVATAR_MIN_WIDTH: 100,
  AVATAR_MIN_HEIGHT: 100,
  AVATAR_MAX_WIDTH: 1000,
  AVATAR_MAX_HEIGHT: 1000,
  AVATAR_RECOMMENDED_SIZE: 400,

  /** Banner */
  BANNER_MIN_WIDTH: 800,
  BANNER_MIN_HEIGHT: 200,
  BANNER_MAX_WIDTH: 3840,
  BANNER_MAX_HEIGHT: 2160,
  BANNER_RECOMMENDED_WIDTH: 1920,
  BANNER_RECOMMENDED_HEIGHT: 480,

  /** Thumbnail */
  THUMBNAIL_WIDTH: 300,
  THUMBNAIL_HEIGHT: 300,

  /** Gallery */
  GALLERY_MIN_WIDTH: 400,
  GALLERY_MIN_HEIGHT: 300,
  GALLERY_MAX_WIDTH: 4000,
  GALLERY_MAX_HEIGHT: 4000,

  /** QR Code */
  QR_CODE_SIZE: 256,
  QR_CODE_MIN_SIZE: 128,
  QR_CODE_MAX_SIZE: 1024,

  /** Aspect ratios (width:height) */
  ASPECT_RATIO_SQUARE: 1,
  ASPECT_RATIO_LANDSCAPE: 16 / 9,
  ASPECT_RATIO_PORTRAIT: 9 / 16,
  ASPECT_RATIO_BANNER: 4,
} as const;

/**
 * Date/Time constraints
 */
export const DATE_CONSTRAINTS = {
  /** Festival dates */
  MAX_FESTIVAL_DURATION_DAYS: 30,
  MIN_ADVANCE_BOOKING_HOURS: 1,
  MAX_ADVANCE_BOOKING_DAYS: 365,

  /** Event scheduling */
  MIN_EVENT_LEAD_TIME_HOURS: 24,
  MAX_EVENT_SCHEDULE_DAYS: 365,

  /** Ticket validity */
  TICKET_VALIDITY_DAYS: 1,

  /** Refund window */
  REFUND_WINDOW_DAYS: 14,

  /** Account */
  PASSWORD_EXPIRY_DAYS: 90,
  ACCOUNT_INACTIVITY_DAYS: 365,

  /** Data retention */
  AUDIT_LOG_RETENTION_DAYS: 365,
  SESSION_LOG_RETENTION_DAYS: 90,
  ANALYTICS_RETENTION_DAYS: 730,
} as const;

/**
 * Allowed MIME types
 */
export const MIME_TYPES = {
  /** Images */
  IMAGES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ] as const,

  /** Documents */
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ] as const,

  /** Videos */
  VIDEOS: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ] as const,

  /** Audio */
  AUDIO: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
  ] as const,

  /** All allowed */
  ALL_ALLOWED: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
  ] as const,
} as const;

/**
 * File extensions
 */
export const FILE_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] as const,
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'] as const,
  VIDEOS: ['.mp4', '.webm', '.ogg', '.mov'] as const,
  AUDIO: ['.mp3', '.wav', '.ogg', '.webm', '.aac'] as const,
} as const;

/**
 * Regex patterns for validation
 * Note: More patterns available in regex.constants.ts
 */
export const VALIDATION_PATTERNS = {
  /** Only letters (with accents) */
  LETTERS_ONLY: /^[\p{L}\s'-]+$/u,

  /** Alphanumeric */
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,

  /** Alphanumeric with spaces */
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,

  /** Slug format */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /** Username */
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,

  /** Hex color */
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  /** ISO date */
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,

  /** Time 24h */
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,

  /** UUID v4 */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /** Safe string (no special chars) */
  SAFE_STRING: /^[\w\s\u00C0-\u024F\u1E00-\u1EFF'-.,!?]+$/,

  /** NFC tag ID */
  NFC_TAG_ID: /^[A-Fa-f0-9]{8,20}$/,

  /** Stripe customer ID */
  STRIPE_CUSTOMER_ID: /^cus_[a-zA-Z0-9]{14,}$/,

  /** Stripe payment intent ID */
  STRIPE_PAYMENT_INTENT_ID: /^pi_[a-zA-Z0-9]{24,}$/,
} as const;

/**
 * Country codes (ISO 3166-1 alpha-2) - Common ones for European festivals
 */
export const COUNTRY_CODES = [
  'FR', 'DE', 'BE', 'NL', 'LU', 'CH', 'AT', 'IT', 'ES', 'PT',
  'GB', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'RO',
  'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'GR', 'CY', 'MT',
  'US', 'CA', 'AU', 'NZ', 'JP',
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

/**
 * Locale codes
 */
export const LOCALE_CODES = [
  'fr-FR', 'en-US', 'en-GB', 'de-DE', 'es-ES', 'it-IT',
  'nl-NL', 'nl-BE', 'fr-BE', 'de-AT', 'de-CH', 'fr-CH',
  'pt-PT', 'pt-BR', 'pl-PL', 'cs-CZ', 'hu-HU',
] as const;

export type LocaleCode = (typeof LOCALE_CODES)[number];

/**
 * Timezone identifiers (IANA)
 */
export const TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Lisbon',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'UTC',
] as const;

export type Timezone = (typeof TIMEZONES)[number];
