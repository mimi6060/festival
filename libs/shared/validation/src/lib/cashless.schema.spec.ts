/**
 * Unit tests for cashless validation schemas
 */

import {
  cashlessAccountStatusEnum,
  cashlessAccountTypeEnum,
  nfcTagStatusEnum,
  topupMethodEnum,
  cashlessTransactionTypeEnum,
  cashlessTransactionStatusEnum,
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
} from './cashless.schema';

describe('cashless.schema', () => {
  // ============================================================================
  // Enums
  // ============================================================================

  describe('cashlessAccountStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const statuses = ['active', 'suspended', 'closed', 'pending_activation', 'blocked'];
      statuses.forEach((status) => {
        const result = cashlessAccountStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = cashlessAccountStatusEnum.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('cashlessAccountTypeEnum', () => {
    it('should accept all valid types', () => {
      const types = ['attendee', 'staff', 'vendor', 'vip', 'artist', 'sponsor', 'press'];
      types.forEach((type) => {
        const result = cashlessAccountTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('nfcTagStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const statuses = ['unassigned', 'assigned', 'active', 'lost', 'damaged', 'blocked', 'returned'];
      statuses.forEach((status) => {
        const result = nfcTagStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('topupMethodEnum', () => {
    it('should accept all valid methods', () => {
      const methods = ['card', 'cash', 'bank_transfer', 'apple_pay', 'google_pay', 'paypal', 'ticket_bonus', 'promotional'];
      methods.forEach((method) => {
        const result = topupMethodEnum.safeParse(method);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('cashlessTransactionTypeEnum', () => {
    it('should accept all valid types', () => {
      const types = ['topup', 'purchase', 'refund', 'transfer_in', 'transfer_out', 'correction', 'bonus', 'withdrawal', 'fee', 'expiry'];
      types.forEach((type) => {
        const result = cashlessTransactionTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('cashlessTransactionStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const statuses = ['pending', 'completed', 'failed', 'cancelled', 'reversed'];
      statuses.forEach((status) => {
        const result = cashlessTransactionStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // Create Cashless Account Schema
  // ============================================================================

  describe('createCashlessAccountSchema', () => {
    const validAccount = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid account creation', () => {
      const result = createCashlessAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = createCashlessAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('attendee');
        expect(result.data.initialBalance).toBe(0);
        expect(result.data.currency).toBe('EUR');
        expect(result.data.allowNegativeBalance).toBe(false);
        expect(result.data.creditLimit).toBe(0);
      }
    });

    it('should accept account with all optional fields', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        ticketId: '550e8400-e29b-41d4-a716-446655440002',
        type: 'vip',
        nfcTagId: 'ABCD1234EF125678',
        initialBalance: 5000,
        maxBalance: 50000,
        email: 'user@example.com',
        phone: '+33612345678',
        firstName: 'Jean',
        lastName: 'Dupont',
        pin: '1234',
        allowNegativeBalance: true,
        creditLimit: 10000,
      });
      expect(result.success).toBe(true);
    });

    it('should trim first and last name', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
        expect(result.data.lastName).toBe('Dupont');
      }
    });

    it('should reject invalid festivalId', () => {
      const result = createCashlessAccountSchema.safeParse({ festivalId: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid NFC tag format', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        nfcTagId: 'INVALID!',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid NFC tag format (8-16 hex chars)', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        nfcTagId: 'ABCDEF12',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid PIN format', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        pin: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid 4-digit PIN', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        pin: '0000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative initial balance', () => {
      const result = createCashlessAccountSchema.safeParse({
        ...validAccount,
        initialBalance: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Update Cashless Account Schema
  // ============================================================================

  describe('updateCashlessAccountSchema', () => {
    it('should accept empty update', () => {
      const result = updateCashlessAccountSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = updateCashlessAccountSchema.safeParse({
        status: 'suspended',
        maxBalance: 100000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with phone (required field)', () => {
      const result = updateCashlessAccountSchema.safeParse({
        status: 'active',
        type: 'vip',
        maxBalance: 100000,
        email: 'updated@example.com',
        phone: '+33698765432',
        firstName: 'Updated',
        lastName: 'Name',
        allowNegativeBalance: true,
        creditLimit: 5000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Assign NFC Tag Schema
  // ============================================================================

  describe('assignNfcTagSchema', () => {
    it('should accept valid assignment', () => {
      const result = assignNfcTagSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
      });
      expect(result.success).toBe(true);
    });

    it('should default replacePrevious to false', () => {
      const result = assignNfcTagSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.replacePrevious).toBe(false);
      }
    });

    it('should accept replacePrevious flag', () => {
      const result = assignNfcTagSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
        replacePrevious: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Set PIN Schema
  // ============================================================================

  describe('setPinSchema', () => {
    it('should accept valid PIN setup', () => {
      const result = setPinSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        pin: '1234',
        confirmPin: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched PINs', () => {
      const result = setPinSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        pin: '1234',
        confirmPin: '5678',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric PIN', () => {
      const result = setPinSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        pin: 'ABCD',
        confirmPin: 'ABCD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject PIN with wrong length', () => {
      const result = setPinSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        pin: '123',
        confirmPin: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Verify PIN Schema
  // ============================================================================

  describe('verifyPinSchema', () => {
    it('should accept verification with accountId', () => {
      const result = verifyPinSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        pin: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('should accept verification with nfcTagId', () => {
      const result = verifyPinSchema.safeParse({
        nfcTagId: 'ABCD1234EF125678',
        pin: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('should reject verification without accountId or nfcTagId', () => {
      const result = verifyPinSchema.safeParse({
        pin: '1234',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Topup Schema
  // ============================================================================

  describe('topupSchema', () => {
    const validTopup = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      accountId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 2000,
      method: 'card',
    };

    it('should accept valid topup', () => {
      const result = topupSchema.safeParse(validTopup);
      expect(result.success).toBe(true);
    });

    it('should accept topup with nfcTagId instead of accountId', () => {
      const result = topupSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
        amount: 2000,
        method: 'card',
      });
      expect(result.success).toBe(true);
    });

    it('should default bonusAmount to 0', () => {
      const result = topupSchema.safeParse(validTopup);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bonusAmount).toBe(0);
      }
    });

    it('should accept topup with all optional fields', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        paymentIntentId: 'pi_1234567890',
        terminalId: '550e8400-e29b-41d4-a716-446655440002',
        operatorId: '550e8400-e29b-41d4-a716-446655440003',
        bonusAmount: 500,
        reference: 'TOPUP-001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject amount below minimum (500 cents = 5 EUR)', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        amount: 400,
      });
      expect(result.success).toBe(false);
    });

    it('should reject amount above maximum (50000 cents = 500 EUR)', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        amount: 60000,
      });
      expect(result.success).toBe(false);
    });

    it('should accept minimum amount (500)', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        amount: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum amount (50000)', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        amount: 50000,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-integer amount', () => {
      const result = topupSchema.safeParse({
        ...validTopup,
        amount: 19.99,
      });
      expect(result.success).toBe(false);
    });

    it('should reject topup without accountId or nfcTagId', () => {
      const result = topupSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 2000,
        method: 'card',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Cashless Payment Schema
  // ============================================================================

  describe('cashlessPaymentSchema', () => {
    const validPayment = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      accountId: '550e8400-e29b-41d4-a716-446655440001',
      vendorId: '550e8400-e29b-41d4-a716-446655440002',
      amount: 1500,
    };

    it('should accept valid payment', () => {
      const result = cashlessPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should accept payment with nfcTagId', () => {
      const result = cashlessPaymentSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
        vendorId: '550e8400-e29b-41d4-a716-446655440002',
        amount: 1500,
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = cashlessPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tip).toBe(0);
        expect(result.data.isOffline).toBe(false);
      }
    });

    it('should accept payment with all optional fields', () => {
      const result = cashlessPaymentSchema.safeParse({
        ...validPayment,
        items: [
          { name: 'Beer', quantity: 2, unitPrice: 500, category: 'drinks' },
          { name: 'Hot Dog', quantity: 1, unitPrice: 500 },
        ],
        terminalId: '550e8400-e29b-41d4-a716-446655440003',
        operatorId: '550e8400-e29b-41d4-a716-446655440004',
        pin: '1234',
        tip: 200,
        reference: 'ORDER-001',
        isOffline: true,
        offlineTimestamp: '2025-07-15T14:30:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject amount less than 1', () => {
      const result = cashlessPaymentSchema.safeParse({
        ...validPayment,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer amount', () => {
      const result = cashlessPaymentSchema.safeParse({
        ...validPayment,
        amount: 14.99,
      });
      expect(result.success).toBe(false);
    });

    it('should reject payment without accountId or nfcTagId', () => {
      const result = cashlessPaymentSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        vendorId: '550e8400-e29b-41d4-a716-446655440002',
        amount: 1500,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Cashless Transfer Schema
  // ============================================================================

  describe('cashlessTransferSchema', () => {
    const validTransfer = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      fromAccountId: '550e8400-e29b-41d4-a716-446655440001',
      toAccountId: '550e8400-e29b-41d4-a716-446655440002',
      amount: 1000,
    };

    it('should accept valid transfer', () => {
      const result = cashlessTransferSchema.safeParse(validTransfer);
      expect(result.success).toBe(true);
    });

    it('should accept transfer with NFC tags', () => {
      const result = cashlessTransferSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        fromNfcTagId: 'ABCD1234EF125678',
        toNfcTagId: '5678EF121234ABCD',
        amount: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept transfer with optional fields', () => {
      const result = cashlessTransferSchema.safeParse({
        ...validTransfer,
        pin: '1234',
        reason: 'Splitting bill',
      });
      expect(result.success).toBe(true);
    });

    it('should reject amount below minimum (100 cents = 1 EUR)', () => {
      const result = cashlessTransferSchema.safeParse({
        ...validTransfer,
        amount: 50,
      });
      expect(result.success).toBe(false);
    });

    it('should reject transfer to same account', () => {
      const result = cashlessTransferSchema.safeParse({
        ...validTransfer,
        fromAccountId: '550e8400-e29b-41d4-a716-446655440001',
        toAccountId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject transfer without source account', () => {
      const result = cashlessTransferSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        toAccountId: '550e8400-e29b-41d4-a716-446655440002',
        amount: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject transfer without destination account', () => {
      const result = cashlessTransferSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        fromAccountId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 1000,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Cashless Refund Schema
  // ============================================================================

  describe('cashlessRefundSchema', () => {
    const validRefund = {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'customer_request',
    };

    it('should accept valid refund', () => {
      const result = cashlessRefundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
    });

    it('should accept all valid refund reasons', () => {
      const reasons = [
        'customer_request', 'incorrect_amount', 'product_unavailable',
        'technical_error', 'duplicate_transaction', 'other',
      ];
      reasons.forEach((reason) => {
        const result = cashlessRefundSchema.safeParse({ ...validRefund, reason });
        expect(result.success).toBe(true);
      });
    });

    it('should provide default values', () => {
      const result = cashlessRefundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refundToBalance).toBe(true);
        expect(result.data.notifyUser).toBe(true);
      }
    });

    it('should accept refund with all optional fields', () => {
      const result = cashlessRefundSchema.safeParse({
        ...validRefund,
        amount: 500,
        reasonDetails: 'Product was out of stock',
        operatorId: '550e8400-e29b-41d4-a716-446655440001',
        terminalId: '550e8400-e29b-41d4-a716-446655440002',
        refundToBalance: false,
        notifyUser: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid reason', () => {
      const result = cashlessRefundSchema.safeParse({
        ...validRefund,
        reason: 'invalid_reason',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Withdrawal Schema
  // ============================================================================

  describe('withdrawalSchema', () => {
    const validWithdrawal = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      accountId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 5000,
      method: 'bank_transfer',
      bankDetails: {
        iban: 'FR7630006000011234567890189',
        accountHolder: 'Jean Dupont',
      },
    };

    it('should accept valid withdrawal', () => {
      const result = withdrawalSchema.safeParse(validWithdrawal);
      expect(result.success).toBe(true);
    });

    it('should accept withdrawal with withdrawAll', () => {
      const result = withdrawalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        withdrawAll: true,
        method: 'cash',
      });
      expect(result.success).toBe(true);
    });

    it('should accept withdrawal with nfcTagId', () => {
      const result = withdrawalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
        amount: 5000,
        method: 'cash',
      });
      expect(result.success).toBe(true);
    });

    it('should default fee to 0', () => {
      const result = withdrawalSchema.safeParse(validWithdrawal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fee).toBe(0);
      }
    });

    it('should reject withdrawal without amount or withdrawAll', () => {
      const result = withdrawalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        method: 'cash',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bank transfer without bank details', () => {
      const result = withdrawalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 5000,
        method: 'bank_transfer',
      });
      expect(result.success).toBe(false);
    });

    it('should accept original_payment_method without bank details', () => {
      const result = withdrawalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 5000,
        method: 'original_payment_method',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Balance Correction Schema
  // ============================================================================

  describe('balanceCorrectionSchema', () => {
    const validCorrection = {
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 1000,
      type: 'credit',
      reason: 'technical_error_correction',
      reasonDetails: 'System error caused incorrect balance deduction',
      operatorId: '550e8400-e29b-41d4-a716-446655440001',
    };

    it('should accept valid correction', () => {
      const result = balanceCorrectionSchema.safeParse(validCorrection);
      expect(result.success).toBe(true);
    });

    it('should accept debit correction', () => {
      const result = balanceCorrectionSchema.safeParse({
        ...validCorrection,
        type: 'debit',
        reason: 'fraud_reversal',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid reasons', () => {
      const reasons = [
        'technical_error_correction', 'customer_complaint', 'fraud_reversal',
        'system_reconciliation', 'promotional_credit', 'penalty', 'other',
      ];
      reasons.forEach((reason) => {
        const result = balanceCorrectionSchema.safeParse({ ...validCorrection, reason });
        expect(result.success).toBe(true);
      });
    });

    it('should accept negative amount', () => {
      const result = balanceCorrectionSchema.safeParse({
        ...validCorrection,
        amount: -500,
      });
      expect(result.success).toBe(true);
    });

    it('should reject reasonDetails too short (<10 chars)', () => {
      const result = balanceCorrectionSchema.safeParse({
        ...validCorrection,
        reasonDetails: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reasonDetails too long (>1000 chars)', () => {
      const result = balanceCorrectionSchema.safeParse({
        ...validCorrection,
        reasonDetails: 'A'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional approvedBy', () => {
      const result = balanceCorrectionSchema.safeParse({
        ...validCorrection,
        approvedBy: '550e8400-e29b-41d4-a716-446655440002',
        reference: 'CORR-001',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Register NFC Tags Schema
  // ============================================================================

  describe('registerNfcTagsSchema', () => {
    it('should accept valid tag registration', () => {
      const result = registerNfcTagsSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        tags: [
          { nfcId: 'ABCD1234EF125678' },
          { nfcId: '1234ABCD5678EF01', batchNumber: 'BATCH-001', serialNumber: 'SN-001' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty tags array', () => {
      const result = registerNfcTagsSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        tags: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many tags (>1000)', () => {
      const result = registerNfcTagsSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        tags: Array.from({ length: 1001 }, (_, i) => ({ nfcId: `ABCD1234${i.toString().padStart(8, '0')}` })),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Report Lost NFC Tag Schema
  // ============================================================================

  describe('reportLostNfcTagSchema', () => {
    const validReport = {
      nfcTagId: 'ABCD1234EF125678',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid lost tag report', () => {
      const result = reportLostNfcTagSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('should default blockAccount to true', () => {
      const result = reportLostNfcTagSchema.safeParse(validReport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blockAccount).toBe(true);
        expect(result.data.transferBalanceToNew).toBe(false);
      }
    });

    it('should accept report with balance transfer', () => {
      const result = reportLostNfcTagSchema.safeParse({
        ...validReport,
        transferBalanceToNew: true,
        newNfcTagId: '5678EF121234ABCD',
      });
      expect(result.success).toBe(true);
    });

    it('should reject balance transfer without new tag', () => {
      const result = reportLostNfcTagSchema.safeParse({
        ...validReport,
        transferBalanceToNew: true,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Cashless Account Query Schema
  // ============================================================================

  describe('cashlessAccountQuerySchema', () => {
    it('should require festivalId', () => {
      const result = cashlessAccountQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid query', () => {
      const result = cashlessAccountQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = cashlessAccountQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        type: 'vip',
        minBalance: 1000,
        maxBalance: 50000,
        hasNfcTag: true,
        search: 'dupont',
        sortBy: 'balance',
      });
      expect(result.success).toBe(true);
    });

    it('should accept array of statuses', () => {
      const result = cashlessAccountQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        status: ['active', 'suspended'],
      });
      expect(result.success).toBe(true);
    });

    it('should coerce boolean for hasNfcTag', () => {
      const result = cashlessAccountQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        hasNfcTag: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasNfcTag).toBe(true);
      }
    });
  });

  // ============================================================================
  // Cashless Transaction Query Schema
  // ============================================================================

  describe('cashlessTransactionQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = cashlessTransactionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = cashlessTransactionQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        nfcTagId: 'ABCD1234EF125678',
        vendorId: '550e8400-e29b-41d4-a716-446655440002',
        type: 'purchase',
        status: 'completed',
        minAmount: 100,
        maxAmount: 10000,
        dateFrom: '2025-07-01',
        dateTo: '2025-07-31',
        terminalId: '550e8400-e29b-41d4-a716-446655440003',
        operatorId: '550e8400-e29b-41d4-a716-446655440004',
        isOffline: false,
        sortBy: 'amount',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // NFC Tag Query Schema
  // ============================================================================

  describe('nfcTagQuerySchema', () => {
    it('should require festivalId', () => {
      const result = nfcTagQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid query', () => {
      const result = nfcTagQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = nfcTagQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        batchNumber: 'BATCH-001',
        isAssigned: true,
        search: 'ABCD',
        sortBy: 'assignedAt',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Offline Sync Schema
  // ============================================================================

  describe('offlineSyncSchema', () => {
    const validSync = {
      terminalId: '550e8400-e29b-41d4-a716-446655440000',
      festivalId: '550e8400-e29b-41d4-a716-446655440001',
      transactions: [
        {
          localId: '550e8400-e29b-41d4-a716-446655440002',
          type: 'purchase',
          accountId: '550e8400-e29b-41d4-a716-446655440003',
          amount: 1500,
          timestamp: '2025-07-15T14:30:00Z',
        },
      ],
    };

    it('should accept valid sync', () => {
      const result = offlineSyncSchema.safeParse(validSync);
      expect(result.success).toBe(true);
    });

    it('should accept sync with detailed transactions', () => {
      const result = offlineSyncSchema.safeParse({
        ...validSync,
        transactions: [
          {
            localId: '550e8400-e29b-41d4-a716-446655440002',
            type: 'purchase',
            nfcTagId: 'ABCD1234EF125678',
            amount: 1500,
            vendorId: '550e8400-e29b-41d4-a716-446655440004',
            items: [
              { name: 'Beer', quantity: 2, unitPrice: 500 },
            ],
            timestamp: '2025-07-15T14:30:00Z',
            operatorId: '550e8400-e29b-41d4-a716-446655440005',
            signature: 'abc123',
          },
        ],
        lastSyncTimestamp: '2025-07-15T14:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty transactions array', () => {
      const result = offlineSyncSchema.safeParse({
        ...validSync,
        transactions: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many transactions (>500)', () => {
      const result = offlineSyncSchema.safeParse({
        ...validSync,
        transactions: Array.from({ length: 501 }, (_, i) => ({
          localId: `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
          type: 'purchase',
          accountId: '550e8400-e29b-41d4-a716-446655440003',
          amount: 1000,
          timestamp: '2025-07-15T14:30:00Z',
        })),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Register Terminal Schema
  // ============================================================================

  describe('registerTerminalSchema', () => {
    const validTerminal = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'POS Terminal 1',
      type: 'pos',
    };

    it('should accept valid terminal registration', () => {
      const result = registerTerminalSchema.safeParse(validTerminal);
      expect(result.success).toBe(true);
    });

    it('should accept all terminal types', () => {
      const types = ['pos', 'topup', 'refund', 'mobile', 'kiosk'];
      types.forEach((type) => {
        const result = registerTerminalSchema.safeParse({ ...validTerminal, type });
        expect(result.success).toBe(true);
      });
    });

    it('should accept terminal with all optional fields', () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal,
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        location: {
          zone: 'Food Court',
          description: 'Near main entrance',
          coordinates: { latitude: 48.8566, longitude: 2.3522 },
        },
        deviceInfo: {
          model: 'Sunmi V2',
          osVersion: 'Android 10',
          appVersion: '2.1.0',
          serialNumber: 'SN123456',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should trim terminal name', () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal,
        name: '  POS Terminal 1  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('POS Terminal 1');
      }
    });

    it('should reject empty name', () => {
      const result = registerTerminalSchema.safeParse({
        ...validTerminal,
        name: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Cashless Stats Query Schema
  // ============================================================================

  describe('cashlessStatsQuerySchema', () => {
    it('should accept valid stats query', () => {
      const result = cashlessStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should default granularity to day', () => {
      const result = cashlessStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granularity).toBe('day');
      }
    });

    it('should accept all granularity options', () => {
      const granularities = ['hour', 'day', 'week'];
      granularities.forEach((granularity) => {
        const result = cashlessStatsQuerySchema.safeParse({
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          granularity,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept metrics array', () => {
      const result = cashlessStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        metrics: ['total_topups', 'total_spending', 'average_balance'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const result = cashlessStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-07-01',
        endDate: '2025-07-31',
        granularity: 'hour',
        metrics: ['total_topups', 'spending_by_vendor'],
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        groupBy: 'vendor',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Check Balance Schema
  // ============================================================================

  describe('checkBalanceSchema', () => {
    it('should accept check with accountId', () => {
      const result = checkBalanceSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        festivalId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should accept check with nfcTagId', () => {
      const result = checkBalanceSchema.safeParse({
        nfcTagId: 'ABCD1234EF125678',
        festivalId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should accept check with optional PIN', () => {
      const result = checkBalanceSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        festivalId: '550e8400-e29b-41d4-a716-446655440001',
        pin: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('should reject check without accountId or nfcTagId', () => {
      const result = checkBalanceSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // ID Schemas
  // ============================================================================

  describe('cashlessAccountIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = cashlessAccountIdSchema.safeParse({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = cashlessAccountIdSchema.safeParse({ accountId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('nfcTagIdSchema', () => {
    it('should accept valid NFC ID', () => {
      const result = nfcTagIdSchema.safeParse({
        nfcTagId: 'ABCD1234EF125678',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid NFC ID format', () => {
      const result = nfcTagIdSchema.safeParse({ nfcTagId: 'INVALID!' });
      expect(result.success).toBe(false);
    });
  });

  describe('terminalIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = terminalIdSchema.safeParse({
        terminalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = terminalIdSchema.safeParse({ terminalId: 'not-uuid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle lowercase NFC ID (hex only)', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'abcd1234ef565678',
      });
      expect(result.success).toBe(true);
    });

    it('should handle mixed case NFC ID (hex only)', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'AbCd1234Ef565678',
      });
      expect(result.success).toBe(true);
    });

    it('should handle minimum NFC ID length (8 chars)', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234',
      });
      expect(result.success).toBe(true);
    });

    it('should handle maximum NFC ID length (16 chars)', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF125678',
      });
      expect(result.success).toBe(true);
    });

    it('should reject NFC ID too short', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABC1234',
      });
      expect(result.success).toBe(false);
    });

    it('should reject NFC ID too long', () => {
      const result = createCashlessAccountSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        nfcTagId: 'ABCD1234EF1256789',
      });
      expect(result.success).toBe(false);
    });
  });
});
