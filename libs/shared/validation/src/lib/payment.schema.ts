/**
 * Payment Validation Schemas
 * Schemas for payments, transactions, and refunds
 */

import { z } from 'zod';
import { m } from './messages';
import {
  uuidSchema,
  emailSchema,
  amountSchema,
  currencySchema,
  ibanSchema,
  bicSchema,
  dateStringSchema,
  dateTimeStringSchema,
  paginationSchema,
  PATTERNS,
} from './common.schema';

// ============================================================================
// Payment Status & Provider Enums
// ============================================================================

export const paymentStatusEnum = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'disputed',
  'expired',
]);

export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const paymentProviderEnum = z.enum([
  'stripe',
  'paypal',
  'apple_pay',
  'google_pay',
  'bank_transfer',
  'cash',
  'cashless',
  'free',
]);

export type PaymentProvider = z.infer<typeof paymentProviderEnum>;

export const paymentMethodTypeEnum = z.enum([
  'card',
  'sepa_debit',
  'ideal',
  'bancontact',
  'giropay',
  'sofort',
  'eps',
  'przelewy24',
  'apple_pay',
  'google_pay',
  'paypal',
  'bank_transfer',
  'cash',
]);

export type PaymentMethodType = z.infer<typeof paymentMethodTypeEnum>;

export const refundStatusEnum = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
]);

export type RefundStatus = z.infer<typeof refundStatusEnum>;

export const refundReasonEnum = z.enum([
  'requested_by_customer',
  'duplicate',
  'fraudulent',
  'event_cancelled',
  'event_postponed',
  'product_unacceptable',
  'other',
]);

export type RefundReason = z.infer<typeof refundReasonEnum>;

export const transactionTypeEnum = z.enum([
  'purchase',
  'refund',
  'partial_refund',
  'topup',
  'withdrawal',
  'transfer',
  'fee',
  'adjustment',
  'payout',
]);

export type TransactionType = z.infer<typeof transactionTypeEnum>;

// ============================================================================
// Card Schema
// ============================================================================

export const cardSchema = z.object({
  number: z.string()
    .min(13, { message: 'Numero de carte invalide' })
    .max(19, { message: 'Numero de carte invalide' })
    .regex(/^\d+$/, { message: 'Numero de carte invalide' }),
  expiryMonth: z.number()
    .int()
    .min(1, { message: 'Mois invalide' })
    .max(12, { message: 'Mois invalide' }),
  expiryYear: z.number()
    .int()
    .min(new Date().getFullYear(), { message: 'Annee invalide' })
    .max(new Date().getFullYear() + 20, { message: 'Annee invalide' }),
  cvc: z.string()
    .min(3, { message: 'CVC invalide' })
    .max(4, { message: 'CVC invalide' })
    .regex(/^\d+$/, { message: 'CVC invalide' }),
  holderName: z.string()
    .min(2, { message: m().tooShort(2) })
    .max(100, { message: m().tooLong(100) })
    .trim(),
});

export type Card = z.infer<typeof cardSchema>;

// ============================================================================
// Billing Address Schema
// ============================================================================

export const billingAddressSchema = z.object({
  line1: z.string()
    .min(1, { message: m().required })
    .max(200, { message: m().tooLong(200) }),
  line2: z.string().max(200).optional(),
  city: z.string()
    .min(1, { message: m().required })
    .max(100, { message: m().tooLong(100) }),
  postalCode: z.string()
    .min(1, { message: m().required })
    .max(20, { message: m().tooLong(20) }),
  state: z.string().max(100).optional(),
  country: z.string()
    .min(2, { message: 'Code pays invalide' })
    .max(2, { message: 'Code pays invalide' }),
});

export type BillingAddress = z.infer<typeof billingAddressSchema>;

// ============================================================================
// Create Payment Intent Schema
// ============================================================================

export const createPaymentIntentSchema = z.object({
  festivalId: uuidSchema,
  amount: amountSchema,
  currency: currencySchema.default('EUR'),
  paymentMethodType: paymentMethodTypeEnum,
  description: z.string().max(500).optional(),
  statementDescriptor: z.string()
    .max(22, { message: 'Le descripteur ne peut pas depasser 22 caracteres' })
    .regex(/^[a-zA-Z0-9 ]*$/, { message: 'Caracteres non autorises' })
    .optional(),
  metadata: z.record(z.string()).optional(),
  customerId: uuidSchema.optional(),
  orderId: uuidSchema.optional(),
  returnUrl: z.string().url().optional(),
  setupFutureUsage: z.enum(['on_session', 'off_session']).optional(),
});

