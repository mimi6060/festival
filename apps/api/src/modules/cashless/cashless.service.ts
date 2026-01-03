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

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TransactionType,
  PaymentStatus,
  PaymentProvider,
  FestivalStatus,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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

// ============================================================================
// Configuration
// ============================================================================

const CASHLESS_CONFIG = {
  MIN_TOPUP_AMOUNT: 5.0,
  MAX_TOPUP_AMOUNT: 500.0,
  MAX_BALANCE: 1000.0,
  MIN_PAYMENT_AMOUNT: 0.01,
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
        throw new ConflictException('NFC tag is already registered to another account');
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
      throw new NotFoundException('Cashless account not found');
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

    // Validate amount
    if (amount < CASHLESS_CONFIG.MIN_TOPUP_AMOUNT) {
      throw new BadRequestException(
        `Minimum top-up amount is ${CASHLESS_CONFIG.MIN_TOPUP_AMOUNT}`,
      );
    }

    if (amount > CASHLESS_CONFIG.MAX_TOPUP_AMOUNT) {
      throw new BadRequestException(
        `Maximum top-up amount is ${CASHLESS_CONFIG.MAX_TOPUP_AMOUNT}`,
      );
    }

    // Validate festival
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new BadRequestException('Festival has been cancelled');
    }

    // Get or create account
    const account = await this.getOrCreateAccount(userId);

    if (!account.isActive) {
      throw new ForbiddenException('Cashless account is deactivated');
    }

    // Check max balance
    const newBalance = account.balance + amount;
    if (newBalance > CASHLESS_CONFIG.MAX_BALANCE) {
      throw new BadRequestException(
        `Maximum account balance is ${CASHLESS_CONFIG.MAX_BALANCE}. Current balance: ${account.balance}`,
      );
    }

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
    performedById?: string,
  ): Promise<CashlessTransactionEntity> {
    const { amount, festivalId, description, vendorId } = dto;

    // Validate amount
    if (amount < CASHLESS_CONFIG.MIN_PAYMENT_AMOUNT) {
      throw new BadRequestException('Payment amount must be positive');
    }

    // Validate festival
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new BadRequestException('Festival has been cancelled');
    }

    if (festival.status !== FestivalStatus.ONGOING) {
      throw new BadRequestException('Payments are only allowed during the festival');
    }

    // Get account
    const account = await this.getAccount(userId);

    if (!account.isActive) {
      throw new ForbiddenException('Cashless account is deactivated');
    }

    // Check sufficient balance
    if (account.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${account.balance}, Required: ${amount}`,
      );
    }

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
    performedById: string,
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
      throw new NotFoundException('Original transaction not found');
    }

    if (originalTransaction.type !== TransactionType.PAYMENT) {
      throw new BadRequestException('Can only refund payment transactions');
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
      throw new ConflictException('Transaction has already been refunded');
    }

    // Verify account ownership
    if (originalTransaction.account.userId !== userId) {
      throw new ForbiddenException('Cannot refund transactions from other users');
    }

    const account = originalTransaction.account;
    const refundAmount = Number(originalTransaction.amount);

    // Check max balance after refund
    const newBalance = Number(account.balance) + refundAmount;
    if (newBalance > CASHLESS_CONFIG.MAX_BALANCE) {
      throw new BadRequestException('Refund would exceed maximum account balance');
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
    limit: number = 50,
    offset: number = 0,
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
      throw new ConflictException('NFC tag is already registered to another account');
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
      throw new NotFoundException('No account found for this NFC tag');
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
      throw new NotFoundException('Cashless account not found');
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
