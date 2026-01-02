/**
 * Ticket Test Fixtures
 *
 * Predefined ticket and payment data for unit and integration tests.
 * Includes various ticket states, payment scenarios, and cashless operations.
 */

import {
  TicketStatus,
  PaymentStatus,
  PaymentProvider,
  TransactionType,
} from '@prisma/client';
import { regularUser, staffUser, cashierUser, adminUser } from './users.fixture';
import { publishedFestival, standardCategory, vipCategory } from './festivals.fixture';

// ============================================================================
// Types
// ============================================================================

export interface TicketFixture {
  id: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  qrCodeData: string;
  status: TicketStatus;
  purchasePrice: number;
  usedAt: Date | null;
  usedByStaffId: string | null;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentFixture {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  providerData: Record<string, unknown> | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashlessAccountFixture {
  id: string;
  userId: string;
  balance: number;
  nfcTagId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashlessTransactionFixture {
  id: string;
  accountId: string;
  festivalId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  paymentId: string | null;
  performedById: string | null;
  createdAt: Date;
}

// ============================================================================
// Ticket Fixtures
// ============================================================================

export const soldTicket: TicketFixture = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: publishedFestival.id,
  categoryId: standardCategory.id,
  userId: regularUser.id,
  qrCode: 'QR-SOLD-ABC123DEF456',
  qrCodeData: JSON.stringify({
    ticketId: 'ticket-uuid-00000000-0000-0000-0000-000000000001',
    festivalId: publishedFestival.id,
    type: 'STANDARD',
    signature: 'mock-signature-sold',
  }),
  status: TicketStatus.SOLD,
  purchasePrice: 149.99,
  usedAt: null,
  usedByStaffId: null,
  paymentId: 'payment-uuid-00000000-0000-0000-0000-000000000001',
  createdAt: new Date('2024-03-01T10:00:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z'),
};

export const usedTicket: TicketFixture = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000002',
  festivalId: publishedFestival.id,
  categoryId: standardCategory.id,
  userId: regularUser.id,
  qrCode: 'QR-USED-GHI789JKL012',
  qrCodeData: JSON.stringify({
    ticketId: 'ticket-uuid-00000000-0000-0000-0000-000000000002',
    festivalId: publishedFestival.id,
    type: 'STANDARD',
    signature: 'mock-signature-used',
  }),
  status: TicketStatus.USED,
  purchasePrice: 149.99,
  usedAt: new Date('2024-07-15T14:30:00Z'),
  usedByStaffId: staffUser.id,
  paymentId: 'payment-uuid-00000000-0000-0000-0000-000000000002',
  createdAt: new Date('2024-03-01T11:00:00Z'),
  updatedAt: new Date('2024-07-15T14:30:00Z'),
};

export const cancelledTicket: TicketFixture = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000003',
  festivalId: publishedFestival.id,
  categoryId: standardCategory.id,
  userId: regularUser.id,
  qrCode: 'QR-CANCELLED-MNO345PQR678',
  qrCodeData: JSON.stringify({
    ticketId: 'ticket-uuid-00000000-0000-0000-0000-000000000003',
    festivalId: publishedFestival.id,
    type: 'STANDARD',
    signature: 'mock-signature-cancelled',
  }),
  status: TicketStatus.CANCELLED,
  purchasePrice: 149.99,
  usedAt: null,
  usedByStaffId: null,
  paymentId: 'payment-uuid-00000000-0000-0000-0000-000000000003',
  createdAt: new Date('2024-02-15T09:00:00Z'),
  updatedAt: new Date('2024-02-20T12:00:00Z'),
};

export const refundedTicket: TicketFixture = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000004',
  festivalId: publishedFestival.id,
  categoryId: vipCategory.id,
  userId: regularUser.id,
  qrCode: 'QR-REFUNDED-STU901VWX234',
  qrCodeData: JSON.stringify({
    ticketId: 'ticket-uuid-00000000-0000-0000-0000-000000000004',
    festivalId: publishedFestival.id,
    type: 'VIP',
    signature: 'mock-signature-refunded',
  }),
  status: TicketStatus.REFUNDED,
  purchasePrice: 399.99,
  usedAt: null,
  usedByStaffId: null,
  paymentId: 'payment-uuid-00000000-0000-0000-0000-000000000004',
  createdAt: new Date('2024-02-01T15:00:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z'),
};