export type CreatePaymentIntent = z.infer<typeof createPaymentIntentSchema>;

// ============================================================================
// Confirm Payment Schema
// ============================================================================

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string()
    .min(1, { message: m().required }),
  paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  receiptEmail: emailSchema.optional(),
  billingAddress: billingAddressSchema.optional(),
});

export type ConfirmPayment = z.infer<typeof confirmPaymentSchema>;

// ============================================================================
// Process Card Payment Schema
// ============================================================================

export const processCardPaymentSchema = z.object({
  festivalId: uuidSchema,
  orderId: uuidSchema,
  amount: amountSchema,
  currency: currencySchema.default('EUR'),
  card: cardSchema,
  billingAddress: billingAddressSchema,
  email: emailSchema,
  description: z.string().max(500).optional(),
  saveCard: z.boolean().default(false),
  idempotencyKey: z.string().uuid().optional(),
});

export type ProcessCardPayment = z.infer<typeof processCardPaymentSchema>;

// ============================================================================
// Create Refund Schema
// ============================================================================

export const createRefundSchema = z.object({
  paymentId: uuidSchema,
  amount: amountSchema.optional(),
  reason: refundReasonEnum,
  reasonDetails: z.string().max(1000).optional(),
  notifyCustomer: z.boolean().default(true),
  metadata: z.record(z.string()).optional(),
});

export type CreateRefund = z.infer<typeof createRefundSchema>;

// ============================================================================
// Bank Transfer Schema
// ============================================================================

export const bankTransferSchema = z.object({
  iban: ibanSchema,
  bic: bicSchema.optional(),
  accountHolder: z.string()
    .min(2, { message: m().tooShort(2) })
    .max(100, { message: m().tooLong(100) })
    .trim(),
  reference: z.string().max(140).optional(),
});

export type BankTransfer = z.infer<typeof bankTransferSchema>;

// ============================================================================
// Payment Query Schema
// ============================================================================

export const paymentQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  orderId: uuidSchema.optional(),
  status: z.union([paymentStatusEnum, z.array(paymentStatusEnum)]).optional(),
  provider: z.union([paymentProviderEnum, z.array(paymentProviderEnum)]).optional(),
  methodType: z.union([paymentMethodTypeEnum, z.array(paymentMethodTypeEnum)]).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  currency: currencySchema.optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status', 'provider']).optional(),
  hasRefund: z.coerce.boolean().optional(),
});

export type PaymentQuery = z.infer<typeof paymentQuerySchema>;

// ============================================================================
// Transaction Query Schema
// ============================================================================

export const transactionQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  type: z.union([transactionTypeEnum, z.array(transactionTypeEnum)]).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  sortBy: z.enum(['createdAt', 'amount', 'type']).optional(),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

// ============================================================================
// Refund Query Schema
// ============================================================================

export const refundQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema.optional(),
  paymentId: uuidSchema.optional(),
  status: z.union([refundStatusEnum, z.array(refundStatusEnum)]).optional(),
  reason: z.union([refundReasonEnum, z.array(refundReasonEnum)]).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status']).optional(),
});

export type RefundQuery = z.infer<typeof refundQuerySchema>;

// ============================================================================
// Webhook Event Schema
// ============================================================================

