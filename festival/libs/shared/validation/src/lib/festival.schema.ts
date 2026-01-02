/**
 * Festival Validation Schemas
 * Schemas for festivals, venues, and event management
 */

import { z } from 'zod';
import { m } from './messages';
import { slugSchema, uuidSchema, dateStringSchema, urlSchema, PATTERNS } from './common.schema';

// ============================================================================
// Festival Status
// ============================================================================

export const festivalStatusEnum = z.enum([
  'draft',
  'published',
  'ongoing',
  'completed',
  'cancelled',
  'postponed',
]);

export type FestivalStatus = z.infer<typeof festivalStatusEnum>;

// ============================================================================
// Location Schema
// ============================================================================

export const coordinatesSchema = z.object({
  latitude: z.number()
    .min(-90, { message: 'Latitude invalide' })
    .max(90, { message: 'Latitude invalide' }),
  longitude: z.number()
    .min(-180, { message: 'Longitude invalide' })
    .max(180, { message: 'Longitude invalide' }),
});

export const addressSchema = z.object({
  street: z.string().min(1, { message: m().required }).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1, { message: m().required }).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1, { message: m().required }).max(20),
  country: z.string().min(2).max(2, { message: 'Code pays invalide (ISO 3166-1 alpha-2)' }),
});

export const venueSchema = z.object({
  name: z.string().min(1, { message: m().required }).max(200).trim(),
  address: addressSchema,
  coordinates: coordinatesSchema.optional(),
  capacity: z.number().int().min(1).optional(),
  description: z.string().max(2000).optional(),
  website: urlSchema.optional(),
  phone: z.string().regex(PATTERNS.PHONE_INTERNATIONAL).optional(),
  email: z.string().email({ message: m().invalidEmail }).optional(),
  amenities: z.array(z.string()).optional(),
  accessibilityInfo: z.string().max(1000).optional(),
  parkingInfo: z.string().max(1000).optional(),
  publicTransportInfo: z.string().max(1000).optional(),
});

// ============================================================================
// Create Festival Schema
// ============================================================================

export const createFestivalSchema = z.object({
  name: z.string()
    .min(3, { message: m().tooShort(3) })
    .max(200, { message: m().tooLong(200) })
    .trim(),
  slug: slugSchema.optional(),
  description: z.string()
    .min(10, { message: m().tooShort(10) })
    .max(5000, { message: m().tooLong(5000) })
    .optional(),
  shortDescription: z.string()
    .max(300, { message: m().tooLong(300) })
    .optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  timezone: z.string().min(1, { message: m().required }),
  venue: venueSchema,
  logo: urlSchema.optional(),
  banner: urlSchema.optional(),
  website: urlSchema.optional(),
  email: z.string().email({ message: m().invalidEmail }).optional(),
  phone: z.string().regex(PATTERNS.PHONE_INTERNATIONAL).optional(),
  socialLinks: z.object({
    facebook: urlSchema.optional(),
    instagram: urlSchema.optional(),
    twitter: urlSchema.optional(),
    youtube: urlSchema.optional(),
    tiktok: urlSchema.optional(),
  }).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  genres: z.array(z.string().max(50)).max(10).optional(),
  ageRestriction: z.number().int().min(0).max(21).optional(),
  currency: z.string().length(3, { message: 'Code devise invalide (ISO 4217)' }).default('EUR'),
  languages: z.array(z.string().length(2)).min(1).default(['fr']),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'La date de fin doit etre apres la date de debut',
    path: ['endDate'],
  }
);

// ============================================================================
// Update Festival Schema
// ============================================================================