export const vipTicket: TicketFixture = {
  id: 'ticket-uuid-00000000-0000-0000-0000-000000000005',
  festivalId: publishedFestival.id,
  categoryId: vipCategory.id,
  userId: regularUser.id,
  qrCode: 'QR-VIP-YZA567BCD890',
  qrCodeData: JSON.stringify({
    ticketId: 'ticket-uuid-00000000-0000-0000-0000-000000000005',
    festivalId: publishedFestival.id,
    type: 'VIP',
    signature: 'mock-signature-vip',
  }),
  status: TicketStatus.SOLD,
  purchasePrice: 399.99,
  usedAt: null,
  usedByStaffId: null,
  paymentId: 'payment-uuid-00000000-0000-0000-0000-000000000005',
  createdAt: new Date('2024-03-05T16:00:00Z'),
  updatedAt: new Date('2024-03-05T16:00:00Z'),
};

// ============================================================================
// Payment Fixtures
// ============================================================================

export const pendingPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000001',
  userId: regularUser.id,
  amount: 149.99,
  currency: 'EUR',
  status: PaymentStatus.PENDING,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_pending_123456',
  providerData: {
    client_secret: 'pi_pending_123456_secret_abc',
  },
  description: 'Ticket purchase - Standard Pass',
  metadata: {
    ticketCategoryId: standardCategory.id,
    quantity: 1,
  },
  paidAt: null,
  refundedAt: null,
  createdAt: new Date('2024-03-01T09:55:00Z'),
  updatedAt: new Date('2024-03-01T09:55:00Z'),
};

export const processingPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000002',
  userId: regularUser.id,
  amount: 149.99,
  currency: 'EUR',
  status: PaymentStatus.PROCESSING,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_processing_234567',
  providerData: {
    payment_method: 'pm_card_visa',
  },
  description: 'Ticket purchase - Standard Pass',
  metadata: {
    ticketCategoryId: standardCategory.id,
    quantity: 1,
  },
  paidAt: null,
  refundedAt: null,
  createdAt: new Date('2024-03-01T10:55:00Z'),
  updatedAt: new Date('2024-03-01T10:56:00Z'),
};

export const completedPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000003',
  userId: regularUser.id,
  amount: 149.99,
  currency: 'EUR',
  status: PaymentStatus.COMPLETED,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_completed_345678',
  providerData: {
    payment_method: 'pm_card_visa',
    receipt_url: 'https://stripe.com/receipts/test',
  },
  description: 'Ticket purchase - Standard Pass',
  metadata: {
    ticketCategoryId: standardCategory.id,
    quantity: 1,
  },
  paidAt: new Date('2024-03-01T10:00:00Z'),
  refundedAt: null,
  createdAt: new Date('2024-03-01T09:58:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z'),
};

export const failedPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000004',
  userId: regularUser.id,
  amount: 399.99,
  currency: 'EUR',
  status: PaymentStatus.FAILED,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_failed_456789',
  providerData: {
    error: {
      code: 'card_declined',
      message: 'Your card was declined.',
    },
  },
  description: 'Ticket purchase - VIP Pass (Failed)',
  metadata: {
    ticketCategoryId: vipCategory.id,
    quantity: 1,
  },
  paidAt: null,
  refundedAt: null,
  createdAt: new Date('2024-02-28T14:00:00Z'),
  updatedAt: new Date('2024-02-28T14:01:00Z'),
};

export const refundedPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000005',
  userId: regularUser.id,
  amount: 399.99,
  currency: 'EUR',
  status: PaymentStatus.REFUNDED,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_refunded_567890',
  providerData: {
    refund_id: 're_test_refund_123',
    refund_status: 'succeeded',
  },
  description: 'Ticket purchase - VIP Pass (Refunded)',
  metadata: {
    ticketCategoryId: vipCategory.id,
    quantity: 1,
    refundReason: 'Customer request',
  },
  paidAt: new Date('2024-02-01T15:00:00Z'),
  refundedAt: new Date('2024-03-01T10:00:00Z'),
  createdAt: new Date('2024-02-01T14:58:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z'),
};

