/**
 * Unit tests for payment validation schemas
 */

import {
  paymentStatusEnum,
  paymentProviderEnum,
  paymentMethodTypeEnum,
  refundStatusEnum,
  refundReasonEnum,
  transactionTypeEnum,
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
} from './payment.schema';

describe('payment.schema', () => {
  // ============================================================================
  // Enums
  // ============================================================================

  describe('paymentStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const statuses = [
        'pending', 'processing', 'succeeded', 'failed', 'cancelled',
        'refunded', 'partially_refunded', 'disputed', 'expired',
      ];
      statuses.forEach((status) => {
        const result = paymentStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = paymentStatusEnum.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('paymentProviderEnum', () => {
    it('should accept all valid providers', () => {
      const providers = [
        'stripe', 'paypal', 'apple_pay', 'google_pay',
        'bank_transfer', 'cash', 'cashless', 'free',
      ];
      providers.forEach((provider) => {
        const result = paymentProviderEnum.safeParse(provider);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('paymentMethodTypeEnum', () => {
    it('should accept all valid method types', () => {
      const types = [
        'card', 'sepa_debit', 'ideal', 'bancontact', 'giropay',
        'sofort', 'eps', 'przelewy24', 'apple_pay', 'google_pay',
        'paypal', 'bank_transfer', 'cash',
      ];
      types.forEach((type) => {
        const result = paymentMethodTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('refundStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const statuses = ['pending', 'processing', 'succeeded', 'failed', 'cancelled'];
      statuses.forEach((status) => {
        const result = refundStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('refundReasonEnum', () => {
    it('should accept all valid reasons', () => {
      const reasons = [
        'requested_by_customer', 'duplicate', 'fraudulent',
        'event_cancelled', 'event_postponed', 'product_unacceptable', 'other',
      ];
      reasons.forEach((reason) => {
        const result = refundReasonEnum.safeParse(reason);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('transactionTypeEnum', () => {
    it('should accept all valid types', () => {
      const types = [
        'purchase', 'refund', 'partial_refund', 'topup',
        'withdrawal', 'transfer', 'fee', 'adjustment', 'payout',
      ];
      types.forEach((type) => {
        const result = transactionTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // Card Schema
  // ============================================================================

  describe('cardSchema', () => {
    const validCard = {
      number: '4242424242424242',
      expiryMonth: 12,
      expiryYear: 2028,
      cvc: '123',
      holderName: 'Jean Dupont',
    };

    it('should accept valid card', () => {
      const result = cardSchema.safeParse(validCard);
      expect(result.success).toBe(true);
    });

    it('should trim holder name', () => {
      const result = cardSchema.safeParse({
        ...validCard,
        holderName: '  Jean Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.holderName).toBe('Jean Dupont');
      }
    });

    it('should reject card number too short', () => {
      const result = cardSchema.safeParse({ ...validCard, number: '424242424242' });
      expect(result.success).toBe(false);
    });

    it('should reject card number too long', () => {
      const result = cardSchema.safeParse({ ...validCard, number: '42424242424242424242' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric card number', () => {
      const result = cardSchema.safeParse({ ...validCard, number: '4242-4242-4242-4242' });
      expect(result.success).toBe(false);
    });

    it('should reject expiryMonth less than 1', () => {
      const result = cardSchema.safeParse({ ...validCard, expiryMonth: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject expiryMonth greater than 12', () => {
      const result = cardSchema.safeParse({ ...validCard, expiryMonth: 13 });
      expect(result.success).toBe(false);
    });

    it('should reject expiryYear in the past', () => {
      const result = cardSchema.safeParse({ ...validCard, expiryYear: 2020 });
      expect(result.success).toBe(false);
    });

    it('should reject CVC too short', () => {
      const result = cardSchema.safeParse({ ...validCard, cvc: '12' });
      expect(result.success).toBe(false);
    });

    it('should reject CVC too long', () => {
      const result = cardSchema.safeParse({ ...validCard, cvc: '12345' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric CVC', () => {
      const result = cardSchema.safeParse({ ...validCard, cvc: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should accept 4-digit CVC (Amex)', () => {
      const result = cardSchema.safeParse({ ...validCard, cvc: '1234' });
      expect(result.success).toBe(true);
    });

    it('should reject empty holder name', () => {
      const result = cardSchema.safeParse({ ...validCard, holderName: '' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Billing Address Schema
  // ============================================================================

  describe('billingAddressSchema', () => {
    const validAddress = {
      line1: '10 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
    };

    it('should accept valid address', () => {
      const result = billingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept address with optional fields', () => {
      const result = billingAddressSchema.safeParse({
        ...validAddress,
        line2: 'Apt 5B',
        state: 'Ile-de-France',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty line1', () => {
      const result = billingAddressSchema.safeParse({ ...validAddress, line1: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty city', () => {
      const result = billingAddressSchema.safeParse({ ...validAddress, city: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty postal code', () => {
      const result = billingAddressSchema.safeParse({ ...validAddress, postalCode: '' });
      expect(result.success).toBe(false);
    });

    it('should reject country code with wrong length', () => {
      const result = billingAddressSchema.safeParse({ ...validAddress, country: 'FRA' });
      expect(result.success).toBe(false);
    });

    it('should reject line1 too long', () => {
      const result = billingAddressSchema.safeParse({ ...validAddress, line1: 'A'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Create Payment Intent Schema
  // ============================================================================

  describe('createPaymentIntentSchema', () => {
    const validIntent = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 5000,
      paymentMethodType: 'card',
    };

    it('should accept valid payment intent', () => {
      const result = createPaymentIntentSchema.safeParse(validIntent);
      expect(result.success).toBe(true);
    });

    it('should provide default currency EUR', () => {
      const result = createPaymentIntentSchema.safeParse(validIntent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
      }
    });

    it('should accept all optional fields', () => {
      const result = createPaymentIntentSchema.safeParse({
        ...validIntent,
        description: 'Festival tickets purchase',
        statementDescriptor: 'FESTIVAL TICKETS',
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        returnUrl: 'https://example.com/return',
        setupFutureUsage: 'on_session',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = createPaymentIntentSchema.safeParse({ ...validIntent, amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept zero amount', () => {
      const result = createPaymentIntentSchema.safeParse({ ...validIntent, amount: 0 });
      expect(result.success).toBe(true);
    });

    it('should reject non-integer amount', () => {
      const result = createPaymentIntentSchema.safeParse({ ...validIntent, amount: 49.99 });
      expect(result.success).toBe(false);
    });

    it('should reject statement descriptor too long (>22 chars)', () => {
      const result = createPaymentIntentSchema.safeParse({
        ...validIntent,
        statementDescriptor: 'A'.repeat(23),
      });
      expect(result.success).toBe(false);
    });

    it('should reject statement descriptor with invalid characters', () => {
      const result = createPaymentIntentSchema.safeParse({
        ...validIntent,
        statementDescriptor: 'FESTIVAL@TICKETS!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid setupFutureUsage', () => {
      const result = createPaymentIntentSchema.safeParse({
        ...validIntent,
        setupFutureUsage: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Confirm Payment Schema
  // ============================================================================

  describe('confirmPaymentSchema', () => {
    it('should accept valid confirm payment request', () => {
      const result = confirmPaymentSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const result = confirmPaymentSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
        paymentMethodId: 'pm_1234567890',
        returnUrl: 'https://example.com/return',
        receiptEmail: 'customer@example.com',
        billingAddress: {
          line1: '10 Rue de Rivoli',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty paymentIntentId', () => {
      const result = confirmPaymentSchema.safeParse({ paymentIntentId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid returnUrl', () => {
      const result = confirmPaymentSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
        returnUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Process Card Payment Schema
  // ============================================================================

  describe('processCardPaymentSchema', () => {
    const validPayment = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      orderId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 5000,
      card: {
        number: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2028,
        cvc: '123',
        holderName: 'Jean Dupont',
      },
      billingAddress: {
        line1: '10 Rue de Rivoli',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      },
      email: 'customer@example.com',
    };

    it('should accept valid card payment', () => {
      const result = processCardPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = processCardPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
        expect(result.data.saveCard).toBe(false);
      }
    });

    it('should accept optional fields', () => {
      const result = processCardPaymentSchema.safeParse({
        ...validPayment,
        description: 'Festival ticket purchase',
        saveCard: true,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = processCardPaymentSchema.safeParse({
        ...validPayment,
        email: 'CUSTOMER@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('customer@example.com');
      }
    });
  });

  // ============================================================================
  // Create Refund Schema
  // ============================================================================

  describe('createRefundSchema', () => {
    const validRefund = {
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'requested_by_customer',
    };

    it('should accept valid refund', () => {
      const result = createRefundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
    });

    it('should default notifyCustomer to true', () => {
      const result = createRefundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyCustomer).toBe(true);
      }
    });

    it('should accept partial refund amount', () => {
      const result = createRefundSchema.safeParse({
        ...validRefund,
        amount: 2500,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const result = createRefundSchema.safeParse({
        ...validRefund,
        amount: 2500,
        reasonDetails: 'Customer requested cancellation',
        notifyCustomer: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid reason', () => {
      const result = createRefundSchema.safeParse({ ...validRefund, reason: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject reason details too long (>1000 chars)', () => {
      const result = createRefundSchema.safeParse({
        ...validRefund,
        reasonDetails: 'A'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Bank Transfer Schema
  // ============================================================================

  describe('bankTransferSchema', () => {
    const validTransfer = {
      iban: 'FR7630006000011234567890189',
      accountHolder: 'Jean Dupont',
    };

    it('should accept valid bank transfer', () => {
      const result = bankTransferSchema.safeParse(validTransfer);
      expect(result.success).toBe(true);
    });

    it('should accept transfer with BIC', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        bic: 'BNPAFRPP',
        reference: 'FESTIVAL-2025',
      });
      expect(result.success).toBe(true);
    });

    it('should transform IBAN to uppercase and remove spaces', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        iban: 'fr76 3000 6000 0112 3456 7890 189',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.iban).toBe('FR7630006000011234567890189');
      }
    });

    it('should reject invalid IBAN format', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        iban: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid IBAN checksum', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        iban: 'FR0030006000011234567890189',
      });
      expect(result.success).toBe(false);
    });

    it('should transform BIC to uppercase', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        bic: 'bnpafrpp',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bic).toBe('BNPAFRPP');
      }
    });

    it('should reject invalid BIC format', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        bic: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should trim account holder name', () => {
      const result = bankTransferSchema.safeParse({
        ...validTransfer,
        accountHolder: '  Jean Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountHolder).toBe('Jean Dupont');
      }
    });
  });

  // ============================================================================
  // Payment Query Schema
  // ============================================================================

  describe('paymentQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = paymentQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept all filter options', () => {
      const result = paymentQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'succeeded',
        provider: 'stripe',
        methodType: 'card',
        minAmount: 1000,
        maxAmount: 50000,
        currency: 'EUR',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        search: 'dupont',
        sortBy: 'createdAt',
        hasRefund: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept arrays for status filter', () => {
      const result = paymentQuerySchema.safeParse({
        status: ['succeeded', 'pending'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept arrays for provider filter', () => {
      const result = paymentQuerySchema.safeParse({
        provider: ['stripe', 'paypal'],
      });
      expect(result.success).toBe(true);
    });

    it('should coerce boolean for hasRefund', () => {
      const result = paymentQuerySchema.safeParse({ hasRefund: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasRefund).toBe(true);
      }
    });

    it('should transform currency to uppercase', () => {
      const result = paymentQuerySchema.safeParse({ currency: 'eur' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
      }
    });
  });

  // ============================================================================
  // Transaction Query Schema
  // ============================================================================

  describe('transactionQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = transactionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = transactionQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        accountId: '550e8400-e29b-41d4-a716-446655440002',
        type: 'purchase',
        minAmount: 100,
        maxAmount: 10000,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        sortBy: 'amount',
      });
      expect(result.success).toBe(true);
    });

    it('should accept arrays for type filter', () => {
      const result = transactionQuerySchema.safeParse({
        type: ['purchase', 'refund', 'topup'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept negative minAmount for debit transactions', () => {
      const result = transactionQuerySchema.safeParse({
        minAmount: -1000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Refund Query Schema
  // ============================================================================

  describe('refundQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = refundQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = refundQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        paymentId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'succeeded',
        reason: 'requested_by_customer',
        minAmount: 0,
        maxAmount: 10000,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        sortBy: 'createdAt',
      });
      expect(result.success).toBe(true);
    });

    it('should accept arrays for status and reason', () => {
      const result = refundQuerySchema.safeParse({
        status: ['pending', 'succeeded'],
        reason: ['requested_by_customer', 'duplicate'],
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Webhook Event Schema
  // ============================================================================

  describe('webhookEventSchema', () => {
    it('should accept valid webhook event', () => {
      const result = webhookEventSchema.safeParse({
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        provider: 'stripe',
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it('should accept webhook with optional fields', () => {
      const result = webhookEventSchema.safeParse({
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        provider: 'stripe',
        data: {},
        timestamp: '2025-07-15T14:30:00Z',
        signature: 'whsec_1234567890',
        rawBody: '{"test": "body"}',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const result = webhookEventSchema.safeParse({
        id: '',
        type: 'payment_intent.succeeded',
        provider: 'stripe',
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty type', () => {
      const result = webhookEventSchema.safeParse({
        id: 'evt_1234567890',
        type: '',
        provider: 'stripe',
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid provider', () => {
      const result = webhookEventSchema.safeParse({
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        provider: 'invalid',
        data: {},
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Create Payout Schema
  // ============================================================================

  describe('createPayoutSchema', () => {
    const validPayout = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100000,
      destination: {
        type: 'bank_account',
        bankAccount: {
          iban: 'FR7630006000011234567890189',
          accountHolder: 'Festival SARL',
        },
      },
    };

    it('should accept valid payout to bank account', () => {
      const result = createPayoutSchema.safeParse(validPayout);
      expect(result.success).toBe(true);
    });

    it('should accept payout to card', () => {
      const result = createPayoutSchema.safeParse({
        ...validPayout,
        destination: {
          type: 'card',
          cardId: 'card_1234567890',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept payout to PayPal', () => {
      const result = createPayoutSchema.safeParse({
        ...validPayout,
        destination: {
          type: 'paypal',
          paypalEmail: 'festival@example.com',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should provide default currency EUR', () => {
      const result = createPayoutSchema.safeParse(validPayout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
      }
    });

    it('should reject bank_account type without bankAccount details', () => {
      const result = createPayoutSchema.safeParse({
        ...validPayout,
        destination: {
          type: 'bank_account',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject card type without cardId', () => {
      const result = createPayoutSchema.safeParse({
        ...validPayout,
        destination: {
          type: 'card',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject paypal type without paypalEmail', () => {
      const result = createPayoutSchema.safeParse({
        ...validPayout,
        destination: {
          type: 'paypal',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Save Payment Method Schema
  // ============================================================================

  describe('savePaymentMethodSchema', () => {
    const validSave = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'card',
      card: {
        tokenId: 'tok_1234567890',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2028,
      },
    };

    it('should accept valid card save', () => {
      const result = savePaymentMethodSchema.safeParse(validSave);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = savePaymentMethodSchema.safeParse(validSave);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isDefault).toBe(false);
      }
    });

    it('should accept SEPA debit', () => {
      const result = savePaymentMethodSchema.safeParse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'sepa_debit',
        sepaDebit: {
          iban: 'FR7630006000011234567890189',
          mandateId: 'md_1234567890',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept billing address and nickname', () => {
      const result = savePaymentMethodSchema.safeParse({
        ...validSave,
        billingAddress: {
          line1: '10 Rue de Rivoli',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
        },
        isDefault: true,
        nickname: 'My Visa Card',
      });
      expect(result.success).toBe(true);
    });

    it('should reject last4 with wrong length', () => {
      const result = savePaymentMethodSchema.safeParse({
        ...validSave,
        card: { ...validSave.card, last4: '42' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject expiryMonth out of range', () => {
      const result = savePaymentMethodSchema.safeParse({
        ...validSave,
        card: { ...validSave.card, expiryMonth: 13 },
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Dispute Response Schema
  // ============================================================================

  describe('disputeResponseSchema', () => {
    it('should accept valid dispute response', () => {
      const result = disputeResponseSchema.safeParse({
        disputeId: 'dp_1234567890',
        evidence: {
          customerName: 'Jean Dupont',
          productDescription: 'Festival ticket for Summer Vibes 2025',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should default submit to false', () => {
      const result = disputeResponseSchema.safeParse({
        disputeId: 'dp_1234567890',
        evidence: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.submit).toBe(false);
      }
    });

    it('should accept all evidence fields', () => {
      const result = disputeResponseSchema.safeParse({
        disputeId: 'dp_1234567890',
        evidence: {
          customerCommunication: 'Email exchange with customer',
          uncategorizedText: 'Additional information',
          accessActivityLog: 'Login and usage logs',
          billingAddress: '10 Rue de Rivoli, Paris',
          cancellationPolicy: 'https://example.com/cancellation',
          cancellationPolicyDisclosure: 'Policy was shown at checkout',
          cancellationRebuttal: 'Customer agreed to terms',
          customerEmailAddress: 'customer@example.com',
          customerName: 'Jean Dupont',
          customerSignature: 'https://example.com/signature.png',
          productDescription: 'Festival ticket',
          receipt: 'https://example.com/receipt.pdf',
          refundPolicy: 'https://example.com/refund',
          refundPolicyDisclosure: 'Policy was displayed',
          refundRefusalExplanation: 'Outside refund window',
          serviceDate: '2025-07-15',
          serviceDocumentation: 'https://example.com/docs',
        },
        submit: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty disputeId', () => {
      const result = disputeResponseSchema.safeParse({
        disputeId: '',
        evidence: {},
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Payment Stats Query Schema
  // ============================================================================

  describe('paymentStatsQuerySchema', () => {
    it('should accept valid stats query', () => {
      const result = paymentStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should default granularity to day', () => {
      const result = paymentStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granularity).toBe('day');
      }
    });

    it('should accept all optional fields', () => {
      const result = paymentStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        granularity: 'hour',
        metrics: ['total_revenue', 'total_transactions', 'average_transaction'],
        groupBy: 'provider',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid metric', () => {
      const result = paymentStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        metrics: ['invalid_metric'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid groupBy', () => {
      const result = paymentStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        groupBy: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Create Invoice Schema
  // ============================================================================

  describe('createInvoiceSchema', () => {
    const validInvoice = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      items: [
        { description: 'VIP Ticket', quantity: 2, unitAmount: 15000 },
      ],
    };

    it('should accept valid invoice', () => {
      const result = createInvoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = createInvoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
        expect(result.data.sendToCustomer).toBe(true);
      }
    });

    it('should accept all optional fields', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        items: [
          { description: 'VIP Ticket', quantity: 2, unitAmount: 15000, taxRate: 20 },
          { description: 'Parking Pass', quantity: 1, unitAmount: 2000 },
        ],
        dueDate: '2025-08-01',
        notes: 'Thank you for your purchase',
        footer: 'Festival SARL - SIRET 123456789',
        taxIdNumber: 'FR12345678901',
        sendToCustomer: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const result = createInvoiceSchema.safeParse({ ...validInvoice, items: [] });
      expect(result.success).toBe(false);
    });

    it('should reject item with empty description', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: '', quantity: 1, unitAmount: 1000 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject item with quantity less than 1', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: 'Ticket', quantity: 0, unitAmount: 1000 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject tax rate above 100', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ description: 'Ticket', quantity: 1, unitAmount: 1000, taxRate: 150 }],
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Send Receipt Schema
  // ============================================================================

  describe('sendReceiptSchema', () => {
    it('should accept valid receipt request', () => {
      const result = sendReceiptSchema.safeParse({
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'customer@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = sendReceiptSchema.safeParse({
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'customer@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.locale).toBe('fr');
        expect(result.data.includeInvoice).toBe(false);
      }
    });

    it('should accept all options', () => {
      const result = sendReceiptSchema.safeParse({
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'customer@example.com',
        locale: 'en',
        includeInvoice: true,
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = sendReceiptSchema.safeParse({
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'CUSTOMER@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('customer@example.com');
      }
    });
  });

  // ============================================================================
  // ID Schemas
  // ============================================================================

  describe('paymentIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = paymentIdSchema.safeParse({
        paymentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = paymentIdSchema.safeParse({ paymentId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('refundIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = refundIdSchema.safeParse({
        refundId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = refundIdSchema.safeParse({ refundId: 'not-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('transactionIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = transactionIdSchema.safeParse({
        transactionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = transactionIdSchema.safeParse({ transactionId: 'bad' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle zero amount payment', () => {
      const result = createPaymentIntentSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0,
        paymentMethodType: 'card',
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in statement descriptor', () => {
      const result = createPaymentIntentSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        paymentMethodType: 'card',
        statementDescriptor: 'FESTIVAL 2025',
      });
      expect(result.success).toBe(true);
    });

    it('should handle long card holder name', () => {
      const result = cardSchema.safeParse({
        number: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2028,
        cvc: '123',
        holderName: 'Jean Pierre Marie Dupont De La Rochefoucauld',
      });
      expect(result.success).toBe(true);
    });

    it('should reject holder name too long (>100 chars)', () => {
      const result = cardSchema.safeParse({
        number: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2028,
        cvc: '123',
        holderName: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
