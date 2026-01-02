/**
 * Ticket Validation Schemas
 * Schemas for tickets, ticket types, and purchase operations
 */

import { z } from 'zod';
import { m } from './messages';
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  dateStringSchema,
  dateTimeStringSchema,
  amountSchema,
  currencySchema,
  paginationSchema,
} from './common.schema';

// ============================================================================
// Ticket Status & Type Enums
// ============================================================================

export const ticketStatusEnum = z.enum([
  'valid',
  'used',
  'expired',
  'cancelled',
  'refunded',
  'transferred',
  'pending',
]);

export type TicketStatus = z.infer<typeof ticketStatusEnum>;

export const ticketTypeStatusEnum = z.enum([
  'draft',
  'on_sale',
  'sold_out',
  'off_sale',
  'archived',
]);

export type TicketTypeStatus = z.infer<typeof ticketTypeStatusEnum>;

export const ticketCategoryEnum = z.enum([
  'general_admission',
  'vip',
  'backstage',
  'camping',
  'parking',
  'premium',
  'early_bird',
  'student',
  'group',
  'press',
  'staff',
  'artist',
  'sponsor',
]);

export type TicketCategory = z.infer<typeof ticketCategoryEnum>;

export const accessLevelEnum = z.enum([
  'standard',
  'premium',
  'vip',
  'backstage',
  'all_access',
]);

export type AccessLevel = z.infer<typeof accessLevelEnum>;

// ============================================================================
// QR Code Schema
// ============================================================================

export const qrCodeSchema = z
  .string()
  .min(20, { message: 'QR code invalide' })
  .max(500, { message: 'QR code trop long' });

export const ticketCodeSchema = z
  .string()
  .min(8, { message: 'Code billet invalide' })
  .max(50, { message: 'Code billet invalide' })
  .regex(/^[A-Z0-9-]+$/, { message: 'Format de code billet invalide' });

// ============================================================================
// Ticket Holder Schema
// ============================================================================

export const ticketHolderSchema = z.object({
  firstName: z.string()
    .min(1, { message: m().required })
    .max(100, { message: m().tooLong(100) })
    .trim(),
  lastName: z.string()
    .min(1, { message: m().required })
    .max(100, { message: m().tooLong(100) })
    .trim(),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateStringSchema.optional(),
  documentType: z.enum(['id_card', 'passport', 'driving_license']).optional(),
  documentNumber: z.string().max(50).optional(),
});

export type TicketHolder = z.infer<typeof ticketHolderSchema>;

// ============================================================================
// Create Ticket Type Schema
// ============================================================================

