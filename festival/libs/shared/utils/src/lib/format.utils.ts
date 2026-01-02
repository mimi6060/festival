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

/**
 * Format a full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number, precision: number = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Format a date range
 */
export function formatDateRange(
  startDate: Date,
  endDate: Date,
  locale: string = 'fr-FR'
): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  const formatter = new Intl.DateTimeFormat(locale, options);

  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth()
  ) {
    // Same month and year
    return `${startDate.getDate()} - ${formatter.format(endDate)}`;
  } else if (startDate.getFullYear() === endDate.getFullYear()) {
    // Same year
    const startFormatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
    });
    return `${startFormatter.format(startDate)} - ${formatter.format(endDate)}`;
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

/**
 * Format bytes as a readable string with appropriate unit
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a count with singular/plural form
 */
export function formatCount(
  count: number,
  singular: string,
  plural: string
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Format an ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(n: number, locale: string = 'fr-FR'): string {
  if (locale.startsWith('fr')) {
    return n === 1 ? '1er' : `${n}e`;
  }

  // English ordinals
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format a list with proper grammar
 */
export function formatList(
  items: string[],
  conjunction: string = 'et',
  locale: string = 'fr-FR'
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  return `${otherItems.join(', ')} ${conjunction} ${lastItem}`;
}

/**
 * Format a time range
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

/**
 * Format distance in meters to human-readable format
 */
export function formatDistance(meters: number, locale: string = 'fr-FR'): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/**
 * Format a rating (e.g., 4.5/5)
 */
export function formatRating(
  rating: number,
  maxRating: number = 5,
  decimals: number = 1
): string {
  return `${rating.toFixed(decimals)}/${maxRating}`;
}

/**
 * Format credit card number with spaces
 */
export function formatCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

/**
 * Format an IBAN with spaces
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

/**
 * Format a compact number (e.g., 1.5K, 2.3M)
 */
export function formatCompactNumber(value: number, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Format a decimal number with fixed decimal places
 */
export function formatDecimal(
  value: number,
  decimals: number = 2,
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
