// Format utility functions

/**
 * Format a price with currency
 */
export function formatPrice(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number,
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format a percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format a duration in human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // French format: XX XX XX XX XX
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  // International format with French number
  if (cleaned.length === 11 && cleaned.startsWith('33')) {
    return '+33 ' + cleaned.slice(2).replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  return phone;
}

/**
 * Format an address as a single line
 */
export function formatAddressOneLine(address: {
  street: string;
  city: string;
  postalCode: string;
  country?: string;
}): string {
  const parts = [address.street, address.postalCode, address.city];
  if (address.country) {
    parts.push(address.country);
  }
  return parts.join(', ');
}