export const createTicketTypeSchema = z.object({
  festivalId: uuidSchema,
  name: z.string()
    .min(2, { message: m().tooShort(2) })
    .max(100, { message: m().tooLong(100) })
    .trim(),
  description: z.string()
    .max(2000, { message: m().tooLong(2000) })
    .optional(),
  category: ticketCategoryEnum,
  accessLevel: accessLevelEnum.default('standard'),
  price: amountSchema,
  currency: currencySchema.default('EUR'),
  totalQuantity: z.number()
    .int({ message: m().integerRequired })
    .min(1, { message: m().minValue(1) })
    .max(1000000, { message: m().maxValue(1000000) }),
  maxPerOrder: z.number()
    .int()
    .min(1)
    .max(20)
    .default(10),
  minPerOrder: z.number()
    .int()
    .min(1)
    .default(1),
  salesStartDate: dateTimeStringSchema,
  salesEndDate: dateTimeStringSchema,
  validFrom: dateTimeStringSchema.optional(),
  validUntil: dateTimeStringSchema.optional(),
  allowedZones: z.array(uuidSchema).optional(),
  allowedDays: z.array(dateStringSchema).optional(),
  isTransferable: z.boolean().default(true),
  isRefundable: z.boolean().default(true),
  refundDeadline: dateTimeStringSchema.optional(),
  requiresHolderInfo: z.boolean().default(false),
  ageRestriction: z.number().int().min(0).max(21).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => new Date(data.salesEndDate) > new Date(data.salesStartDate),
  {
    message: 'La date de fin de vente doit etre apres la date de debut',
    path: ['salesEndDate'],
  }
).refine(
  (data) => data.minPerOrder <= data.maxPerOrder,
  {
    message: 'Le minimum par commande doit etre inferieur ou egal au maximum',
    path: ['minPerOrder'],
  }
);

export type CreateTicketType = z.infer<typeof createTicketTypeSchema>;

// ============================================================================
// Update Ticket Type Schema
// ============================================================================

export const updateTicketTypeSchema = z.object({
  name: z.string()
    .min(2, { message: m().tooShort(2) })
    .max(100, { message: m().tooLong(100) })
    .trim()
    .optional(),
  description: z.string()
    .max(2000, { message: m().tooLong(2000) })
    .optional(),
  category: ticketCategoryEnum.optional(),
  accessLevel: accessLevelEnum.optional(),
  price: amountSchema.optional(),
  totalQuantity: z.number()
    .int({ message: m().integerRequired })
    .min(1, { message: m().minValue(1) })
    .max(1000000, { message: m().maxValue(1000000) })
    .optional(),
  maxPerOrder: z.number().int().min(1).max(20).optional(),
  minPerOrder: z.number().int().min(1).optional(),
  salesStartDate: dateTimeStringSchema.optional(),
  salesEndDate: dateTimeStringSchema.optional(),
  validFrom: dateTimeStringSchema.optional(),
  validUntil: dateTimeStringSchema.optional(),
  allowedZones: z.array(uuidSchema).optional(),
  allowedDays: z.array(dateStringSchema).optional(),
  isTransferable: z.boolean().optional(),
  isRefundable: z.boolean().optional(),
  refundDeadline: dateTimeStringSchema.optional(),
  requiresHolderInfo: z.boolean().optional(),
  ageRestriction: z.number().int().min(0).max(21).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  status: ticketTypeStatusEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateTicketType = z.infer<typeof updateTicketTypeSchema>;

// ============================================================================
// Purchase Ticket Schema
// ============================================================================

export const purchaseTicketItemSchema = z.object({
  ticketTypeId: uuidSchema,
  quantity: z.number()
    .int({ message: m().integerRequired })
    .min(1, { message: m().minValue(1) })
    .max(20, { message: m().maxValue(20) }),
  holders: z.array(ticketHolderSchema).optional(),
});

export const purchaseTicketsSchema = z.object({
  festivalId: uuidSchema,
  items: z.array(purchaseTicketItemSchema)
    .min(1, { message: m().arrayTooShort(1) })
    .max(10, { message: m().arrayTooLong(10) }),
  buyerEmail: emailSchema,
  buyerPhone: phoneSchema,
  buyerFirstName: z.string()
    .min(1, { message: m().required })
    .max(100)
    .trim(),
  buyerLastName: z.string()
    .min(1, { message: m().required })
    .max(100)
    .trim(),
  promoCode: z.string().max(50).optional(),
  acceptsTerms: z.literal(true, {
    message: 'Vous devez accepter les conditions',
  }),
  acceptsMarketing: z.boolean().default(false),
  locale: z.enum(['fr', 'en']).default('fr'),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => {
    // Validate that holders are provided if required by ticket type
    for (const item of data.items) {
      if (item.holders && item.holders.length !== item.quantity) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Le nombre de porteurs doit correspondre a la quantite',
    path: ['items'],
  }
);

export type PurchaseTickets = z.infer<typeof purchaseTicketsSchema>;

// ============================================================================
// Validate Ticket Schema
// ============================================================================

export const validateTicketSchema = z.object({
  ticketId: uuidSchema.optional(),
  qrCode: qrCodeSchema.optional(),
  ticketCode: ticketCodeSchema.optional(),
  festivalId: uuidSchema,
  zoneId: uuidSchema.optional(),
  scannerId: uuidSchema.optional(),
  scanLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
}).refine(
  (data) => data.ticketId || data.qrCode || data.ticketCode,
  {
    message: 'Un identifiant de billet, QR code ou code est requis',
    path: ['ticketId'],
  }
);

export type ValidateTicket = z.infer<typeof validateTicketSchema>;

// ============================================================================
// Transfer Ticket Schema
// ============================================================================

export const transferTicketSchema = z.object({
  ticketId: uuidSchema,
  recipientEmail: emailSchema,
  recipientFirstName: z.string()
    .min(1, { message: m().required })
    .max(100)
    .trim(),
  recipientLastName: z.string()
    .min(1, { message: m().required })
    .max(100)
    .trim(),
  message: z.string().max(500).optional(),
  notifyRecipient: z.boolean().default(true),
});

export type TransferTicket = z.infer<typeof transferTicketSchema>;

// ============================================================================
// Refund Ticket Schema
// ============================================================================

export const refundTicketSchema = z.object({
  ticketId: uuidSchema,
  reason: z.enum([
    'customer_request',
    'event_cancelled',
    'event_postponed',
    'duplicate_purchase',
    'fraud',
    'other',
  ]),
  reasonDetails: z.string().max(1000).optional(),
  refundAmount: amountSchema.optional(),
  isPartialRefund: z.boolean().default(false),
  refundToOriginalMethod: z.boolean().default(true),
  notifyCustomer: z.boolean().default(true),
});

export type RefundTicket = z.infer<typeof refundTicketSchema>;

// ============================================================================
// Ticket Query Schema
// ============================================================================

export const ticketQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  ticketTypeId: uuidSchema.optional(),
  status: z.union([ticketStatusEnum, z.array(ticketStatusEnum)]).optional(),
  category: z.union([ticketCategoryEnum, z.array(ticketCategoryEnum)]).optional(),
  purchaseDateFrom: dateStringSchema.optional(),
  purchaseDateTo: dateStringSchema.optional(),
  validFrom: dateStringSchema.optional(),
  validTo: dateStringSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['purchaseDate', 'validFrom', 'status', 'price']).optional(),
  isUsed: z.coerce.boolean().optional(),
  isExpired: z.coerce.boolean().optional(),
});

export type TicketQuery = z.infer<typeof ticketQuerySchema>;

// ============================================================================
// Ticket Type Query Schema
// ============================================================================

export const ticketTypeQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema,
  status: z.union([ticketTypeStatusEnum, z.array(ticketTypeStatusEnum)]).optional(),
  category: z.union([ticketCategoryEnum, z.array(ticketCategoryEnum)]).optional(),
  accessLevel: z.union([accessLevelEnum, z.array(accessLevelEnum)]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  hasAvailability: z.coerce.boolean().optional(),
  isOnSale: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'price', 'salesStartDate', 'availableQuantity']).optional(),
});

