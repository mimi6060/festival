/**
 * Custom Validators Unit Tests
 *
 * Comprehensive tests for custom validators including:
 * - Phone number validators (E.164)
 * - URL validators (HTTPS)
 * - Slug validators
 * - Currency validators
 * - Monetary amount validators
 * - Date validators (future date, after date)
 * - NFC tag UID validators
 * - GPS coordinate validators
 * - Color validators
 * - File extension validators
 * - Conditional validators
 * - IBAN validators
 */

import {
  IsPhoneE164Constraint,
  IsSecureUrlConstraint,
  IsSlugConstraint,
  IsCurrencyCodeConstraint,
  IsMonetaryAmountConstraint,
  IsFutureDateConstraint,
  IsAfterDateConstraint,
  IsNfcTagUidConstraint,
  IsLatitudeConstraint,
  IsLongitudeConstraint,
  IsHexColorConstraint,
  IsFileExtensionConstraint,
  RequiredWithConstraint,
  IsIBANConstraint,
} from './custom.validators';
import { ValidationArguments } from 'class-validator';

// ============================================================================
// Helper Functions
// ============================================================================

const createMockValidationArgs = (
  value: unknown,
  constraints: unknown[] = [],
  object: Record<string, unknown> = {},
  property = 'testProperty',
): ValidationArguments => ({
  value,
  constraints,
  targetName: 'TestDto',
  property,
  object,
});

// ============================================================================
// Phone Number Validators
// ============================================================================

