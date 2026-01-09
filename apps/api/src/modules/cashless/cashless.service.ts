/**
 * Cashless Service
 *
 * Handles cashless payment functionality including:
 * - Account creation and management
 * - Balance top-ups
 * - Cashless payments
 * - Transaction history
 * - Refunds
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType, FestivalStatus, Prisma } from '@prisma/client';

import { PaginationDto as _PaginationDto } from '../../common/dto/pagination.dto';
import { paginate as _paginate } from '@festival/utils';

// Import BusinessException pattern
import { NotFoundException, ConflictException } from '../../common/exceptions/base.exception';
import {
  InsufficientBalanceException,
  CashlessAccountDisabledException,
  TopupFailedException,
  TransactionLimitExceededException,
  DailyTransactionLimitExceededException,
  MaxBalanceExceededException,
  InvalidNFCTagException,
  FestivalCancelledException,
  FestivalNotPublishedException,
} from '../../common/exceptions/business.exception';
// ============================================================================
// Types
// ============================================================================

export interface CreateAccountDto {
  nfcTagId?: string;
}

export interface TopupDto {
  amount: number;
  festivalId: string;
  paymentMethod?: 'CARD' | 'CASH';
}

export interface CashlessPaymentDto {
  amount: number;
  festivalId: string;
  description?: string;
  vendorId?: string;
}

export interface RefundDto {
  transactionId: string;
  reason?: string;
}

export interface TransferDto {
  toUserId: string;
  amount: number;
  festivalId: string;
  description?: string;
}

export interface CashlessAccountEntity {
  id: string;
  userId: string;
  balance: number;
  nfcTagId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashlessTransactionEntity {
  id: string;
  accountId: string;
  festivalId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

/**
 * Cashless limits configuration per festival
 * These values can be customized per festival via cashlessLimits JSON field
 */
export interface CashlessLimitsConfig {
  /** Minimum amount for a single top-up (default: 5.00 EUR) */
  minTopupAmount: number;
  /** Maximum amount for a single top-up (default: 500.00 EUR) */
  maxTopupAmount: number;
  /** Maximum account balance allowed (default: 500.00 EUR) */
  maxBalance: number;
  /** Minimum amount for a payment (default: 0.01 EUR) */
  minPaymentAmount: number;
  /** Maximum amount for a single transaction (default: 100.00 EUR) */
  maxSingleTransactionAmount: number;
  /** Maximum total transaction amount per day (default: 1000.00 EUR) */
  dailyTransactionLimit: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default cashless limits - used when festival doesn't specify custom limits
 * Exported for use in tests and documentation
 */
export const DEFAULT_CASHLESS_LIMITS: CashlessLimitsConfig = {
  minTopupAmount: 5.0,
  maxTopupAmount: 500.0,
  maxBalance: 500.0, // Default max balance: 500 EUR
  minPaymentAmount: 0.01,
  maxSingleTransactionAmount: 100.0, // Default max single transaction: 100 EUR
  dailyTransactionLimit: 1000.0, // Default daily limit: 1000 EUR
};

/**
 * Legacy config for backwards compatibility
 * @deprecated Use festival-specific limits instead
 */
const CASHLESS_CONFIG = {
  MIN_TOPUP_AMOUNT: DEFAULT_CASHLESS_LIMITS.minTopupAmount,
  MAX_TOPUP_AMOUNT: DEFAULT_CASHLESS_LIMITS.maxTopupAmount,
  MAX_BALANCE: 1000.0, // Higher limit for backwards compatibility
  MIN_PAYMENT_AMOUNT: DEFAULT_CASHLESS_LIMITS.minPaymentAmount,
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class CashlessService {
  private readonly logger = new Logger(CashlessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create cashless account for a user
   */
  async getOrCreateAccount(userId: string, dto?: CreateAccountDto): Promise<CashlessAccountEntity> {
    // Try to find existing account
    let account = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
    });

    if (account) {
      return this.mapAccountToEntity(account);
    }

    // Check if NFC tag is already in use
    if (dto?.nfcTagId) {
      const existingNfc = await this.prisma.cashlessAccount.findUnique({
        where: { nfcTagId: dto.nfcTagId },
      });

      if (existingNfc) {
        throw ConflictException.nfcTagExists(dto.nfcTagId);
      }
    }

    // Create new account
    account = await this.prisma.cashlessAccount.create({
      data: {
        userId,
        balance: 0,
        nfcTagId: dto?.nfcTagId || null,
        isActive: true,
      },
    });

    this.logger.log(`Cashless account created for user ${userId}`);

    return this.mapAccountToEntity(account);
  }

  /**
   * Get cashless account for a user
   */
  async getAccount(userId: string): Promise<CashlessAccountEntity> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw NotFoundException.cashless(userId);
    }

