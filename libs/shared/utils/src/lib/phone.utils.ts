/**
 * Phone Number Utilities
 * Functions for phone number validation, formatting, and parsing
 */

// ============================================================================
// Types
// ============================================================================

export interface PhoneNumber {
  countryCode: string;
  nationalNumber: string;
  formatted: string;
  international: string;
  e164: string;
  isValid: boolean;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  phoneNumber?: PhoneNumber;
}

export interface CountryPhoneInfo {
  code: string;
  name: string;
  dialCode: string;
  format: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
}

// ============================================================================
// Country Phone Information
// ============================================================================

export const COUNTRY_PHONE_INFO: Record<string, CountryPhoneInfo> = {
  FR: {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    format: 'XX XX XX XX XX',
    pattern: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
    minLength: 9,
    maxLength: 10,
  },
  BE: {
    code: 'BE',
    name: 'Belgique',
    dialCode: '+32',
    format: 'XXX XX XX XX',
    pattern: /^(?:(?:\+|00)32|0)\s*[1-9]\d{7,8}$/,
    minLength: 8,
    maxLength: 9,
  },
  CH: {
    code: 'CH',
    name: 'Suisse',
    dialCode: '+41',
    format: 'XX XXX XX XX',
    pattern: /^(?:(?:\+|00)41|0)\s*[1-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    dialCode: '+352',
    format: 'XXX XXX XXX',
    pattern: /^(?:(?:\+|00)352|0)\s*[1-9]\d{6,8}$/,
    minLength: 6,
    maxLength: 9,
  },
  DE: {
    code: 'DE',
    name: 'Allemagne',
    dialCode: '+49',
    format: 'XXX XXXXXXXX',
    pattern: /^(?:(?:\+|00)49|0)\s*[1-9]\d{9,11}$/,
    minLength: 10,
    maxLength: 12,
  },
  GB: {
    code: 'GB',
    name: 'Royaume-Uni',
    dialCode: '+44',
    format: 'XXXX XXX XXXX',
    pattern: /^(?:(?:\+|00)44|0)\s*[1-9]\d{9,10}$/,
    minLength: 10,
    maxLength: 11,
  },
  ES: {
    code: 'ES',
    name: 'Espagne',
    dialCode: '+34',
    format: 'XXX XXX XXX',
    pattern: /^(?:(?:\+|00)34)\s*[6-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
  },
  IT: {
    code: 'IT',
    name: 'Italie',
    dialCode: '+39',
    format: 'XXX XXXXXXX',
    pattern: /^(?:(?:\+|00)39)\s*[0-9]\d{9,10}$/,
    minLength: 9,
    maxLength: 11,
  },
  NL: {
    code: 'NL',
    name: 'Pays-Bas',
    dialCode: '+31',
    format: 'X XX XXX XXXX',
    pattern: /^(?:(?:\+|00)31|0)\s*[1-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    format: 'XXX XXX XXX',
    pattern: /^(?:(?:\+|00)351)\s*[1-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
  },
  US: {
    code: 'US',
    name: 'Etats-Unis',
    dialCode: '+1',
    format: '(XXX) XXX-XXXX',
    pattern: /^(?:(?:\+|00)1)?\s*\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    minLength: 10,
    maxLength: 10,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    format: '(XXX) XXX-XXXX',
    pattern: /^(?:(?:\+|00)1)?\s*\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    minLength: 10,
    maxLength: 10,
  },
};

// List of European countries with their dial codes for quick lookup
export const EUROPEAN_DIAL_CODES = [
  '+33', // France
  '+32', // Belgium
  '+41', // Switzerland
  '+352', // Luxembourg
  '+49', // Germany
  '+44', // UK
  '+34', // Spain
  '+39', // Italy
  '+31', // Netherlands
  '+351', // Portugal
  '+43', // Austria
  '+30', // Greece
  '+353', // Ireland
  '+48', // Poland
  '+420', // Czech Republic
  '+45', // Denmark
  '+46', // Sweden
  '+47', // Norway
  '+358', // Finland
];

// ============================================================================
// Parsing & Extraction
// ============================================================================

/**
 * Extract digits only from phone number string
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, '');

  // Check for + prefix
  if (cleaned.startsWith('+')) {
    // Try to match known dial codes (longest first)
    const dialCodes = Object.values(COUNTRY_PHONE_INFO)
      .map((info) => info.dialCode)
      .sort((a, b) => b.length - a.length);

    for (const dialCode of dialCodes) {
      if (cleaned.startsWith(dialCode)) {
        return dialCode;
      }
    }
  }

  // Check for 00 prefix
  if (cleaned.startsWith('00')) {
    const withPlus = '+' + cleaned.substring(2);
    return extractCountryCode(withPlus);
  }

  return null;
}

/**
 * Get country from dial code
 */
export function getCountryFromDialCode(dialCode: string): string | null {
  for (const [code, info] of Object.entries(COUNTRY_PHONE_INFO)) {
    if (info.dialCode === dialCode) {
      return code;
    }
  }
  return null;
}

/**
 * Parse phone number string into structured format
 */
export function parsePhoneNumber(phone: string, defaultCountry: string = 'FR'): PhoneNumber | null {
  if (!phone) return null;

  const cleaned = phone.trim();
  let countryCode = extractCountryCode(cleaned);
  let nationalNumber: string;

  if (countryCode) {
    // International format
    nationalNumber = cleaned.substring(countryCode.length).replace(/\D/g, '');
  } else {
    // Local format - use default country
    const countryInfo = COUNTRY_PHONE_INFO[defaultCountry];
    if (!countryInfo) return null;

    countryCode = countryInfo.dialCode;
    nationalNumber = extractDigits(cleaned);

    // Remove leading zero for national format
    if (nationalNumber.startsWith('0')) {
      nationalNumber = nationalNumber.substring(1);
    }
  }

  if (!nationalNumber) return null;

  const e164 = `${countryCode}${nationalNumber}`;
  const formatted = formatPhoneNumber(e164, defaultCountry);

  return {
    countryCode,
    nationalNumber,
    formatted,
    international: e164,
    e164,
    isValid: isValidPhoneNumber(e164),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string, countryCode?: string): boolean {
  if (!phone) return false;

  const result = validatePhoneNumber(phone, countryCode);
  return result.isValid;
}

/**
 * Validate phone number with detailed result
 */
export function validatePhoneNumber(
  phone: string,
  countryCode?: string
): PhoneValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: 'Le numero de telephone est requis' };
  }

  const cleaned = phone.trim();
  const dialCode = extractCountryCode(cleaned);

  // If country code provided, validate against that country
  if (countryCode) {
    const countryInfo = COUNTRY_PHONE_INFO[countryCode];
    if (countryInfo) {
      const isValid = countryInfo.pattern.test(cleaned);
      if (!isValid) {
        return {
          isValid: false,
          error: `Format de numero invalide pour ${countryInfo.name}`,
        };
      }
    }
  }

  // Basic validation for any phone number
  const digits = extractDigits(cleaned);

  // Check minimum length (international: 8, national: 6)
  const minLength = dialCode ? 8 : 6;
  if (digits.length < minLength) {
    return { isValid: false, error: 'Le numero est trop court' };
  }

  // Check maximum length
  if (digits.length > 15) {
    return { isValid: false, error: 'Le numero est trop long' };
  }

  const phoneNumber = parsePhoneNumber(phone);
  if (!phoneNumber) {
    return { isValid: false, error: 'Format de numero invalide' };
  }

  return { isValid: true, phoneNumber };
}

/**
 * Check if phone number is mobile
 */
export function isMobileNumber(phone: string, countryCode: string = 'FR'): boolean {
  const digits = extractDigits(phone);

  switch (countryCode) {
    case 'FR':
      // French mobile numbers start with 06 or 07
      return /^(0?[67])/.test(digits) || /^33[67]/.test(digits);
    case 'BE':
      // Belgian mobile numbers start with 04
      return /^(0?4)/.test(digits) || /^324/.test(digits);
    case 'GB':
      // UK mobile numbers start with 07
      return /^(0?7)/.test(digits) || /^447/.test(digits);
    default:
      // Generic check for numbers starting with common mobile prefixes
      return /^[67]/.test(digits.replace(/^(0|33|32|44|49|34|39)/, ''));
  }
}

/**
 * Check if phone number is landline
 */
export function isLandlineNumber(phone: string, countryCode: string = 'FR'): boolean {
  return !isMobileNumber(phone, countryCode);
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format phone number to national format
 */
export function formatPhoneNumber(phone: string, countryCode: string = 'FR'): string {
  if (!phone) return '';

  const parsed = parsePhoneNumber(phone, countryCode);
  if (!parsed) return phone;

  const national = parsed.nationalNumber;

  switch (countryCode) {
    case 'FR':
      // Format: 06 12 34 56 78
      if (national.length === 9) {
        return `0${national.slice(0, 1)} ${national.slice(1, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`;
      }
      break;
    case 'BE':
      // Format: 0475 12 34 56
      if (national.length === 9) {
        return `0${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`;
      }
      break;
    case 'US':
    case 'CA':
      // Format: (514) 123-4567
      if (national.length === 10) {
        return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
      }
      break;
    default:
      // Generic format with spaces every 2-3 digits
      return national.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }

  return phone;
}

/**
 * Format phone number to international format
 */
export function formatInternational(phone: string, countryCode: string = 'FR'): string {
  const parsed = parsePhoneNumber(phone, countryCode);
  if (!parsed) return phone;

  return `${parsed.countryCode} ${formatPhoneNumber(phone, countryCode).replace(/^0/, '')}`;
}

/**
 * Format phone number to E.164 format
 */
export function formatE164(phone: string, countryCode: string = 'FR'): string {
  const parsed = parsePhoneNumber(phone, countryCode);
  if (!parsed) return phone;

  return parsed.e164;
}

/**
 * Format phone number for display (with flag)
 */
export function formatPhoneWithFlag(phone: string, countryCode: string = 'FR'): string {
  const flags: Record<string, string> = {
    FR: '\u{1F1EB}\u{1F1F7}',
    BE: '\u{1F1E7}\u{1F1EA}',
    CH: '\u{1F1E8}\u{1F1ED}',
    LU: '\u{1F1F1}\u{1F1FA}',
    DE: '\u{1F1E9}\u{1F1EA}',
    GB: '\u{1F1EC}\u{1F1E7}',
    ES: '\u{1F1EA}\u{1F1F8}',
    IT: '\u{1F1EE}\u{1F1F9}',
    US: '\u{1F1FA}\u{1F1F8}',
    CA: '\u{1F1E8}\u{1F1E6}',
  };

  const flag = flags[countryCode] || '';
  const formatted = formatPhoneNumber(phone, countryCode);

  return `${flag} ${formatted}`.trim();
}

/**
 * Format phone as clickable tel: link
 */
export function formatPhoneLink(phone: string, countryCode: string = 'FR'): string {
  const e164 = formatE164(phone, countryCode);
  return `tel:${e164}`;
}

/**
 * Format phone as WhatsApp link
 */
export function formatWhatsAppLink(phone: string, countryCode: string = 'FR'): string {
  const e164 = formatE164(phone, countryCode).replace('+', '');
  return `https://wa.me/${e164}`;
}

// ============================================================================
// Masking & Privacy
// ============================================================================

/**
 * Mask phone number for privacy
 */
export function maskPhoneNumber(phone: string, visibleDigits: number = 4): string {
  const formatted = formatPhoneNumber(phone);
  const digits = extractDigits(formatted);

  if (digits.length <= visibleDigits) return formatted;

  const maskedLength = digits.length - visibleDigits;
  let masked = '';
  let digitIndex = 0;

  for (const char of formatted) {
    if (/\d/.test(char)) {
      masked += digitIndex < maskedLength ? '*' : char;
      digitIndex++;
    } else {
      masked += char;
    }
  }

  return masked;
}

/**
 * Partially mask phone number (show first and last digits)
 */
export function partialMaskPhone(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  const digits = extractDigits(formatted);

  if (digits.length <= 4) return formatted;

  const firstTwo = digits.slice(0, 2);
  const lastTwo = digits.slice(-2);
  const maskedMiddle = '*'.repeat(digits.length - 4);

  let result = '';
  let digitIndex = 0;
  const maskedDigits = firstTwo + maskedMiddle + lastTwo;

  for (const char of formatted) {
    if (/\d/.test(char)) {
      result += maskedDigits[digitIndex];
      digitIndex++;
    } else {
      result += char;
    }
  }

  return result;
}

// ============================================================================
// Comparison & Normalization
// ============================================================================

/**
 * Normalize phone number for comparison
 */
export function normalizePhoneNumber(phone: string, countryCode: string = 'FR'): string {
  const parsed = parsePhoneNumber(phone, countryCode);
  return parsed ? parsed.e164 : extractDigits(phone);
}

/**
 * Compare two phone numbers
 */
export function arePhoneNumbersEqual(
  phone1: string,
  phone2: string,
  countryCode: string = 'FR'
): boolean {
  const normalized1 = normalizePhoneNumber(phone1, countryCode);
  const normalized2 = normalizePhoneNumber(phone2, countryCode);
  return normalized1 === normalized2;
}

// ============================================================================
// Input Helpers
// ============================================================================

/**
 * Auto-format phone number while typing
 */
export function autoFormatPhoneInput(
  value: string,
  previousValue: string,
  countryCode: string = 'FR'
): string {
  // Only format if adding characters (not deleting)
  if (value.length <= previousValue.length) {
    return value;
  }

  const digits = extractDigits(value);
  const countryInfo = COUNTRY_PHONE_INFO[countryCode];

  if (!countryInfo) return value;

  // Don't format if too many digits
  if (digits.length > countryInfo.maxLength + 1) {
    return previousValue;
  }

  // Apply formatting based on length
  switch (countryCode) {
    case 'FR':
      if (digits.length <= 2) return digits.replace(/^(\d{2})/, '0$1').slice(0, 2);
      if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
      if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    default:
      return value;
  }
}

/**
 * Get phone number placeholder for country
 */
export function getPhonePlaceholder(countryCode: string): string {
  const countryInfo = COUNTRY_PHONE_INFO[countryCode];
  if (!countryInfo) return 'XXX XXX XXXX';

  return countryInfo.format.replace(/X/g, '0');
}

/**
 * Get phone number input pattern for country
 */
export function getPhoneInputPattern(countryCode: string): string {
  const countryInfo = COUNTRY_PHONE_INFO[countryCode];
  if (!countryInfo) return '[0-9\\s\\-\\+]+';

  return countryInfo.pattern.source;
}
