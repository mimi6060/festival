/**
 * Cashless & NFC Constants
 * @module @festival/constants/cashless
 */

// ============================================================================
// Cashless Account Status
// ============================================================================

/**
 * Cashless account lifecycle status
 */
export const CASHLESS_ACCOUNT_STATUS = {
  /** Account created but not activated */
  PENDING: 'PENDING',
  /** Account is active and usable */
  ACTIVE: 'ACTIVE',
  /** Temporarily suspended (e.g., suspicious activity) */
  SUSPENDED: 'SUSPENDED',
  /** Account blocked (fraud, abuse) */
  BLOCKED: 'BLOCKED',
  /** Account closed by user or admin */
  CLOSED: 'CLOSED',
  /** Account expired after festival */
  EXPIRED: 'EXPIRED',
} as const;

export type CashlessAccountStatus = (typeof CASHLESS_ACCOUNT_STATUS)[keyof typeof CASHLESS_ACCOUNT_STATUS];

// ============================================================================
// NFC Tag Status
// ============================================================================

/**
 * NFC tag/wristband lifecycle status
 */
export const NFC_TAG_STATUS = {
  /** Tag in inventory, not assigned */
  UNASSIGNED: 'UNASSIGNED',
  /** Tag assigned to account but not activated */
  ASSIGNED: 'ASSIGNED',
  /** Tag is active and linked to account */
  ACTIVE: 'ACTIVE',
  /** Tag reported as lost */
  LOST: 'LOST',
  /** Tag is damaged/defective */
  DAMAGED: 'DAMAGED',
  /** Tag blocked (security) */
  BLOCKED: 'BLOCKED',
  /** Tag returned after festival */
  RETURNED: 'RETURNED',
  /** Tag deactivated */
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type NfcTagStatus = (typeof NFC_TAG_STATUS)[keyof typeof NFC_TAG_STATUS];

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Cashless transaction types
 */
export const CASHLESS_TRANSACTION_TYPE = {
  /** Add funds to account */
  TOPUP: 'TOPUP',
  /** Purchase at vendor */
  PURCHASE: 'PURCHASE',
  /** Refund from vendor */
  REFUND: 'REFUND',
  /** Transfer from another account */
  TRANSFER_IN: 'TRANSFER_IN',
  /** Transfer to another account */
  TRANSFER_OUT: 'TRANSFER_OUT',
  /** Balance correction by admin */
  CORRECTION: 'CORRECTION',
  /** Bonus credit (promotion) */
  BONUS: 'BONUS',
  /** Withdrawal to bank/card */
  WITHDRAWAL: 'WITHDRAWAL',
  /** Fee (e.g., withdrawal fee) */
  FEE: 'FEE',
  /** Expiry/forfeiture */
  EXPIRY: 'EXPIRY',
  /** Tip to vendor */
  TIP: 'TIP',
  /** Chargeback reversal */
  CHARGEBACK: 'CHARGEBACK',
} as const;

export type CashlessTransactionType = (typeof CASHLESS_TRANSACTION_TYPE)[keyof typeof CASHLESS_TRANSACTION_TYPE];

/**
 * Transaction status
 */
export const CASHLESS_TRANSACTION_STATUS = {
  /** Transaction pending */
  PENDING: 'PENDING',
  /** Transaction completed successfully */
  COMPLETED: 'COMPLETED',
  /** Transaction failed */
  FAILED: 'FAILED',
  /** Transaction cancelled */
  CANCELLED: 'CANCELLED',
  /** Transaction reversed */
  REVERSED: 'REVERSED',
  /** Transaction in dispute */
  DISPUTED: 'DISPUTED',
} as const;

export type CashlessTransactionStatus = (typeof CASHLESS_TRANSACTION_STATUS)[keyof typeof CASHLESS_TRANSACTION_STATUS];

// ============================================================================
// Topup Methods
// ============================================================================

/**
 * Methods to add funds to cashless account
 */
export const TOPUP_METHOD = {
  /** Credit/debit card online */
  CARD_ONLINE: 'CARD_ONLINE',
  /** Card at on-site terminal */
  CARD_ONSITE: 'CARD_ONSITE',
  /** Cash at topup point */
  CASH: 'CASH',
  /** Bank transfer (pre-festival) */
  BANK_TRANSFER: 'BANK_TRANSFER',
  /** Apple Pay */
  APPLE_PAY: 'APPLE_PAY',
  /** Google Pay */
  GOOGLE_PAY: 'GOOGLE_PAY',
  /** PayPal */
  PAYPAL: 'PAYPAL',
  /** Promotional bonus */
  PROMOTIONAL: 'PROMOTIONAL',
  /** Ticket includes credit */
  TICKET_BONUS: 'TICKET_BONUS',
  /** Admin adjustment */
  ADMIN: 'ADMIN',
} as const;

export type TopupMethod = (typeof TOPUP_METHOD)[keyof typeof TOPUP_METHOD];

// ============================================================================
// Terminal Types
// ============================================================================

/**
 * Types of cashless terminals
 */
export const TERMINAL_TYPE = {
  /** Point of sale for purchases */
  POS: 'POS',
  /** Topup-only terminal */
  TOPUP: 'TOPUP',
  /** Multi-function terminal */
  MULTI: 'MULTI',
  /** Mobile app as terminal */
  MOBILE: 'MOBILE',
  /** Self-service kiosk */
  KIOSK: 'KIOSK',
  /** Refund terminal */
  REFUND: 'REFUND',
  /** Balance check only */
  CHECK: 'CHECK',
} as const;

export type TerminalType = (typeof TERMINAL_TYPE)[keyof typeof TERMINAL_TYPE];

/**
 * Terminal status
 */
export const TERMINAL_STATUS = {
  /** Terminal is online and operational */
  ONLINE: 'ONLINE',
  /** Terminal is offline (no connection) */
  OFFLINE: 'OFFLINE',
  /** Terminal in maintenance mode */
  MAINTENANCE: 'MAINTENANCE',
  /** Terminal is disabled */
  DISABLED: 'DISABLED',
  /** Terminal has error */
  ERROR: 'ERROR',
} as const;

export type TerminalStatus = (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS];

// ============================================================================
// Cashless Limits and Configuration
// ============================================================================

/**
 * Cashless system limits (in cents for amounts)
 */
export const CASHLESS_LIMITS = {
  /** Minimum topup amount in cents (5 EUR) */
  MIN_TOPUP_AMOUNT: 500,
  /** Maximum topup amount in cents (500 EUR) */
  MAX_TOPUP_AMOUNT: 50000,
  /** Maximum balance in cents (1000 EUR) */
  MAX_BALANCE: 100000,
  /** Minimum purchase amount in cents (0.01 EUR) */
  MIN_PURCHASE_AMOUNT: 1,
  /** Maximum purchase amount in cents (500 EUR) */
  MAX_PURCHASE_AMOUNT: 50000,
  /** Minimum transfer amount in cents (1 EUR) */
  MIN_TRANSFER_AMOUNT: 100,
  /** Maximum transfer amount in cents (200 EUR) */
  MAX_TRANSFER_AMOUNT: 20000,
  /** Default withdrawal fee in cents */
  DEFAULT_WITHDRAWAL_FEE: 0,
  /** Maximum offline transactions before sync required */
  MAX_OFFLINE_TRANSACTIONS: 100,
  /** Offline transaction timeout in hours */
  OFFLINE_TIMEOUT_HOURS: 24,
  /** PIN attempts before lockout */
  MAX_PIN_ATTEMPTS: 3,
  /** PIN lockout duration in minutes */
  PIN_LOCKOUT_MINUTES: 30,
  /** Days after festival to claim refund */
  REFUND_CLAIM_DAYS: 30,
  /** Minimum balance for refund in cents (1 EUR) */
  MIN_REFUND_BALANCE: 100,
} as const;

/**
 * Default cashless configuration
 */
export const CASHLESS_DEFAULTS = {
  /** Default currency */
  CURRENCY: 'EUR',
  /** Allow negative balance */
  ALLOW_NEGATIVE_BALANCE: false,
  /** Default credit limit if negative allowed */
  CREDIT_LIMIT: 0,
  /** Require PIN for transactions */
  REQUIRE_PIN: false,
  /** PIN required threshold in cents (50 EUR) */
  PIN_THRESHOLD: 5000,
  /** Auto-refund remaining balance */
  AUTO_REFUND: true,
  /** Show balance after transaction */
  SHOW_BALANCE: true,
  /** Allow tips */
  ALLOW_TIPS: true,
  /** Maximum tip percentage */
  MAX_TIP_PERCENTAGE: 30,
  /** Allow transfers between accounts */
  ALLOW_TRANSFERS: false,
} as const;

// ============================================================================
// NFC Configuration
// ============================================================================

/**
 * NFC tag configuration
 */
export const NFC_CONFIG = {
  /** NFC tag ID minimum length */
  TAG_ID_MIN_LENGTH: 8,
  /** NFC tag ID maximum length */
  TAG_ID_MAX_LENGTH: 20,
  /** NFC read timeout in ms */
  READ_TIMEOUT_MS: 3000,
  /** NFC write timeout in ms */
  WRITE_TIMEOUT_MS: 5000,
  /** Tag detection debounce in ms */
  DETECTION_DEBOUNCE_MS: 500,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
} as const;

/**
 * Supported NFC tag types
 */
export const NFC_TAG_TYPES = {
  /** MIFARE Classic */
  MIFARE_CLASSIC: 'MIFARE_CLASSIC',
  /** MIFARE Ultralight */
  MIFARE_ULTRALIGHT: 'MIFARE_ULTRALIGHT',
  /** MIFARE DESFire */
  MIFARE_DESFIRE: 'MIFARE_DESFIRE',
  /** NTAG series */
  NTAG: 'NTAG',
  /** ISO 14443-4A */
  ISO14443_4A: 'ISO14443_4A',
  /** Unknown type */
  UNKNOWN: 'UNKNOWN',
} as const;

export type NfcTagType = (typeof NFC_TAG_TYPES)[keyof typeof NFC_TAG_TYPES];

// ============================================================================
// Offline Sync
// ============================================================================

/**
 * Offline sync status
 */
export const OFFLINE_SYNC_STATUS = {
  /** Pending sync */
  PENDING: 'PENDING',
  /** Currently syncing */
  SYNCING: 'SYNCING',
  /** Successfully synced */
  SYNCED: 'SYNCED',
  /** Sync failed */
  FAILED: 'FAILED',
  /** Conflict detected */
  CONFLICT: 'CONFLICT',
} as const;

export type OfflineSyncStatus = (typeof OFFLINE_SYNC_STATUS)[keyof typeof OFFLINE_SYNC_STATUS];

/**
 * Offline sync configuration
 */
export const OFFLINE_SYNC_CONFIG = {
  /** Auto-sync interval in seconds */
  AUTO_SYNC_INTERVAL_SECONDS: 30,
  /** Max time offline before warning in minutes */
  OFFLINE_WARNING_MINUTES: 5,
  /** Max time offline before blocking in minutes */
  OFFLINE_BLOCK_MINUTES: 60,
  /** Batch size for sync */
  SYNC_BATCH_SIZE: 50,
  /** Retry delay in ms */
  RETRY_DELAY_MS: 5000,
} as const;

// ============================================================================
// Receipt/Notification
// ============================================================================

/**
 * Receipt types
 */
export const RECEIPT_TYPE = {
  /** Digital receipt via email */
  EMAIL: 'EMAIL',
  /** SMS receipt */
  SMS: 'SMS',
  /** Print receipt */
  PRINT: 'PRINT',
  /** In-app notification */
  IN_APP: 'IN_APP',
  /** No receipt */
  NONE: 'NONE',
} as const;

export type ReceiptType = (typeof RECEIPT_TYPE)[keyof typeof RECEIPT_TYPE];

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Cashless-specific error codes
 */
export const CASHLESS_ERROR_CODES = {
  /** Insufficient balance */
  INSUFFICIENT_BALANCE: 'CASHLESS_INSUFFICIENT_BALANCE',
  /** Account not found */
  ACCOUNT_NOT_FOUND: 'CASHLESS_ACCOUNT_NOT_FOUND',
  /** Account suspended */
  ACCOUNT_SUSPENDED: 'CASHLESS_ACCOUNT_SUSPENDED',
  /** Account blocked */
  ACCOUNT_BLOCKED: 'CASHLESS_ACCOUNT_BLOCKED',
  /** Invalid PIN */
  INVALID_PIN: 'CASHLESS_INVALID_PIN',
  /** PIN locked */
  PIN_LOCKED: 'CASHLESS_PIN_LOCKED',
  /** NFC tag not found */
  TAG_NOT_FOUND: 'CASHLESS_TAG_NOT_FOUND',
  /** NFC tag blocked */
  TAG_BLOCKED: 'CASHLESS_TAG_BLOCKED',
  /** Amount exceeds limit */
  AMOUNT_EXCEEDS_LIMIT: 'CASHLESS_AMOUNT_EXCEEDS_LIMIT',
  /** Amount below minimum */
  AMOUNT_BELOW_MINIMUM: 'CASHLESS_AMOUNT_BELOW_MINIMUM',
  /** Balance would exceed maximum */
  BALANCE_EXCEEDS_MAX: 'CASHLESS_BALANCE_EXCEEDS_MAX',
  /** Terminal offline */
  TERMINAL_OFFLINE: 'CASHLESS_TERMINAL_OFFLINE',
  /** Terminal disabled */
  TERMINAL_DISABLED: 'CASHLESS_TERMINAL_DISABLED',
  /** Vendor not authorized */
  VENDOR_NOT_AUTHORIZED: 'CASHLESS_VENDOR_NOT_AUTHORIZED',
  /** Transaction already exists */
  DUPLICATE_TRANSACTION: 'CASHLESS_DUPLICATE_TRANSACTION',
  /** Transaction not found */
  TRANSACTION_NOT_FOUND: 'CASHLESS_TRANSACTION_NOT_FOUND',
  /** Cannot refund */
  REFUND_NOT_ALLOWED: 'CASHLESS_REFUND_NOT_ALLOWED',
  /** Offline limit exceeded */
  OFFLINE_LIMIT_EXCEEDED: 'CASHLESS_OFFLINE_LIMIT_EXCEEDED',
  /** Sync failed */
  SYNC_FAILED: 'CASHLESS_SYNC_FAILED',
  /** NFC read error */
  NFC_READ_ERROR: 'CASHLESS_NFC_READ_ERROR',
  /** NFC write error */
  NFC_WRITE_ERROR: 'CASHLESS_NFC_WRITE_ERROR',
} as const;

export type CashlessErrorCode = (typeof CASHLESS_ERROR_CODES)[keyof typeof CASHLESS_ERROR_CODES];
