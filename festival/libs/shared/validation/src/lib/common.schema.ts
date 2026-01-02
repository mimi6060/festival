/**
 * Common Validation Schemas
 * Reusable base schemas for common patterns
 */

import { z } from 'zod';
import { m } from './messages';

// ============================================================================
// Regex Patterns
// ============================================================================

export const PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{1,14}$/,
  PHONE_FR: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
  POSTAL_CODE_FR: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATE_ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/,
  NFC_ID: /^[A-Fa-f0-9]{8,16}$/,
  PIN: /^\d{4}$/,
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/,
  BIC: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  CURRENCY_ISO: /^[A-Z]{3}$/,
  NAME: /^[a-zA-ZÀ-ÿ\s'-]+$/,
} as const;

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * UUID v4 validation
 */
export const uuidSchema = z.string().regex(PATTERNS.UUID, { message: m().invalidUuid });

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .min(1, { message: m().required })
  .email({ message: m().invalidEmail })
  .max(255, { message: m().tooLong(255) })
  .toLowerCase()
  .trim();

/**
 * International phone number validation
 */
export const phoneSchema = z
  .string()
  .regex(PATTERNS.PHONE_INTERNATIONAL, { message: m().invalidPhone })
  .optional();

/**
 * French phone number validation
 */
export const frenchPhoneSchema = z
  .string()
  .regex(PATTERNS.PHONE_FR, { message: m().invalidFrenchPhone });

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .regex(PATTERNS.URL, { message: m().invalidUrl })
  .max(2048, { message: m().tooLong(2048) });

/**
 * Slug validation (URL-friendly string)
 */
export const slugSchema = z
  .string()
  .min(1, { message: m().required })
  .max(100, { message: m().tooLong(100) })
  .regex(PATTERNS.SLUG, { message: m().invalidSlug });

/**
 * ISO date string validation (YYYY-MM-DD)
 */
export const dateStringSchema = z
  .string()
  .regex(PATTERNS.DATE_ISO, { message: m().invalidDate });

/**
 * ISO datetime string validation
 */
export const dateTimeStringSchema = z
  .string()
  .regex(PATTERNS.DATE_ISO_DATETIME, { message: m().invalidDate });

/**
 * Date object or ISO string (coerced to Date)
 */
export const dateSchema = z.coerce.date({ message: m().invalidDate });

/**
 * Time format validation (HH:mm)
 */
export const timeSchema = z
  .string()
  .regex(PATTERNS.TIME_24H, { message: m().invalidTimeFormat });

/**
 * NFC ID validation
 */
export const nfcIdSchema = z
  .string()
  .regex(PATTERNS.NFC_ID, { message: m().invalidNfcId });

/**
 * PIN code validation (4 digits)
 */
export const pinSchema = z.string().regex(PATTERNS.PIN, { message: m().invalidPin });

/**
 * IBAN validation
 */
export const ibanSchema = z
  .string()
  .transform((val) => val.replace(/\s/g, '').toUpperCase())
  .refine((val) => PATTERNS.IBAN.test(val), { message: m().invalidIban })
  .refine((val) => validateIbanChecksum(val), { message: m().invalidIban });

/**
 * BIC/SWIFT code validation
 */
export const bicSchema = z
  .string()
  .toUpperCase()
  .regex(PATTERNS.BIC, { message: m().invalidBic });

/**
 * Currency code validation (ISO 4217)
 */
export const currencySchema = z
  .string()
  .toUpperCase()
  .regex(PATTERNS.CURRENCY_ISO, { message: m().invalidCurrency });

/**
 * Positive integer (for amounts in cents)
 */
export const amountSchema = z
  .number()
  .int({ message: m().integerRequired })
  .nonnegative({ message: m().positiveNumber });

/**
 * Positive decimal number
 */
export const positiveNumberSchema = z
  .number()
  .positive({ message: m().positiveNumber });

/**
 * Non-negative number (zero or positive)
 */
export const nonNegativeSchema = z
  .number()
  .nonnegative({ message: m().positiveNumber });

/**
 * Name validation (accepts accented characters)
 */