    return this.mapAccountToEntity(account);
  }

  /**
   * Get account balance
   */
  async getBalance(userId: string): Promise<number> {
    const account = await this.getAccount(userId);
    return account.balance;
  }

  /**
   * Top up cashless account
   */
  async topup(userId: string, dto: TopupDto): Promise<CashlessTransactionEntity> {
    const { amount, festivalId, paymentMethod = 'CARD' } = dto;

    // Validate festival first to get limits
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw NotFoundException.festival(festivalId);
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new FestivalCancelledException(festivalId);
    }

    // Get festival-specific limits
    const limits = this.getFestivalLimits(festival);
    const currency = festival.currency || 'EUR';

    // Validate minimum topup amount
    if (amount < limits.minTopupAmount) {
      throw new TransactionLimitExceededException(
        limits.minTopupAmount,
        amount,
        currency,
        'single'
      );
    }

    // Validate maximum topup amount
    if (amount > limits.maxTopupAmount) {
      throw new TransactionLimitExceededException(
        limits.maxTopupAmount,
        amount,
        currency,
        'single'
      );
    }

    // Get or create account
    const account = await this.getOrCreateAccount(userId);

    if (!account.isActive) {
      throw new CashlessAccountDisabledException(account.id);
    }

    // Validate against festival-specific limits (max balance, single transaction, daily limit)
    await this.validateTransactionLimits(
      account.id,
      festivalId,
      amount,
      limits,
      'topup',
      account.balance,
      currency
    );

    // Create transaction in a database transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update account balance
      const updatedAccount = await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      const transaction = await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId,
          type: TransactionType.TOPUP,
          amount,
          balanceBefore: account.balance,
          balanceAfter: Number(updatedAccount.balance),
          description: `Top-up via ${paymentMethod}`,
          metadata: {
            paymentMethod,
          },
        },
      });

      return transaction;
    });

    this.logger.log(`Top-up of ${amount} for user ${userId} in festival ${festivalId}`);

    return this.mapTransactionToEntity(result);
  }

  /**
   * Make a cashless payment
   */
  async pay(
    userId: string,
    dto: CashlessPaymentDto,
    performedById?: string
  ): Promise<CashlessTransactionEntity> {
    const { amount, festivalId, description, vendorId } = dto;

    // Validate festival first to get limits
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw NotFoundException.festival(festivalId);
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new FestivalCancelledException(festivalId);
    }

    if (festival.status !== FestivalStatus.ONGOING) {
      throw new FestivalNotPublishedException(festivalId);
    }

    // Get festival-specific limits
    const limits = this.getFestivalLimits(festival);
    const currency = festival.currency || 'EUR';

    // Validate minimum payment amount
    if (amount < limits.minPaymentAmount) {
      throw new TransactionLimitExceededException(
        limits.minPaymentAmount,
        amount,
        currency,
        'single'
      );
    }

    // Get account
    const account = await this.getAccount(userId);

    if (!account.isActive) {
      throw new CashlessAccountDisabledException(account.id);
    }

    // Check sufficient balance
    if (account.balance < amount) {
      throw new InsufficientBalanceException(account.balance, amount, currency);
    }

    // Validate against festival-specific limits (single transaction, daily limit)
    await this.validateTransactionLimits(
      account.id,
      festivalId,
      amount,
      limits,
      'payment',
      account.balance,
      currency
    );

    // Create transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update account balance
      const updatedAccount = await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: amount } },
      });

      // Create transaction record
      const transaction = await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId,
          type: TransactionType.PAYMENT,
          amount,
          balanceBefore: account.balance,
          balanceAfter: Number(updatedAccount.balance),
          description: description || 'Cashless payment',
          performedById,
          metadata: vendorId ? { vendorId } : undefined,
        },
      });

      return transaction;
    });

    this.logger.log(`Payment of ${amount} by user ${userId} in festival ${festivalId}`);

    return this.mapTransactionToEntity(result);
  }

  /**
   * Process a refund
   */
  async refund(
    userId: string,
    dto: RefundDto,
    performedById: string
  ): Promise<CashlessTransactionEntity> {
    const { transactionId, reason } = dto;

    // Find original transaction
    const originalTransaction = await this.prisma.cashlessTransaction.findUnique({
      where: { id: transactionId },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) {
      throw NotFoundException.payment(transactionId);
    }

    if (originalTransaction.type !== TransactionType.PAYMENT) {
      throw new TopupFailedException('Can only refund payment transactions');
    }

    // Check if already refunded
    const existingRefund = await this.prisma.cashlessTransaction.findFirst({
      where: {
        type: TransactionType.REFUND,
        metadata: {
          path: ['originalTransactionId'],
          equals: transactionId,
        },
      },
    });

    if (existingRefund) {
      throw ConflictException.paymentDuplicate(transactionId);
    }

    // Verify account ownership
    if (originalTransaction.account.userId !== userId) {
      throw new CashlessAccountDisabledException(originalTransaction.account.id);
    }

    const account = originalTransaction.account;
    const refundAmount = Number(originalTransaction.amount);

    // Check max balance after refund
    const newBalance = Number(account.balance) + refundAmount;
    if (newBalance > CASHLESS_CONFIG.MAX_BALANCE) {
      throw new TopupFailedException('Refund would exceed maximum account balance');
    }

    // Process refund
    const result = await this.prisma.$transaction(async (tx) => {
      // Update account balance
      const updatedAccount = await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: { increment: refundAmount } },
      });

      // Create refund transaction
      const refundTransaction = await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId: originalTransaction.festivalId,
          type: TransactionType.REFUND,
          amount: refundAmount,
          balanceBefore: Number(account.balance),
          balanceAfter: Number(updatedAccount.balance),
          description: reason || 'Refund',
          performedById,
          metadata: {
            originalTransactionId: transactionId,
            reason,
          },
        },
      });

      return refundTransaction;
    });

    this.logger.log(`Refund of ${refundAmount} for transaction ${transactionId}`);

    return this.mapTransactionToEntity(result);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    festivalId?: string,
    limit = 50,
    offset = 0
  ): Promise<CashlessTransactionEntity[]> {
    const account = await this.getAccount(userId);

    const where: Prisma.CashlessTransactionWhereInput = {
      accountId: account.id,
    };

    if (festivalId) {
      where.festivalId = festivalId;
    }

    const transactions = await this.prisma.cashlessTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map(this.mapTransactionToEntity);
  }

  /**
   * Link NFC tag to account
   */
  async linkNfcTag(userId: string, nfcTagId: string): Promise<CashlessAccountEntity> {
    const account = await this.getAccount(userId);

    // Check if NFC tag is already in use
    const existingNfc = await this.prisma.cashlessAccount.findUnique({
      where: { nfcTagId },
    });

    if (existingNfc && existingNfc.id !== account.id) {
      throw ConflictException.nfcTagExists(nfcTagId);
    }

    const updatedAccount = await this.prisma.cashlessAccount.update({
      where: { id: account.id },
      data: { nfcTagId },
    });

    this.logger.log(`NFC tag ${nfcTagId} linked to account ${account.id}`);

    return this.mapAccountToEntity(updatedAccount);
  }

  /**
   * Find account by NFC tag
   */
  async findAccountByNfcTag(nfcTagId: string): Promise<CashlessAccountEntity> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { nfcTagId },
    });

    if (!account) {
      throw new InvalidNFCTagException(nfcTagId);
    }

    return this.mapAccountToEntity(account);
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const account = await this.getAccount(userId);

    await this.prisma.cashlessAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    this.logger.log(`Cashless account ${account.id} deactivated`);
  }

  /**
   * Reactivate account
   */
  async reactivateAccount(userId: string): Promise<CashlessAccountEntity> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw NotFoundException.cashless(userId);
    }

    const updatedAccount = await this.prisma.cashlessAccount.update({
      where: { id: account.id },
      data: { isActive: true },
    });

    this.logger.log(`Cashless account ${account.id} reactivated`);

    return this.mapAccountToEntity(updatedAccount);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get cashless limits configuration for a festival
   * Merges festival-specific limits with default values
   */
  private getFestivalLimits(festival: any): CashlessLimitsConfig {
    // If festival has custom cashlessLimits configured, merge with defaults
    const customLimits = festival.cashlessLimits as Partial<CashlessLimitsConfig> | null;

    if (!customLimits) {
      return { ...DEFAULT_CASHLESS_LIMITS };
    }

    return {
      minTopupAmount: customLimits.minTopupAmount ?? DEFAULT_CASHLESS_LIMITS.minTopupAmount,
      maxTopupAmount: customLimits.maxTopupAmount ?? DEFAULT_CASHLESS_LIMITS.maxTopupAmount,
      maxBalance: customLimits.maxBalance ?? DEFAULT_CASHLESS_LIMITS.maxBalance,
      minPaymentAmount: customLimits.minPaymentAmount ?? DEFAULT_CASHLESS_LIMITS.minPaymentAmount,
      maxSingleTransactionAmount:
        customLimits.maxSingleTransactionAmount ??
        DEFAULT_CASHLESS_LIMITS.maxSingleTransactionAmount,
      dailyTransactionLimit:
        customLimits.dailyTransactionLimit ?? DEFAULT_CASHLESS_LIMITS.dailyTransactionLimit,
    };
  }

  /**
   * Calculate the total transaction amount for a user on a specific day
   * Only counts PAYMENT and TOPUP transactions (money spent or added)
   */
  private async getDailyTransactionTotal(
    accountId: string,
    festivalId: string,
    date: Date = new Date()
  ): Promise<number> {
    // Get start and end of the day in the festival's timezone
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Use Prisma aggregate for efficient sum calculation (avoids N+1)
    const result = await this.prisma.cashlessTransaction.aggregate({
      where: {
        accountId,
        festivalId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        type: {
          in: [TransactionType.PAYMENT, TransactionType.TOPUP],
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  /**
   * Validate transaction against festival limits
   * Throws appropriate exceptions if limits are exceeded
   */
  private async validateTransactionLimits(
    accountId: string,
    festivalId: string,
    amount: number,
    limits: CashlessLimitsConfig,
    transactionType: 'topup' | 'payment',
    currentBalance: number,
    currency = 'EUR'
  ): Promise<void> {
    // 1. Validate single transaction amount limit
    if (amount > limits.maxSingleTransactionAmount) {
      throw new TransactionLimitExceededException(
        limits.maxSingleTransactionAmount,
        amount,
        currency,
        'single'
      );
    }

    // 2. Validate max balance for topups
    if (transactionType === 'topup') {
      const newBalance = currentBalance + amount;
      if (newBalance > limits.maxBalance) {
        throw new MaxBalanceExceededException(limits.maxBalance, currentBalance, amount, currency);
      }
    }

    // 3. Validate daily transaction limit
    const dailyTotal = await this.getDailyTransactionTotal(accountId, festivalId);
    const newDailyTotal = dailyTotal + amount;

    if (newDailyTotal > limits.dailyTransactionLimit) {
      throw new DailyTransactionLimitExceededException(
        limits.dailyTransactionLimit,
        dailyTotal,
        amount,
        currency
      );
    }
  }

  private mapAccountToEntity(account: any): CashlessAccountEntity {
    return {
      id: account.id,
      userId: account.userId,
      balance: Number(account.balance),
      nfcTagId: account.nfcTagId,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private mapTransactionToEntity(transaction: any): CashlessTransactionEntity {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      festivalId: transaction.festivalId,
      type: transaction.type,
      amount: Number(transaction.amount),
      balanceBefore: Number(transaction.balanceBefore),
      balanceAfter: Number(transaction.balanceAfter),
      description: transaction.description,
      createdAt: transaction.createdAt,
    };
  }
}