export type TicketTypeQuery = z.infer<typeof ticketTypeQuerySchema>;

// ============================================================================
// Scan Event Schema
// ============================================================================

export const scanEventSchema = z.object({
  ticketId: uuidSchema,
  scanType: z.enum(['entry', 'exit', 'zone_access', 'reentry']),
  scannerId: uuidSchema.optional(),
  deviceId: z.string().max(100).optional(),
  zoneId: uuidSchema.optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  timestamp: dateTimeStringSchema.optional(),
  isOffline: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ScanEvent = z.infer<typeof scanEventSchema>;

// ============================================================================
// Batch Operations Schema
// ============================================================================

export const batchTicketOperationSchema = z.object({
  ticketIds: z.array(uuidSchema)
    .min(1, { message: m().arrayTooShort(1) })
    .max(100, { message: m().arrayTooLong(100) }),
  operation: z.enum(['cancel', 'refund', 'extend_validity', 'change_status']),
  newStatus: ticketStatusEnum.optional(),
  extendUntil: dateTimeStringSchema.optional(),
  reason: z.string().max(500).optional(),
  notifyHolders: z.boolean().default(true),
});

export type BatchTicketOperation = z.infer<typeof batchTicketOperationSchema>;

// ============================================================================
// Promo Code Schema
// ============================================================================

export const promoCodeSchema = z.object({
  code: z.string()
    .min(3, { message: m().tooShort(3) })
    .max(50, { message: m().tooLong(50) })
    .toUpperCase()
    .trim(),
  festivalId: uuidSchema,
  discountType: z.enum(['percentage', 'fixed_amount', 'free_ticket']),
  discountValue: z.number()
    .min(0, { message: m().positiveNumber }),
  maxUses: z.number().int().min(1).optional(),
  maxUsesPerUser: z.number().int().min(1).default(1),
  validFrom: dateTimeStringSchema,
  validUntil: dateTimeStringSchema,
  applicableTicketTypes: z.array(uuidSchema).optional(),
  minOrderAmount: amountSchema.optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Le pourcentage de reduction ne peut pas depasser 100%',
    path: ['discountValue'],
  }
).refine(
  (data) => new Date(data.validUntil) > new Date(data.validFrom),
  {
    message: 'La date de fin de validite doit etre apres la date de debut',
    path: ['validUntil'],
  }
);

export type PromoCode = z.infer<typeof promoCodeSchema>;

// ============================================================================
// Apply Promo Code Schema
// ============================================================================

export const applyPromoCodeSchema = z.object({
  code: z.string()
    .min(1, { message: m().required })
    .max(50)
    .toUpperCase()
    .trim(),
  festivalId: uuidSchema,
  ticketTypeIds: z.array(uuidSchema).optional(),
  orderTotal: amountSchema.optional(),
});

export type ApplyPromoCode = z.infer<typeof applyPromoCodeSchema>;

// ============================================================================
// Ticket Statistics Query
// ============================================================================

export const ticketStatsQuerySchema = z.object({
  festivalId: uuidSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum([
    'sales_count',
    'sales_revenue',
    'scans_count',
    'cancellations',
    'refunds',
    'transfers',
    'conversion_rate',
  ])).optional(),
  ticketTypeIds: z.array(uuidSchema).optional(),
  groupBy: z.enum(['ticket_type', 'category', 'access_level', 'day']).optional(),
});

export type TicketStatsQuery = z.infer<typeof ticketStatsQuerySchema>;

// ============================================================================
// ID Schemas
// ============================================================================

export const ticketIdSchema = z.object({
  ticketId: uuidSchema,
});

export const ticketTypeIdSchema = z.object({
  ticketTypeId: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type TicketId = z.infer<typeof ticketIdSchema>;
export type TicketTypeId = z.infer<typeof ticketTypeIdSchema>;
