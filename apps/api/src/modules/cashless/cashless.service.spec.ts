/**
 * Cashless Service Unit Tests
 *
 * Comprehensive tests for cashless payment functionality including:
 * - Account management
 * - Top-ups
 * - Payments
 * - Refunds
 * - Transaction history
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CashlessService, DEFAULT_CASHLESS_LIMITS, CashlessLimitsConfig } from './cashless.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType, FestivalStatus } from '@prisma/client';
import {
  regularUser,
  staffUser,
  ongoingFestival,
  publishedFestival,
  cancelledFestival,
  activeCashlessAccount,
  emptyCashlessAccount,
  inactiveCashlessAccount,
  topupTransaction,
  paymentTransaction,
} from '../../test/fixtures';
import { NotFoundException, ConflictException } from '../../common/exceptions/base.exception';
import {
  TransactionLimitExceededException,
  DailyTransactionLimitExceededException,
  MaxBalanceExceededException,
  FestivalCancelledException,
  CashlessAccountDisabledException,
  TopupFailedException,
  InsufficientBalanceException,
  FestivalNotPublishedException,
  InvalidNFCTagException,
} from '../../common/exceptions/business.exception';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-transaction-123'),
}));

describe('CashlessService', () => {
  let cashlessService: CashlessService;
  let _prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    cashlessAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cashlessTransaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CashlessService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    cashlessService = module.get<CashlessService>(CashlessService);
    _prismaService = module.get(PrismaService);

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    });
  });

  // ==========================================================================
  // Get or Create Account Tests
  // ==========================================================================

  describe('getOrCreateAccount', () => {
    it('should return existing account if found', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await cashlessService.getOrCreateAccount(regularUser.id);

      // Assert
      expect(result.id).toBe(activeCashlessAccount.id);
      expect(result.userId).toBe(activeCashlessAccount.userId);
      expect(mockPrismaService.cashlessAccount.create).not.toHaveBeenCalled();
    });

    it('should create new account if not found', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(null);
      mockPrismaService.cashlessAccount.create.mockResolvedValue({
        id: 'new-account-id',
        userId: regularUser.id,
        balance: 0,
        nfcTagId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await cashlessService.getOrCreateAccount(regularUser.id);

      // Assert
      expect(result.userId).toBe(regularUser.id);
      expect(result.balance).toBe(0);
      expect(mockPrismaService.cashlessAccount.create).toHaveBeenCalled();
    });

    it('should create account with NFC tag if provided', async () => {
      // Arrange
      const nfcTagId = 'NFC-NEW-TAG';
      mockPrismaService.cashlessAccount.findUnique
        .mockResolvedValueOnce(null) // First call: userId lookup
        .mockResolvedValueOnce(null); // Second call: nfcTagId lookup
      mockPrismaService.cashlessAccount.create.mockResolvedValue({
        id: 'new-account-id',
        userId: regularUser.id,
        balance: 0,
        nfcTagId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await cashlessService.getOrCreateAccount(regularUser.id, { nfcTagId });

      // Assert
      expect(result.nfcTagId).toBe(nfcTagId);
    });

    it('should throw ConflictException if NFC tag already in use', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique
        .mockResolvedValueOnce(null) // First call: userId lookup
        .mockResolvedValueOnce(activeCashlessAccount); // Second call: nfcTagId lookup - already exists

      // Act & Assert
      await expect(
        cashlessService.getOrCreateAccount(regularUser.id, {
          nfcTagId: activeCashlessAccount.nfcTagId!,
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==========================================================================
  // Get Account Tests
  // ==========================================================================

  describe('getAccount', () => {
    it('should return account if found', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await cashlessService.getAccount(regularUser.id);

      // Assert
      expect(result.id).toBe(activeCashlessAccount.id);
    });

    it('should throw NotFoundException if account not found', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(cashlessService.getAccount('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Get Balance Tests
  // ==========================================================================

  describe('getBalance', () => {
    it('should return account balance', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await cashlessService.getBalance(regularUser.id);

      // Assert
      expect(result).toBe(activeCashlessAccount.balance);
    });
  });

  // ==========================================================================
  // Top-up Tests
  // ==========================================================================

  describe('topup', () => {
    it('should successfully top up account', async () => {
      // Arrange
      const topupAmount = 50;
      // Use a lower balance to stay within the new 500 max balance limit
      const accountWithLowBalance = { ...activeCashlessAccount, balance: 100 };
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(accountWithLowBalance);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]); // No daily transactions
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...accountWithLowBalance,
        balance: accountWithLowBalance.balance + topupAmount,
      });
      mockPrismaService.cashlessTransaction.create.mockResolvedValue({
        id: 'transaction-id',
        accountId: accountWithLowBalance.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.TOPUP,
        amount: topupAmount,
        balanceBefore: accountWithLowBalance.balance,
        balanceAfter: accountWithLowBalance.balance + topupAmount,
        description: 'Top-up via CARD',
        createdAt: new Date(),
      });

      // Act
      const result = await cashlessService.topup(regularUser.id, {
        amount: topupAmount,
        festivalId: ongoingFestival.id,
      });

      // Assert
      expect(result.type).toBe(TransactionType.TOPUP);
      expect(result.amount).toBe(topupAmount);
      expect(result.balanceAfter).toBe(accountWithLowBalance.balance + topupAmount);
    });

    it('should throw TransactionLimitExceededException for amount below minimum', async () => {
      // Arrange - need festival for limits
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 2, // Below minimum of 5
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw TransactionLimitExceededException for amount above maximum', async () => {
      // Arrange - need festival for limits
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 600, // Above maximum topup of 500
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 50,
          festivalId: 'non-existent-festival',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw FestivalCancelledException if festival is cancelled', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(cancelledFestival);

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 50,
          festivalId: cancelledFestival.id,
        })
      ).rejects.toThrow(FestivalCancelledException);
    });

    it('should throw CashlessAccountDisabledException if account is deactivated', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(inactiveCashlessAccount);

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 50,
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(CashlessAccountDisabledException);
    });

    it('should throw MaxBalanceExceededException if balance would exceed maximum', async () => {
      // Arrange
      const highBalanceAccount = {
        ...activeCashlessAccount,
        balance: 480, // Near max of 500 (new default limit)
      };
      mockPrismaService.festival.findUnique.mockResolvedValue(ongoingFestival);
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(highBalanceAccount);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]); // No daily transactions

      // Act & Assert
      await expect(
        cashlessService.topup(regularUser.id, {
          amount: 50, // Would bring to 530, above 500 max
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(MaxBalanceExceededException);
    });
  });

  // ==========================================================================
  // Payment Tests
  // ==========================================================================

  describe('pay', () => {
    it('should successfully process payment', async () => {
      // Arrange
      const paymentAmount = 15;
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...ongoingFestival,
        status: FestivalStatus.ONGOING,
      });
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]); // No daily transactions
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...activeCashlessAccount,
        balance: activeCashlessAccount.balance - paymentAmount,
      });
      mockPrismaService.cashlessTransaction.create.mockResolvedValue({
        id: 'transaction-id',
        accountId: activeCashlessAccount.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.PAYMENT,
        amount: paymentAmount,
        balanceBefore: activeCashlessAccount.balance,
        balanceAfter: activeCashlessAccount.balance - paymentAmount,
        description: 'Beer purchase',
        createdAt: new Date(),
      });

      // Act
      const result = await cashlessService.pay(regularUser.id, {
        amount: paymentAmount,
        festivalId: ongoingFestival.id,
        description: 'Beer purchase',
      });

      // Assert
      expect(result.type).toBe(TransactionType.PAYMENT);
      expect(result.amount).toBe(paymentAmount);
      expect(result.balanceAfter).toBe(activeCashlessAccount.balance - paymentAmount);
    });

    it('should throw TransactionLimitExceededException for zero or negative amount', async () => {
      // Arrange - need festival for limits
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...ongoingFestival,
        status: FestivalStatus.ONGOING,
      });

      // Act & Assert
      await expect(
        cashlessService.pay(regularUser.id, {
          amount: 0,
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(TransactionLimitExceededException);

      await expect(
        cashlessService.pay(regularUser.id, {
          amount: -10,
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(TransactionLimitExceededException);
    });

    it('should throw NotFoundException if festival not found', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        cashlessService.pay(regularUser.id, {
          amount: 10,
          festivalId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw FestivalNotPublishedException if festival is not ongoing', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...publishedFestival,
        status: FestivalStatus.PUBLISHED,
      });

      // Act & Assert
      await expect(
        cashlessService.pay(regularUser.id, {
          amount: 10,
          festivalId: publishedFestival.id,
        })
      ).rejects.toThrow(FestivalNotPublishedException);
    });

    it('should throw CashlessAccountDisabledException if account is deactivated', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...ongoingFestival,
        status: FestivalStatus.ONGOING,
      });
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(inactiveCashlessAccount);

      // Act & Assert
      await expect(
        cashlessService.pay('user-inactive', {
          amount: 10,
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(CashlessAccountDisabledException);
    });

    it('should throw InsufficientBalanceException for insufficient balance', async () => {
      // Arrange
      mockPrismaService.festival.findUnique.mockResolvedValue({
        ...ongoingFestival,
        status: FestivalStatus.ONGOING,
      });
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
        ...activeCashlessAccount,
        balance: 10,
      });

      // Act & Assert
      await expect(
        cashlessService.pay(regularUser.id, {
          amount: 50, // More than available balance
          festivalId: ongoingFestival.id,
        })
      ).rejects.toThrow(InsufficientBalanceException);
    });
  });

  // ==========================================================================
  // Refund Tests
  // ==========================================================================

  describe('refund', () => {
    it('should successfully process refund', async () => {
      // Arrange
      const originalAmount = 15;
      mockPrismaService.cashlessTransaction.findUnique.mockResolvedValue({
        ...paymentTransaction,
        amount: originalAmount,
        type: TransactionType.PAYMENT,
        account: {
          ...activeCashlessAccount,
          userId: regularUser.id,
        },
      });
      mockPrismaService.cashlessTransaction.findFirst.mockResolvedValue(null); // No existing refund
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...activeCashlessAccount,
        balance: activeCashlessAccount.balance + originalAmount,
      });
      mockPrismaService.cashlessTransaction.create.mockResolvedValue({
        id: 'refund-transaction-id',
        accountId: activeCashlessAccount.id,
        festivalId: ongoingFestival.id,
        type: TransactionType.REFUND,
        amount: originalAmount,
        balanceBefore: activeCashlessAccount.balance,
        balanceAfter: activeCashlessAccount.balance + originalAmount,
        description: 'Refund - Item unavailable',
        createdAt: new Date(),
      });

      // Act
      const result = await cashlessService.refund(
        regularUser.id,
        { transactionId: paymentTransaction.id, reason: 'Item unavailable' },
        staffUser.id
      );

      // Assert
      expect(result.type).toBe(TransactionType.REFUND);
      expect(result.amount).toBe(originalAmount);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      // Arrange
      mockPrismaService.cashlessTransaction.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        cashlessService.refund(regularUser.id, { transactionId: 'non-existent' }, staffUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw TopupFailedException if transaction is not a payment', async () => {
      // Arrange
      mockPrismaService.cashlessTransaction.findUnique.mockResolvedValue({
        ...topupTransaction,
        type: TransactionType.TOPUP,
        account: activeCashlessAccount,
      });

      // Act & Assert
      await expect(
        cashlessService.refund(regularUser.id, { transactionId: topupTransaction.id }, staffUser.id)
      ).rejects.toThrow(TopupFailedException);
    });

    it('should throw ConflictException if already refunded', async () => {
      // Arrange
      mockPrismaService.cashlessTransaction.findUnique.mockResolvedValue({
        ...paymentTransaction,
        type: TransactionType.PAYMENT,
        account: {
          ...activeCashlessAccount,
          userId: regularUser.id,
        },
      });
      mockPrismaService.cashlessTransaction.findFirst.mockResolvedValue({
        id: 'existing-refund',
        type: TransactionType.REFUND,
      }); // Existing refund found

      // Act & Assert
      await expect(
        cashlessService.refund(
          regularUser.id,
          { transactionId: paymentTransaction.id },
          staffUser.id
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should throw CashlessAccountDisabledException for other users transaction', async () => {
      // Arrange
      mockPrismaService.cashlessTransaction.findUnique.mockResolvedValue({
        ...paymentTransaction,
        type: TransactionType.PAYMENT,
        account: {
          ...activeCashlessAccount,
          userId: 'different-user',
        },
      });
      mockPrismaService.cashlessTransaction.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        cashlessService.refund(
          regularUser.id,
          { transactionId: paymentTransaction.id },
          staffUser.id
        )
      ).rejects.toThrow(CashlessAccountDisabledException);
    });
  });

  // ==========================================================================
  // Transaction History Tests
  // ==========================================================================

  describe('getTransactionHistory', () => {
    it('should return transaction history for user', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([
        topupTransaction,
        paymentTransaction,
      ]);

      // Act
      const result = await cashlessService.getTransactionHistory(regularUser.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: activeCashlessAccount.id },
        })
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([topupTransaction]);

      // Act
      await cashlessService.getTransactionHistory(regularUser.id, ongoingFestival.id);

      // Assert
      expect(mockPrismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId: activeCashlessAccount.id,
            festivalId: ongoingFestival.id,
          },
        })
      );
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);
      mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);

      // Act
      await cashlessService.getTransactionHistory(regularUser.id, undefined, 20, 10);

      // Assert
      expect(mockPrismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });
  });

  // ==========================================================================
  // Link NFC Tag Tests
  // ==========================================================================

  describe('linkNfcTag', () => {
    it('should link NFC tag to account', async () => {
      // Arrange
      const newNfcTag = 'NFC-NEW-TAG-123';
      mockPrismaService.cashlessAccount.findUnique
        .mockResolvedValueOnce(activeCashlessAccount) // Account lookup
        .mockResolvedValueOnce(null); // NFC tag lookup - not in use
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...activeCashlessAccount,
        nfcTagId: newNfcTag,
      });

      // Act
      const result = await cashlessService.linkNfcTag(regularUser.id, newNfcTag);

      // Assert
      expect(result.nfcTagId).toBe(newNfcTag);
    });

    it('should throw ConflictException if NFC tag already in use by another account', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique
        .mockResolvedValueOnce(activeCashlessAccount)
        .mockResolvedValueOnce({
          ...emptyCashlessAccount,
          id: 'different-account-id',
        });

      // Act & Assert
      await expect(cashlessService.linkNfcTag(regularUser.id, 'EXISTING-NFC-TAG')).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow relinking same NFC tag to same account', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique
        .mockResolvedValueOnce(activeCashlessAccount)
        .mockResolvedValueOnce(activeCashlessAccount); // Same account
      mockPrismaService.cashlessAccount.update.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await cashlessService.linkNfcTag(
        regularUser.id,
        activeCashlessAccount.nfcTagId!
      );

      // Assert
      expect(result.nfcTagId).toBe(activeCashlessAccount.nfcTagId);
    });
  });

  // ==========================================================================
  // Find Account By NFC Tag Tests
  // ==========================================================================

  describe('findAccountByNfcTag', () => {
    it('should return account for valid NFC tag', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);

      // Act
      const result = await cashlessService.findAccountByNfcTag(activeCashlessAccount.nfcTagId!);

      // Assert
      expect(result.id).toBe(activeCashlessAccount.id);
    });

    it('should throw InvalidNFCTagException for unknown NFC tag', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(cashlessService.findAccountByNfcTag('UNKNOWN-NFC-TAG')).rejects.toThrow(
        InvalidNFCTagException
      );
    });
  });

  // ==========================================================================
  // Deactivate/Reactivate Account Tests
  // ==========================================================================

  describe('deactivateAccount', () => {
    it('should deactivate account', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(activeCashlessAccount);
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...activeCashlessAccount,
        isActive: false,
      });

      // Act
      await cashlessService.deactivateAccount(regularUser.id);

      // Assert
      expect(mockPrismaService.cashlessAccount.update).toHaveBeenCalledWith({
        where: { id: activeCashlessAccount.id },
        data: { isActive: false },
      });
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate account', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(inactiveCashlessAccount);
      mockPrismaService.cashlessAccount.update.mockResolvedValue({
        ...inactiveCashlessAccount,
        isActive: true,
      });

      // Act
      const result = await cashlessService.reactivateAccount('user-inactive');

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if account not found', async () => {
      // Arrange
      mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(cashlessService.reactivateAccount('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Cashless Limits Tests
  // ==========================================================================

  describe('Cashless Limits', () => {
    describe('topup with limits', () => {
      it('should throw MaxBalanceExceededException when topup would exceed max balance', async () => {
        // Arrange
        const highBalanceAccount = {
          ...activeCashlessAccount,
          balance: 480, // Close to 500 max
        };
        const festivalWithLimits = {
          ...ongoingFestival,
          cashlessLimits: {
            maxBalance: 500,
            maxSingleTransactionAmount: 100,
            dailyTransactionLimit: 1000,
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue(highBalanceAccount);
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]); // No daily transactions

        // Act & Assert
        await expect(
          cashlessService.topup(regularUser.id, {
            amount: 50, // Would bring to 530, above 500 max
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(MaxBalanceExceededException);
      });

      it('should throw TransactionLimitExceededException when topup exceeds single transaction limit', async () => {
        // Arrange
        const festivalWithLimits = {
          ...ongoingFestival,
          cashlessLimits: {
            maxBalance: 500,
            maxSingleTransactionAmount: 50, // Low single transaction limit
            dailyTransactionLimit: 1000,
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 0,
        });

        // Act & Assert
        await expect(
          cashlessService.topup(regularUser.id, {
            amount: 75, // Exceeds 50 single transaction limit
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(TransactionLimitExceededException);
      });

      it('should throw DailyTransactionLimitExceededException when daily limit exceeded', async () => {
        // Arrange
        const festivalWithLimits = {
          ...ongoingFestival,
          cashlessLimits: {
            maxBalance: 1000,
            maxSingleTransactionAmount: 200,
            dailyTransactionLimit: 100, // Low daily limit
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 0,
        });
        // Simulate existing transactions totaling 80 today
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([
          { amount: 50, type: TransactionType.TOPUP },
          { amount: 30, type: TransactionType.PAYMENT },
        ]);

        // Act & Assert
        await expect(
          cashlessService.topup(regularUser.id, {
            amount: 30, // Would bring daily total to 110, above 100 limit
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(DailyTransactionLimitExceededException);
      });

      it('should use festival-specific limits when configured', async () => {
        // Arrange
        const customLimits: Partial<CashlessLimitsConfig> = {
          maxBalance: 1000, // Higher than default
          maxSingleTransactionAmount: 200, // Higher than default
          dailyTransactionLimit: 2000, // Higher than default
        };
        const festivalWithCustomLimits = {
          ...ongoingFestival,
          cashlessLimits: customLimits,
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithCustomLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 0,
        });
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);
        mockPrismaService.cashlessAccount.update.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 150,
        });
        mockPrismaService.cashlessTransaction.create.mockResolvedValue({
          id: 'new-tx',
          accountId: activeCashlessAccount.id,
          festivalId: ongoingFestival.id,
          type: TransactionType.TOPUP,
          amount: 150,
          balanceBefore: 0,
          balanceAfter: 150,
          description: 'Top-up via CARD',
          createdAt: new Date(),
        });

        // Act - 150 would exceed default 100 single transaction limit but not custom 200
        const result = await cashlessService.topup(regularUser.id, {
          amount: 150,
          festivalId: ongoingFestival.id,
        });

        // Assert
        expect(result.amount).toBe(150);
      });

      it('should use default limits when festival has no cashlessLimits', async () => {
        // Arrange
        const festivalWithoutLimits = {
          ...ongoingFestival,
          cashlessLimits: null,
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithoutLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 0,
        });
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([]);

        // Act & Assert - 150 exceeds default 100 single transaction limit
        await expect(
          cashlessService.topup(regularUser.id, {
            amount: 150, // Exceeds default maxSingleTransactionAmount of 100
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(TransactionLimitExceededException);
      });
    });

    describe('pay with limits', () => {
      it('should throw TransactionLimitExceededException when payment exceeds single transaction limit', async () => {
        // Arrange
        const festivalWithLimits = {
          ...ongoingFestival,
          status: FestivalStatus.ONGOING,
          cashlessLimits: {
            maxBalance: 500,
            maxSingleTransactionAmount: 50, // Low single transaction limit
            dailyTransactionLimit: 1000,
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 100, // Enough balance
        });

        // Act & Assert
        await expect(
          cashlessService.pay(regularUser.id, {
            amount: 75, // Exceeds 50 single transaction limit
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(TransactionLimitExceededException);
      });

      it('should throw DailyTransactionLimitExceededException when payment would exceed daily limit', async () => {
        // Arrange
        const festivalWithLimits = {
          ...ongoingFestival,
          status: FestivalStatus.ONGOING,
          cashlessLimits: {
            maxBalance: 1000,
            maxSingleTransactionAmount: 200,
            dailyTransactionLimit: 100, // Low daily limit
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 500, // Plenty of balance
        });
        // Simulate existing transactions totaling 90 today
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([
          { amount: 50, type: TransactionType.PAYMENT },
          { amount: 40, type: TransactionType.TOPUP },
        ]);

        // Act & Assert
        await expect(
          cashlessService.pay(regularUser.id, {
            amount: 20, // Would bring daily total to 110, above 100 limit
            festivalId: ongoingFestival.id,
          })
        ).rejects.toThrow(DailyTransactionLimitExceededException);
      });

      it('should allow payment within festival-specific limits', async () => {
        // Arrange
        const festivalWithLimits = {
          ...ongoingFestival,
          status: FestivalStatus.ONGOING,
          cashlessLimits: {
            maxBalance: 500,
            maxSingleTransactionAmount: 100,
            dailyTransactionLimit: 500,
          },
        };
        mockPrismaService.festival.findUnique.mockResolvedValue(festivalWithLimits);
        mockPrismaService.cashlessAccount.findUnique.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 200,
        });
        mockPrismaService.cashlessTransaction.findMany.mockResolvedValue([
          { amount: 50, type: TransactionType.PAYMENT },
        ]); // 50 already spent today
        mockPrismaService.cashlessAccount.update.mockResolvedValue({
          ...activeCashlessAccount,
          balance: 125,
        });
        mockPrismaService.cashlessTransaction.create.mockResolvedValue({
          id: 'payment-tx',
          accountId: activeCashlessAccount.id,
          festivalId: ongoingFestival.id,
          type: TransactionType.PAYMENT,
          amount: 75,
          balanceBefore: 200,
          balanceAfter: 125,
          description: 'Food purchase',
          createdAt: new Date(),
        });

        // Act
        const result = await cashlessService.pay(regularUser.id, {
          amount: 75,
          festivalId: ongoingFestival.id,
          description: 'Food purchase',
        });

        // Assert
        expect(result.amount).toBe(75);
        expect(result.type).toBe(TransactionType.PAYMENT);
      });
    });

    describe('default limits', () => {
      it('should have correct default values', () => {
        expect(DEFAULT_CASHLESS_LIMITS.maxBalance).toBe(500);
        expect(DEFAULT_CASHLESS_LIMITS.maxSingleTransactionAmount).toBe(100);
        expect(DEFAULT_CASHLESS_LIMITS.dailyTransactionLimit).toBe(1000);
        expect(DEFAULT_CASHLESS_LIMITS.minTopupAmount).toBe(5);
        expect(DEFAULT_CASHLESS_LIMITS.maxTopupAmount).toBe(500);
        expect(DEFAULT_CASHLESS_LIMITS.minPaymentAmount).toBe(0.01);
      });
    });
  });
});