export const nameSchema = z
  .string()
  .min(1, { message: m().required })
  .max(100, { message: m().tooLong(100) })
  .regex(PATTERNS.NAME, { message: m().invalidType })
  .trim();

/**
 * French postal code validation
 */
export const frenchPostalCodeSchema = z
  .string()
  .regex(PATTERNS.POSTAL_CODE_FR, { message: m().invalidPostalCode });

// ============================================================================
// Pagination & Search Schemas
// ============================================================================

/**
 * Sort order enumeration
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.optional(),
});

/**
 * Search parameters
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Combined pagination and search
 */
export const paginatedSearchSchema = paginationSchema.merge(searchSchema);

/**
 * Date range validation
 */
export const dateRangeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: m().endDateBeforeStart,
    path: ['endDate'],
  });

/**
 * Date range with optional dates
 */
export const optionalDateRangeSchema = z
  .object({
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: m().endDateBeforeStart,
      path: ['endDate'],
    }
  );

/**
 * Time slot validation
 */
export const timeSlotSchema = z
  .object({
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);
      return endH * 60 + endM > startH * 60 + startM;
    },
    {
      message: m().endDateBeforeStart,
      path: ['endTime'],
    }
  );

// ============================================================================
// Address Schemas
// ============================================================================

/**
 * Geographic coordinates
 */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Full address schema
 */
export const addressSchema = z.object({
  street: z.string().min(1, { message: m().required }).max(255),
  city: z.string().min(1, { message: m().required }).max(100),
  postalCode: z.string().min(1, { message: m().required }).max(20),
  country: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  coordinates: coordinatesSchema.optional(),
});

/**
 * French address schema
 */
export const frenchAddressSchema = z.object({
  street: z.string().min(1, { message: m().required }).max(255),
  city: z.string().min(1, { message: m().required }).max(100),
  postalCode: frenchPostalCodeSchema,
  country: z.literal('FR').or(z.literal('France')),
  coordinates: coordinatesSchema.optional(),
});

// ============================================================================
// Metadata & Misc Schemas
// ============================================================================

/**
 * Generic metadata object
 */
export const metadataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Tags array (unique strings)
 */
export const tagsSchema = z
  .array(z.string().min(1).max(50))
  .max(20)
  .refine((tags) => new Set(tags).size === tags.length, {
    message: m().uniqueItems,
  })
  .optional();

/**
 * Locale schema
 */
export const localeSchema = z.enum(['fr', 'en']).default('fr');

/**
 * Timezone schema (IANA format)
 */
export const timezoneSchema = z
  .string()
  .min(1)
  .default('Europe/Paris')
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: m().invalidType }
  );

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate IBAN checksum using MOD 97-10
 */
function validateIbanChecksum(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numericIban = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : char;
    })
    .join('');

  // Perform MOD 97-10 calculation
  let remainder = 0;
  for (let i = 0; i < numericIban.length; i++) {
    remainder = (remainder * 10 + parseInt(numericIban[i], 10)) % 97;
  }
  return remainder === 1;
}

/**
 * Create an optional version of a schema
 */
export function optional<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}

/**
 * Create a nullable version of a schema
 */
export function nullable<T extends z.ZodTypeAny>(schema: T): z.ZodNullable<T> {
  return schema.nullable();
}

/**
 * Create a schema that allows empty strings to become undefined
 */
export function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return undefined;
    }
    return val;
  }, schema.optional());
}

// ============================================================================
// Type Exports
// ============================================================================

export type UUID = z.infer<typeof uuidSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type FrenchPhone = z.infer<typeof frenchPhoneSchema>;
export type Slug = z.infer<typeof slugSchema>;
export type IBAN = z.infer<typeof ibanSchema>;
export type BIC = z.infer<typeof bicSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type NfcId = z.infer<typeof nfcIdSchema>;
export type PIN = z.infer<typeof pinSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Search = z.infer<typeof searchSchema>;
export type PaginatedSearch = z.infer<typeof paginatedSearchSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type Address = z.infer<typeof addressSchema>;
export type FrenchAddress = z.infer<typeof frenchAddressSchema>;
export type Tags = z.infer<typeof tagsSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type Timezone = z.infer<typeof timezoneSchema>;
