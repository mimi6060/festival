/**
 * Cashless Validation Schemas
 * Schemas for cashless accounts, topups, payments, and NFC operations
 */

import { z } from 'zod';
import { m } from './messages';
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  amountSchema,
  currencySchema,
  nfcIdSchema,
  pinSchema,
  dateStringSchema,
  dateTimeStringSchema,
  paginationSchema,
  PATTERNS,
} from './common.schema';

// ============================================================================
// Cashless Account Status & Type Enums
// ============================================================================

export const cashlessAccountStatusEnum = z.enum([
  'active',
  'suspended',
  'closed',
  'pending_activation',
  'blocked',
]);

export type CashlessAccountStatus = z.infer<typeof cashlessAccountStatusEnum>;

export const cashlessAccountTypeEnum = z.enum([
  'attendee',
  'staff',
  'vendor',
  'vip',
  'artist',
  'sponsor',
  'press',
]);

export type CashlessAccountType = z.infer<typeof cashlessAccountTypeEnum>;

export const nfcTagStatusEnum = z.enum([
  'unassigned',
  'assigned',
  'active',
  'lost',
  'damaged',
  'blocked',
  'returned',
]);

export type NfcTagStatus = z.infer<typeof nfcTagStatusEnum>;

export const topupMethodEnum = z.enum([
  'card',
  'cash',
  'bank_transfer',
  'apple_pay',
  'google_pay',
  'paypal',
  'ticket_bonus',
  'promotional',
]);

export type TopupMethod = z.infer<typeof topupMethodEnum>;

export const cashlessTransactionTypeEnum = z.enum([
  'topup',
  'purchase',
  'refund',
  'transfer_in',
  'transfer_out',
  'correction',
  'bonus',
  'withdrawal',
  'fee',
  'expiry',
]);

export type CashlessTransactionType = z.infer<typeof cashlessTransactionTypeEnum>;

export const cashlessTransactionStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'cancelled',
  'reversed',
]);

export type CashlessTransactionStatus = z.infer<typeof cashlessTransactionStatusEnum>;

// ============================================================================
// Create Cashless Account Schema
// ============================================================================

