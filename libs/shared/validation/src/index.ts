/**
 * Shared Validation Library
 * Zod schemas for all festival platform data validation
 */

// ============================================================================
// Core Schemas
// ============================================================================

// Messages and localization
export {
  type SupportedLocale,
  type ValidationMessages,
  setValidationLocale,
  getValidationLocale,
  getMessages,
  getMessagesForLocale,
  m,
} from './lib/messages';

// Common schemas and patterns
export {
  // Regex patterns
  PATTERNS,
  // Base schemas
  uuidSchema,
  emailSchema,
  phoneSchema,
  frenchPhoneSchema,
  urlSchema,
  slugSchema,
  dateStringSchema,
  dateTimeStringSchema,
  dateSchema,
  timeSchema,
  nfcIdSchema,
  pinSchema,
  ibanSchema,
  bicSchema,
  currencySchema,
  amountSchema,
  positiveNumberSchema,
  nonNegativeSchema,
  nameSchema,
  frenchPostalCodeSchema,
  // Pagination and search
  sortOrderSchema,
  paginationSchema,
  searchSchema,
  paginatedSearchSchema,
  // Date and time
  dateRangeSchema,
  optionalDateRangeSchema,
  timeSlotSchema,
  // Address
  coordinatesSchema,
  addressSchema,
  frenchAddressSchema,
  // Misc
  metadataSchema,
  tagsSchema,
  localeSchema,
  timezoneSchema,
  // Helper functions
  optional,
  nullable,
  emptyToUndefined,
  // Types
  type UUID,
  type Email,
  type Phone,
  type FrenchPhone,
  type Slug,
  type IBAN,
  type BIC,
  type Currency,
  type NfcId,
  type PIN,
  type Pagination,
  type Search,
  type PaginatedSearch,
  type DateRange,
  type TimeSlot,
  type Coordinates,
  type Address,
  type FrenchAddress,
  type Tags,
  type Locale,
  type Timezone,
} from './lib/common.schema';

// ============================================================================
// Auth Schemas
// ============================================================================

export * from './lib/auth.schema';

// ============================================================================
// User Schemas
// ============================================================================

export * from './lib/user.schema';

// ============================================================================
// Festival Schemas
// ============================================================================

export {
  // Enums
  festivalStatusEnum,
  // Schemas
  venueSchema,
  createFestivalSchema,
  updateFestivalSchema,
  festivalQuerySchema,
  festivalIdSchema,
  festivalSlugSchema,
  publishFestivalSchema,
  festivalSettingsSchema,
  festivalStatsQuerySchema,
  // Types
  type FestivalStatus,
  type Venue,
  type CreateFestival,
  type UpdateFestival,
  type FestivalQuery,
  type FestivalSettings,
  type FestivalStatsQuery,
} from './lib/festival.schema';

// ============================================================================
// Ticket Schemas
// ============================================================================

export {
  // Enums
  ticketStatusEnum,
  ticketTypeStatusEnum,
  ticketCategoryEnum,
  accessLevelEnum,
  // Schemas
  qrCodeSchema,
  ticketCodeSchema,
  ticketHolderSchema,
  createTicketTypeSchema,
  updateTicketTypeSchema,
  purchaseTicketItemSchema,
  purchaseTicketsSchema,
  validateTicketSchema,
  transferTicketSchema,
  refundTicketSchema,
  ticketQuerySchema,
  ticketTypeQuerySchema,
  scanEventSchema,
  batchTicketOperationSchema,
  promoCodeSchema,
  applyPromoCodeSchema,
  ticketStatsQuerySchema,
  ticketIdSchema,
  ticketTypeIdSchema,
  // Types
  type TicketStatus,
  type TicketTypeStatus,
  type TicketCategory,
  type AccessLevel,
  type TicketHolder,
  type CreateTicketType,
  type UpdateTicketType,
  type PurchaseTickets,
  type ValidateTicket,
  type TransferTicket,
  type RefundTicket,
  type TicketQuery,
  type TicketTypeQuery,
  type ScanEvent,
  type BatchTicketOperation,
  type PromoCode,
  type ApplyPromoCode,
  type TicketStatsQuery,
  type TicketId,
  type TicketTypeId,
} from './lib/ticket.schema';

