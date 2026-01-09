/**
 * Tax Service
 *
 * Handles VAT/tax calculations for invoices:
 * - VAT rates by country
 * - Tax-exempt handling
 * - Reverse charge for B2B transactions
 * - Tax validation
 */

import { Injectable } from '@nestjs/common';

export interface TaxRate {
  country: string;
  countryName: string;
  standardRate: number;
  reducedRate?: number;
  superReducedRate?: number;
  parkingRate?: number;
  isEU: boolean;
}

export interface TaxCalculation {
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  isExempt: boolean;
  isReverseCharge: boolean;
  taxCountry: string;
}

export interface VatValidationResult {
  valid: boolean;
  vatNumber: string;
  countryCode: string;
  companyName?: string;
  address?: string;
  errorMessage?: string;
}

@Injectable()
export class TaxService {
  // EU VAT rates (updated 2024)
  private readonly vatRates: Record<string, TaxRate> = {
    AT: { country: 'AT', countryName: 'Austria', standardRate: 20, reducedRate: 10, isEU: true },
    BE: { country: 'BE', countryName: 'Belgium', standardRate: 21, reducedRate: 6, isEU: true },
    BG: { country: 'BG', countryName: 'Bulgaria', standardRate: 20, reducedRate: 9, isEU: true },
    HR: { country: 'HR', countryName: 'Croatia', standardRate: 25, reducedRate: 5, isEU: true },
    CY: { country: 'CY', countryName: 'Cyprus', standardRate: 19, reducedRate: 5, isEU: true },
    CZ: { country: 'CZ', countryName: 'Czech Republic', standardRate: 21, reducedRate: 12, isEU: true },
    DK: { country: 'DK', countryName: 'Denmark', standardRate: 25, isEU: true },
    EE: { country: 'EE', countryName: 'Estonia', standardRate: 22, reducedRate: 9, isEU: true },
    FI: { country: 'FI', countryName: 'Finland', standardRate: 24, reducedRate: 10, isEU: true },
    FR: { country: 'FR', countryName: 'France', standardRate: 20, reducedRate: 5.5, superReducedRate: 2.1, isEU: true },
    DE: { country: 'DE', countryName: 'Germany', standardRate: 19, reducedRate: 7, isEU: true },
    GR: { country: 'GR', countryName: 'Greece', standardRate: 24, reducedRate: 6, isEU: true },
    HU: { country: 'HU', countryName: 'Hungary', standardRate: 27, reducedRate: 5, isEU: true },
    IE: { country: 'IE', countryName: 'Ireland', standardRate: 23, reducedRate: 9, isEU: true },
    IT: { country: 'IT', countryName: 'Italy', standardRate: 22, reducedRate: 4, isEU: true },
    LV: { country: 'LV', countryName: 'Latvia', standardRate: 21, reducedRate: 12, isEU: true },
    LT: { country: 'LT', countryName: 'Lithuania', standardRate: 21, reducedRate: 5, isEU: true },
    LU: { country: 'LU', countryName: 'Luxembourg', standardRate: 17, reducedRate: 8, superReducedRate: 3, isEU: true },
    MT: { country: 'MT', countryName: 'Malta', standardRate: 18, reducedRate: 5, isEU: true },
    NL: { country: 'NL', countryName: 'Netherlands', standardRate: 21, reducedRate: 9, isEU: true },
    PL: { country: 'PL', countryName: 'Poland', standardRate: 23, reducedRate: 5, isEU: true },
    PT: { country: 'PT', countryName: 'Portugal', standardRate: 23, reducedRate: 6, isEU: true },
    RO: { country: 'RO', countryName: 'Romania', standardRate: 19, reducedRate: 5, isEU: true },
    SK: { country: 'SK', countryName: 'Slovakia', standardRate: 20, reducedRate: 10, isEU: true },
    SI: { country: 'SI', countryName: 'Slovenia', standardRate: 22, reducedRate: 5, isEU: true },
    ES: { country: 'ES', countryName: 'Spain', standardRate: 21, reducedRate: 10, superReducedRate: 4, isEU: true },
    SE: { country: 'SE', countryName: 'Sweden', standardRate: 25, reducedRate: 6, isEU: true },
    // Non-EU countries
    GB: { country: 'GB', countryName: 'United Kingdom', standardRate: 20, reducedRate: 5, isEU: false },
    CH: { country: 'CH', countryName: 'Switzerland', standardRate: 8.1, reducedRate: 2.6, isEU: false },
    NO: { country: 'NO', countryName: 'Norway', standardRate: 25, reducedRate: 12, isEU: false },
    US: { country: 'US', countryName: 'United States', standardRate: 0, isEU: false }, // Sales tax varies by state
    CA: { country: 'CA', countryName: 'Canada', standardRate: 5, isEU: false }, // GST federal rate
  };