export const webhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  provider: paymentProviderEnum,
  data: z.record(z.unknown()),
  timestamp: dateTimeStringSchema.optional(),
  signature: z.string().optional(),
  rawBody: z.string().optional(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// ============================================================================
// Payout Schema
// ============================================================================

export const createPayoutSchema = z.object({
  festivalId: uuidSchema,
  amount: amountSchema,
  currency: currencySchema.default('EUR'),
  destination: z.object({
    type: z.enum(['bank_account', 'card', 'paypal']),
    bankAccount: bankTransferSchema.optional(),
    cardId: z.string().optional(),
    paypalEmail: emailSchema.optional(),
  }).refine(
    (data) => {
      if (data.type === 'bank_account') {return !!data.bankAccount;}
      if (data.type === 'card') {return !!data.cardId;}
      if (data.type === 'paypal') {return !!data.paypalEmail;}
      return false;
    },
    { message: 'Destination de paiement invalide' }
  ),
  description: z.string().max(500).optional(),
  statementDescriptor: z.string().max(22).optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreatePayout = z.infer<typeof createPayoutSchema>;

// ============================================================================
// Payment Method Schema
// ============================================================================

export const savePaymentMethodSchema = z.object({
  userId: uuidSchema,
  type: paymentMethodTypeEnum,
  card: z.object({
    tokenId: z.string().min(1),
    last4: z.string().length(4),
    brand: z.string().min(1),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int(),
  }).optional(),
  sepaDebit: z.object({
    iban: ibanSchema,
    mandateId: z.string().optional(),
  }).optional(),
  billingAddress: billingAddressSchema.optional(),
  isDefault: z.boolean().default(false),
  nickname: z.string().max(50).optional(),
});

export type SavePaymentMethod = z.infer<typeof savePaymentMethodSchema>;

// ============================================================================
// Dispute Schema
// ============================================================================

export const disputeResponseSchema = z.object({
  disputeId: z.string().min(1),
  evidence: z.object({
    customerCommunication: z.string().max(10000).optional(),
    uncategorizedText: z.string().max(10000).optional(),
    accessActivityLog: z.string().max(10000).optional(),
    billingAddress: z.string().max(500).optional(),
    cancellationPolicy: z.string().url().optional(),
    cancellationPolicyDisclosure: z.string().max(10000).optional(),
    cancellationRebuttal: z.string().max(10000).optional(),
    customerEmailAddress: emailSchema.optional(),
    customerName: z.string().max(200).optional(),
    customerSignature: z.string().url().optional(),
    productDescription: z.string().max(10000).optional(),
    receipt: z.string().url().optional(),
    refundPolicy: z.string().url().optional(),
    refundPolicyDisclosure: z.string().max(10000).optional(),
    refundRefusalExplanation: z.string().max(10000).optional(),
    serviceDate: dateStringSchema.optional(),
    serviceDocumentation: z.string().url().optional(),
  }),
  submit: z.boolean().default(false),
});

export type DisputeResponse = z.infer<typeof disputeResponseSchema>;

// ============================================================================
// Payment Statistics Query
// ============================================================================

export const paymentStatsQuerySchema = z.object({
  festivalId: uuidSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum([
    'total_revenue',
    'total_transactions',
    'average_transaction',
    'refund_rate',
    'conversion_rate',
    'payment_method_breakdown',
    'provider_breakdown',
    'failed_payments',
  ])).optional(),
  groupBy: z.enum(['provider', 'method_type', 'status', 'currency']).optional(),
});

export type PaymentStatsQuery = z.infer<typeof paymentStatsQuerySchema>;

// ============================================================================
// Invoice Schema
// ============================================================================

export const createInvoiceSchema = z.object({
  festivalId: uuidSchema,
  customerId: uuidSchema,
  orderId: uuidSchema.optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().int().min(1),
    unitAmount: amountSchema,
    taxRate: z.number().min(0).max(100).optional(),
  })).min(1).max(100),
  currency: currencySchema.default('EUR'),
  dueDate: dateStringSchema.optional(),
  notes: z.string().max(2000).optional(),
  footer: z.string().max(500).optional(),
  taxIdNumber: z.string().max(50).optional(),
  sendToCustomer: z.boolean().default(true),
});

export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

// ============================================================================
// Receipt Schema
// ============================================================================

export const sendReceiptSchema = z.object({
  paymentId: uuidSchema,
  email: emailSchema,
  locale: z.enum(['fr', 'en']).default('fr'),
  includeInvoice: z.boolean().default(false),
});

export type SendReceipt = z.infer<typeof sendReceiptSchema>;

// ============================================================================
// ID Schemas
// ============================================================================

export const paymentIdSchema = z.object({
  paymentId: uuidSchema,
});

export const refundIdSchema = z.object({
  refundId: uuidSchema,
});

export const transactionIdSchema = z.object({
  transactionId: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type PaymentId = z.infer<typeof paymentIdSchema>;
export type RefundId = z.infer<typeof refundIdSchema>;
export type TransactionId = z.infer<typeof transactionIdSchema>;
