/**
 * Price Formatter Utility
 *
 * Provides comprehensive price formatting capabilities:
 * - Format prices by locale (fr, en, de, es, it, pt)
 * - Currency symbols and positioning
 * - Decimal handling per currency
 * - Number formatting with separators
 */

/**
 * Supported locales for price formatting
 */
export type PriceLocale = 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt';

/**
 * Currency display format options
 */
export type CurrencyDisplayFormat = 'symbol' | 'code' | 'name' | 'narrowSymbol';

/**
 * Currency codes (ISO 4217)
 */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF';

/**
 * Currency metadata
 */
interface CurrencyMetadata {
  code: CurrencyCode;
  symbol: string;
  narrowSymbol: string;
  name: { en: string; fr: string };
  decimals: number;
  symbolPosition: 'before' | 'after';
  thousandsSeparator: { fr: string; en: string };
  decimalSeparator: { fr: string; en: string };
}

/**
 * Currency definitions
 */
const CURRENCIES: Record<CurrencyCode, CurrencyMetadata> = {
  EUR: {
    code: 'EUR',
    symbol: '\u20AC',
    narrowSymbol: '\u20AC',
    name: { en: 'Euro', fr: 'Euro' },
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: { fr: ' ', en: ',' },
    decimalSeparator: { fr: ',', en: '.' },
  },
  USD: {
    code: 'USD',
    symbol: '$',
    narrowSymbol: '$',
    name: { en: 'US Dollar', fr: 'Dollar americain' },
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: { fr: ' ', en: ',' },
    decimalSeparator: { fr: ',', en: '.' },
  },
  GBP: {
    code: 'GBP',
    symbol: '\u00A3',
    narrowSymbol: '\u00A3',
    name: { en: 'British Pound', fr: 'Livre sterling' },
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: { fr: ' ', en: ',' },
    decimalSeparator: { fr: ',', en: '.' },
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    narrowSymbol: 'Fr.',
    name: { en: 'Swiss Franc', fr: 'Franc suisse' },
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: { fr: "'", en: "'" },
    decimalSeparator: { fr: '.', en: '.' },
  },
};

/**
 * Locale to language mapping
 */
const LOCALE_LANG: Record<PriceLocale, 'fr' | 'en'> = {
  fr: 'fr',
  en: 'en',
  de: 'en', // German uses similar formatting to English
  es: 'fr', // Spanish uses similar formatting to French
  it: 'fr', // Italian uses similar formatting to French
  pt: 'fr', // Portuguese uses similar formatting to French
};

/**
 * Price formatting options
 */
export interface PriceFormatOptions {
  /** Locale for formatting */
  locale?: PriceLocale;
  /** How to display the currency */
  displayFormat?: CurrencyDisplayFormat;
  /** Whether to show decimals even for whole numbers */
  alwaysShowDecimals?: boolean;
  /** Whether to include thousands separators */
  useGrouping?: boolean;
  /** Custom decimal places override */
  decimals?: number;
  /** Minimum value (values below this show "< min") */
  minValue?: number;
  /** Maximum value (values above this show "> max") */
  maxValue?: number;
}

/**
 * Formatted price result
 */
export interface FormattedPrice {
  /** Raw numeric amount */
  amount: number;
  /** Currency code */
  currency: CurrencyCode;
  /** Formatted string with symbol */
  formatted: string;
  /** Formatted string with currency code */
  formattedWithCode: string;
  /** Formatted string with full currency name */
  formattedWithName: string;
  /** Just the formatted number (no currency) */
  formattedNumber: string;
  /** Currency symbol */
  symbol: string;
  /** Number of decimal places used */
  decimals: number;
}

/**
 * Format a price for display
 *
 * @param amount - The numeric amount to format
 * @param currency - The currency code (EUR, USD, GBP, CHF)
 * @param options - Formatting options
 * @returns Formatted price object with multiple representations
 *
 * @example
 * formatPrice(1234.56, 'EUR')
 * // { formatted: '1 234,56 EUR', ... }
 *
 * formatPrice(1234.56, 'USD', { locale: 'en' })
 * // { formatted: '$1,234.56', ... }
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode,
  options: PriceFormatOptions = {},
): FormattedPrice {
  const {
    locale = 'fr',
    displayFormat = 'symbol',
    alwaysShowDecimals = true,
    useGrouping = true,
    decimals: customDecimals,
    minValue,
    maxValue,
  } = options;

  const currencyData = CURRENCIES[currency];
  const lang = LOCALE_LANG[locale];
  const decimals = customDecimals ?? currencyData.decimals;

  // Handle min/max bounds
  let displayAmount = amount;
  let prefix = '';
  let suffix = '';

  if (minValue !== undefined && amount < minValue && amount > 0) {
    displayAmount = minValue;
    prefix = '< ';
  } else if (maxValue !== undefined && amount > maxValue) {
    displayAmount = maxValue;
    suffix = '+';
  }

  // Format the number
  const formattedNumber = formatNumber(displayAmount, {
    decimals,
    alwaysShowDecimals,
    useGrouping,
    thousandsSeparator: currencyData.thousandsSeparator[lang],
    decimalSeparator: currencyData.decimalSeparator[lang],
  });

  // Get currency display
  let currencyDisplay: string;
  switch (displayFormat) {
    case 'code':
      currencyDisplay = currencyData.code;
      break;
    case 'name':
      currencyDisplay = currencyData.name[lang];
      break;
    case 'narrowSymbol':
      currencyDisplay = currencyData.narrowSymbol;
      break;
    case 'symbol':
    default:
      currencyDisplay = currencyData.symbol;
  }

  // Build formatted strings
  const numberWithAffixes = `${prefix}${formattedNumber}${suffix}`;
  let formatted: string;

  if (currencyData.symbolPosition === 'before') {
    formatted = `${currencyDisplay}${numberWithAffixes}`;
  } else {
    formatted = `${numberWithAffixes} ${currencyDisplay}`;
  }

  return {
    amount,
    currency,
    formatted,
    formattedWithCode: `${numberWithAffixes} ${currencyData.code}`,
    formattedWithName: `${numberWithAffixes} ${currencyData.name[lang]}`,
    formattedNumber: numberWithAffixes,
    symbol: currencyData.symbol,
    decimals,
  };
}

/**
 * Format a number with separators
 */
