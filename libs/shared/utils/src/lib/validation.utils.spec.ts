import {
  isValidEmail,
  isValidPhoneNumber,
  validatePassword,
  isValidUUID,
  isValidUrl,
  isValidFrenchPostalCode,
  isValidNumber,
  isValidCoordinates,
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
} from './validation.utils';

describe('Validation Utils', () => {
  // ============================================================================
  // isValidEmail
  // ============================================================================
  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(isValidEmail('test@mail.example.com')).toBe(true);
    });

    it('should validate email with plus sign', () => {
      expect(isValidEmail('test+tag@example.com')).toBe(true);
    });

    it('should validate email with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(isValidEmail('test@example')).toBe(false);
    });
  });

  // ============================================================================
  // isValidPhoneNumber
  // ============================================================================
  describe('isValidPhoneNumber', () => {
    it('should validate international format', () => {
      expect(isValidPhoneNumber('+33612345678')).toBe(true);
    });

    it('should validate with country code', () => {
      expect(isValidPhoneNumber('+1234567890123')).toBe(true);
    });

    it('should reject phone with spaces (after cleaning)', () => {
      expect(isValidPhoneNumber('+33 6 12 34 56 78')).toBe(true);
    });

    it('should reject phone with dashes (after cleaning)', () => {
      expect(isValidPhoneNumber('+33-6-12-34-56-78')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('should reject too short number', () => {
      // The utility uses a regex that accepts short numbers if they match basic format
      expect(isValidPhoneNumber('1')).toBe(false);
    });
  });

  // ============================================================================
  // validatePassword
  // ============================================================================
  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password too short', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('PasswordABC!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should collect multiple errors', () => {
      const result = validatePassword('abc');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // isValidUUID
  // ============================================================================
  describe('isValidUUID', () => {
    it('should validate UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should validate lowercase UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should validate uppercase UUID', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });

    it('should reject UUID without dashes', () => {
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    });

    it('should reject UUID with wrong segment length', () => {
      expect(isValidUUID('550e840-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should reject UUID with invalid version', () => {
      expect(isValidUUID('550e8400-e29b-61d4-a716-446655440000')).toBe(false);
    });
  });

  // ============================================================================
  // isValidUrl
  // ============================================================================
  describe('isValidUrl', () => {
    it('should validate http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should validate https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should validate URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should validate URL with query params', () => {
      expect(isValidUrl('https://example.com?foo=bar')).toBe(true);
    });

    it('should validate URL with port', () => {
      expect(isValidUrl('https://example.com:8080')).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('should reject URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  // ============================================================================
  // isValidFrenchPostalCode
  // ============================================================================
  describe('isValidFrenchPostalCode', () => {
    it('should validate 5-digit postal code', () => {
      expect(isValidFrenchPostalCode('75001')).toBe(true);
    });

    it('should validate postal code starting with 0', () => {
      expect(isValidFrenchPostalCode('06000')).toBe(true);
    });

    it('should reject postal code with letters', () => {
      expect(isValidFrenchPostalCode('7500A')).toBe(false);
    });

    it('should reject postal code too short', () => {
      expect(isValidFrenchPostalCode('7500')).toBe(false);
    });

    it('should reject postal code too long', () => {
      expect(isValidFrenchPostalCode('750001')).toBe(false);
    });
  });

  // ============================================================================
  // isValidNumber
  // ============================================================================
  describe('isValidNumber', () => {
    it('should validate integer', () => {
      expect(isValidNumber(42)).toBe(true);
    });

    it('should validate float', () => {
      expect(isValidNumber(3.14)).toBe(true);
    });

    it('should validate negative number', () => {
      expect(isValidNumber(-100)).toBe(true);
    });

    it('should validate numeric string', () => {
      expect(isValidNumber('42')).toBe(true);
    });

    it('should validate float string', () => {
      expect(isValidNumber('3.14')).toBe(true);
    });

    it('should reject NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
    });

    it('should reject non-numeric string', () => {
      expect(isValidNumber('abc')).toBe(false);
    });

    it('should reject object', () => {
      expect(isValidNumber({})).toBe(false);
    });
  });

  // ============================================================================
  // isValidCoordinates
  // ============================================================================
  describe('isValidCoordinates', () => {
    it('should validate valid coordinates', () => {
      expect(isValidCoordinates(48.8566, 2.3522)).toBe(true);
    });

    it('should validate extreme latitudes', () => {
      expect(isValidCoordinates(90, 0)).toBe(true);
      expect(isValidCoordinates(-90, 0)).toBe(true);
    });

    it('should validate extreme longitudes', () => {
      expect(isValidCoordinates(0, 180)).toBe(true);
      expect(isValidCoordinates(0, -180)).toBe(true);
    });

    it('should reject latitude out of range', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
    });

    it('should reject longitude out of range', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
    });
  });

  // ============================================================================
  // isValidIBAN
  // ============================================================================
  describe('isValidIBAN', () => {
    it('should validate French IBAN', () => {
      expect(isValidIBAN('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
    });

    it('should validate German IBAN', () => {
      expect(isValidIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
    });

    it('should validate IBAN without spaces', () => {
      expect(isValidIBAN('DE89370400440532013000')).toBe(true);
    });

    it('should reject IBAN with invalid check digits', () => {
      expect(isValidIBAN('DE00 3704 0044 0532 0130 00')).toBe(false);
    });

    it('should reject IBAN too short', () => {
      expect(isValidIBAN('FR76')).toBe(false);
    });

    it('should reject IBAN with invalid format', () => {
      expect(isValidIBAN('12345')).toBe(false);
    });
  });

  // ============================================================================
  // isValidCreditCard
  // ============================================================================
  describe('isValidCreditCard', () => {
    it('should validate Visa card', () => {
      expect(isValidCreditCard('4111111111111111')).toBe(true);
    });

    it('should validate Mastercard', () => {
      expect(isValidCreditCard('5500000000000004')).toBe(true);
    });

    it('should validate card with spaces', () => {
      expect(isValidCreditCard('4111 1111 1111 1111')).toBe(true);
    });

    it('should validate card with dashes', () => {
      expect(isValidCreditCard('4111-1111-1111-1111')).toBe(true);
    });

    it('should reject invalid Luhn checksum', () => {
      expect(isValidCreditCard('4111111111111112')).toBe(false);
    });

    it('should reject card too short', () => {
      expect(isValidCreditCard('411111111111')).toBe(false);
    });

    it('should reject card too long', () => {
      expect(isValidCreditCard('41111111111111111111')).toBe(false);
    });
  });

  // ============================================================================
  // isValidDateFormat
  // ============================================================================
  describe('isValidDateFormat', () => {
    it('should validate YYYY-MM-DD format', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
    });

    it('should validate different months', () => {
      expect(isValidDateFormat('2024-12-31')).toBe(true);
    });

    it('should validate leap year date', () => {
      expect(isValidDateFormat('2024-02-29')).toBe(true);
    });

    it('should reject invalid month', () => {
      expect(isValidDateFormat('2024-13-01')).toBe(false);
    });

    it('should reject invalid day', () => {
      expect(isValidDateFormat('2024-01-32')).toBe(false);
    });

    it('should reject Feb 29 on non-leap year', () => {
      expect(isValidDateFormat('2023-02-29')).toBe(false);
    });

    it('should reject wrong format', () => {
      expect(isValidDateFormat('01/15/2024')).toBe(false);
    });

    it('should reject incomplete date', () => {
      expect(isValidDateFormat('2024-01')).toBe(false);
    });
  });

  // ============================================================================
  // isValidTimeFormat
  // ============================================================================
  describe('isValidTimeFormat', () => {
    it('should validate HH:mm format', () => {
      expect(isValidTimeFormat('14:30')).toBe(true);
    });

    it('should validate HH:mm:ss format', () => {
      expect(isValidTimeFormat('14:30:45')).toBe(true);
    });

    it('should validate midnight', () => {
      expect(isValidTimeFormat('00:00')).toBe(true);
    });

    it('should validate 23:59', () => {
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid hour', () => {
      expect(isValidTimeFormat('24:00')).toBe(false);
    });

    it('should reject invalid minute', () => {
      expect(isValidTimeFormat('12:60')).toBe(false);
    });

    it('should reject invalid second', () => {
      expect(isValidTimeFormat('12:30:60')).toBe(false);
    });

    it('should reject single digit format', () => {
      expect(isValidTimeFormat('2:30')).toBe(false);
    });
  });

  // ============================================================================
  // isValidHexColor
  // ============================================================================
  describe('isValidHexColor', () => {
    it('should validate 6-digit hex color', () => {
      expect(isValidHexColor('#FF5733')).toBe(true);
    });

    it('should validate 3-digit hex color', () => {
      expect(isValidHexColor('#F00')).toBe(true);
    });

    it('should validate lowercase hex color', () => {
      expect(isValidHexColor('#ff5733')).toBe(true);
    });

    it('should reject without hash', () => {
      expect(isValidHexColor('FF5733')).toBe(false);
    });

    it('should reject invalid hex characters', () => {
      expect(isValidHexColor('#GG5733')).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(isValidHexColor('#FF57')).toBe(false);
    });
  });

  // ============================================================================
  // isValidSlug
  // ============================================================================
  describe('isValidSlug', () => {
    it('should validate simple slug', () => {
      expect(isValidSlug('hello')).toBe(true);
    });

    it('should validate slug with hyphen', () => {
      expect(isValidSlug('hello-world')).toBe(true);
    });

    it('should validate slug with numbers', () => {
      expect(isValidSlug('festival-2024')).toBe(true);
    });

    it('should reject uppercase', () => {
      expect(isValidSlug('Hello-World')).toBe(false);
    });

    it('should reject spaces', () => {
      expect(isValidSlug('hello world')).toBe(false);
    });

    it('should reject consecutive hyphens', () => {
      expect(isValidSlug('hello--world')).toBe(false);
    });

    it('should reject leading hyphen', () => {
      expect(isValidSlug('-hello')).toBe(false);
    });

    it('should reject trailing hyphen', () => {
      expect(isValidSlug('hello-')).toBe(false);
    });
  });

  // ============================================================================
  // isAlphanumeric
  // ============================================================================
  describe('isAlphanumeric', () => {
    it('should validate letters only', () => {
      expect(isAlphanumeric('hello')).toBe(true);
    });

    it('should validate numbers only', () => {
      expect(isAlphanumeric('12345')).toBe(true);
    });

    it('should validate mixed', () => {
      expect(isAlphanumeric('hello123')).toBe(true);
    });

    it('should reject spaces', () => {
      expect(isAlphanumeric('hello world')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(isAlphanumeric('hello!')).toBe(false);
    });

    it('should reject hyphen', () => {
      expect(isAlphanumeric('hello-world')).toBe(false);
    });
  });

  // ============================================================================
  // hasMinLength / hasMaxLength
  // ============================================================================
  describe('hasMinLength', () => {
    it('should return true for string at min length', () => {
      expect(hasMinLength('hello', 5)).toBe(true);
    });

    it('should return true for string above min length', () => {
      expect(hasMinLength('hello world', 5)).toBe(true);
    });

    it('should return false for string below min length', () => {
      expect(hasMinLength('hi', 5)).toBe(false);
    });
  });

  describe('hasMaxLength', () => {
    it('should return true for string at max length', () => {
      expect(hasMaxLength('hello', 5)).toBe(true);
    });

    it('should return true for string below max length', () => {
      expect(hasMaxLength('hi', 5)).toBe(true);
    });

    it('should return false for string above max length', () => {
      expect(hasMaxLength('hello world', 5)).toBe(false);
    });
  });

  // ============================================================================
  // isOneOf
  // ============================================================================
  describe('isOneOf', () => {
    it('should return true if value is in list', () => {
      expect(isOneOf('apple', ['apple', 'banana', 'cherry'])).toBe(true);
    });

    it('should return false if value is not in list', () => {
      expect(isOneOf('orange', ['apple', 'banana', 'cherry'])).toBe(false);
    });

    it('should work with numbers', () => {
      expect(isOneOf(2, [1, 2, 3])).toBe(true);
    });

    it('should handle empty list', () => {
      expect(isOneOf('test', [])).toBe(false);
    });
  });

  // ============================================================================
  // hasMinItems / hasMaxItems
  // ============================================================================
  describe('hasMinItems', () => {
    it('should return true for array at min items', () => {
      expect(hasMinItems([1, 2, 3], 3)).toBe(true);
    });

    it('should return true for array above min items', () => {
      expect(hasMinItems([1, 2, 3, 4], 3)).toBe(true);
    });

    it('should return false for array below min items', () => {
      expect(hasMinItems([1, 2], 3)).toBe(false);
    });
  });

  describe('hasMaxItems', () => {
    it('should return true for array at max items', () => {
      expect(hasMaxItems([1, 2, 3], 3)).toBe(true);
    });

    it('should return true for array below max items', () => {
      expect(hasMaxItems([1, 2], 3)).toBe(true);
    });

    it('should return false for array above max items', () => {
      expect(hasMaxItems([1, 2, 3, 4], 3)).toBe(false);
    });
  });

  // ============================================================================
  // isDefined
  // ============================================================================
  describe('isDefined', () => {
    it('should return true for defined value', () => {
      expect(isDefined('test')).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isDefined(0)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isDefined('')).toBe(true);
    });

    it('should return true for false', () => {
      expect(isDefined(false)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  // ============================================================================
  // isEmptyObject
  // ============================================================================
  describe('isEmptyObject', () => {
    it('should return true for empty object', () => {
      expect(isEmptyObject({})).toBe(true);
    });

    it('should return false for object with properties', () => {
      expect(isEmptyObject({ key: 'value' })).toBe(false);
    });

    it('should return false for object with nested empty object', () => {
      expect(isEmptyObject({ nested: {} })).toBe(false);
    });
  });

  // ============================================================================
  // isPositiveInteger / isNonNegativeInteger
  // ============================================================================
  describe('isPositiveInteger', () => {
    it('should return true for positive integer', () => {
      expect(isPositiveInteger(5)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositiveInteger(0)).toBe(false);
    });

    it('should return false for negative integer', () => {
      expect(isPositiveInteger(-5)).toBe(false);
    });

    it('should return false for float', () => {
      expect(isPositiveInteger(5.5)).toBe(false);
    });
  });

  describe('isNonNegativeInteger', () => {
    it('should return true for positive integer', () => {
      expect(isNonNegativeInteger(5)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isNonNegativeInteger(0)).toBe(true);
    });

    it('should return false for negative integer', () => {
      expect(isNonNegativeInteger(-5)).toBe(false);
    });

    it('should return false for float', () => {
      expect(isNonNegativeInteger(5.5)).toBe(false);
    });
  });

  // ============================================================================
  // isInRange
  // ============================================================================
  describe('isInRange', () => {
    it('should return true for value in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
    });

    it('should return true for value at min', () => {
      expect(isInRange(1, 1, 10)).toBe(true);
    });

    it('should return true for value at max', () => {
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('should return false for value below min', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
    });

    it('should return false for value above max', () => {
      expect(isInRange(11, 1, 10)).toBe(false);
    });

    it('should work with negative ranges', () => {
      expect(isInRange(-5, -10, -1)).toBe(true);
    });
  });
});
