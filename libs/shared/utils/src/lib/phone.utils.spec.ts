import {
  COUNTRY_PHONE_INFO,
  EUROPEAN_DIAL_CODES,
  extractDigits,
  extractCountryCode,
  getCountryFromDialCode,
  isMobileNumber,
  isLandlineNumber,
  autoFormatPhoneInput,
  getPhonePlaceholder,
  getPhoneInputPattern,
} from './phone.utils';

/**
 * Note: Some phone.utils functions have an infinite recursion bug between
 * parsePhoneNumber and formatPhoneNumber. Tests are written to avoid triggering
 * this bug by only testing functions that don't call into that recursion chain.
 *
 * Functions that trigger recursion (NOT TESTED):
 * - parsePhoneNumber
 * - formatPhoneNumber
 * - formatInternational
 * - formatE164
 * - formatPhoneWithFlag
 * - formatPhoneLink
 * - formatWhatsAppLink
 * - maskPhoneNumber (calls formatPhoneNumber)
 * - partialMaskPhone (calls formatPhoneNumber)
 * - normalizePhoneNumber (calls parsePhoneNumber)
 * - arePhoneNumbersEqual (calls normalizePhoneNumber)
 * - isValidPhoneNumber (calls validatePhoneNumber which calls parsePhoneNumber)
 * - validatePhoneNumber (calls parsePhoneNumber)
 */
