/**
 * RTL (Right-to-Left) Utilities
 *
 * Utilities for handling RTL languages like Arabic, Hebrew, Farsi, and Urdu.
 * These utilities help with:
 * - Detecting RTL locales
 * - Setting text direction
 * - Providing direction-aware helpers
 */

/**
 * List of RTL (Right-to-Left) locale codes
 * These languages are written from right to left
 */
export const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'] as const;

/**
 * Type for RTL locale codes
 */
export type RTLLocale = (typeof RTL_LOCALES)[number];

/**
 * Text direction type
 */
export type Direction = 'ltr' | 'rtl';

/**
 * Check if a locale is RTL
 *
 * @param locale - The locale code to check (e.g., 'ar', 'en', 'fr')
 * @returns true if the locale is RTL, false otherwise
 *
 * @example
 * isRTL('ar') // true (Arabic)
 * isRTL('en') // false (English)
 * isRTL('he') // true (Hebrew)
 */
export function isRTL(locale: string): boolean {
  // Extract the language code from locale (e.g., 'ar-SA' -> 'ar')
  const languageCode = locale.split('-')[0].toLowerCase();
  return RTL_LOCALES.includes(languageCode as RTLLocale);
}

/**
 * Get the text direction for a locale
 *
 * @param locale - The locale code to get direction for
 * @returns 'rtl' for RTL locales, 'ltr' for LTR locales
 *
 * @example
 * getDirection('ar') // 'rtl'
 * getDirection('en') // 'ltr'
 */
export function getDirection(locale: string): Direction {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get the opposite direction
 *
 * @param direction - The current direction
 * @returns The opposite direction
 *
 * @example
 * getOppositeDirection('ltr') // 'rtl'
 * getOppositeDirection('rtl') // 'ltr'
 */
export function getOppositeDirection(direction: Direction): Direction {
  return direction === 'ltr' ? 'rtl' : 'ltr';
}

/**
 * Get direction-aware position values
 * Useful for positioning elements in RTL layouts
 *
 * @param direction - The current text direction
 * @returns An object with start/end mapped to left/right
 *
 * @example
 * const positions = getDirectionalPositions('ltr');
 * positions.start // 'left'
 * positions.end // 'right'
 *
 * const rtlPositions = getDirectionalPositions('rtl');
 * rtlPositions.start // 'right'
 * rtlPositions.end // 'left'
 */
export function getDirectionalPositions(direction: Direction): {
  start: 'left' | 'right';
  end: 'left' | 'right';
} {
  return direction === 'ltr' ? { start: 'left', end: 'right' } : { start: 'right', end: 'left' };
}

/**
 * Get direction-aware transform value for mirroring
 * Use for icons and elements that need to flip in RTL
 *
 * @param direction - The current text direction
 * @param shouldMirror - Whether the element should be mirrored in RTL
 * @returns CSS transform value or undefined
 *
 * @example
 * getMirrorTransform('rtl', true) // 'scaleX(-1)'
 * getMirrorTransform('ltr', true) // undefined
 */
export function getMirrorTransform(direction: Direction, shouldMirror = true): string | undefined {
  if (direction === 'rtl' && shouldMirror) {
    return 'scaleX(-1)';
  }
  return undefined;
}

/**
 * Get direction-aware flex direction
 * Use for flex containers that should reverse in RTL
 *
 * @param direction - The current text direction
 * @param baseDirection - The base flex direction ('row' or 'row-reverse')
 * @returns The appropriate flex direction for the text direction
 *
 * @example
 * getFlexDirection('ltr', 'row') // 'row'
 * getFlexDirection('rtl', 'row') // 'row-reverse'
 */
export function getFlexDirection(
  direction: Direction,
  baseDirection: 'row' | 'row-reverse' = 'row'
): 'row' | 'row-reverse' {
  if (direction === 'rtl') {
    return baseDirection === 'row' ? 'row-reverse' : 'row';
  }
  return baseDirection;
}

/**
 * Get locale display name with native script
 * Returns the language name in its native script
 *
 * @param locale - The locale code
 * @returns The locale name in native script
 */
export function getLocaleNativeName(locale: string): string {
  const nativeNames: Record<string, string> = {
    ar: 'العربية',
    he: 'עברית',
    fa: 'فارسی',
    ur: 'اردو',
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    it: 'Italiano',
    pt: 'Português',
  };

  const languageCode = locale.split('-')[0].toLowerCase();
  return nativeNames[languageCode] || locale;
}

/**
 * Configuration for RTL locales
 * Provides additional metadata for each RTL language
 */
export const RTL_LOCALE_CONFIG: Record<
  RTLLocale,
  {
    name: string;
    nativeName: string;
    direction: Direction;
    numberSystem: 'arab' | 'latn';
  }
> = {
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    numberSystem: 'arab',
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    numberSystem: 'latn',
  },
  fa: {
    name: 'Persian',
    nativeName: 'فارسی',
    direction: 'rtl',
    numberSystem: 'arab',
  },
  ur: {
    name: 'Urdu',
    nativeName: 'اردو',
    direction: 'rtl',
    numberSystem: 'arab',
  },
};

/**
 * Check if a string contains RTL characters
 * Useful for detecting mixed-direction content
 *
 * @param text - The text to check
 * @returns true if the text contains RTL characters
 */
export function containsRTLCharacters(text: string): boolean {
  // RTL character ranges: Arabic, Hebrew, Persian, Urdu, etc.
  const rtlRegex = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
}

/**
 * Get the dominant direction of a text string
 * Analyzes the text to determine if it's primarily RTL or LTR
 *
 * @param text - The text to analyze
 * @returns The dominant text direction
 */
export function getTextDirection(text: string): Direction {
  if (!text) {
    return 'ltr';
  }

  // Count RTL and LTR characters
  const rtlChars = (
    text.match(/[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/g) || []
  ).length;
  const ltrChars = (text.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;

  return rtlChars > ltrChars ? 'rtl' : 'ltr';
}

/**
 * CSS class helper for direction-aware styling
 * Returns appropriate CSS classes based on direction
 *
 * @param direction - The current text direction
 * @param classes - Object with ltr and rtl class arrays
 * @returns Combined class string
 *
 * @example
 * getDirectionClasses('rtl', {
 *   ltr: ['text-left', 'pl-4'],
 *   rtl: ['text-right', 'pr-4']
 * }) // 'text-right pr-4'
 */
export function getDirectionClasses(
  direction: Direction,
  classes: { ltr: string[]; rtl: string[] }
): string {
  return classes[direction].join(' ');
}

/**
 * Helper to swap left/right values based on direction
 *
 * @param direction - The current text direction
 * @param leftValue - Value to use for left (in LTR) / right (in RTL)
 * @param rightValue - Value to use for right (in LTR) / left (in RTL)
 * @returns Object with directional values
 */
export function swapDirectionalValues<T>(
  direction: Direction,
  leftValue: T,
  rightValue: T
): { left: T; right: T } {
  return direction === 'ltr'
    ? { left: leftValue, right: rightValue }
    : { left: rightValue, right: leftValue };
}
