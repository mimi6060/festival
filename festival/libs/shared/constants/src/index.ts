/**
 * Festival Platform - Shared Constants
 * Central export for all platform constants
 */

// ============================================================================
// Core Constants
// ============================================================================

// API configuration
export * from './lib/api.constants';

// Application configuration
export * from './lib/app.constants';

// Regex patterns
export * from './lib/regex.constants';

// Error codes and messages
export * from './lib/error.constants';

// ============================================================================
// Domain Constants
// ============================================================================

// Authentication and authorization
export * from './lib/auth.constants';

// Festival, tickets, events, zones
export * from './lib/festival.constants';

// Payment processing - exclude duplicates defined in cashless.constants
export {
  CURRENCIES,
  type Currency,
  // DEFAULT_CURRENCY is exported from app.constants
  CURRENCY_CONFIG,
  PAYMENT_METHODS,
  type PaymentMethod,
  PAYMENT_STATUS,
  type PaymentStatus,
  STRIPE_CONFIG,
  REFUND_POLICY,
  REFUND_STATUS,
  type RefundStatus,
  CASHLESS_CONFIG,
  // CASHLESS_TRANSACTION_TYPE and CashlessTransactionType are exported from cashless.constants
  PAYMENT_LIMITS,
  INVOICE_CONFIG,
  PROMO_CONFIG,
  DISCOUNT_TYPES,
  type DiscountType,
} from './lib/payment.constants';

// Cashless and NFC operations
export * from './lib/cashless.constants';

// ============================================================================
// UI Constants
// ============================================================================

// UI configuration and theming
export * from './lib/ui.constants';

// ============================================================================
// Validation Constants
// ============================================================================

// Validation limits and patterns
export * from './lib/validation.constants';