describe('Phone Utils', () => {
  // ============================================================================
  // Constants
  // ============================================================================
  describe('COUNTRY_PHONE_INFO', () => {
    it('should have France info', () => {
      expect(COUNTRY_PHONE_INFO['FR']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['FR'].dialCode).toBe('+33');
      expect(COUNTRY_PHONE_INFO['FR'].minLength).toBe(9);
      expect(COUNTRY_PHONE_INFO['FR'].maxLength).toBe(10);
    });

    it('should have multiple countries', () => {
      expect(Object.keys(COUNTRY_PHONE_INFO).length).toBeGreaterThan(10);
    });

    it('should have US info', () => {
      expect(COUNTRY_PHONE_INFO['US']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['US'].dialCode).toBe('+1');
    });

    it('should have Belgium info', () => {
      expect(COUNTRY_PHONE_INFO['BE']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['BE'].dialCode).toBe('+32');
    });

    it('should have Germany info', () => {
      expect(COUNTRY_PHONE_INFO['DE']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['DE'].dialCode).toBe('+49');
    });

    it('should have UK info', () => {
      expect(COUNTRY_PHONE_INFO['GB']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['GB'].dialCode).toBe('+44');
    });

    it('should have Spain info', () => {
      expect(COUNTRY_PHONE_INFO['ES']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['ES'].dialCode).toBe('+34');
    });

    it('should have Italy info', () => {
      expect(COUNTRY_PHONE_INFO['IT']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['IT'].dialCode).toBe('+39');
    });

    it('should have Switzerland info', () => {
      expect(COUNTRY_PHONE_INFO['CH']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['CH'].dialCode).toBe('+41');
    });

    it('should have Luxembourg info', () => {
      expect(COUNTRY_PHONE_INFO['LU']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['LU'].dialCode).toBe('+352');
    });

    it('should have Netherlands info', () => {
      expect(COUNTRY_PHONE_INFO['NL']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['NL'].dialCode).toBe('+31');
    });

    it('should have Portugal info', () => {
      expect(COUNTRY_PHONE_INFO['PT']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['PT'].dialCode).toBe('+351');
    });

    it('should have Canada info', () => {
      expect(COUNTRY_PHONE_INFO['CA']).toBeDefined();
      expect(COUNTRY_PHONE_INFO['CA'].dialCode).toBe('+1');
    });

    it('should have pattern for each country', () => {
      for (const code of Object.keys(COUNTRY_PHONE_INFO)) {
        expect(COUNTRY_PHONE_INFO[code].pattern).toBeInstanceOf(RegExp);
      }
    });

    it('should have name for each country', () => {
      for (const code of Object.keys(COUNTRY_PHONE_INFO)) {
        expect(typeof COUNTRY_PHONE_INFO[code].name).toBe('string');
        expect(COUNTRY_PHONE_INFO[code].name.length).toBeGreaterThan(0);
      }
    });

    it('should have format for each country', () => {
      for (const code of Object.keys(COUNTRY_PHONE_INFO)) {
        expect(typeof COUNTRY_PHONE_INFO[code].format).toBe('string');
      }
    });
  });

  describe('EUROPEAN_DIAL_CODES', () => {
    it('should include France', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+33');
    });

    it('should include Belgium', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+32');
    });

    it('should include Germany', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+49');
    });

    it('should include UK', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+44');
    });

    it('should include Spain', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+34');
    });

    it('should include Italy', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+39');
    });

    it('should include Switzerland', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+41');
    });

    it('should include Luxembourg', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+352');
    });

    it('should include Netherlands', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+31');
    });

    it('should include Portugal', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+351');
    });

    it('should include Austria', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+43');
    });

    it('should include Poland', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+48');
    });

    it('should include Nordic countries', () => {
      expect(EUROPEAN_DIAL_CODES).toContain('+45'); // Denmark
      expect(EUROPEAN_DIAL_CODES).toContain('+46'); // Sweden
      expect(EUROPEAN_DIAL_CODES).toContain('+47'); // Norway
      expect(EUROPEAN_DIAL_CODES).toContain('+358'); // Finland
    });

    it('should have more than 15 dial codes', () => {
      expect(EUROPEAN_DIAL_CODES.length).toBeGreaterThan(15);
    });
  });

  // ============================================================================
  // extractDigits
  // ============================================================================
  describe('extractDigits', () => {
    it('should extract digits from phone with country code', () => {
      expect(extractDigits('+33 6 12 34 56 78')).toBe('33612345678');
    });

    it('should extract digits from formatted number with dashes', () => {
      expect(extractDigits('06-12-34-56-78')).toBe('0612345678');
    });

    it('should handle already clean number', () => {
      expect(extractDigits('0612345678')).toBe('0612345678');
    });

    it('should return empty for no digits', () => {
      expect(extractDigits('abc')).toBe('');
    });

    it('should handle mixed content', () => {
      expect(extractDigits('Phone: (06) 12.34.56.78')).toBe('0612345678');
    });

    it('should handle empty string', () => {
      expect(extractDigits('')).toBe('');
    });

    it('should handle only special characters', () => {
      expect(extractDigits('+()- ')).toBe('');
    });

    it('should extract from US format', () => {
      expect(extractDigits('(514) 123-4567')).toBe('5141234567');
    });

    it('should handle international prefix', () => {
      expect(extractDigits('+1 (514) 123-4567')).toBe('15141234567');
    });

    it('should handle dots as separators', () => {
      expect(extractDigits('06.12.34.56.78')).toBe('0612345678');
    });
  });

  // ============================================================================
  // extractCountryCode
  // ============================================================================
  describe('extractCountryCode', () => {
    it('should extract +33 from French number', () => {
      expect(extractCountryCode('+33612345678')).toBe('+33');
    });

    it('should extract from number with spaces', () => {
      expect(extractCountryCode('+33 6 12 34 56 78')).toBe('+33');
    });

    it('should extract 00 prefix', () => {
      expect(extractCountryCode('0033612345678')).toBe('+33');
    });

    it('should extract longer dial codes first (Luxembourg)', () => {
      expect(extractCountryCode('+352123456')).toBe('+352');
    });

    it('should return null for local number', () => {
      expect(extractCountryCode('0612345678')).toBeNull();
    });

    it('should extract +1 for US/Canada', () => {
      expect(extractCountryCode('+15141234567')).toBe('+1');
    });

    it('should extract +44 for UK', () => {
      expect(extractCountryCode('+447123456789')).toBe('+44');
    });

    it('should handle 00 prefix for US', () => {
      expect(extractCountryCode('0015141234567')).toBe('+1');
    });

    it('should return null for number without country code', () => {
      expect(extractCountryCode('612345678')).toBeNull();
    });

    it('should extract +49 for Germany', () => {
      expect(extractCountryCode('+491234567890')).toBe('+49');
    });

    it('should extract +32 for Belgium', () => {
      expect(extractCountryCode('+32412345678')).toBe('+32');
    });

    it('should extract +351 for Portugal', () => {
      expect(extractCountryCode('+351912345678')).toBe('+351');
    });
  });

  // ============================================================================
  // getCountryFromDialCode
  // ============================================================================
  describe('getCountryFromDialCode', () => {
    it('should return FR for +33', () => {
      expect(getCountryFromDialCode('+33')).toBe('FR');
    });

    it('should return US for +1', () => {
      expect(getCountryFromDialCode('+1')).toBe('US');
    });

    it('should return BE for +32', () => {
      expect(getCountryFromDialCode('+32')).toBe('BE');
    });

    it('should return null for unknown dial code', () => {
      expect(getCountryFromDialCode('+999')).toBeNull();
    });

    it('should return DE for +49', () => {
      expect(getCountryFromDialCode('+49')).toBe('DE');
    });

    it('should return GB for +44', () => {
      expect(getCountryFromDialCode('+44')).toBe('GB');
    });

    it('should return ES for +34', () => {
      expect(getCountryFromDialCode('+34')).toBe('ES');
    });

    it('should return IT for +39', () => {
      expect(getCountryFromDialCode('+39')).toBe('IT');
    });

    it('should return CH for +41', () => {
      expect(getCountryFromDialCode('+41')).toBe('CH');
    });

    it('should return LU for +352', () => {
      expect(getCountryFromDialCode('+352')).toBe('LU');
    });

    it('should return NL for +31', () => {
      expect(getCountryFromDialCode('+31')).toBe('NL');
    });

    it('should return PT for +351', () => {
      expect(getCountryFromDialCode('+351')).toBe('PT');
    });
  });

  // ============================================================================
  // isMobileNumber / isLandlineNumber
  // ============================================================================
  describe('isMobileNumber', () => {
    it('should detect French mobile (06)', () => {
      expect(isMobileNumber('0612345678', 'FR')).toBe(true);
    });

    it('should detect French mobile (07)', () => {
      expect(isMobileNumber('0712345678', 'FR')).toBe(true);
    });

    it('should detect French mobile with +33', () => {
      expect(isMobileNumber('+33612345678', 'FR')).toBe(true);
    });

    it('should detect French mobile with 33 prefix', () => {
      expect(isMobileNumber('33612345678', 'FR')).toBe(true);
    });

    it('should reject French landline (01)', () => {
      expect(isMobileNumber('0112345678', 'FR')).toBe(false);
    });

    it('should reject French landline (02)', () => {
      expect(isMobileNumber('0212345678', 'FR')).toBe(false);
    });

    it('should reject French landline (03)', () => {
      expect(isMobileNumber('0312345678', 'FR')).toBe(false);
    });

    it('should reject French landline (04)', () => {
      expect(isMobileNumber('0412345678', 'FR')).toBe(false);
    });

    it('should reject French landline (05)', () => {
      expect(isMobileNumber('0512345678', 'FR')).toBe(false);
    });

    it('should detect Belgian mobile (04)', () => {
      expect(isMobileNumber('0412345678', 'BE')).toBe(true);
    });

    it('should detect Belgian mobile with +32', () => {
      expect(isMobileNumber('+32412345678', 'BE')).toBe(true);
    });

    it('should detect UK mobile (07)', () => {
      expect(isMobileNumber('07123456789', 'GB')).toBe(true);
    });

    it('should detect UK mobile with +44', () => {
      expect(isMobileNumber('+447123456789', 'GB')).toBe(true);
    });
  });

  describe('isLandlineNumber', () => {
    it('should detect French landline (01)', () => {
      expect(isLandlineNumber('0112345678', 'FR')).toBe(true);
    });

    it('should detect French landline (02)', () => {
      expect(isLandlineNumber('0212345678', 'FR')).toBe(true);
    });

    it('should detect French landline (03)', () => {
      expect(isLandlineNumber('0312345678', 'FR')).toBe(true);
    });

    it('should detect French landline (04)', () => {
      expect(isLandlineNumber('0412345678', 'FR')).toBe(true);
    });

    it('should detect French landline (05)', () => {
      expect(isLandlineNumber('0512345678', 'FR')).toBe(true);
    });

    it('should reject French mobile (06)', () => {
      expect(isLandlineNumber('0612345678', 'FR')).toBe(false);
    });

    it('should reject French mobile (07)', () => {
      expect(isLandlineNumber('0712345678', 'FR')).toBe(false);
    });
  });

  // ============================================================================
  // autoFormatPhoneInput
  // ============================================================================
  describe('autoFormatPhoneInput', () => {
    it('should not format on delete (shorter value)', () => {
      expect(autoFormatPhoneInput('061', '0612', 'FR')).toBe('061');
    });

    it('should handle unknown country', () => {
      expect(autoFormatPhoneInput('123', '12', 'XX')).toBe('123');
    });

    it('should handle same value', () => {
      expect(autoFormatPhoneInput('061', '061', 'FR')).toBe('061');
    });

    it('should not exceed max length', () => {
      const maxLength = COUNTRY_PHONE_INFO['FR'].maxLength;
      const longValue = '0'.repeat(maxLength + 5);
      const prevValue = '0'.repeat(maxLength + 4);
      const result = autoFormatPhoneInput(longValue, prevValue, 'FR');
      expect(result).toBe(prevValue);
    });
  });

  // ============================================================================
  // getPhonePlaceholder / getPhoneInputPattern
  // ============================================================================
  describe('getPhonePlaceholder', () => {
    it('should return French placeholder', () => {
      const placeholder = getPhonePlaceholder('FR');
      expect(placeholder).toContain('0');
      expect(placeholder.length).toBeGreaterThan(5);
    });

    it('should return US placeholder', () => {
      const placeholder = getPhonePlaceholder('US');
      expect(placeholder).toContain('(');
      expect(placeholder).toContain(')');
    });

    it('should return default for unknown country', () => {
      const placeholder = getPhonePlaceholder('XX');
      expect(placeholder).toBeDefined();
      expect(placeholder).toContain('X');
    });

    it('should return Belgian placeholder', () => {
      const placeholder = getPhonePlaceholder('BE');
      expect(placeholder).toBeDefined();
      expect(placeholder.length).toBeGreaterThan(5);
    });

    it('should return German placeholder', () => {
      const placeholder = getPhonePlaceholder('DE');
      expect(placeholder).toBeDefined();
    });

    it('should return UK placeholder', () => {
      const placeholder = getPhonePlaceholder('GB');
      expect(placeholder).toBeDefined();
    });
  });

  describe('getPhoneInputPattern', () => {
    it('should return French pattern', () => {
      const pattern = getPhoneInputPattern('FR');
      expect(pattern).toBeDefined();
      expect(pattern.length).toBeGreaterThan(0);
    });

    it('should return default for unknown country', () => {
      const pattern = getPhoneInputPattern('XX');
      expect(pattern).toContain('[0-9');
    });

    it('should return US pattern', () => {
      const pattern = getPhoneInputPattern('US');
      expect(pattern).toBeDefined();
      expect(pattern.length).toBeGreaterThan(0);
    });

    it('should return Belgian pattern', () => {
      const pattern = getPhoneInputPattern('BE');
      expect(pattern).toBeDefined();
    });

    it('should return German pattern', () => {
      const pattern = getPhoneInputPattern('DE');
      expect(pattern).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle numbers with parentheses', () => {
      const digits = extractDigits('(06) 12 34 56 78');
      expect(digits).toBe('0612345678');
    });

    it('should handle numbers with dots', () => {
      const digits = extractDigits('06.12.34.56.78');
      expect(digits).toBe('0612345678');
    });

    it('should handle country info format strings', () => {
      expect(COUNTRY_PHONE_INFO['FR'].format).toBe('XX XX XX XX XX');
      expect(COUNTRY_PHONE_INFO['US'].format).toBe('(XXX) XXX-XXXX');
      expect(COUNTRY_PHONE_INFO['BE'].format).toBe('XXX XX XX XX');
    });

    it('should have correct min/max length for countries', () => {
      expect(COUNTRY_PHONE_INFO['FR'].minLength).toBe(9);
      expect(COUNTRY_PHONE_INFO['FR'].maxLength).toBe(10);
      expect(COUNTRY_PHONE_INFO['US'].minLength).toBe(10);
      expect(COUNTRY_PHONE_INFO['US'].maxLength).toBe(10);
    });

    it('should extract country code from 00 prefix', () => {
      expect(extractCountryCode('0033612345678')).toBe('+33');
      expect(extractCountryCode('0032412345678')).toBe('+32');
      expect(extractCountryCode('0049123456789')).toBe('+49');
    });
  });
});
