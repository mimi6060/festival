/**
 * Cashless Controller Unit Tests
 *
 * Comprehensive tests for cashless API endpoints including:
 * - GET /api/wallet/account
 * - GET /api/wallet/balance
 * - POST /api/wallet/topup
 * - POST /api/wallet/pay
 * - GET /api/wallet/transactions
 * - POST /api/wallet/nfc/link
 * - POST /api/wallet/refund
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CashlessController } from './cashless.controller';
import { CashlessService } from './cashless.service';
import { TransactionType } from '@prisma/client';
import {
  regularUser,
  staffUser,
  ongoingFestival,
  activeCashlessAccount,
  topupTransaction,
  paymentTransaction,
} from '../../test/fixtures';
import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/base.exception';
import {
  TransactionLimitExceededException,
  FestivalCancelledException,
  CashlessAccountDisabledException,
  TopupFailedException,
  InsufficientBalanceException,
  FestivalNotPublishedException,
} from '../../common/exceptions/business.exception';

// ============================================================================
// Mock Setup
// ============================================================================

describe('CashlessController', () => {
  let controller: CashlessController;
  let _cashlessService: jest.Mocked<CashlessService>;

  const mockCashlessService = {
    getOrCreateAccount: jest.fn(),
    getAccount: jest.fn(),
    getBalance: jest.fn(),
    topup: jest.fn(),
    pay: jest.fn(),
    refund: jest.fn(),
    getTransactionHistory: jest.fn(),
    linkNfcTag: jest.fn(),
    findAccountByNfcTag: jest.fn(),
    deactivateAccount: jest.fn(),
    reactivateAccount: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    },
  };

  const mockStaffRequest = {
    user: {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashlessController],
      providers: [
        { provide: CashlessService, useValue: mockCashlessService },
      ],
    }).compile();

    controller = module.get<CashlessController>(CashlessController);
    _cashlessService = module.get(CashlessService);
  });

  // ==========================================================================
  // GET /api/wallet/account Tests
  // ==========================================================================

  describe('GET /api/wallet/account', () => {
    it('should return or create cashless account for authenticated user', async () => {
      // Arrange
      mockCashlessService.getOrCreateAccount.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await controller.getAccount(mockRequest);

      // Assert
      expect(result).toEqual(activeCashlessAccount);
      expect(mockCashlessService.getOrCreateAccount).toHaveBeenCalledWith(regularUser.id);
    });

    it('should create new account if user does not have one', async () => {
      // Arrange
      const newAccount = {
        ...activeCashlessAccount,
        id: 'new-account-id',
        balance: 0,
        nfcTagId: null,
      };
      mockCashlessService.getOrCreateAccount.mockResolvedValue(newAccount);

      // Act
      const result = await controller.getAccount(mockRequest);

      // Assert
      expect(result.balance).toBe(0);
      expect(result.nfcTagId).toBeNull();
    });
  });

  // ==========================================================================
  // GET /api/wallet/balance Tests
  // ==========================================================================

  describe('GET /api/wallet/balance', () => {
    it('should return wallet balance with correct structure', async () => {
      // Arrange
      mockCashlessService.getOrCreateAccount.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await controller.getBalance(mockRequest);

      // Assert
      expect(result).toEqual({
        available: activeCashlessAccount.balance,
        pending: 0,
        currency: 'EUR',
      });
    });

    it('should return zero balance for new account', async () => {
      // Arrange
      mockCashlessService.getOrCreateAccount.mockResolvedValue({
        ...activeCashlessAccount,
        balance: 0,
      });

      // Act
      const result = await controller.getBalance(mockRequest);

      // Assert
      expect(result.available).toBe(0);
      expect(result.currency).toBe('EUR');
    });
  });

  // ==========================================================================
  // POST /api/wallet/topup Tests
  // ==========================================================================

  describe('POST /api/wallet/topup', () => {
    const validTopupDto = {
      amount: 50,
      festivalId: ongoingFestival.id,
      paymentMethod: 'CARD' as const,
    };

    it('should successfully process topup', async () => {
      // Arrange
      const expectedTransaction = {
        id: 'transaction-id',
        accountId: activeCashlessAccount.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.TOPUP,
        amount: 50,
        balanceBefore: 75.5,
        balanceAfter: 125.5,
        description: 'Top-up via CARD',
        createdAt: new Date(),
      };
      mockCashlessService.topup.mockResolvedValue(expectedTransaction);

      // Act
      const result = await controller.topup(mockRequest, validTopupDto);

      // Assert
      expect(result).toEqual(expectedTransaction);
      expect(mockCashlessService.topup).toHaveBeenCalledWith(
        regularUser.id,
        validTopupDto,
      );
    });

    it('should pass correct parameters to service', async () => {
      // Arrange
      mockCashlessService.topup.mockResolvedValue(topupTransaction);

      // Act
      await controller.topup(mockRequest, validTopupDto);

      // Assert
      expect(mockCashlessService.topup).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          amount: 50,
          festivalId: ongoingFestival.id,
        }),
      );
    });

    it('should throw TransactionLimitExceededException for amount below minimum', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        new TransactionLimitExceededException(5, 2, 'EUR', 'single'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, { amount: 2, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw TransactionLimitExceededException for amount above maximum', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        new TransactionLimitExceededException(500, 600, 'EUR', 'single'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, { amount: 600, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        NotFoundException.festival('non-existent'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, { amount: 50, festivalId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw FestivalCancelledException if festival is cancelled', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        new FestivalCancelledException('cancelled-festival-id'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, { amount: 50, festivalId: 'cancelled-festival-id' }),
      ).rejects.toThrow(FestivalCancelledException);
    });

    it('should throw CashlessAccountDisabledException if account is disabled', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        new CashlessAccountDisabledException('account-id'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, validTopupDto),
      ).rejects.toThrow(CashlessAccountDisabledException);
    });

    it('should throw TopupFailedException if max balance would be exceeded', async () => {
      // Arrange
      mockCashlessService.topup.mockRejectedValue(
        new TopupFailedException('Maximum account balance is 1000'),
      );

      // Act & Assert
      await expect(
        controller.topup(mockRequest, validTopupDto),
      ).rejects.toThrow(TopupFailedException);
    });
  });

  // ==========================================================================
  // POST /api/wallet/pay Tests
  // ==========================================================================

  describe('POST /api/wallet/pay', () => {
    const validPaymentDto = {
      amount: 15,
      festivalId: ongoingFestival.id,
      description: 'Beer purchase',
    };

    it('should successfully process payment', async () => {
      // Arrange
      const expectedTransaction = {
        id: 'payment-transaction-id',
        accountId: activeCashlessAccount.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.PAYMENT,
        amount: 15,
        balanceBefore: 75.5,
        balanceAfter: 60.5,
        description: 'Beer purchase',
        createdAt: new Date(),
      };
      mockCashlessService.pay.mockResolvedValue(expectedTransaction);

      // Act
      const result = await controller.pay(mockRequest, validPaymentDto);

      // Assert
      expect(result).toEqual(expectedTransaction);
      expect(mockCashlessService.pay).toHaveBeenCalledWith(
        regularUser.id,
        validPaymentDto,
      );
    });

    it('should throw TransactionLimitExceededException for zero amount', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        new TransactionLimitExceededException(0.01, 0, 'EUR', 'single'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: 0, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw TransactionLimitExceededException for negative amount', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        new TransactionLimitExceededException(0.01, -10, 'EUR', 'single'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: -10, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        NotFoundException.festival('non-existent'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: 10, festivalId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw FestivalNotPublishedException if festival is not ongoing', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        new FestivalNotPublishedException('not-ongoing-festival'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: 10, festivalId: 'not-ongoing-festival' }),
      ).rejects.toThrow(FestivalNotPublishedException);
    });

    it('should throw CashlessAccountDisabledException if account is disabled', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        new CashlessAccountDisabledException('account-id'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, validPaymentDto),
      ).rejects.toThrow(CashlessAccountDisabledException);
    });

    it('should throw InsufficientBalanceException for insufficient balance', async () => {
      // Arrange
      mockCashlessService.pay.mockRejectedValue(
        new InsufficientBalanceException(10, 50, 'EUR'),
      );

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: 50, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(InsufficientBalanceException);
    });
  });

  // ==========================================================================
  // GET /api/wallet/transactions Tests
  // ==========================================================================

  describe('GET /api/wallet/transactions', () => {
    it('should return transaction history', async () => {
      // Arrange
      const transactions = [topupTransaction, paymentTransaction];
      mockCashlessService.getTransactionHistory.mockResolvedValue(transactions);

      // Act
      const result = await controller.getTransactions(mockRequest);

      // Assert
      expect(result).toEqual(transactions);
      expect(mockCashlessService.getTransactionHistory).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
        50,
        0,
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      mockCashlessService.getTransactionHistory.mockResolvedValue([topupTransaction]);

      // Act
      await controller.getTransactions(mockRequest, ongoingFestival.id);

      // Assert
      expect(mockCashlessService.getTransactionHistory).toHaveBeenCalledWith(
        regularUser.id,
        ongoingFestival.id,
        50,
        0,
      );
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      mockCashlessService.getTransactionHistory.mockResolvedValue([]);

      // Act
      await controller.getTransactions(mockRequest, undefined, '20', '10');

      // Assert
      expect(mockCashlessService.getTransactionHistory).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
        20,
        10,
      );
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockCashlessService.getTransactionHistory.mockResolvedValue([]);

      // Act
      await controller.getTransactions(mockRequest);

      // Assert
      expect(mockCashlessService.getTransactionHistory).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
        50,
        0,
      );
    });

    it('should return empty array for user with no transactions', async () => {
      // Arrange
      mockCashlessService.getTransactionHistory.mockResolvedValue([]);

      // Act
      const result = await controller.getTransactions(mockRequest);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if account not found', async () => {
      // Arrange
      mockCashlessService.getTransactionHistory.mockRejectedValue(
        NotFoundException.cashless('user-id'),
      );

      // Act & Assert
      await expect(
        controller.getTransactions(mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // POST /api/wallet/nfc/link Tests
  // ==========================================================================

  describe('POST /api/wallet/nfc/link', () => {
    const nfcLinkBody = { nfcTagId: 'NFC-NEW-TAG-123' };

    it('should successfully link NFC tag to account', async () => {
      // Arrange
      const expectedAccount = {
        ...activeCashlessAccount,
        nfcTagId: 'NFC-NEW-TAG-123',
      };
      mockCashlessService.linkNfcTag.mockResolvedValue(expectedAccount);

      // Act
      const result = await controller.linkNfcTag(mockRequest, nfcLinkBody);

      // Assert
      expect(result.nfcTagId).toBe('NFC-NEW-TAG-123');
      expect(mockCashlessService.linkNfcTag).toHaveBeenCalledWith(
        regularUser.id,
        'NFC-NEW-TAG-123',
      );
    });

    it('should throw ConflictException if NFC tag already linked to another account', async () => {
      // Arrange
      mockCashlessService.linkNfcTag.mockRejectedValue(
        ConflictException.nfcTagExists('EXISTING-NFC-TAG'),
      );

      // Act & Assert
      await expect(
        controller.linkNfcTag(mockRequest, { nfcTagId: 'EXISTING-NFC-TAG' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if account not found', async () => {
      // Arrange
      mockCashlessService.linkNfcTag.mockRejectedValue(
        NotFoundException.cashless('user-id'),
      );

      // Act & Assert
      await expect(
        controller.linkNfcTag(mockRequest, nfcLinkBody),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow relinking same NFC tag to same account', async () => {
      // Arrange
      mockCashlessService.linkNfcTag.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await controller.linkNfcTag(mockRequest, {
        nfcTagId: activeCashlessAccount.nfcTagId!,
      });

      // Assert
      expect(result.nfcTagId).toBe(activeCashlessAccount.nfcTagId);
    });
  });

  // ==========================================================================
  // POST /api/wallet/refund Tests
  // ==========================================================================

  describe('POST /api/wallet/refund', () => {
    const refundDto = {
      transactionId: paymentTransaction.id,
      reason: 'Item unavailable',
    };

    it('should successfully process refund', async () => {
      // Arrange
      const expectedRefund = {
        id: 'refund-transaction-id',
        accountId: activeCashlessAccount.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.REFUND,
        amount: 15,
        balanceBefore: 60.5,
        balanceAfter: 75.5,
        description: 'Item unavailable',
        createdAt: new Date(),
      };
      mockCashlessService.refund.mockResolvedValue(expectedRefund);

      // Act
      const result = await controller.refund(mockRequest, refundDto);

      // Assert
      expect(result.type).toBe(TransactionType.REFUND);
      expect(mockCashlessService.refund).toHaveBeenCalledWith(
        regularUser.id,
        refundDto,
        regularUser.id,
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      // Arrange
      mockCashlessService.refund.mockRejectedValue(
        NotFoundException.payment('non-existent-transaction'),
      );

      // Act & Assert
      await expect(
        controller.refund(mockRequest, { transactionId: 'non-existent-transaction' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TopupFailedException if transaction is not a payment', async () => {
      // Arrange
      mockCashlessService.refund.mockRejectedValue(
        new TopupFailedException('Can only refund payment transactions'),
      );

      // Act & Assert
      await expect(
        controller.refund(mockRequest, { transactionId: topupTransaction.id }),
      ).rejects.toThrow(TopupFailedException);
    });

    it('should throw ConflictException if already refunded', async () => {
      // Arrange
      mockCashlessService.refund.mockRejectedValue(
        ConflictException.paymentDuplicate(paymentTransaction.id),
      );

      // Act & Assert
      await expect(
        controller.refund(mockRequest, refundDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw CashlessAccountDisabledException for other users transaction', async () => {
      // Arrange
      mockCashlessService.refund.mockRejectedValue(
        new CashlessAccountDisabledException('account-id'),
      );

      // Act & Assert
      await expect(
        controller.refund(mockRequest, refundDto),
      ).rejects.toThrow(CashlessAccountDisabledException);
    });

    it('should pass performer ID correctly', async () => {
      // Arrange
      mockCashlessService.refund.mockResolvedValue({
        id: 'refund-id',
        type: TransactionType.REFUND,
        amount: 15,
        createdAt: new Date(),
      });

      // Act
      await controller.refund(mockStaffRequest, refundDto);

      // Assert
      expect(mockCashlessService.refund).toHaveBeenCalledWith(
        staffUser.id,
        refundDto,
        staffUser.id,
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error handling', () => {
    it('should propagate BusinessException from service', async () => {
      // Arrange
      const error = new InsufficientBalanceException(10, 50, 'EUR');
      mockCashlessService.pay.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.pay(mockRequest, { amount: 50, festivalId: ongoingFestival.id }),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const error = NotFoundException.festival('non-existent');
      mockCashlessService.topup.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.topup(mockRequest, { amount: 50, festivalId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException from service', async () => {
      // Arrange
      const error = ConflictException.nfcTagExists('tag-id');
      mockCashlessService.linkNfcTag.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.linkNfcTag(mockRequest, { nfcTagId: 'tag-id' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('Authentication', () => {
    it('should use user ID from request for all operations', async () => {
      // Arrange
      mockCashlessService.getOrCreateAccount.mockResolvedValue(activeCashlessAccount);
      mockCashlessService.topup.mockResolvedValue(topupTransaction);
      mockCashlessService.pay.mockResolvedValue(paymentTransaction);
      mockCashlessService.getTransactionHistory.mockResolvedValue([]);
      mockCashlessService.linkNfcTag.mockResolvedValue(activeCashlessAccount);
      mockCashlessService.refund.mockResolvedValue({
        id: 'refund-id',
        type: TransactionType.REFUND,
        amount: 15,
        createdAt: new Date(),
      });

      // Act
      await controller.getAccount(mockRequest);
      await controller.getBalance(mockRequest);
      await controller.topup(mockRequest, { amount: 50, festivalId: ongoingFestival.id });
      await controller.pay(mockRequest, { amount: 10, festivalId: ongoingFestival.id });
      await controller.getTransactions(mockRequest);
      await controller.linkNfcTag(mockRequest, { nfcTagId: 'NFC-123' });
      await controller.refund(mockRequest, { transactionId: 'tx-id' });

      // Assert - verify user ID was extracted from request
      expect(mockCashlessService.getOrCreateAccount).toHaveBeenCalledWith(regularUser.id);
      expect(mockCashlessService.topup).toHaveBeenCalledWith(
        regularUser.id,
        expect.any(Object),
      );
      expect(mockCashlessService.pay).toHaveBeenCalledWith(
        regularUser.id,
        expect.any(Object),
      );
      expect(mockCashlessService.getTransactionHistory).toHaveBeenCalledWith(
        regularUser.id,
        undefined,
        50,
        0,
      );
      expect(mockCashlessService.linkNfcTag).toHaveBeenCalledWith(
        regularUser.id,
        expect.any(String),
      );
      expect(mockCashlessService.refund).toHaveBeenCalledWith(
        regularUser.id,
        expect.any(Object),
        regularUser.id,
      );
    });
  });
});
