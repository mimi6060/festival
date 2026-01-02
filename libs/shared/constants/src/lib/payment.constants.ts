/**
 * Payment-related Constants
 * @module @festival/constants/payment
 */

/**
 * Supported currencies with ISO 4217 codes
 */
export const CURRENCIES = {
  /** Euro - Primary currency */
  EUR: 'EUR',
  /** US Dollar */
  USD: 'USD',
  /** British Pound */
  GBP: 'GBP',
  /** Swiss Franc */
  CHF: 'CHF',
  /** Canadian Dollar */
  CAD: 'CAD',
  /** Australian Dollar */
  AUD: 'AUD',
  /** Japanese Yen */
  JPY: 'JPY',
  /** Swedish Krona */
  SEK: 'SEK',
  /** Norwegian Krone */
  NOK: 'NOK',
  /** Danish Krone */
  DKK: 'DKK',
  /** Polish Zloty */
  PLN: 'PLN',
  /** Czech Koruna */
  CZK: 'CZK',
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

/**
 * Default currency for the platform
 */
export const DEFAULT_CURRENCY = CURRENCIES.EUR;

/**
 * Currency configuration with symbols and decimal places
 */
export const CURRENCY_CONFIG: Record<Currency, {
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}> = {
  [CURRENCIES.EUR]: {
    symbol: '\u20AC',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  [CURRENCIES.USD]: {
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  [CURRENCIES.GBP]: {
    symbol: '\u00A3',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  [CURRENCIES.CHF]: {
    symbol: 'CHF',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: "'",
    decimalSeparator: '.',
  },
  [CURRENCIES.CAD]: {
    symbol: 'CA$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  [CURRENCIES.AUD]: {
    symbol: 'A$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  [CURRENCIES.JPY]: {
    symbol: '\u00A5',
    symbolPosition: 'before',
    decimalPlaces: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  [CURRENCIES.SEK]: {
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  [CURRENCIES.NOK]: {
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  [CURRENCIES.DKK]: {
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  [CURRENCIES.PLN]: {
    symbol: 'z\u0142',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  [CURRENCIES.CZK]: {
    symbol: 'K\u010D',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
} as const;

/**
 * Payment methods/providers
 */
export const PAYMENT_METHODS = {
  /** Credit/Debit card via Stripe */
  CARD: 'CARD',
  /** Stripe checkout session */
  STRIPE_CHECKOUT: 'STRIPE_CHECKOUT',
  /** Apple Pay */
  APPLE_PAY: 'APPLE_PAY',
  /** Google Pay */
  GOOGLE_PAY: 'GOOGLE_PAY',
  /** PayPal */
  PAYPAL: 'PAYPAL',
  /** Bank transfer/wire */
  BANK_TRANSFER: 'BANK_TRANSFER',
  /** SEPA Direct Debit */
  SEPA: 'SEPA',
  /** iDEAL (Netherlands) */
  IDEAL: 'IDEAL',
  /** Bancontact (Belgium) */
  BANCONTACT: 'BANCONTACT',
  /** Giropay (Germany) */
  GIROPAY: 'GIROPAY',
  /** Sofort (Germany) */
  SOFORT: 'SOFORT',
  /** Klarna (Buy now, pay later) */
  KLARNA: 'KLARNA',
  /** Cashless/prepaid balance */
  CASHLESS: 'CASHLESS',
  /** Cash on site */
  CASH: 'CASH',
  /** Free/complimentary ticket */
  FREE: 'FREE',
  /** Voucher/promo code */
  VOUCHER: 'VOUCHER',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

/**
 * Payment status lifecycle
 */
export const PAYMENT_STATUS = {
  /** Payment initiated */
  PENDING: 'PENDING',
  /** Payment being processed */
  PROCESSING: 'PROCESSING',
  /** Awaiting 3D Secure authentication */
  AWAITING_AUTH: 'AWAITING_AUTH',
  /** Payment succeeded */
  SUCCEEDED: 'SUCCEEDED',
  /** Payment failed */
  FAILED: 'FAILED',
  /** Payment cancelled by user */
  CANCELLED: 'CANCELLED',
  /** Payment refunded (full) */
  REFUNDED: 'REFUNDED',
  /** Payment partially refunded */
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  /** Payment disputed/chargeback */
  DISPUTED: 'DISPUTED',
  /** Dispute won */
  DISPUTE_WON: 'DISPUTE_WON',
  /** Dispute lost */
  DISPUTE_LOST: 'DISPUTE_LOST',
  /** Payment expired (session timeout) */
  EXPIRED: 'EXPIRED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Stripe-specific configuration
 */
export const STRIPE_CONFIG = {
  /** API version to use */
  API_VERSION: '2024-12-18.acacia' as const,
  /** Checkout session expiration in seconds (30 minutes) */
  CHECKOUT_EXPIRATION_SECONDS: 30 * 60,
  /** Payment intent confirmation timeout in seconds */
  CONFIRMATION_TIMEOUT_SECONDS: 300,
  /** Webhook tolerance window in seconds */
  WEBHOOK_TOLERANCE_SECONDS: 300,
  /** Supported payment method types */
  SUPPORTED_PAYMENT_METHODS: [
    'card',
    'apple_pay',
    'google_pay',
    'sepa_debit',
    'ideal',
    'bancontact',
    'giropay',
    'sofort',
    'klarna',
  ] as const,
  /** Supported card brands */
  SUPPORTED_CARD_BRANDS: [
    'visa',
    'mastercard',
    'amex',
    'discover',
    'diners',
    'jcb',
    'unionpay',
  ] as const,
  /** Metadata key prefix */
  METADATA_PREFIX: 'festival_',
  /** Maximum metadata key length */
  MAX_METADATA_KEY_LENGTH: 40,
  /** Maximum metadata value length */
  MAX_METADATA_VALUE_LENGTH: 500,
} as const;

/**
 * Refund policies
 */
export const REFUND_POLICY = {
  /** Full refund period before event (days) */
  FULL_REFUND_DAYS: 14,
  /** Partial refund period before event (days) */
  PARTIAL_REFUND_DAYS: 7,
  /** Partial refund percentage */
  PARTIAL_REFUND_PERCENT: 50,
  /** No refund period before event (days) */
  NO_REFUND_DAYS: 3,
  /** Admin fee for refund processing (percentage) */
  REFUND_FEE_PERCENT: 5,
  /** Minimum refund amount (in smallest currency unit) */
  MIN_REFUND_AMOUNT: 100,
  /** Maximum refund processing time (days) */
  MAX_REFUND_PROCESSING_DAYS: 10,
} as const;

/**
 * Refund status
 */
export const REFUND_STATUS = {
  /** Refund requested */
  PENDING: 'PENDING',
  /** Refund being processed */
  PROCESSING: 'PROCESSING',
  /** Refund approved */
  APPROVED: 'APPROVED',
  /** Refund completed */
  COMPLETED: 'COMPLETED',
  /** Refund rejected */
  REJECTED: 'REJECTED',
  /** Refund failed */
  FAILED: 'FAILED',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

/**
 * Cashless/prepaid wallet configuration
 */
export const CASHLESS_CONFIG = {
  /** Minimum top-up amount (in cents) */
  MIN_TOPUP_AMOUNT: 500,
  /** Maximum top-up amount (in cents) */
  MAX_TOPUP_AMOUNT: 50000,
  /** Maximum wallet balance (in cents) */
  MAX_BALANCE: 100000,
  /** Top-up amounts for quick select (in cents) */
  TOPUP_PRESETS: [1000, 2000, 3000, 5000, 10000] as const,
  /** Minimum payment amount (in cents) */
  MIN_PAYMENT_AMOUNT: 50,
  /** Maximum payment amount (in cents) */
  MAX_PAYMENT_AMOUNT: 50000,
  /** Minimum transfer amount (in cents) */
  MIN_TRANSFER_AMOUNT: 100,
  /** Days to claim refund after festival */
  REFUND_CLAIM_DAYS: 30,
  /** Minimum balance for refund (in cents) */
  MIN_REFUND_BALANCE: 100,
  /** NFC tag activation code length */
  NFC_ACTIVATION_CODE_LENGTH: 8,
  /** Transaction history limit */
  TRANSACTION_HISTORY_LIMIT: 100,
} as const;

/**
 * Cashless transaction types
 */
export const CASHLESS_TRANSACTION_TYPE = {
  /** Initial top-up */
  TOPUP: 'TOPUP',
  /** Payment to vendor */
  PAYMENT: 'PAYMENT',
  /** Refund from vendor */
  REFUND: 'REFUND',
  /** Transfer to another user */
  TRANSFER_OUT: 'TRANSFER_OUT',
  /** Transfer from another user */
  TRANSFER_IN: 'TRANSFER_IN',
  /** Final cashout/withdrawal */
  CASHOUT: 'CASHOUT',
  /** Adjustment (admin) */
  ADJUSTMENT: 'ADJUSTMENT',
  /** Bonus credit */
  BONUS: 'BONUS',
  /** Correction */
  CORRECTION: 'CORRECTION',
} as const;

export type CashlessTransactionType = (typeof CASHLESS_TRANSACTION_TYPE)[keyof typeof CASHLESS_TRANSACTION_TYPE];

/**
 * Payment limits
 */
export const PAYMENT_LIMITS = {
  /** Minimum payment amount (in cents) */
  MIN_AMOUNT: 100,
  /** Maximum single payment amount (in cents) */
  MAX_AMOUNT: 10000000,
  /** Maximum daily payment volume per user (in cents) */
  MAX_DAILY_VOLUME: 50000000,
  /** Maximum number of payments per day per user */
  MAX_DAILY_TRANSACTIONS: 50,
  /** Card payment minimum */
  CARD_MIN_AMOUNT: 50,
  /** SEPA minimum */
  SEPA_MIN_AMOUNT: 100,
} as const;

/**
 * Invoice configuration
 */
export const INVOICE_CONFIG = {
  /** Invoice number prefix */
  PREFIX: 'INV',
  /** Invoice number padding (e.g., INV-00001) */
  NUMBER_PADDING: 5,
  /** Payment due days for bank transfer */
  DUE_DAYS: 14,
  /** Supported invoice formats */
  FORMATS: ['PDF', 'HTML'] as const,
  /** VAT rates by country (percentage) */
  VAT_RATES: {
    FR: 20,
    DE: 19,
    BE: 21,
    NL: 21,
    ES: 21,
    IT: 22,
    UK: 20,
    CH: 7.7,
    AT: 20,
    PT: 23,
    IE: 23,
    LU: 17,
  } as const,
  /** Default VAT rate */
  DEFAULT_VAT_RATE: 20,
  /** Reduced VAT rate for tickets (France) */
  REDUCED_VAT_RATE: 5.5,
} as const;

/**
 * Promo code / voucher configuration
 */
export const PROMO_CONFIG = {
  /** Minimum code length */
  MIN_CODE_LENGTH: 4,
  /** Maximum code length */
  MAX_CODE_LENGTH: 20,
  /** Maximum uses per code (0 = unlimited) */
  DEFAULT_MAX_USES: 0,
  /** Maximum uses per user per code */
  MAX_USES_PER_USER: 1,
  /** Code characters allowed */
  CODE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  /** Generated code length */
  GENERATED_CODE_LENGTH: 8,
} as const;

/**
 * Discount types
 */
export const DISCOUNT_TYPES = {
  /** Fixed amount off */
  FIXED: 'FIXED',
  /** Percentage off */
  PERCENTAGE: 'PERCENTAGE',
  /** Buy X get Y free */
  BUY_X_GET_Y: 'BUY_X_GET_Y',
  /** Free shipping/delivery */
  FREE_DELIVERY: 'FREE_DELIVERY',
} as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];
