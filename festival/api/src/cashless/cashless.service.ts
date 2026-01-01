import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  TopupDto,
  PayDto,
  TransferDto,
  LinkNfcDto,
} from './dto';
import {
  CashlessAccount,
  CashlessTransaction,
  TransactionType,
  PaymentStatus,
  PaymentProvider,
  FestivalStatus,
} from '@prisma/client';
// Decimal is now a native Prisma type in v5+
type Decimal = { toNumber: () => number };

export interface TopupResult {
  paymentId: string;
  checkoutUrl: string;
  amount: number;
}

export interface PayResult {
  transactionId: string;
  newBalance: number;
  amount: number;
}

export interface TransferResult {
  transactionId: string;
  newBalance: number;
  amount: number;
}

export interface RefundResult {
  refundRequestId: string;
  amount: number;
  message: string;
}

@Injectable()
export class CashlessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new cashless account for a user
   */
  async createAccount(
    userId: string,
    dto: CreateAccountDto,
  ): Promise<CashlessAccount> {
    // Check if user already has an account
    const existingAccount = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
    });

    if (existingAccount) {
      throw new ConflictException('User already has a cashless account');
    }

    // If NFC tag provided, check if it's already in use
    if (dto.nfcTagId) {
      const existingNfc = await this.prisma.cashlessAccount.findUnique({
        where: { nfcTagId: dto.nfcTagId },
      });

      if (existingNfc) {
        throw new ConflictException('NFC tag is already linked to another account');
      }
    }

    return this.prisma.cashlessAccount.create({
      data: {
        userId,
        nfcTagId: dto.nfcTagId,
        balance: 0,
        isActive: true,
      },
    });
  }

  /**
   * Get user's cashless account with balance
   */
  async getAccount(userId: string): Promise<CashlessAccount> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Cashless account not found');
    }

    return account;
  }

  /**
   * Get account by NFC tag ID (for terminals)
   */
  async getAccountByNfcTag(nfcTagId: string): Promise<{
    accountId: string;
    balance: number;
    isActive: boolean;
    userName: string;
  }> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { nfcTagId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('No account linked to this NFC tag');
    }

    if (!account.isActive) {
      throw new ForbiddenException('This cashless account is deactivated');
    }

    return {
      accountId: account.id,
      balance: Number(account.balance),
      isActive: account.isActive,
      userName: `${account.user.firstName} ${account.user.lastName}`,
    };
  }

  /**
   * Initiate a topup - creates a pending payment and returns checkout URL
   */
  async topup(userId: string, dto: TopupDto): Promise<TopupResult> {
    const account = await this.getAccount(userId);

    if (!account.isActive) {
      throw new ForbiddenException('Cashless account is deactivated');
    }

    // Verify festival exists and is active
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (
      festival.status !== FestivalStatus.PUBLISHED &&
      festival.status !== FestivalStatus.ONGOING
    ) {
      throw new BadRequestException(
        'Festival is not accepting cashless topups at this time',
      );
    }

    // Create pending payment
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: festival.currency,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        description: `Cashless topup - ${festival.name}`,
        metadata: {
          type: 'cashless_topup',
          festivalId: dto.festivalId,
          accountId: account.id,
          successUrl: dto.successUrl,
          cancelUrl: dto.cancelUrl,
        },
      },
    });

    // In production, integrate with Stripe here
    // For now, return a mock checkout URL
    const checkoutUrl = `/checkout/cashless/${payment.id}?amount=${dto.amount}`;

    return {
      paymentId: payment.id,
      checkoutUrl,
      amount: dto.amount,
    };
  }

  /**
   * Process a successful topup payment (called by payment webhook)
   */
  async processTopup(
    paymentId: string,
    providerPaymentId: string,
  ): Promise<CashlessTransaction> {
    return this.prisma.$transaction(async (tx) => {
      // Get and lock the payment
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment has already been processed');
      }

      const metadata = payment.metadata as {
        type: string;
        festivalId: string;
        accountId: string;
      };

      if (metadata.type !== 'cashless_topup') {
        throw new BadRequestException('Payment is not a cashless topup');
      }

      // Get current account balance
      const account = await tx.cashlessAccount.findUnique({
        where: { id: metadata.accountId },
      });

      if (!account) {
        throw new NotFoundException('Cashless account not found');
      }

      const balanceBefore = account.balance;
      const balanceAfter = new Decimal(balanceBefore).plus(payment.amount);

      // Update account balance
      await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: balanceAfter },
      });

      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          providerPaymentId,
          paidAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId: metadata.festivalId,
          type: TransactionType.TOPUP,
          amount: payment.amount,
          balanceBefore,
          balanceAfter,
          description: 'Cashless account topup',
          paymentId: payment.id,
        },
      });

      return transaction;
    });
  }

  /**
   * Pay using cashless balance (for vendors/stands)
   */
  async pay(
    userId: string,
    dto: PayDto,
    performedById?: string,
  ): Promise<PayResult> {
    return this.prisma.$transaction(async (tx) => {
      // Get and lock the account
      const account = await tx.cashlessAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new NotFoundException('Cashless account not found');
      }

      if (!account.isActive) {
        throw new ForbiddenException('Cashless account is deactivated');
      }

      // Verify festival
      const festival = await tx.festival.findUnique({
        where: { id: dto.festivalId },
      });

      if (!festival) {
        throw new NotFoundException('Festival not found');
      }

      if (festival.status !== FestivalStatus.ONGOING) {
        throw new BadRequestException(
          'Payments are only allowed during the festival',
        );
      }

      // Check sufficient balance
      const amount = new Decimal(dto.amount);
      if (new Decimal(account.balance).lessThan(amount)) {
        throw new BadRequestException(
          `Insufficient balance. Current balance: ${account.balance}, Required: ${dto.amount}`,
        );
      }

      const balanceBefore = account.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(amount);

      // Update account balance
      await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId: dto.festivalId,
          type: TransactionType.PAYMENT,
          amount: amount.negated(),
          balanceBefore,
          balanceAfter,
          description: dto.description || 'Cashless payment',
          performedById,
          metadata: dto.vendorId ? { vendorId: dto.vendorId } : undefined,
        },
      });

      return {
        transactionId: transaction.id,
        newBalance: Number(balanceAfter),
        amount: dto.amount,
      };
    });
  }

  /**
   * Pay by NFC tag (for terminals)
   */
  async payByNfc(
    nfcTagId: string,
    dto: PayDto,
    performedById?: string,
  ): Promise<PayResult> {
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { nfcTagId },
    });

    if (!account) {
      throw new NotFoundException('No account linked to this NFC tag');
    }

    return this.payByAccountId(account.id, dto, performedById);
  }

  /**
   * Pay by account ID directly (internal use)
   */
  private async payByAccountId(
    accountId: string,
    dto: PayDto,
    performedById?: string,
  ): Promise<PayResult> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.cashlessAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException('Cashless account not found');
      }

      if (!account.isActive) {
        throw new ForbiddenException('Cashless account is deactivated');
      }

      // Verify festival
      const festival = await tx.festival.findUnique({
        where: { id: dto.festivalId },
      });

      if (!festival) {
        throw new NotFoundException('Festival not found');
      }

      if (festival.status !== FestivalStatus.ONGOING) {
        throw new BadRequestException(
          'Payments are only allowed during the festival',
        );
      }

      // Check sufficient balance
      const amount = new Decimal(dto.amount);
      if (new Decimal(account.balance).lessThan(amount)) {
        throw new BadRequestException(
          `Insufficient balance. Current balance: ${account.balance}, Required: ${dto.amount}`,
        );
      }

      const balanceBefore = account.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(amount);

      // Update account balance
      await tx.cashlessAccount.update({
        where: { id: accountId },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.cashlessTransaction.create({
        data: {
          accountId,
          festivalId: dto.festivalId,
          type: TransactionType.PAYMENT,
          amount: amount.negated(),
          balanceBefore,
          balanceAfter,
          description: dto.description || 'Cashless payment',
          performedById,
          metadata: dto.vendorId ? { vendorId: dto.vendorId } : undefined,
        },
      });

      return {
        transactionId: transaction.id,
        newBalance: Number(balanceAfter),
        amount: dto.amount,
      };
    });
  }

  /**
   * Transfer balance between two accounts
   */
  async transfer(userId: string, dto: TransferDto): Promise<TransferResult> {
    if (dto.toAccountId === userId) {
      throw new BadRequestException('Cannot transfer to your own account');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get sender account
      const senderAccount = await tx.cashlessAccount.findUnique({
        where: { userId },
      });

      if (!senderAccount) {
        throw new NotFoundException('Your cashless account not found');
      }

      if (!senderAccount.isActive) {
        throw new ForbiddenException('Your cashless account is deactivated');
      }

      // Get receiver account
      const receiverAccount = await tx.cashlessAccount.findUnique({
        where: { id: dto.toAccountId },
      });

      if (!receiverAccount) {
        throw new NotFoundException('Recipient cashless account not found');
      }

      if (!receiverAccount.isActive) {
        throw new BadRequestException(
          'Recipient cashless account is deactivated',
        );
      }

      // Verify festival
      const festival = await tx.festival.findUnique({
        where: { id: dto.festivalId },
      });

      if (!festival) {
        throw new NotFoundException('Festival not found');
      }

      // Check sufficient balance
      const amount = new Decimal(dto.amount);
      if (new Decimal(senderAccount.balance).lessThan(amount)) {
        throw new BadRequestException(
          `Insufficient balance. Current balance: ${senderAccount.balance}, Required: ${dto.amount}`,
        );
      }

      // Calculate new balances
      const senderBalanceBefore = senderAccount.balance;
      const senderBalanceAfter = new Decimal(senderBalanceBefore).minus(amount);

      const receiverBalanceBefore = receiverAccount.balance;
      const receiverBalanceAfter = new Decimal(receiverBalanceBefore).plus(amount);

      // Update sender balance
      await tx.cashlessAccount.update({
        where: { id: senderAccount.id },
        data: { balance: senderBalanceAfter },
      });

      // Update receiver balance
      await tx.cashlessAccount.update({
        where: { id: receiverAccount.id },
        data: { balance: receiverBalanceAfter },
      });

      // Create sender transaction (debit)
      const senderTransaction = await tx.cashlessTransaction.create({
        data: {
          accountId: senderAccount.id,
          festivalId: dto.festivalId,
          type: TransactionType.TRANSFER,
          amount: amount.negated(),
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceAfter,
          description: dto.description || `Transfer to account ${dto.toAccountId}`,
          metadata: { toAccountId: dto.toAccountId },
        },
      });

      // Create receiver transaction (credit)
      await tx.cashlessTransaction.create({
        data: {
          accountId: receiverAccount.id,
          festivalId: dto.festivalId,
          type: TransactionType.TRANSFER,
          amount,
          balanceBefore: receiverBalanceBefore,
          balanceAfter: receiverBalanceAfter,
          description: dto.description || `Transfer from account ${senderAccount.id}`,
          metadata: { fromAccountId: senderAccount.id },
        },
      });

      return {
        transactionId: senderTransaction.id,
        newBalance: Number(senderBalanceAfter),
        amount: dto.amount,
      };
    });
  }

  /**
   * Link an NFC tag to the user's account
   */
  async linkNfcTag(userId: string, dto: LinkNfcDto): Promise<CashlessAccount> {
    // Check if NFC tag is already in use
    const existingNfc = await this.prisma.cashlessAccount.findUnique({
      where: { nfcTagId: dto.nfcTagId },
    });

    if (existingNfc) {
      throw new ConflictException('NFC tag is already linked to another account');
    }

    // Update user's account with NFC tag
    const account = await this.prisma.cashlessAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException('Cashless account not found');
    }

    return this.prisma.cashlessAccount.update({
      where: { id: account.id },
      data: { nfcTagId: dto.nfcTagId },
    });
  }

  /**
   * Request refund of remaining balance (only after festival ends)
   */
  async refundBalance(userId: string, festivalId: string): Promise<RefundResult> {
    const account = await this.getAccount(userId);

    if (Number(account.balance) <= 0) {
      throw new BadRequestException('No balance to refund');
    }

    // Verify festival has ended
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.status !== FestivalStatus.COMPLETED) {
      throw new ForbiddenException(
        'Balance refunds are only available after the festival has ended',
      );
    }

    // Check if there's already a pending refund
    const pendingRefund = await this.prisma.payment.findFirst({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        metadata: {
          path: ['type'],
          equals: 'cashless_refund',
        },
      },
    });

    if (pendingRefund) {
      throw new ConflictException('You already have a pending refund request');
    }

    const refundAmount = account.balance;

    // Create refund payment record
    const refundPayment = await this.prisma.$transaction(async (tx) => {
      const balanceBefore = account.balance;

      // Create refund transaction
      await tx.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId,
          type: TransactionType.REFUND,
          amount: new Decimal(refundAmount).negated(),
          balanceBefore,
          balanceAfter: 0,
          description: 'Balance refund request',
        },
      });

      // Set balance to 0
      await tx.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: 0 },
      });

      // Create refund payment record
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: refundAmount,
          currency: festival.currency,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.BANK_TRANSFER,
          description: `Cashless balance refund - ${festival.name}`,
          metadata: {
            type: 'cashless_refund',
            festivalId,
            accountId: account.id,
          },
        },
      });

      return payment;
    });

    return {
      refundRequestId: refundPayment.id,
      amount: Number(refundAmount),
      message:
        'Refund request submitted. The refund will be processed within 14 business days.',
    };
  }

  /**
   * Get transaction history for user's account
   */
  async getTransactionHistory(
    userId: string,
    options?: {
      festivalId?: string;
      type?: TransactionType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    transactions: CashlessTransaction[];
    total: number;
    hasMore: boolean;
  }> {
    const account = await this.getAccount(userId);

    const where: {
      accountId: string;
      festivalId?: string;
      type?: TransactionType;
    } = {
      accountId: account.id,
    };

    if (options?.festivalId) {
      where.festivalId = options.festivalId;
    }

    if (options?.type) {
      where.type = options.type;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [transactions, total] = await Promise.all([
      this.prisma.cashlessTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          festival: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.cashlessTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      hasMore: offset + transactions.length < total,
    };
  }
}