function formatNumber(
  value: number,
  options: {
    decimals: number;
    alwaysShowDecimals: boolean;
    useGrouping: boolean;
    thousandsSeparator: string;
    decimalSeparator: string;
  },
): string {
  const { decimals, alwaysShowDecimals, useGrouping, thousandsSeparator, decimalSeparator } =
    options;

  // Handle negative numbers
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Round to specified decimals
  const rounded = Math.round(absValue * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = rounded.toFixed(decimals).split('.');

  // Format integer part with thousands separators
  let formattedInteger = integerPart;
  if (useGrouping) {
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  }

  // Build result
  let result: string;
  if (decimals > 0 && (alwaysShowDecimals || decimalPart !== '0'.repeat(decimals))) {
    result = `${formattedInteger}${decimalSeparator}${decimalPart}`;
  } else {
    result = formattedInteger;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Parse a formatted price string back to a number
 *
 * @param formattedPrice - The formatted price string
 * @param currency - The currency code (for knowing separators)
 * @param locale - The locale used for formatting
 * @returns The numeric value
 *
 * @example
 * parsePrice('1 234,56 EUR', 'EUR', 'fr')
 * // 1234.56
 */
export function parsePrice(
  formattedPrice: string,
  currency: CurrencyCode,
  locale: PriceLocale = 'fr',
): number {
  const currencyData = CURRENCIES[currency];
  const lang = LOCALE_LANG[locale];

  // Remove currency symbols and names
  let cleaned = formattedPrice
    .replace(currencyData.symbol, '')
    .replace(currencyData.narrowSymbol, '')
    .replace(currencyData.code, '')
    .replace(currencyData.name.en, '')
    .replace(currencyData.name.fr, '')
    .trim();

  // Remove thousands separators
  cleaned = cleaned.split(currencyData.thousandsSeparator[lang]).join('');

  // Replace decimal separator with standard period
  cleaned = cleaned.replace(currencyData.decimalSeparator[lang], '.');

  // Remove any remaining non-numeric characters except minus and period
  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  return parseFloat(cleaned) || 0;
}

/**
 * Get currency metadata
 */
export function getCurrencyMetadata(currency: CurrencyCode): CurrencyMetadata {
  return CURRENCIES[currency];
}

/**
 * Check if a currency code is valid
 */
export function isValidCurrency(code: string): code is CurrencyCode {
  return code in CURRENCIES;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Object.keys(CURRENCIES) as CurrencyCode[];
}

/**
 * Format a price range (e.g., "10,00 - 50,00 EUR")
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currency: CurrencyCode,
  options: PriceFormatOptions = {},
): string {
  if (minAmount === maxAmount) {
    return formatPrice(minAmount, currency, options).formatted;
  }

  const min = formatPrice(minAmount, currency, { ...options, displayFormat: 'code' });
  const max = formatPrice(maxAmount, currency, options);

  // Only show currency once at the end
  return `${min.formattedNumber} - ${max.formatted}`;
}

/**
 * Format a percentage discount with original and final price
 */
export function formatDiscountedPrice(
  originalAmount: number,
  discountedAmount: number,
  currency: CurrencyCode,
  options: PriceFormatOptions = {},
): {
  original: FormattedPrice;
  discounted: FormattedPrice;
  savings: FormattedPrice;
  savingsPercent: number;
} {
  const original = formatPrice(originalAmount, currency, options);
  const discounted = formatPrice(discountedAmount, currency, options);
  const savings = formatPrice(originalAmount - discountedAmount, currency, options);
  const savingsPercent = Math.round(((originalAmount - discountedAmount) / originalAmount) * 100);

  return {
    original,
    discounted,
    savings,
    savingsPercent,
  };
}

/**
 * Format amount in smallest currency unit (cents) to display format
 */
export function formatFromCents(
  cents: number,
  currency: CurrencyCode,
  options: PriceFormatOptions = {},
): FormattedPrice {
  const amount = cents / 100;
  return formatPrice(amount, currency, options);
}

/**
 * Convert display amount to cents (smallest currency unit)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to display amount
 */
export function fromCents(cents: number): number {
  return cents / 100;
}