export const updateFestivalSchema = z.object({
  name: z.string()
    .min(3, { message: m().tooShort(3) })
    .max(200, { message: m().tooLong(200) })
    .trim()
    .optional(),
  slug: slugSchema.optional(),
  description: z.string()
    .min(10, { message: m().tooShort(10) })
    .max(5000, { message: m().tooLong(5000) })
    .optional(),
  shortDescription: z.string()
    .max(300, { message: m().tooLong(300) })
    .optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  timezone: z.string().min(1).optional(),
  venue: venueSchema.partial().optional(),
  status: festivalStatusEnum.optional(),
  logo: urlSchema.optional(),
  banner: urlSchema.optional(),
  website: urlSchema.optional(),
  email: z.string().email({ message: m().invalidEmail }).optional(),
  phone: z.string().regex(PATTERNS.PHONE_INTERNATIONAL).optional(),
  socialLinks: z.object({
    facebook: urlSchema.optional(),
    instagram: urlSchema.optional(),
    twitter: urlSchema.optional(),
    youtube: urlSchema.optional(),
    tiktok: urlSchema.optional(),
  }).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  genres: z.array(z.string().max(50)).max(10).optional(),
  ageRestriction: z.number().int().min(0).max(21).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ============================================================================
// Festival Query Schema
// ============================================================================

export const festivalQuerySchema = z.object({
  status: z.union([festivalStatusEnum, z.array(festivalStatusEnum)]).optional(),
  startDateFrom: dateStringSchema.optional(),
  startDateTo: dateStringSchema.optional(),
  city: z.string().optional(),
  country: z.string().length(2).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  genres: z.union([z.string(), z.array(z.string())]).optional(),
  isFeatured: z.coerce.boolean().optional(),
  hasAvailableTickets: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['startDate', 'name', 'createdAt', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Festival ID Schema
// ============================================================================

export const festivalIdSchema = z.object({
  festivalId: uuidSchema,
});

export const festivalSlugSchema = z.object({
  slug: slugSchema,
});

// ============================================================================
// Publish Festival Schema
// ============================================================================

export const publishFestivalSchema = z.object({
  festivalId: uuidSchema,
  publishAt: dateStringSchema.optional(),
  notifySubscribers: z.boolean().default(true),
});

// ============================================================================
// Festival Settings Schema
// ============================================================================

export const festivalSettingsSchema = z.object({
  ticketing: z.object({
    maxTicketsPerOrder: z.number().int().min(1).max(20).default(10),
    cartExpirationMinutes: z.number().int().min(5).max(60).default(15),
    allowTransfers: z.boolean().default(true),
    allowRefunds: z.boolean().default(true),
    refundDeadlineDays: z.number().int().min(0).max(30).default(7),
    requireHolderInfo: z.boolean().default(false),
  }).optional(),
  cashless: z.object({
    enabled: z.boolean().default(true),
    minTopup: z.number().min(5).default(10),
    maxTopup: z.number().min(10).default(200),
    maxBalance: z.number().min(100).default(500),
    allowRefund: z.boolean().default(true),
    refundFee: z.number().min(0).max(5).default(0),
  }).optional(),
  notifications: z.object({
    emailReminders: z.boolean().default(true),
    reminderDaysBefore: z.array(z.number().int().min(1).max(30)).default([7, 1]),
    pushNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
  }).optional(),
  access: z.object({
    scanMode: z.enum(['entry', 'exit', 'both']).default('entry'),
    allowReentry: z.boolean().default(true),
    maxReentries: z.number().int().min(0).optional(),
    noReentryAfterTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
  legal: z.object({
    termsUrl: urlSchema.optional(),
    privacyUrl: urlSchema.optional(),
    refundPolicyUrl: urlSchema.optional(),
    ageVerificationRequired: z.boolean().default(false),
  }).optional(),
});

// ============================================================================
// Festival Statistics Query
// ============================================================================

export const festivalStatsQuerySchema = z.object({
  festivalId: uuidSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum([
    'tickets_sold',
    'revenue',
    'attendance',
    'cashless_transactions',
    'cashless_volume',
  ])).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Coordinates = z.infer<typeof coordinatesSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type CreateFestival = z.infer<typeof createFestivalSchema>;
export type UpdateFestival = z.infer<typeof updateFestivalSchema>;
export type FestivalQuery = z.infer<typeof festivalQuerySchema>;
export type FestivalSettings = z.infer<typeof festivalSettingsSchema>;
export type FestivalStatsQuery = z.infer<typeof festivalStatsQuerySchema>;