export const topupPayment: PaymentFixture = {
  id: 'payment-uuid-00000000-0000-0000-0000-000000000006',
  userId: regularUser.id,
  amount: 50.0,
  currency: 'EUR',
  status: PaymentStatus.COMPLETED,
  provider: PaymentProvider.STRIPE,
  providerPaymentId: 'pi_topup_678901',
  providerData: {
    payment_method: 'pm_card_visa',
  },
  description: 'Cashless account top-up',
  metadata: {
    type: 'CASHLESS_TOPUP',
    festivalId: publishedFestival.id,
  },
  paidAt: new Date('2024-03-10T12:00:00Z'),
  refundedAt: null,
  createdAt: new Date('2024-03-10T11:59:00Z'),
  updatedAt: new Date('2024-03-10T12:00:00Z'),
};

// ============================================================================
// Cashless Account Fixtures
// ============================================================================

export const activeCashlessAccount: CashlessAccountFixture = {
  id: 'cashless-uuid-00000000-0000-0000-0000-000000000001',
  userId: regularUser.id,
  balance: 75.5,
  nfcTagId: 'NFC-TAG-001-ABC123',
  isActive: true,
  createdAt: new Date('2024-03-01T00:00:00Z'),
  updatedAt: new Date('2024-03-15T14:30:00Z'),
};

export const emptyCashlessAccount: CashlessAccountFixture = {
  id: 'cashless-uuid-00000000-0000-0000-0000-000000000002',
  userId: 'user-uuid-empty-cashless',
  balance: 0,
  nfcTagId: 'NFC-TAG-002-DEF456',
  isActive: true,
  createdAt: new Date('2024-03-05T00:00:00Z'),
  updatedAt: new Date('2024-03-05T00:00:00Z'),
};

export const inactiveCashlessAccount: CashlessAccountFixture = {
  id: 'cashless-uuid-00000000-0000-0000-0000-000000000003',
  userId: 'user-uuid-inactive-cashless',
  balance: 25.0,
  nfcTagId: 'NFC-TAG-003-GHI789',
  isActive: false,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-15T00:00:00Z'),
};

export const noNfcCashlessAccount: CashlessAccountFixture = {
  id: 'cashless-uuid-00000000-0000-0000-0000-000000000004',
  userId: 'user-uuid-no-nfc',
  balance: 100.0,
  nfcTagId: null,
  isActive: true,
  createdAt: new Date('2024-03-01T00:00:00Z'),
  updatedAt: new Date('2024-03-01T00:00:00Z'),
};

// ============================================================================
// Cashless Transaction Fixtures
// ============================================================================

export const topupTransaction: CashlessTransactionFixture = {
  id: 'transaction-uuid-00000000-0000-0000-0000-000000000001',
  accountId: activeCashlessAccount.id,
  festivalId: publishedFestival.id,
  type: TransactionType.TOPUP,
  amount: 50.0,
  balanceBefore: 25.5,
  balanceAfter: 75.5,
  description: 'Top-up via credit card',
  metadata: {
    paymentMethod: 'card',
  },
  paymentId: topupPayment.id,
  performedById: null,
  createdAt: new Date('2024-03-15T14:30:00Z'),
};

export const paymentTransaction: CashlessTransactionFixture = {
  id: 'transaction-uuid-00000000-0000-0000-0000-000000000002',
  accountId: activeCashlessAccount.id,
  festivalId: publishedFestival.id,
  type: TransactionType.PAYMENT,
  amount: 12.5,
  balanceBefore: 87.5,
  balanceAfter: 75.0,
  description: 'Beer x2 - Festival Bar',
  metadata: {
    vendorId: 'vendor-uuid-bar',
    items: [{ name: 'Beer', quantity: 2, price: 6.25 }],
  },
  paymentId: null,
  performedById: cashierUser.id,
  createdAt: new Date('2024-03-15T18:45:00Z'),
};

export const refundTransaction: CashlessTransactionFixture = {
  id: 'transaction-uuid-00000000-0000-0000-0000-000000000003',
  accountId: activeCashlessAccount.id,
  festivalId: publishedFestival.id,
  type: TransactionType.REFUND,
  amount: 6.25,
  balanceBefore: 75.0,
  balanceAfter: 81.25,
  description: 'Refund - Item unavailable',
  metadata: {
    originalTransactionId: 'transaction-uuid-original',
    reason: 'Item unavailable',
  },
  paymentId: null,
  performedById: cashierUser.id,
  createdAt: new Date('2024-03-15T18:50:00Z'),
};