// ============================================================================
// Payment Schemas
// ============================================================================

export {
  // Enums
  paymentStatusEnum,
  paymentProviderEnum,
  paymentMethodTypeEnum,
  refundStatusEnum,
  refundReasonEnum,
  transactionTypeEnum,
  // Schemas
  cardSchema,
  billingAddressSchema,
  createPaymentIntentSchema,
  confirmPaymentSchema,
  processCardPaymentSchema,
  createRefundSchema,
  bankTransferSchema,
  paymentQuerySchema,
  transactionQuerySchema,
  refundQuerySchema,
  webhookEventSchema,
  createPayoutSchema,
  savePaymentMethodSchema,
  disputeResponseSchema,
  paymentStatsQuerySchema,
  createInvoiceSchema,
  sendReceiptSchema,
  paymentIdSchema,
  refundIdSchema,
  transactionIdSchema,
  // Types
  type PaymentStatus,
  type PaymentProvider,
  type PaymentMethodType,
  type RefundStatus,
  type RefundReason,
  type TransactionType,
  type Card,
  type BillingAddress,
  type CreatePaymentIntent,
  type ConfirmPayment,
  type ProcessCardPayment,
  type CreateRefund,
  type BankTransfer,
  type PaymentQuery,
  type TransactionQuery,
  type RefundQuery,
  type WebhookEvent,
  type CreatePayout,
  type SavePaymentMethod,
  type DisputeResponse,
  type PaymentStatsQuery,
  type CreateInvoice,
  type SendReceipt,
  type PaymentId,
  type RefundId,
  type TransactionId,
} from './lib/payment.schema';

// ============================================================================
// Cashless Schemas
// ============================================================================

export {
  // Enums
  cashlessAccountStatusEnum,
  cashlessAccountTypeEnum,
  nfcTagStatusEnum,
  topupMethodEnum,
  cashlessTransactionTypeEnum,
  cashlessTransactionStatusEnum,
  // Schemas
  createCashlessAccountSchema,
  updateCashlessAccountSchema,
  assignNfcTagSchema,
  setPinSchema,
  verifyPinSchema,
  topupSchema,
  cashlessPaymentSchema,
  cashlessTransferSchema,
  cashlessRefundSchema,
  withdrawalSchema,
  balanceCorrectionSchema,
  registerNfcTagsSchema,
  reportLostNfcTagSchema,
  cashlessAccountQuerySchema,
  cashlessTransactionQuerySchema,
  nfcTagQuerySchema,
  offlineSyncSchema,
  registerTerminalSchema,
  cashlessStatsQuerySchema,
  checkBalanceSchema,
  cashlessAccountIdSchema,
  nfcTagIdSchema,
  terminalIdSchema,
  // Types
  type CashlessAccountStatus,
  type CashlessAccountType,
  type NfcTagStatus,
  type TopupMethod,
  type CashlessTransactionType,
  type CashlessTransactionStatus,
  type CreateCashlessAccount,
  type UpdateCashlessAccount,
  type AssignNfcTag,
  type SetPin,
  type VerifyPin,
  type Topup,
  type CashlessPayment,
  type CashlessTransfer,
  type CashlessRefund,
  type Withdrawal,
  type BalanceCorrection,
  type RegisterNfcTags,
  type ReportLostNfcTag,
  type CashlessAccountQuery,
  type CashlessTransactionQuery,
  type NfcTagQuery,
  type OfflineSync,
  type RegisterTerminal,
  type CashlessStatsQuery,
  type CheckBalance,
  type CashlessAccountId,
  type NfcTagId,
  type TerminalId,
} from './lib/cashless.schema';
