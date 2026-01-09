// Types
export * from './lib/types';

// Legacy utilities (for backward compatibility)
// Note: Use the new formatters module for more comprehensive formatting
export {
  interpolate,
  getNestedValue,
  formatDate as formatDateSimple,
  formatDateTime as formatDateTimeSimple,
  formatCurrency as formatCurrencySimple,
  formatNumber as formatNumberSimple,
  formatPercent as formatPercentSimple,
  formatRelativeTime as formatRelativeTimeSimple,
  pluralize,
  getBrowserLocale,
  setStoredLocale,
  getStoredLocale,
} from './lib/utils';

// Formatters (locale-aware date, number, currency, relative time)
export * from './lib/formatters';

// Locales (JSON imports)
export { default as frLocale } from './lib/locales/fr.json';
export { default as enLocale } from './lib/locales/en.json';
export { default as deLocale } from './lib/locales/de.json';
export { default as esLocale } from './lib/locales/es.json';
export { default as itLocale } from './lib/locales/it.json';
export { default as nlLocale } from './lib/locales/nl.json';