  /**
   * Get VAT rate for a country
   */
  getVatRate(countryCode: string): TaxRate | null {
    const code = countryCode.toUpperCase();
    const rate = this.vatRates[code];

    if (!rate) {
      return null;
    }

    return rate;
  }

  /**
   * Get standard VAT rate for a country
   */
  getStandardRate(countryCode: string): number {
    const rate = this.getVatRate(countryCode);
    return rate?.standardRate ?? 0;
  }

  /**
   * Get reduced VAT rate for a country
   */
  getReducedRate(countryCode: string): number {
    const rate = this.getVatRate(countryCode);
    return rate?.reducedRate ?? rate?.standardRate ?? 0;
  }

  /**
   * Check if a country is in the EU
   */
  isEuCountry(countryCode: string): boolean {
    const rate = this.getVatRate(countryCode);
    return rate?.isEU ?? false;
  }

  /**
   * Get all available tax rates
   */
  getAllRates(): TaxRate[] {
    return Object.values(this.vatRates);
  }

  /**
   * Get all EU country rates
   */
  getEuRates(): TaxRate[] {
    return Object.values(this.vatRates).filter((r) => r.isEU);
  }

  /**
   * Calculate tax for an amount
   */
  calculateTax(
    amount: number,
    countryCode: string,
    options: {
      useReducedRate?: boolean;
      customRate?: number;
      isB2B?: boolean;
      sellerCountry?: string;
      customerVatNumber?: string;
    } = {},
  ): TaxCalculation {
    const {
      useReducedRate = false,
      customRate,
      isB2B = false,
      sellerCountry = 'FR',
      customerVatNumber,
    } = options;

    const taxableBase = this.roundToTwo(amount);
    let taxRate: number;
    let isExempt = false;
    let isReverseCharge = false;
    const taxCountry = countryCode.toUpperCase();

    // Determine if reverse charge applies (B2B within EU)
    if (isB2B && customerVatNumber) {
      const sellerIsEu = this.isEuCountry(sellerCountry);
      const customerIsEu = this.isEuCountry(taxCountry);

      // Reverse charge for B2B sales within EU (different countries)
      if (sellerIsEu && customerIsEu && sellerCountry.toUpperCase() !== taxCountry) {
        isReverseCharge = true;
        taxRate = 0;
      }
    }

    // Determine tax rate if not reverse charge
    if (!isReverseCharge) {
      if (customRate !== undefined) {
        taxRate = customRate;
      } else if (useReducedRate) {
        taxRate = this.getReducedRate(taxCountry);
      } else {
        taxRate = this.getStandardRate(taxCountry);
      }
    }

    // Calculate tax amount
    const taxAmount = isExempt || isReverseCharge ? 0 : this.roundToTwo(taxableBase * (taxRate! / 100));
    const total = this.roundToTwo(taxableBase + taxAmount);

    return {
      taxableBase,
      taxRate: taxRate!,
      taxAmount,
      total,
      isExempt,
      isReverseCharge,
      taxCountry,
    };
  }

  /**
   * Calculate tax from a gross amount (tax-inclusive)
   */
  calculateTaxFromGross(
    grossAmount: number,
    taxRate: number,
  ): { netAmount: number; taxAmount: number } {
    const netAmount = this.roundToTwo(grossAmount / (1 + taxRate / 100));
    const taxAmount = this.roundToTwo(grossAmount - netAmount);

    return {
      netAmount,
      taxAmount,
    };
  }