export const createCashlessAccountSchema = z.object({
  festivalId: uuidSchema,
  userId: uuidSchema.optional(),
  ticketId: uuidSchema.optional(),
  type: cashlessAccountTypeEnum.default('attendee'),
  nfcTagId: nfcIdSchema.optional(),
  initialBalance: amountSchema.default(0),
  maxBalance: amountSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  firstName: z.string()
    .min(1, { message: m().required })
    .max(100, { message: m().tooLong(100) })
    .trim()
    .optional(),
  lastName: z.string()
    .min(1, { message: m().required })
    .max(100, { message: m().tooLong(100) })
    .trim()
    .optional(),
  pin: pinSchema.optional(),
  currency: currencySchema.default('EUR'),
  allowNegativeBalance: z.boolean().default(false),
  creditLimit: amountSchema.default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCashlessAccount = z.infer<typeof createCashlessAccountSchema>;

// ============================================================================
// Update Cashless Account Schema
// ============================================================================

export const updateCashlessAccountSchema = z.object({
  status: cashlessAccountStatusEnum.optional(),
  type: cashlessAccountTypeEnum.optional(),
  maxBalance: amountSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  allowNegativeBalance: z.boolean().optional(),
  creditLimit: amountSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateCashlessAccount = z.infer<typeof updateCashlessAccountSchema>;

// ============================================================================
// Assign NFC Tag Schema
// ============================================================================

export const assignNfcTagSchema = z.object({
  accountId: uuidSchema,
  nfcTagId: nfcIdSchema,
  replacePrevious: z.boolean().default(false),
});

export type AssignNfcTag = z.infer<typeof assignNfcTagSchema>;

// ============================================================================
// Set PIN Schema
// ============================================================================

export const setPinSchema = z.object({
  accountId: uuidSchema,
  pin: pinSchema,
  confirmPin: pinSchema,
}).refine(
  (data) => data.pin === data.confirmPin,
  {
    message: 'Les codes PIN ne correspondent pas',
    path: ['confirmPin'],
  }
);

export type SetPin = z.infer<typeof setPinSchema>;

export const verifyPinSchema = z.object({
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  pin: pinSchema,
}).refine(
  (data) => data.accountId || data.nfcTagId,
  {
    message: 'Un identifiant de compte ou tag NFC est requis',
    path: ['accountId'],
  }
);

export type VerifyPin = z.infer<typeof verifyPinSchema>;

// ============================================================================
// Topup Schema
// ============================================================================

export const topupSchema = z.object({
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  festivalId: uuidSchema,
  amount: z.number()
    .int({ message: m().integerRequired })
    .min(500, { message: 'Le montant minimum est de 5,00 EUR' })
    .max(50000, { message: 'Le montant maximum est de 500,00 EUR' }),
  method: topupMethodEnum,
  paymentIntentId: z.string().optional(),
  terminalId: uuidSchema.optional(),
  operatorId: uuidSchema.optional(),
  bonusAmount: amountSchema.default(0),
  reference: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.accountId || data.nfcTagId,
  {
    message: 'Un identifiant de compte ou tag NFC est requis',
    path: ['accountId'],
  }
);

export type Topup = z.infer<typeof topupSchema>;

// ============================================================================
// Cashless Payment Schema
// ============================================================================

export const cashlessPaymentSchema = z.object({
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  festivalId: uuidSchema,
  vendorId: uuidSchema,
  amount: z.number()
    .int({ message: m().integerRequired })
    .min(1, { message: m().minValue(1) }),
  items: z.array(z.object({
    productId: uuidSchema.optional(),
    name: z.string().min(1).max(100),
    quantity: z.number().int().min(1),
    unitPrice: amountSchema,
    category: z.string().max(50).optional(),
  })).optional(),
  terminalId: uuidSchema.optional(),
  operatorId: uuidSchema.optional(),
  pin: pinSchema.optional(),
  tip: amountSchema.default(0),
  reference: z.string().max(100).optional(),
  isOffline: z.boolean().default(false),
  offlineTimestamp: dateTimeStringSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.accountId || data.nfcTagId,
  {
    message: 'Un identifiant de compte ou tag NFC est requis',
    path: ['accountId'],
  }
);

export type CashlessPayment = z.infer<typeof cashlessPaymentSchema>;

// ============================================================================
// Transfer Schema
// ============================================================================

export const cashlessTransferSchema = z.object({
  fromAccountId: uuidSchema.optional(),
  fromNfcTagId: nfcIdSchema.optional(),
  toAccountId: uuidSchema.optional(),
  toNfcTagId: nfcIdSchema.optional(),
  festivalId: uuidSchema,
  amount: z.number()
    .int({ message: m().integerRequired })
    .min(100, { message: 'Le montant minimum est de 1,00 EUR' }),
  pin: pinSchema.optional(),
  reason: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.fromAccountId || data.fromNfcTagId,
  {
    message: 'Un compte source est requis',
    path: ['fromAccountId'],
  }
).refine(
  (data) => data.toAccountId || data.toNfcTagId,
  {
    message: 'Un compte destination est requis',
    path: ['toAccountId'],
  }
).refine(
  (data) => {
    const from = data.fromAccountId || data.fromNfcTagId;
    const to = data.toAccountId || data.toNfcTagId;
    return from !== to;
  },
  {
    message: 'Le compte source et destination doivent etre differents',
    path: ['toAccountId'],
  }
);

export type CashlessTransfer = z.infer<typeof cashlessTransferSchema>;

// ============================================================================
// Refund Schema
// ============================================================================

export const cashlessRefundSchema = z.object({
  transactionId: uuidSchema,
  amount: amountSchema.optional(),
  reason: z.enum([
    'customer_request',
    'incorrect_amount',
    'product_unavailable',
    'technical_error',
    'duplicate_transaction',
    'other',
  ]),
  reasonDetails: z.string().max(500).optional(),
  operatorId: uuidSchema.optional(),
  terminalId: uuidSchema.optional(),
  refundToBalance: z.boolean().default(true),
  notifyUser: z.boolean().default(true),
});

export type CashlessRefund = z.infer<typeof cashlessRefundSchema>;

// ============================================================================
// Withdrawal Schema
// ============================================================================

export const withdrawalSchema = z.object({
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  festivalId: uuidSchema,
  amount: amountSchema.optional(),
  withdrawAll: z.boolean().default(false),
  method: z.enum(['bank_transfer', 'cash', 'original_payment_method']),
  bankDetails: z.object({
    iban: z.string().regex(PATTERNS.IBAN),
    bic: z.string().regex(PATTERNS.BIC).optional(),
    accountHolder: z.string().min(2).max(100),
  }).optional(),
  pin: pinSchema.optional(),
  fee: amountSchema.default(0),
}).refine(
  (data) => data.accountId || data.nfcTagId,
  {
    message: 'Un identifiant de compte ou tag NFC est requis',
    path: ['accountId'],
  }
).refine(
  (data) => data.amount || data.withdrawAll,
  {
    message: 'Un montant ou withdrawAll est requis',
    path: ['amount'],
  }
).refine(
  (data) => {
    if (data.method === 'bank_transfer') {
      return !!data.bankDetails;
    }
    return true;
  },
  {
    message: 'Les details bancaires sont requis pour un virement',
    path: ['bankDetails'],
  }
);

export type Withdrawal = z.infer<typeof withdrawalSchema>;

// ============================================================================
// Balance Correction Schema
// ============================================================================

export const balanceCorrectionSchema = z.object({
  accountId: uuidSchema,
  amount: z.number()
    .int({ message: m().integerRequired }),
  type: z.enum(['credit', 'debit']),
  reason: z.enum([
    'technical_error_correction',
    'customer_complaint',
    'fraud_reversal',
    'system_reconciliation',
    'promotional_credit',
    'penalty',
    'other',
  ]),
  reasonDetails: z.string()
    .min(10, { message: m().tooShort(10) })
    .max(1000, { message: m().tooLong(1000) }),
  operatorId: uuidSchema,
  approvedBy: uuidSchema.optional(),
  reference: z.string().max(100).optional(),
});

export type BalanceCorrection = z.infer<typeof balanceCorrectionSchema>;

// ============================================================================
// NFC Tag Management Schemas
// ============================================================================

export const registerNfcTagsSchema = z.object({
  festivalId: uuidSchema,
  tags: z.array(z.object({
    nfcId: nfcIdSchema,
    batchNumber: z.string().max(50).optional(),
    serialNumber: z.string().max(50).optional(),
  }))
    .min(1, { message: m().arrayTooShort(1) })
    .max(1000, { message: m().arrayTooLong(1000) }),
});

export type RegisterNfcTags = z.infer<typeof registerNfcTagsSchema>;

export const reportLostNfcTagSchema = z.object({
  nfcTagId: nfcIdSchema,
  accountId: uuidSchema,
  blockAccount: z.boolean().default(true),
  transferBalanceToNew: z.boolean().default(false),
  newNfcTagId: nfcIdSchema.optional(),
}).refine(
  (data) => {
    if (data.transferBalanceToNew) {
      return !!data.newNfcTagId;
    }
    return true;
  },
  {
    message: 'Un nouveau tag NFC est requis pour le transfert',
    path: ['newNfcTagId'],
  }
);

export type ReportLostNfcTag = z.infer<typeof reportLostNfcTagSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

export const cashlessAccountQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema,
  status: z.union([cashlessAccountStatusEnum, z.array(cashlessAccountStatusEnum)]).optional(),
  type: z.union([cashlessAccountTypeEnum, z.array(cashlessAccountTypeEnum)]).optional(),
  minBalance: z.coerce.number().optional(),
  maxBalance: z.coerce.number().optional(),
  hasNfcTag: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'balance', 'lastTransactionAt', 'name']).optional(),
});

export type CashlessAccountQuery = z.infer<typeof cashlessAccountQuerySchema>;

export const cashlessTransactionQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  vendorId: uuidSchema.optional(),
  type: z.union([cashlessTransactionTypeEnum, z.array(cashlessTransactionTypeEnum)]).optional(),
  status: z.union([cashlessTransactionStatusEnum, z.array(cashlessTransactionStatusEnum)]).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  terminalId: uuidSchema.optional(),
  operatorId: uuidSchema.optional(),
  isOffline: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'type']).optional(),
});