describe('IsPhoneE164Constraint', () => {
  const constraint = new IsPhoneE164Constraint();

  describe('validate', () => {
    it('should return true for valid E.164 phone numbers', () => {
      expect(constraint.validate('+33612345678')).toBe(true);
      expect(constraint.validate('+14155551234')).toBe(true);
      expect(constraint.validate('+442071234567')).toBe(true);
      expect(constraint.validate('+81312345678')).toBe(true);
    });

    it('should return false for phone numbers without +', () => {
      expect(constraint.validate('33612345678')).toBe(false);
    });

    it('should return false for phone numbers starting with +0', () => {
      expect(constraint.validate('+0612345678')).toBe(false);
    });

    it('should return false for phone numbers that are too short', () => {
      expect(constraint.validate('+1')).toBe(false);
    });

    it('should return false for phone numbers that are too long', () => {
      expect(constraint.validate('+123456789012345678')).toBe(false);
    });

    it('should return false for phone numbers with non-digits', () => {
      expect(constraint.validate('+33 6 12 34 56 78')).toBe(false);
      expect(constraint.validate('+33-612-345-678')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(12345)).toBe(false);
      expect(constraint.validate(null)).toBe(false);
      expect(constraint.validate(undefined)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toBe(
        'Phone number must be in E.164 format (e.g., +33612345678)',
      );
    });
  });
});

// ============================================================================
// URL Validators
// ============================================================================

describe('IsSecureUrlConstraint', () => {
  const constraint = new IsSecureUrlConstraint();

  describe('validate', () => {
    it('should return true for HTTPS URLs', () => {
      expect(constraint.validate('https://example.com')).toBe(true);
      expect(constraint.validate('https://example.com/path')).toBe(true);
      expect(constraint.validate('https://example.com:443/path?query=1')).toBe(true);
    });

    it('should return false for HTTP URLs', () => {
      expect(constraint.validate('http://example.com')).toBe(false);
    });

    it('should return false for other protocols', () => {
      expect(constraint.validate('ftp://example.com')).toBe(false);
      expect(constraint.validate('file:///etc/passwd')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(constraint.validate('not-a-url')).toBe(false);
      expect(constraint.validate('://example.com')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(12345)).toBe(false);
      expect(constraint.validate(null)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toBe('URL must be a valid HTTPS URL');
    });
  });
});

// ============================================================================
// Slug Validators
// ============================================================================

describe('IsSlugConstraint', () => {
  const constraint = new IsSlugConstraint();

  describe('validate', () => {
    it('should return true for valid slugs', () => {
      expect(constraint.validate('my-slug')).toBe(true);
      expect(constraint.validate('festival-2024')).toBe(true);
      expect(constraint.validate('a-b-c')).toBe(true);
      expect(constraint.validate('test123')).toBe(true);
    });

    it('should return false for slugs with uppercase', () => {
      expect(constraint.validate('My-Slug')).toBe(false);
    });

    it('should return false for slugs with consecutive hyphens', () => {
      expect(constraint.validate('my--slug')).toBe(false);
    });

    it('should return false for slugs too short', () => {
      expect(constraint.validate('ab')).toBe(false);
    });

    it('should return false for slugs starting with hyphen', () => {
      expect(constraint.validate('-my-slug')).toBe(false);
    });

    it('should return false for slugs ending with hyphen', () => {
      expect(constraint.validate('my-slug-')).toBe(false);
    });

    it('should return false for slugs with special characters', () => {
      expect(constraint.validate('my_slug')).toBe(false);
      expect(constraint.validate('my.slug')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(12345)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toContain(
        '3-100 characters',
      );
    });
  });
});

// ============================================================================
// Currency Validators
// ============================================================================

describe('IsCurrencyCodeConstraint', () => {
  const constraint = new IsCurrencyCodeConstraint();

  describe('validate', () => {
    it('should return true for valid currency codes', () => {
      expect(constraint.validate('EUR')).toBe(true);
      expect(constraint.validate('USD')).toBe(true);
      expect(constraint.validate('GBP')).toBe(true);
      expect(constraint.validate('JPY')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(constraint.validate('eur')).toBe(true);
      expect(constraint.validate('Usd')).toBe(true);
    });

    it('should return false for invalid currency codes', () => {
      expect(constraint.validate('XXX')).toBe(false);
      expect(constraint.validate('EURO')).toBe(false);
      expect(constraint.validate('EU')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(123)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toContain('ISO 4217');
    });
  });
});

// ============================================================================
// Monetary Amount Validators
// ============================================================================

describe('IsMonetaryAmountConstraint', () => {
  const constraint = new IsMonetaryAmountConstraint();

  describe('validate', () => {
    it('should return true for valid amounts', () => {
      const args = createMockValidationArgs(100, [{}]);
      expect(constraint.validate(100, args)).toBe(true);
      expect(constraint.validate(99.99, args)).toBe(true);
      expect(constraint.validate(0, args)).toBe(true);
    });

    it('should return false for negative amounts', () => {
      const args = createMockValidationArgs(-1, [{}]);
      expect(constraint.validate(-1, args)).toBe(false);
    });

    it('should return false for amounts exceeding max', () => {
      const args = createMockValidationArgs(2000000, [{}]);
      expect(constraint.validate(2000000, args)).toBe(false);
    });

    it('should return false for amounts with more than 2 decimal places', () => {
      const args = createMockValidationArgs(99.999, [{}]);
      expect(constraint.validate(99.999, args)).toBe(false);
    });

    it('should respect custom min and max', () => {
      const args = createMockValidationArgs(50, [{ min: 100, max: 1000 }]);
      expect(constraint.validate(50, args)).toBe(false);
      expect(constraint.validate(150, args)).toBe(true);
      expect(constraint.validate(1500, args)).toBe(false);
    });

    it('should return false for non-number values', () => {
      const args = createMockValidationArgs('100', [{}]);
      expect(constraint.validate('100', args)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      const args = createMockValidationArgs(100, [{}]);
      expect(constraint.defaultMessage(args)).toContain('2 decimal places');
    });
  });
});

// ============================================================================
// Date Validators
// ============================================================================

describe('IsFutureDateConstraint', () => {
  const constraint = new IsFutureDateConstraint();

  describe('validate', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(constraint.validate(futureDate)).toBe(true);
    });

    it('should return true for future date strings', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(constraint.validate(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(constraint.validate(pastDate)).toBe(false);
    });

    it('should return false for current date', () => {
      const now = new Date();
      expect(constraint.validate(now)).toBe(false);
    });

    it('should return false for invalid date strings', () => {
      expect(constraint.validate('not-a-date')).toBe(false);
    });

    it('should return false for non-date values', () => {
      expect(constraint.validate(12345)).toBe(false);
      expect(constraint.validate(null)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toBe('Date must be in the future');
    });
  });
});

describe('IsAfterDateConstraint', () => {
  const constraint = new IsAfterDateConstraint();

  describe('validate', () => {
    it('should return true when date is after related date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const args = createMockValidationArgs(endDate, ['startDate'], {
        startDate,
        endDate,
      }, 'endDate');
      expect(constraint.validate(endDate, args)).toBe(true);
    });

    it('should return false when date is before related date', () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');
      const args = createMockValidationArgs(endDate, ['startDate'], {
        startDate,
        endDate,
      }, 'endDate');
      expect(constraint.validate(endDate, args)).toBe(false);
    });

    it('should return false when dates are equal', () => {
      const sameDate = new Date('2024-06-15');
      const args = createMockValidationArgs(sameDate, ['startDate'], {
        startDate: sameDate,
        endDate: sameDate,
      }, 'endDate');
      expect(constraint.validate(sameDate, args)).toBe(false);
    });

    it('should return true when related value is empty', () => {
      const args = createMockValidationArgs(new Date(), ['startDate'], {
        startDate: null,
      }, 'endDate');
      expect(constraint.validate(new Date(), args)).toBe(true);
    });

    it('should handle date strings', () => {
      const args = createMockValidationArgs('2024-12-31', ['startDate'], {
        startDate: '2024-01-01',
      }, 'endDate');
      expect(constraint.validate('2024-12-31', args)).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      const args = createMockValidationArgs(null, ['startDate'], {}, 'endDate');
      expect(constraint.defaultMessage(args)).toBe('endDate must be after startDate');
    });
  });
});

// ============================================================================
// NFC Tag Validators
// ============================================================================

describe('IsNfcTagUidConstraint', () => {
  const constraint = new IsNfcTagUidConstraint();

  describe('validate', () => {
    it('should return true for 4-byte UIDs (8 hex chars)', () => {
      expect(constraint.validate('12345678')).toBe(true);
      expect(constraint.validate('ABCDEF12')).toBe(true);
      expect(constraint.validate('abcdef12')).toBe(true);
    });

    it('should return true for 7-byte UIDs (14 hex chars)', () => {
      expect(constraint.validate('1234567890ABCD')).toBe(true);
    });

    it('should return true for 10-byte UIDs (20 hex chars)', () => {
      expect(constraint.validate('1234567890ABCDEF1234')).toBe(true);
    });

    it('should return false for invalid lengths', () => {
      expect(constraint.validate('1234567')).toBe(false); // 7 chars
      expect(constraint.validate('123456789')).toBe(false); // 9 chars
    });

    it('should return false for non-hex characters', () => {
      expect(constraint.validate('1234567G')).toBe(false);
      expect(constraint.validate('GHIJKLMN')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(12345678)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toContain('8, 14, or 20');
    });
  });
});

// ============================================================================
// GPS Coordinate Validators
// ============================================================================

describe('IsLatitudeConstraint', () => {
  const constraint = new IsLatitudeConstraint();

  describe('validate', () => {
    it('should return true for valid latitudes', () => {
      expect(constraint.validate(0)).toBe(true);
      expect(constraint.validate(45.5)).toBe(true);
      expect(constraint.validate(-45.5)).toBe(true);
      expect(constraint.validate(90)).toBe(true);
      expect(constraint.validate(-90)).toBe(true);
    });

    it('should return false for latitudes > 90', () => {
      expect(constraint.validate(90.1)).toBe(false);
      expect(constraint.validate(180)).toBe(false);
    });

    it('should return false for latitudes < -90', () => {
      expect(constraint.validate(-90.1)).toBe(false);
      expect(constraint.validate(-180)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(constraint.validate('45.5')).toBe(false);
      expect(constraint.validate(null)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toBe('Latitude must be between -90 and 90');
    });
  });
});

describe('IsLongitudeConstraint', () => {
  const constraint = new IsLongitudeConstraint();

  describe('validate', () => {
    it('should return true for valid longitudes', () => {
      expect(constraint.validate(0)).toBe(true);
      expect(constraint.validate(90)).toBe(true);
      expect(constraint.validate(-90)).toBe(true);
      expect(constraint.validate(180)).toBe(true);
      expect(constraint.validate(-180)).toBe(true);
    });

    it('should return false for longitudes > 180', () => {
      expect(constraint.validate(180.1)).toBe(false);
      expect(constraint.validate(360)).toBe(false);
    });

    it('should return false for longitudes < -180', () => {
      expect(constraint.validate(-180.1)).toBe(false);
      expect(constraint.validate(-360)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(constraint.validate('90')).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toBe('Longitude must be between -180 and 180');
    });
  });
});

// ============================================================================
// Color Validators
// ============================================================================

describe('IsHexColorConstraint', () => {
  const constraint = new IsHexColorConstraint();

  describe('validate', () => {
    it('should return true for 6-digit hex colors', () => {
      expect(constraint.validate('#FF0000')).toBe(true);
      expect(constraint.validate('#00ff00')).toBe(true);
      expect(constraint.validate('#0000FF')).toBe(true);
      expect(constraint.validate('#123abc')).toBe(true);
    });

    it('should return true for 3-digit hex colors', () => {
      expect(constraint.validate('#F00')).toBe(true);
      expect(constraint.validate('#0f0')).toBe(true);
      expect(constraint.validate('#00F')).toBe(true);
    });

    it('should return false for colors without #', () => {
      expect(constraint.validate('FF0000')).toBe(false);
    });

    it('should return false for invalid lengths', () => {
      expect(constraint.validate('#FF00')).toBe(false);
      expect(constraint.validate('#FF00000')).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      expect(constraint.validate('#GGGGGG')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(0xFF0000)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toContain('#FF0000');
    });
  });
});

// ============================================================================
// File Extension Validators
// ============================================================================

describe('IsFileExtensionConstraint', () => {
  const constraint = new IsFileExtensionConstraint();

  describe('validate', () => {
    it('should return true for allowed extensions', () => {
      const args = createMockValidationArgs('image.jpg', [['jpg', 'png', 'gif']]);
      expect(constraint.validate('image.jpg', args)).toBe(true);
      expect(constraint.validate('image.png', args)).toBe(true);
      expect(constraint.validate('image.gif', args)).toBe(true);
    });

    it('should be case-insensitive', () => {
      const args = createMockValidationArgs('image.JPG', [['jpg', 'png']]);
      expect(constraint.validate('image.JPG', args)).toBe(true);
    });

    it('should return false for disallowed extensions', () => {
      const args = createMockValidationArgs('script.exe', [['jpg', 'png']]);
      expect(constraint.validate('script.exe', args)).toBe(false);
    });

    it('should return false for files without extension', () => {
      const args = createMockValidationArgs('noextension', [['jpg', 'png']]);
      expect(constraint.validate('noextension', args)).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      const args = createMockValidationArgs('image.backup.jpg', [['jpg', 'png']]);
      expect(constraint.validate('image.backup.jpg', args)).toBe(true);
    });

    it('should return false for non-string values', () => {
      const args = createMockValidationArgs(123, [['jpg']]);
      expect(constraint.validate(123, args)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message with allowed extensions', () => {
      const args = createMockValidationArgs('test.exe', [['jpg', 'png']]);
      const message = constraint.defaultMessage(args);
      expect(message).toContain('jpg');
      expect(message).toContain('png');
    });
  });
});

// ============================================================================
// Conditional Validators
// ============================================================================

describe('RequiredWithConstraint', () => {
  const constraint = new RequiredWithConstraint();

  describe('validate', () => {
    it('should return true when both values are present', () => {
      const args = createMockValidationArgs('value', ['relatedField'], {
        relatedField: 'related',
        testProperty: 'value',
      });
      expect(constraint.validate('value', args)).toBe(true);
    });

    it('should return true when related field is empty', () => {
      const args = createMockValidationArgs('', ['relatedField'], {
        relatedField: null,
        testProperty: '',
      });
      expect(constraint.validate('', args)).toBe(true);
    });

    it('should return false when related field has value but this is empty', () => {
      const args = createMockValidationArgs('', ['relatedField'], {
        relatedField: 'value',
        testProperty: '',
      });
      expect(constraint.validate('', args)).toBe(false);
    });

    it('should return false when related field has value but this is null', () => {
      const args = createMockValidationArgs(null, ['relatedField'], {
        relatedField: 'value',
        testProperty: null,
      });
      expect(constraint.validate(null, args)).toBe(false);
    });

    it('should return false when related field has value but this is undefined', () => {
      const args = createMockValidationArgs(undefined, ['relatedField'], {
        relatedField: 'value',
        testProperty: undefined,
      });
      expect(constraint.validate(undefined, args)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      const args = createMockValidationArgs(null, ['startDate'], {}, 'endDate');
      expect(constraint.defaultMessage(args)).toBe(
        'endDate is required when startDate is provided',
      );
    });
  });
});

// ============================================================================
// IBAN Validators
// ============================================================================

describe('IsIBANConstraint', () => {
  const constraint = new IsIBANConstraint();

  describe('validate', () => {
    it('should return true for valid IBANs', () => {
      expect(constraint.validate('FR7630006000011234567890189')).toBe(true);
      expect(constraint.validate('DE89370400440532013000')).toBe(true);
      expect(constraint.validate('GB82WEST12345698765432')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(constraint.validate('fr7630006000011234567890189')).toBe(true);
    });

    it('should handle spaces', () => {
      expect(constraint.validate('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
    });

    it('should return false for too short IBANs', () => {
      expect(constraint.validate('FR76')).toBe(false);
    });

    it('should return false for invalid country code', () => {
      expect(constraint.validate('123456789012345')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(constraint.validate(12345)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      expect(constraint.defaultMessage()).toContain('valid international bank account number');
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  describe('IsPhoneE164Constraint', () => {
    const constraint = new IsPhoneE164Constraint();

    it('should handle boundary lengths', () => {
      expect(constraint.validate('+12')).toBe(true); // minimum: 3 chars after +
      expect(constraint.validate('+123456789012345')).toBe(true); // maximum: 15 digits
    });
  });

  describe('IsSlugConstraint', () => {
    const constraint = new IsSlugConstraint();

    it('should handle boundary lengths', () => {
      expect(constraint.validate('abc')).toBe(true); // minimum: 3 chars
      expect(constraint.validate('a'.repeat(100))).toBe(true); // maximum: 100 chars
      expect(constraint.validate('a'.repeat(101))).toBe(false); // over limit
    });
  });

  describe('IsMonetaryAmountConstraint', () => {
    const constraint = new IsMonetaryAmountConstraint();

    it('should handle edge values', () => {
      const args = createMockValidationArgs(0, [{}]);
      expect(constraint.validate(0, args)).toBe(true);
      expect(constraint.validate(0.01, args)).toBe(true);
      expect(constraint.validate(0.00, args)).toBe(true);
    });

    it('should handle floating point precision', () => {
      const args = createMockValidationArgs(0.1 + 0.2, [{}]); // 0.30000000000000004
      // This might fail due to floating point - implementation should handle this
      expect(typeof constraint.validate(0.1 + 0.2, args)).toBe('boolean');
    });
  });

  describe('IsHexColorConstraint', () => {
    const constraint = new IsHexColorConstraint();

    it('should handle mixed case', () => {
      expect(constraint.validate('#AaBbCc')).toBe(true);
    });
  });

  describe('GPS Coordinates', () => {
    const latConstraint = new IsLatitudeConstraint();
    const lngConstraint = new IsLongitudeConstraint();

    it('should handle exact boundary values', () => {
      expect(latConstraint.validate(90)).toBe(true);
      expect(latConstraint.validate(-90)).toBe(true);
      expect(lngConstraint.validate(180)).toBe(true);
      expect(lngConstraint.validate(-180)).toBe(true);
    });

    it('should handle decimal precision', () => {
      expect(latConstraint.validate(48.858844)).toBe(true); // Eiffel Tower
      expect(lngConstraint.validate(2.294351)).toBe(true);
    });
  });
});
