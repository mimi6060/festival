/**
 * Unit tests for format utility functions
 */

import {
  formatPrice,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  formatAddressOneLine,
  formatFullName,
  formatCoordinates,
  formatDateRange,
  formatBytes,
  formatCount,
  formatOrdinal,
  formatList,
  formatTimeRange,
  formatDistance,
  formatRating,
  formatCreditCard,
  formatIBAN,
  formatCompactNumber,
  formatDecimal,
} from './format.utils';

describe('format.utils', () => {
  describe('formatPrice', () => {
    it('should format price with default EUR currency', () => {
      const result = formatPrice(19.99);
      expect(result).toContain('19');
      expect(result).toContain('99');
    });

    it('should format price with USD currency', () => {
      const result = formatPrice(19.99, 'USD', 'en-US');
      expect(result).toContain('$');
      expect(result).toContain('19.99');
    });

    it('should handle zero amount', () => {
      const result = formatPrice(0);
      expect(result).toContain('0');
    });

    it('should handle large amounts', () => {
      const result = formatPrice(1234567.89);
      expect(result).toBeTruthy();
    });
  });

  describe('formatNumber', () => {
    it('should format number with thousand separators (French locale)', () => {
      const result = formatNumber(1234567);
      // French uses space as thousand separator
      expect(result).toMatch(/1.*234.*567/);
    });

    it('should handle decimals', () => {
      const result = formatNumber(1234.56);
      expect(result).toBeTruthy();
    });

    it('should handle zero', () => {
      const result = formatNumber(0);
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234);
      // French locale uses non-breaking space as separator
      expect(result).toMatch(/-1.*234/);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      const result = formatPercentage(75);
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('should handle 100%', () => {
      const result = formatPercentage(100);
      expect(result).toContain('100');
    });

    it('should handle 0%', () => {
      const result = formatPercentage(0);
      expect(result).toContain('0');
    });

    it('should handle decimal percentages', () => {
      const result = formatPercentage(33.33, 2);
      expect(result).toContain('33');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      const result = formatFileSize(500);
      expect(result).toBe('500.0 B');
    });

    it('should format kilobytes', () => {
      const result = formatFileSize(1024);
      expect(result).toBe('1.0 KB');
    });

    it('should format megabytes', () => {
      const result = formatFileSize(1024 * 1024);
      expect(result).toBe('1.0 MB');
    });

    it('should format gigabytes', () => {
      const result = formatFileSize(1024 * 1024 * 1024);
      expect(result).toBe('1.0 GB');
    });

    it('should handle 0 bytes', () => {
      const result = formatFileSize(0);
      expect(result).toBe('0.0 B');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      const result = formatDuration(45);
      expect(result).toBe('45 min');
    });

    it('should format hours only', () => {
      const result = formatDuration(120);
      expect(result).toBe('2h');
    });

    it('should format hours and minutes', () => {
      const result = formatDuration(90);
      expect(result).toBe('1h 30min');
    });

    it('should handle 0 minutes', () => {
      const result = formatDuration(0);
      expect(result).toBe('0 min');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format French phone number with leading 0', () => {
      const result = formatPhoneNumber('0612345678');
      expect(result).toBe('06 12 34 56 78');
    });

    it('should format international French phone number', () => {
      const result = formatPhoneNumber('33612345678');
      expect(result).toBe('+33 6 12 34 56 78');
    });

    it('should return original if not matching patterns', () => {
      const result = formatPhoneNumber('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should strip non-numeric characters', () => {
      const result = formatPhoneNumber('06 12 34 56 78');
      expect(result).toBe('06 12 34 56 78');
    });
  });

  describe('formatAddressOneLine', () => {
    it('should format address without country', () => {
      const address = {
        street: '123 Rue de Paris',
        city: 'Paris',
        postalCode: '75001',
      };
      const result = formatAddressOneLine(address);
      expect(result).toBe('123 Rue de Paris, 75001, Paris');
    });

    it('should format address with country', () => {
      const address = {
        street: '123 Rue de Paris',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
      };
      const result = formatAddressOneLine(address);
      expect(result).toBe('123 Rue de Paris, 75001, Paris, France');
    });
  });

  describe('formatFullName', () => {
    it('should format first and last name', () => {
      const result = formatFullName('Jean', 'Dupont');
      expect(result).toBe('Jean Dupont');
    });

    it('should handle empty first name', () => {
      const result = formatFullName('', 'Dupont');
      expect(result).toBe('Dupont');
    });

    it('should handle empty last name', () => {
      const result = formatFullName('Jean', '');
      expect(result).toBe('Jean');
    });

    it('should combine names with spaces', () => {
      const result = formatFullName(' Jean ', ' Dupont ');
      // The function only trims the final result, not individual names
      expect(result).toBe('Jean   Dupont');
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with default precision', () => {
      const result = formatCoordinates(48.8566, 2.3522);
      expect(result).toBe('48.856600, 2.352200');
    });

    it('should format coordinates with custom precision', () => {
      const result = formatCoordinates(48.8566, 2.3522, 2);
      expect(result).toBe('48.86, 2.35');
    });
  });

  describe('formatDateRange', () => {
    it('should format same month and year', () => {
      const start = new Date('2026-06-15');
      const end = new Date('2026-06-20');
      const result = formatDateRange(start, end, 'fr-FR');
      expect(result).toContain('15');
      expect(result).toContain('20');
    });

    it('should format same year different months', () => {
      const start = new Date('2026-06-15');
      const end = new Date('2026-08-20');
      const result = formatDateRange(start, end, 'fr-FR');
      expect(result).toContain('15');
      expect(result).toContain('20');
    });

    it('should format different years', () => {
      const start = new Date('2026-12-25');
      const end = new Date('2027-01-05');
      const result = formatDateRange(start, end, 'fr-FR');
      expect(result).toContain('2026');
      expect(result).toContain('2027');
    });
  });

  describe('formatBytes', () => {
    it('should return "0 Bytes" for 0', () => {
      const result = formatBytes(0);
      expect(result).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      const result = formatBytes(500);
      expect(result).toBe('500 Bytes');
    });

    it('should format KB correctly', () => {
      const result = formatBytes(1536);
      expect(result).toBe('1.5 KB');
    });

    it('should format MB correctly', () => {
      const result = formatBytes(1048576);
      expect(result).toBe('1 MB');
    });
  });

  describe('formatCount', () => {
    it('should use singular for 1', () => {
      const result = formatCount(1, 'ticket', 'tickets');
      expect(result).toBe('1 ticket');
    });

    it('should use plural for 0', () => {
      const result = formatCount(0, 'ticket', 'tickets');
      expect(result).toBe('0 tickets');
    });

    it('should use plural for more than 1', () => {
      const result = formatCount(5, 'ticket', 'tickets');
      expect(result).toBe('5 tickets');
    });
  });

  describe('formatOrdinal', () => {
    it('should format French ordinals correctly for 1', () => {
      const result = formatOrdinal(1, 'fr-FR');
      expect(result).toBe('1er');
    });

    it('should format French ordinals correctly for other numbers', () => {
      const result = formatOrdinal(2, 'fr-FR');
      expect(result).toBe('2e');
    });

    it('should format English ordinals for 1st', () => {
      const result = formatOrdinal(1, 'en-US');
      expect(result).toBe('1st');
    });

    it('should format English ordinals for 2nd', () => {
      const result = formatOrdinal(2, 'en-US');
      expect(result).toBe('2nd');
    });

    it('should format English ordinals for 3rd', () => {
      const result = formatOrdinal(3, 'en-US');
      expect(result).toBe('3rd');
    });

    it('should format English ordinals for 4th', () => {
      const result = formatOrdinal(4, 'en-US');
      expect(result).toBe('4th');
    });

    it('should format English ordinals for 11th', () => {
      const result = formatOrdinal(11, 'en-US');
      expect(result).toBe('11th');
    });

    it('should format English ordinals for 21st', () => {
      const result = formatOrdinal(21, 'en-US');
      expect(result).toBe('21st');
    });
  });

  describe('formatList', () => {
    it('should return empty string for empty array', () => {
      const result = formatList([]);
      expect(result).toBe('');
    });

    it('should return single item', () => {
      const result = formatList(['pomme']);
      expect(result).toBe('pomme');
    });

    it('should join two items with conjunction', () => {
      const result = formatList(['pomme', 'orange']);
      expect(result).toBe('pomme et orange');
    });

    it('should join multiple items with commas and conjunction', () => {
      const result = formatList(['pomme', 'orange', 'banane']);
      expect(result).toBe('pomme, orange et banane');
    });

    it('should use custom conjunction', () => {
      const result = formatList(['pomme', 'orange'], 'ou');
      expect(result).toBe('pomme ou orange');
    });
  });

  describe('formatTimeRange', () => {
    it('should format time range correctly', () => {
      const result = formatTimeRange('14:00', '16:30');
      expect(result).toBe('14:00 - 16:30');
    });
  });

  describe('formatDistance', () => {
    it('should format meters', () => {
      const result = formatDistance(500);
      expect(result).toBe('500 m');
    });

    it('should format kilometers with decimal for small km', () => {
      const result = formatDistance(2500);
      expect(result).toBe('2.5 km');
    });

    it('should format kilometers without decimal for large km', () => {
      const result = formatDistance(15000);
      expect(result).toBe('15 km');
    });
  });

  describe('formatRating', () => {
    it('should format rating with default max', () => {
      const result = formatRating(4.5);
      expect(result).toBe('4.5/5');
    });

    it('should format rating with custom max', () => {
      const result = formatRating(8.5, 10);
      expect(result).toBe('8.5/10');
    });

    it('should format rating with custom decimals', () => {
      const result = formatRating(4.567, 5, 2);
      expect(result).toBe('4.57/5');
    });
  });

  describe('formatCreditCard', () => {
    it('should format credit card with spaces', () => {
      const result = formatCreditCard('4111111111111111');
      expect(result).toBe('4111 1111 1111 1111');
    });

    it('should handle already formatted input', () => {
      const result = formatCreditCard('4111 1111 1111 1111');
      expect(result).toBe('4111 1111 1111 1111');
    });

    it('should strip non-numeric characters', () => {
      const result = formatCreditCard('4111-1111-1111-1111');
      expect(result).toBe('4111 1111 1111 1111');
    });
  });

  describe('formatIBAN', () => {
    it('should format IBAN with spaces', () => {
      const result = formatIBAN('FR7630001007941234567890185');
      expect(result).toBe('FR76 3000 1007 9412 3456 7890 185');
    });

    it('should convert to uppercase', () => {
      const result = formatIBAN('fr7630001007941234567890185');
      expect(result).toBe('FR76 3000 1007 9412 3456 7890 185');
    });

    it('should handle already formatted input', () => {
      const result = formatIBAN('FR76 3000 1007 9412 3456 7890 185');
      expect(result).toBe('FR76 3000 1007 9412 3456 7890 185');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format thousands as K', () => {
      const result = formatCompactNumber(1500, 'en-US');
      expect(result).toMatch(/1\.?5?\s*K/i);
    });

    it('should format millions as M', () => {
      const result = formatCompactNumber(2500000, 'en-US');
      expect(result).toMatch(/2\.?5?\s*M/i);
    });

    it('should not compact small numbers', () => {
      const result = formatCompactNumber(500);
      expect(result).toContain('500');
    });
  });

  describe('formatDecimal', () => {
    it('should format with default 2 decimals', () => {
      const result = formatDecimal(3.14159);
      // French locale uses comma for decimal separator
      expect(result).toMatch(/3[,.]14/);
    });

    it('should format with custom decimals', () => {
      const result = formatDecimal(3.14159, 4);
      expect(result).toMatch(/3[,.]1416/);
    });

    it('should add trailing zeros', () => {
      const result = formatDecimal(3);
      expect(result).toMatch(/3[,.]00/);
    });
  });
});