export type CashlessTransactionQuery = z.infer<typeof cashlessTransactionQuerySchema>;

export const nfcTagQuerySchema = paginationSchema.extend({
  festivalId: uuidSchema,
  status: z.union([nfcTagStatusEnum, z.array(nfcTagStatusEnum)]).optional(),
  batchNumber: z.string().optional(),
  isAssigned: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'assignedAt', 'status']).optional(),
});

export type NfcTagQuery = z.infer<typeof nfcTagQuerySchema>;

// ============================================================================
// Offline Sync Schema
// ============================================================================

export const offlineSyncSchema = z.object({
  terminalId: uuidSchema,
  festivalId: uuidSchema,
  transactions: z.array(z.object({
    localId: z.string().uuid(),
    type: cashlessTransactionTypeEnum,
    accountId: uuidSchema.optional(),
    nfcTagId: nfcIdSchema.optional(),
    amount: z.number().int(),
    vendorId: uuidSchema.optional(),
    items: z.array(z.object({
      productId: uuidSchema.optional(),
      name: z.string(),
      quantity: z.number().int(),
      unitPrice: z.number().int(),
    })).optional(),
    timestamp: dateTimeStringSchema,
    operatorId: uuidSchema.optional(),
    signature: z.string().optional(),
  })).min(1).max(500),
  lastSyncTimestamp: dateTimeStringSchema.optional(),
});