export const correctionTransaction: CashlessTransactionFixture = {
  id: 'transaction-uuid-00000000-0000-0000-0000-000000000004',
  accountId: activeCashlessAccount.id,
  festivalId: publishedFestival.id,
  type: TransactionType.CORRECTION,
  amount: 5.0,
  balanceBefore: 70.5,
  balanceAfter: 75.5,
  description: 'Manual correction by admin',
  metadata: {
    reason: 'Technical error compensation',
    authorizedBy: adminUser.id,
  },
  paymentId: null,
  performedById: adminUser.id,
  createdAt: new Date('2024-03-15T20:00:00Z'),
};

// ============================================================================
// Collections
// ============================================================================

export const allTicketFixtures: TicketFixture[] = [
  soldTicket,
  usedTicket,
  cancelledTicket,
  refundedTicket,
  vipTicket,
];

export const validTicketFixtures: TicketFixture[] = [
  soldTicket,
  vipTicket,
];

export const allPaymentFixtures: PaymentFixture[] = [
  pendingPayment,
  processingPayment,
  completedPayment,
  failedPayment,
  refundedPayment,
  topupPayment,
];

export const successfulPaymentFixtures: PaymentFixture[] = [
  completedPayment,
  topupPayment,
];

export const allCashlessAccountFixtures: CashlessAccountFixture[] = [
  activeCashlessAccount,
  emptyCashlessAccount,
  inactiveCashlessAccount,
  noNfcCashlessAccount,
];

export const allCashlessTransactionFixtures: CashlessTransactionFixture[] = [
  topupTransaction,
  paymentTransaction,
  refundTransaction,
  correctionTransaction,
];

// ============================================================================
// Stripe Mock Data
// ============================================================================

export const stripeMockPaymentIntent = {
  id: 'pi_test_12345678',
  object: 'payment_intent',
  amount: 14999,
  amount_capturable: 0,
  amount_received: 14999,
  currency: 'eur',
  status: 'succeeded',
  client_secret: 'pi_test_12345678_secret_abcdef',
  created: Math.floor(Date.now() / 1000),
  metadata: {
    userId: regularUser.id,
    ticketCategoryId: standardCategory.id,
    quantity: '1',
  },
  payment_method: 'pm_card_visa',
};

export const stripeMockPaymentIntentFailed = {
  id: 'pi_test_failed_87654321',
  object: 'payment_intent',
  amount: 39999,
  currency: 'eur',
  status: 'requires_payment_method',
  last_payment_error: {
    code: 'card_declined',
    message: 'Your card was declined.',
  },
  created: Math.floor(Date.now() / 1000),
  metadata: {
    userId: regularUser.id,
    ticketCategoryId: vipCategory.id,
    quantity: '1',
  },
};

export const stripeWebhookPayloads = {
  paymentIntentSucceeded: {
    id: 'evt_test_succeeded',
    type: 'payment_intent.succeeded',
    data: {
      object: stripeMockPaymentIntent,
    },
  },
  paymentIntentFailed: {
    id: 'evt_test_failed',
    type: 'payment_intent.payment_failed',
    data: {
      object: stripeMockPaymentIntentFailed,
    },
  },
  refundCreated: {
    id: 'evt_test_refund',
    type: 'refund.created',
    data: {
      object: {
        id: 're_test_refund_123',
        object: 'refund',
        amount: 14999,
        payment_intent: stripeMockPaymentIntent.id,
        status: 'succeeded',
      },
    },
  },
};

// ============================================================================
// Factory Functions
// ============================================================================

let ticketCounter = 0;
let paymentCounter = 0;
let transactionCounter = 0;

/**
 * Creates a unique ticket fixture
 */
