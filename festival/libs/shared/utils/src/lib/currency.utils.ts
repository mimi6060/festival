// Currency utility functions

/**
 * Currency codes with their symbols and decimal places
 */
export const CURRENCIES: Record<
  string,
  { symbol: string; decimals: number; name: string }
> = {
  EUR: { symbol: '\u20AC', decimals: 2, name: 'Euro' },
  USD: { symbol: '$', decimals: 2, name: 'US Dollar' },
  GBP: { symbol: '\u00A3', decimals: 2, name: 'British Pound' },
  CHF: { symbol: 'CHF', decimals: 2, name: 'Swiss Franc' },
  CAD: { symbol: 'CA$', decimals: 2, name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
  JPY: { symbol: '\u00A5', decimals: 0, name: 'Japanese Yen' },
  CNY: { symbol: '\u00A5', decimals: 2, name: 'Chinese Yuan' },
  INR: { symbol: '\u20B9', decimals: 2, name: 'Indian Rupee' },
  BRL: { symbol: 'R$', decimals: 2, name: 'Brazilian Real' },
  MXN: { symbol: 'MX$', decimals: 2, name: 'Mexican Peso' },
  SEK: { symbol: 'kr', decimals: 2, name: 'Swedish Krona' },
  NOK: { symbol: 'kr', decimals: 2, name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', decimals: 2, name: 'Danish Krone' },
  PLN: { symbol: 'z\u0142', decimals: 2, name: 'Polish Zloty' },
  CZK: { symbol: 'K\u010D', decimals: 2, name: 'Czech Koruna' },
};

/**
 * Format a price with currency symbol
 */
export function formatPrice(
  amount: number,
  currency = 'EUR',
  locale = 'fr-FR',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(amount);
}

/**
 * Format a price with custom decimal places
 */
export function formatPriceCustom(
  amount: number,
  currency = 'EUR',
  locale = 'fr-FR',
  minimumFractionDigits?: number,
  maximumFractionDigits?: number
): string {
  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minimumFractionDigits ?? decimals,
    maximumFractionDigits: maximumFractionDigits ?? decimals,
  }).format(amount);
}

/**
 * Convert between currencies using exchange rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error(
      `Exchange rate not found for ${!fromRate ? fromCurrency : toCurrency}`
    );
  }

  // Convert to base currency then to target currency
  const baseAmount = amount / fromRate;
  return baseAmount * toRate;
}

/**
 * Parse a currency string to a number
 */
export function parseCurrencyString(
  currencyString: string,
  locale = 'fr-FR'
): number {
  // Get the decimal and thousand separators for the locale
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
  const decimalSeparator =
    parts.find((part) => part.type === 'decimal')?.value || '.';
  const groupSeparator =
    parts.find((part) => part.type === 'group')?.value || ',';

  // Remove currency symbols and non-numeric characters except separators
  let cleaned = currencyString.replace(/[^\d\-.,\s]/g, '').trim();

  // Replace group separator with nothing and decimal separator with '.'
  cleaned = cleaned
    .split(groupSeparator)
    .join('')
    .replace(decimalSeparator, '.');

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Convert cents to euros/dollars (smallest unit to main unit)
 */
export function fromCents(cents: number, currency = 'EUR'): number {
  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;
  return cents / Math.pow(10, decimals);
}

/**
 * Convert euros/dollars to cents (main unit to smallest unit)
 */
export function toCents(amount: number, currency = 'EUR'): number {
  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;
  return Math.round(amount * Math.pow(10, decimals));
}

/**
 * Round to currency precision
 */
export function roundToCurrencyPrecision(
  amount: number,
  currency = 'EUR'
): number {
  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Calculate total with tax
 */
export function calculateWithTax(
  amount: number,
  taxRate: number,
  currency = 'EUR'
): { subtotal: number; tax: number; total: number } {
  const subtotal = roundToCurrencyPrecision(amount, currency);
  const tax = roundToCurrencyPrecision(amount * (taxRate / 100), currency);
  const total = roundToCurrencyPrecision(subtotal + tax, currency);

  return { subtotal, tax, total };
}

/**
 * Calculate discount
 */
export function calculateDiscount(
  amount: number,
  discountPercent: number,
  currency = 'EUR'
): { original: number; discount: number; final: number } {
  const original = roundToCurrencyPrecision(amount, currency);
  const discount = roundToCurrencyPrecision(
    amount * (discountPercent / 100),
    currency
  );
  const final = roundToCurrencyPrecision(original - discount, currency);

  return { original, discount, final };
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const currencyInfo = CURRENCIES[currency];
  return currencyInfo?.symbol || currency;
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return currency in CURRENCIES;
}

/**
 * Get list of supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCIES);
}

/**
 * Format a price range
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency = 'EUR',
  locale = 'fr-FR'
): string {
  if (minPrice === maxPrice) {
    return formatPrice(minPrice, currency, locale);
  }
  return `${formatPrice(minPrice, currency, locale)} - ${formatPrice(
    maxPrice,
    currency,
    locale
  )}`;
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(
  amount: number,
  total: number
): number {
  if (total === 0) return 0;
  return (amount / total) * 100;
}

/**
 * Split amount equally among participants (handles rounding)
 */
export function splitAmount(
  amount: number,
  participants: number,
  currency = 'EUR'
): number[] {
  if (participants <= 0) return [];

  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;
  const factor = Math.pow(10, decimals);

  const cents = Math.round(amount * factor);
  const baseAmount = Math.floor(cents / participants);
  const remainder = cents % participants;

  const shares: number[] = [];
  for (let i = 0; i < participants; i++) {
    // Distribute remainder to first few participants
    const share = baseAmount + (i < remainder ? 1 : 0);
    shares.push(share / factor);
  }

  return shares;
}