export type OfflineSync = z.infer<typeof offlineSyncSchema>;

// ============================================================================
// Terminal Management Schema
// ============================================================================

export const registerTerminalSchema = z.object({
  festivalId: uuidSchema,
  vendorId: uuidSchema.optional(),
  name: z.string().min(1).max(100).trim(),
  type: z.enum(['pos', 'topup', 'refund', 'mobile', 'kiosk']),
  location: z.object({
    zone: z.string().max(100).optional(),
    description: z.string().max(200).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }).optional(),
  }).optional(),
  deviceInfo: z.object({
    model: z.string().max(100).optional(),
    osVersion: z.string().max(50).optional(),
    appVersion: z.string().max(20).optional(),
    serialNumber: z.string().max(100).optional(),
  }).optional(),
});

export type RegisterTerminal = z.infer<typeof registerTerminalSchema>;

// ============================================================================
// Cashless Statistics Query
// ============================================================================

export const cashlessStatsQuerySchema = z.object({
  festivalId: uuidSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  granularity: z.enum(['hour', 'day', 'week']).default('day'),
  metrics: z.array(z.enum([
    'total_topups',
    'total_spending',
    'average_balance',
    'active_accounts',
    'transaction_count',
    'average_transaction',
    'topup_methods_breakdown',
    'spending_by_vendor',
    'spending_by_category',
    'refund_rate',
    'withdrawal_total',
  ])).optional(),
  vendorId: uuidSchema.optional(),
  groupBy: z.enum(['vendor', 'terminal', 'hour', 'day', 'category']).optional(),
});

export type CashlessStatsQuery = z.infer<typeof cashlessStatsQuerySchema>;

// ============================================================================
// Account Balance Check
// ============================================================================

export const checkBalanceSchema = z.object({
  accountId: uuidSchema.optional(),
  nfcTagId: nfcIdSchema.optional(),
  festivalId: uuidSchema,
  pin: pinSchema.optional(),
}).refine(
  (data) => data.accountId || data.nfcTagId,
  {
    message: 'Un identifiant de compte ou tag NFC est requis',
    path: ['accountId'],
  }
);

export type CheckBalance = z.infer<typeof checkBalanceSchema>;

// ============================================================================
// ID Schemas
// ============================================================================

export const cashlessAccountIdSchema = z.object({
  accountId: uuidSchema,
});

export const nfcTagIdSchema = z.object({
  nfcTagId: nfcIdSchema,
});

export const terminalIdSchema = z.object({
  terminalId: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type CashlessAccountId = z.infer<typeof cashlessAccountIdSchema>;
export type NfcTagId = z.infer<typeof nfcTagIdSchema>;
export type TerminalId = z.infer<typeof terminalIdSchema>;