export function createTicketFixture(overrides: Partial<TicketFixture> = {}): TicketFixture {
  ticketCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${ticketCounter}`;

  return {
    id: `ticket-uuid-${uniqueId}`,
    festivalId: publishedFestival.id,
    categoryId: standardCategory.id,
    userId: regularUser.id,
    qrCode: `QR-${uniqueId}`,
    qrCodeData: JSON.stringify({
      ticketId: `ticket-uuid-${uniqueId}`,
      festivalId: publishedFestival.id,
      type: 'STANDARD',
      signature: `mock-signature-${uniqueId}`,
    }),
    status: TicketStatus.SOLD,
    purchasePrice: 149.99,
    usedAt: null,
    usedByStaffId: null,
    paymentId: `payment-uuid-${uniqueId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique payment fixture
 */
export function createPaymentFixture(overrides: Partial<PaymentFixture> = {}): PaymentFixture {
  paymentCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${paymentCounter}`;

  return {
    id: `payment-uuid-${uniqueId}`,
    userId: regularUser.id,
    amount: 149.99,
    currency: 'EUR',
    status: PaymentStatus.PENDING,
    provider: PaymentProvider.STRIPE,
    providerPaymentId: `pi_${uniqueId}`,
    providerData: null,
    description: 'Test payment',
    metadata: null,
    paidAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique cashless transaction fixture
 */
export function createCashlessTransactionFixture(
  overrides: Partial<CashlessTransactionFixture> = {},
): CashlessTransactionFixture {
  transactionCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${transactionCounter}`;

  return {
    id: `transaction-uuid-${uniqueId}`,
    accountId: activeCashlessAccount.id,
    festivalId: publishedFestival.id,
    type: TransactionType.TOPUP,
    amount: 50.0,
    balanceBefore: 0,
    balanceAfter: 50.0,
    description: 'Test transaction',
    metadata: null,
    paymentId: null,
    performedById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Input Data
// ============================================================================

export const validTicketPurchaseInput = {
  festivalId: publishedFestival.id,
  categoryId: standardCategory.id,
  quantity: 1,
};

export const invalidTicketPurchaseInputs = {
  soldOutCategory: {
    festivalId: publishedFestival.id,
    categoryId: 'category-uuid-sold-out',
    quantity: 1,
  },
  exceedsMaxPerUser: {
    festivalId: publishedFestival.id,
    categoryId: standardCategory.id,
    quantity: 10, // Exceeds maxPerUser of 4
  },
  invalidFestival: {
    festivalId: 'festival-uuid-nonexistent',
    categoryId: standardCategory.id,
    quantity: 1,
  },
  invalidCategory: {
    festivalId: publishedFestival.id,
    categoryId: 'category-uuid-nonexistent',
    quantity: 1,
  },
  zeroQuantity: {
    festivalId: publishedFestival.id,
    categoryId: standardCategory.id,
    quantity: 0,
  },
  negativeQuantity: {
    festivalId: publishedFestival.id,
    categoryId: standardCategory.id,
    quantity: -1,
  },
};

export const validTopupInput = {
  amount: 50.0,
  festivalId: publishedFestival.id,
};

export const invalidTopupInputs = {
  negativeAmount: {
    amount: -20,
    festivalId: publishedFestival.id,
  },
  zeroAmount: {
    amount: 0,
    festivalId: publishedFestival.id,
  },
  excessiveAmount: {
    amount: 10000, // May exceed limits
    festivalId: publishedFestival.id,
  },
};

export const validCashlessPaymentInput = {
  amount: 12.5,
  festivalId: publishedFestival.id,
  description: 'Food purchase',
};

export const invalidCashlessPaymentInputs = {
  insufficientBalance: {
    amount: 1000, // More than balance
    festivalId: publishedFestival.id,
    description: 'Too expensive',
  },
  negativeAmount: {
    amount: -10,
    festivalId: publishedFestival.id,
    description: 'Invalid',
  },
  inactiveAccount: {
    amount: 10,
    festivalId: publishedFestival.id,
    description: 'Inactive account',
    accountId: inactiveCashlessAccount.id,
  },
};

export const validQrCodeData = {
  qrCode: soldTicket.qrCode,
};

export const invalidQrCodeInputs = {
  alreadyUsed: {
    qrCode: usedTicket.qrCode,
  },
  cancelled: {
    qrCode: cancelledTicket.qrCode,
  },
  refunded: {
    qrCode: refundedTicket.qrCode,
  },
  nonexistent: {
    qrCode: 'QR-NONEXISTENT-123456',
  },
  malformed: {
    qrCode: 'not-a-valid-qr-code',
  },
};
