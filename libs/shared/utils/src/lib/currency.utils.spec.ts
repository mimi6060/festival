import {
  CURRENCIES,
  formatPrice,
  formatPriceCustom,
  convertCurrency,
  parseCurrencyString,
  fromCents,
  toCents,
  roundToCurrencyPrecision,
  calculateWithTax,
  calculateDiscount,
  getCurrencySymbol,
  isSupportedCurrency,
  getSupportedCurrencies,
  formatPriceRange,
  calculatePercentage,
  splitAmount,
} from './currency.utils';

describe('Currency Utils', () => {
  // ============================================================================
  // CURRENCIES constant
  // ============================================================================
  describe('CURRENCIES', () => {
    it('should have EUR with correct properties', () => {
      expect(CURRENCIES['EUR']).toEqual({
        symbol: '\u20AC',
        decimals: 2,
        name: 'Euro',
      });
    });

    it('should have USD with correct properties', () => {
      expect(CURRENCIES['USD']).toEqual({
        symbol: '$',
        decimals: 2,
        name: 'US Dollar',
      });
    });

    it('should have JPY with 0 decimals', () => {
      expect(CURRENCIES['JPY'].decimals).toBe(0);
    });

    it('should have multiple currencies', () => {
      expect(Object.keys(CURRENCIES).length).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // formatPrice
  // ============================================================================
  describe('formatPrice', () => {
    it('should format EUR price in French locale', () => {
      const formatted = formatPrice(10.5, 'EUR', 'fr-FR');
      expect(formatted).toContain('10,50');
      expect(formatted).toContain('\u20AC');
    });

    it('should format USD price', () => {
      const formatted = formatPrice(10.5, 'USD', 'en-US');
      expect(formatted).toContain('10.50');
      expect(formatted).toContain('$');
    });

    it('should use EUR as default currency', () => {
      const formatted = formatPrice(10);
      expect(formatted).toContain('\u20AC');
    });

    it('should handle large numbers', () => {
      const formatted = formatPrice(1000000, 'EUR', 'en-US');
      expect(formatted).toBeDefined();
    });

    it('should handle zero', () => {
      const formatted = formatPrice(0, 'EUR', 'en-US');
      expect(formatted).toContain('0');
    });

    it('should handle negative amounts', () => {
      const formatted = formatPrice(-10.5, 'EUR', 'en-US');
      expect(formatted).toContain('10.50');
    });
  });

  // ============================================================================
  // formatPriceCustom
  // ============================================================================
  describe('formatPriceCustom', () => {
    it('should format with custom decimal places', () => {
      const formatted = formatPriceCustom(10.555, 'EUR', 'en-US', 2, 3);
      expect(formatted).toBeDefined();
    });

    it('should use currency default decimals when not specified', () => {
      const formatted = formatPriceCustom(10.55, 'JPY', 'en-US');
      expect(formatted).toBeDefined();
    });
  });

  // ============================================================================
  // convertCurrency
  // ============================================================================
  describe('convertCurrency', () => {
    const exchangeRates = {
      EUR: 1,
      USD: 1.1,
      GBP: 0.85,
    };

    it('should return same amount for same currency', () => {
      const result = convertCurrency(100, 'EUR', 'EUR', exchangeRates);
      expect(result).toBe(100);
    });

    it('should convert EUR to USD', () => {
      const result = convertCurrency(100, 'EUR', 'USD', exchangeRates);
      expect(result).toBeCloseTo(110, 10);
    });

    it('should convert USD to EUR', () => {
      const result = convertCurrency(110, 'USD', 'EUR', exchangeRates);
      expect(result).toBeCloseTo(100, 10);
    });

    it('should convert between non-base currencies', () => {
      const result = convertCurrency(100, 'USD', 'GBP', exchangeRates);
      // 100 USD / 1.1 = 90.909 EUR * 0.85 = 77.27 GBP
      expect(result).toBeCloseTo(77.27, 1);
    });

    it('should throw for missing from currency', () => {
      expect(() => convertCurrency(100, 'XXX', 'USD', exchangeRates)).toThrow();
    });

    it('should throw for missing to currency', () => {
      expect(() => convertCurrency(100, 'EUR', 'XXX', exchangeRates)).toThrow();
    });
  });

  // ============================================================================
  // parseCurrencyString
  // ============================================================================
  describe('parseCurrencyString', () => {
    it('should parse French format', () => {
      // Note: parsing formatted strings depends on locale handling
      // The function might not perfectly handle all locales
      const result = parseCurrencyString('1234,56', 'fr-FR');
      expect(result).toBeCloseTo(1234.56, 2);
    });

    it('should parse US format', () => {
      expect(parseCurrencyString('$1234.56', 'en-US')).toBeCloseTo(1234.56, 2);
    });

    it('should parse simple number', () => {
      expect(parseCurrencyString('10.50', 'en-US')).toBe(10.5);
    });

    it('should return 0 for invalid string', () => {
      expect(parseCurrencyString('not a number', 'en-US')).toBe(0);
    });

    it('should handle negative values', () => {
      expect(parseCurrencyString('-10.50', 'en-US')).toBe(-10.5);
    });
  });

  // ============================================================================
  // fromCents / toCents
  // ============================================================================
  describe('fromCents', () => {
    it('should convert cents to EUR', () => {
      expect(fromCents(1050, 'EUR')).toBe(10.5);
    });

    it('should convert cents to USD', () => {
      expect(fromCents(1050, 'USD')).toBe(10.5);
    });

    it('should handle JPY (0 decimals)', () => {
      expect(fromCents(1000, 'JPY')).toBe(1000);
    });

    it('should use EUR as default', () => {
      expect(fromCents(500)).toBe(5);
    });
  });

  describe('toCents', () => {
    it('should convert EUR to cents', () => {
      expect(toCents(10.5, 'EUR')).toBe(1050);
    });

    it('should convert USD to cents', () => {
      expect(toCents(10.5, 'USD')).toBe(1050);
    });

    it('should handle JPY (0 decimals)', () => {
      expect(toCents(1000, 'JPY')).toBe(1000);
    });

    it('should use EUR as default', () => {
      expect(toCents(5)).toBe(500);
    });

    it('should round correctly', () => {
      expect(toCents(10.555, 'EUR')).toBe(1056);
    });
  });

  // ============================================================================
  // roundToCurrencyPrecision
  // ============================================================================
  describe('roundToCurrencyPrecision', () => {
    it('should round to 2 decimals for EUR', () => {
      expect(roundToCurrencyPrecision(10.555, 'EUR')).toBe(10.56);
    });

    it('should round to 0 decimals for JPY', () => {
      expect(roundToCurrencyPrecision(10.5, 'JPY')).toBe(11);
    });

    it('should use EUR as default', () => {
      expect(roundToCurrencyPrecision(10.555)).toBe(10.56);
    });

    it('should handle already rounded values', () => {
      expect(roundToCurrencyPrecision(10.5, 'EUR')).toBe(10.5);
    });
  });

  // ============================================================================
  // calculateWithTax
  // ============================================================================
  describe('calculateWithTax', () => {
    it('should calculate tax correctly', () => {
      const result = calculateWithTax(100, 20, 'EUR');
      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(20);
      expect(result.total).toBe(120);
    });

    it('should handle 0% tax', () => {
      const result = calculateWithTax(100, 0, 'EUR');
      expect(result.tax).toBe(0);
      expect(result.total).toBe(100);
    });

    it('should round to currency precision', () => {
      const result = calculateWithTax(10.333, 20, 'EUR');
      expect(result.subtotal).toBe(10.33);
      expect(result.tax).toBe(2.07);
      expect(result.total).toBe(12.4);
    });

    it('should use EUR as default currency', () => {
      const result = calculateWithTax(100, 20);
      expect(result.total).toBe(120);
    });
  });

  // ============================================================================
  // calculateDiscount
  // ============================================================================
  describe('calculateDiscount', () => {
    it('should calculate discount correctly', () => {
      const result = calculateDiscount(100, 20, 'EUR');
      expect(result.original).toBe(100);
      expect(result.discount).toBe(20);
      expect(result.final).toBe(80);
    });

    it('should handle 0% discount', () => {
      const result = calculateDiscount(100, 0, 'EUR');
      expect(result.discount).toBe(0);
      expect(result.final).toBe(100);
    });

    it('should handle 100% discount', () => {
      const result = calculateDiscount(100, 100, 'EUR');
      expect(result.discount).toBe(100);
      expect(result.final).toBe(0);
    });

    it('should round to currency precision', () => {
      const result = calculateDiscount(10.333, 15, 'EUR');
      expect(result.original).toBe(10.33);
      expect(result.discount).toBe(1.55);
      expect(result.final).toBe(8.78);
    });
  });

  // ============================================================================
  // getCurrencySymbol
  // ============================================================================
  describe('getCurrencySymbol', () => {
    it('should return EUR symbol', () => {
      expect(getCurrencySymbol('EUR')).toBe('\u20AC');
    });

    it('should return USD symbol', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('should return GBP symbol', () => {
      expect(getCurrencySymbol('GBP')).toBe('\u00A3');
    });

    it('should return currency code for unknown currency', () => {
      expect(getCurrencySymbol('XXX')).toBe('XXX');
    });
  });

  // ============================================================================
  // isSupportedCurrency / getSupportedCurrencies
  // ============================================================================
  describe('isSupportedCurrency', () => {
    it('should return true for EUR', () => {
      expect(isSupportedCurrency('EUR')).toBe(true);
    });

    it('should return true for USD', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
    });

    it('should return false for unsupported currency', () => {
      expect(isSupportedCurrency('XXX')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return array of currencies', () => {
      const currencies = getSupportedCurrencies();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
    });

    it('should return all currencies from CURRENCIES', () => {
      const currencies = getSupportedCurrencies();
      expect(currencies.length).toBe(Object.keys(CURRENCIES).length);
    });
  });

  // ============================================================================
  // formatPriceRange
  // ============================================================================
  describe('formatPriceRange', () => {
    it('should format range with different prices', () => {
      const formatted = formatPriceRange(10, 50, 'EUR', 'en-US');
      expect(formatted).toContain('\u20AC');
      expect(formatted).toContain('-');
    });

    it('should format single price when min equals max', () => {
      const formatted = formatPriceRange(10, 10, 'EUR', 'en-US');
      expect(formatted).not.toContain('-');
    });

    it('should use EUR as default', () => {
      const formatted = formatPriceRange(10, 50);
      expect(formatted).toContain('\u20AC');
    });
  });

  // ============================================================================
  // calculatePercentage
  // ============================================================================
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('should handle 100%', () => {
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('should handle 0 amount', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('should return 0 for zero total', () => {
      expect(calculatePercentage(25, 0)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1);
    });
  });

  // ============================================================================
  // splitAmount
  // ============================================================================
  describe('splitAmount', () => {
    it('should split evenly divisible amount', () => {
      const shares = splitAmount(100, 4, 'EUR');
      expect(shares).toEqual([25, 25, 25, 25]);
    });

    it('should handle remainder distribution', () => {
      const shares = splitAmount(100, 3, 'EUR');
      expect(shares[0]).toBe(33.34);
      expect(shares[1]).toBe(33.33);
      expect(shares[2]).toBe(33.33);
      // Sum should equal original amount
      expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    });

    it('should return empty array for 0 participants', () => {
      expect(splitAmount(100, 0, 'EUR')).toEqual([]);
    });

    it('should return empty array for negative participants', () => {
      expect(splitAmount(100, -1, 'EUR')).toEqual([]);
    });

    it('should handle single participant', () => {
      const shares = splitAmount(100, 1, 'EUR');
      expect(shares).toEqual([100]);
    });

    it('should handle JPY (0 decimals)', () => {
      const shares = splitAmount(100, 3, 'JPY');
      expect(shares[0]).toBe(34);
      expect(shares[1]).toBe(33);
      expect(shares[2]).toBe(33);
    });

    it('should handle small amounts', () => {
      const shares = splitAmount(0.1, 3, 'EUR');
      const sum = shares.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0.1, 2);
    });
  });
});
