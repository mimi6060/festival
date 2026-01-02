// Festival Platform - Shared Utilities
// Export all utility functions

// Core utilities
export * from './lib/date.utils';
export * from './lib/string.utils';

// Validation utilities - export all except functions that have better implementations elsewhere
export {
  isValidEmail,
  // isValidPhoneNumber is exported from phone.utils with more features
  validatePassword,
  isValidUUID,
  isValidUrl,
  isValidFrenchPostalCode,
  isValidNumber,
  // isValidCoordinates is exported from geo.utils with more features
  isValidIBAN,
  isValidCreditCard,
  isValidDateFormat,
  isValidTimeFormat,
  isValidHexColor,
  isValidSlug,
  isAlphanumeric,
  hasMinLength,
  hasMaxLength,
  isOneOf,
  hasMinItems,
  hasMaxItems,
  isDefined,
  isEmptyObject,
  isPositiveInteger,
  isNonNegativeInteger,
  isInRange,
} from './lib/validation.utils';

// Format utilities - export all except functions that have better implementations elsewhere
export {
  // formatPrice is exported from currency.utils with more options
  formatNumber,
  formatPercentage,
  // formatFileSize is exported from file.utils with more options
  formatDuration,
  // formatPhoneNumber is exported from phone.utils with more features
  formatAddressOneLine,
  formatFullName,
  formatCoordinates,
  formatDateRange,
  formatBytes,
  formatCount,
  formatOrdinal,
  formatList,
  formatTimeRange,
  // formatDistance is exported from geo.utils with more features
  formatRating,
  formatCreditCard,
  formatIBAN,
  formatCompactNumber,
  formatDecimal,
} from './lib/format.utils';

export * from './lib/crypto.utils';

// Extended utilities
export * from './lib/currency.utils';
export * from './lib/pagination.utils';
export * from './lib/qrcode.utils';
export * from './lib/geo.utils';
export * from './lib/file.utils';
export * from './lib/phone.utils';

// Base utilities
export * from './lib/utils';