  /**
   * Validate VAT number format
   */
  validateVatFormat(vatNumber: string): {
    valid: boolean;
    countryCode?: string;
    number?: string;
    errorMessage?: string;
  } {
    if (!vatNumber || typeof vatNumber !== 'string') {
      return { valid: false, errorMessage: 'VAT number is required' };
    }

    // Clean the VAT number
    const cleaned = vatNumber.replace(/[\s.-]/g, '').toUpperCase();

    // Extract country code (first 2 characters)
    const countryCode = cleaned.substring(0, 2);
    const number = cleaned.substring(2);

    // Validate country code
    if (!this.vatRates[countryCode]) {
      return { valid: false, errorMessage: `Invalid country code: ${countryCode}` };
    }

    // Basic format validation by country
    const patterns: Record<string, RegExp> = {
      AT: /^U\d{8}$/,
      BE: /^0?\d{9,10}$/,
      BG: /^\d{9,10}$/,
      HR: /^\d{11}$/,
      CY: /^\d{8}[A-Z]$/,
      CZ: /^\d{8,10}$/,
      DK: /^\d{8}$/,
      EE: /^\d{9}$/,
      FI: /^\d{8}$/,
      FR: /^[A-Z0-9]{2}\d{9}$/,
      DE: /^\d{9}$/,
      GR: /^\d{9}$/,
      HU: /^\d{8}$/,
      IE: /^\d{7}[A-Z]{1,2}$|^\d[A-Z]\d{5}[A-Z]$/,
      IT: /^\d{11}$/,
      LV: /^\d{11}$/,
      LT: /^\d{9,12}$/,
      LU: /^\d{8}$/,
      MT: /^\d{8}$/,
      NL: /^\d{9}B\d{2}$/,
      PL: /^\d{10}$/,
      PT: /^\d{9}$/,
      RO: /^\d{2,10}$/,
      SK: /^\d{10}$/,
      SI: /^\d{8}$/,
      ES: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/,
      SE: /^\d{12}$/,
      GB: /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/,
    };

    const pattern = patterns[countryCode];
    if (pattern && !pattern.test(number)) {
      return {
        valid: false,
        countryCode,
        number,
        errorMessage: `Invalid VAT number format for ${countryCode}`,
      };
    }

    return {
      valid: true,
      countryCode,
      number,
    };
  }

  /**
   * Format VAT number for display
   */
  formatVatNumber(vatNumber: string): string {
    const cleaned = vatNumber.replace(/[\s.-]/g, '').toUpperCase();
    const countryCode = cleaned.substring(0, 2);
    const number = cleaned.substring(2);

    // Add spacing based on country
    switch (countryCode) {
      case 'FR':
        return `${countryCode} ${number.substring(0, 2)} ${number.substring(2)}`;
      case 'DE':
        return `${countryCode} ${number}`;
      case 'NL':
        return `${countryCode} ${number.substring(0, 9)} ${number.substring(9)}`;
      default:
        return `${countryCode} ${number}`;
    }
  }

  /**
   * Get tax summary for reporting
   */
  getTaxSummary(
    items: { amount: number; taxRate: number }[],
  ): { byRate: { rate: number; base: number; tax: number }[]; totalBase: number; totalTax: number } {
    const byRate = new Map<number, { base: number; tax: number }>();

    for (const item of items) {
      const existing = byRate.get(item.taxRate) || { base: 0, tax: 0 };
      existing.base += item.amount;
      existing.tax += this.roundToTwo(item.amount * (item.taxRate / 100));
      byRate.set(item.taxRate, existing);
    }

    const result: { rate: number; base: number; tax: number }[] = [];
    let totalBase = 0;
    let totalTax = 0;

    for (const [rate, { base, tax }] of byRate) {
      result.push({
        rate,
        base: this.roundToTwo(base),
        tax: this.roundToTwo(tax),
      });
      totalBase += base;
      totalTax += tax;
    }

    return {
      byRate: result.sort((a, b) => a.rate - b.rate),
      totalBase: this.roundToTwo(totalBase),
      totalTax: this.roundToTwo(totalTax),
    };
  }

  /**
   * Round to 2 decimal places
   */
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }
}
