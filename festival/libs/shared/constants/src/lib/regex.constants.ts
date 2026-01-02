// Regular expressions for validation

// Email validation (RFC 5322)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone number (international format)
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// French phone number
export const FRENCH_PHONE_REGEX = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

// French postal code
export const FRENCH_POSTAL_CODE_REGEX = /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/;

// UUID v4
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Slug (URL-friendly string)
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Password requirements
export const PASSWORD_REGEX = {
  HAS_UPPERCASE: /[A-Z]/,
  HAS_LOWERCASE: /[a-z]/,
  HAS_NUMBER: /\d/,
  HAS_SPECIAL: /[!@#$%^&*(),.?":{}|<>]/,
  MIN_LENGTH: /.{8,}/,
};

// URL validation
export const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

// Date formats
export const DATE_REGEX = {
  ISO: /^\d{4}-\d{2}-\d{2}$/,
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
};

// Credit card (basic validation)
export const CREDIT_CARD_REGEX = /^\d{13,19}$/;

// Alphanumeric with spaces
export const ALPHANUMERIC_SPACES_REGEX = /^[a-zA-Z0-9\s]+$/;

// No special characters (letters, numbers, spaces, hyphens, apostrophes)
export const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]+$/;
