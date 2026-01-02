import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  FestivalStatus,
  PaymentStatus,
  PaymentProvider,
  TransactionType,
} from '@prisma/client';
import { CashlessService, TopupResult, PayResult, TransferResult } from '../cashless.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, TopupDto, PayDto, TransferDto, LinkNfcDto } from '../dto';

// Mock Decimal for balance calculations
class MockDecimal {
  private value: number;

  constructor(value: number | { toNumber: () => number } | string) {
    if (typeof value === 'object' && 'toNumber' in value) {
      this.value = value.toNumber();
    } else if (typeof value === 'string') {
      this.value = parseFloat(value);
    } else {
      this.value = value;
    }
  }

  plus(other: number | MockDecimal): MockDecimal {
    const otherValue = other instanceof MockDecimal ? other.value : other;
    return new MockDecimal(this.value + otherValue);
  }

  minus(other: number | MockDecimal): MockDecimal {
    const otherValue = other instanceof MockDecimal ? other.value : other;
    return new MockDecimal(this.value - otherValue);
  }

  lessThan(other: number | MockDecimal): boolean {
    const otherValue = other instanceof MockDecimal ? other.value : other;
    return this.value < otherValue;
  }

  negated(): MockDecimal {
    return new MockDecimal(-this.value);
  }

  toNumber(): number {
    return this.value;
  }
}

// Mock the Decimal import in the service
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    Decimal: MockDecimal,
  };
});

describe('CashlessService', () => {
  let service: CashlessService;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock data
  const mockUserId = 'user-123';
  const mockFestivalId = 'festival-123';
  const mockAccountId = 'account-123';
  const mockNfcTagId = 'nfc-tag-123';

  const mockFestival = {
    id: mockFestivalId,
    name: 'Summer Festival',
    status: FestivalStatus.ONGOING,
    currency: 'EUR',
  };

  const mockPublishedFestival = {
    ...mockFestival,
    status: FestivalStatus.PUBLISHED,
  };

  const mockCompletedFestival = {
    ...mockFestival,
    status: FestivalStatus.COMPLETED,
  };

  const mockAccount = {
    id: mockAccountId,
    userId: mockUserId,
    balance: 100,
    nfcTagId: mockNfcTagId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockPayment = {
    id: 'payment-123',
    userId: mockUserId,
    amount: 50,
    currency: 'EUR',
    status: PaymentStatus.PENDING,
    provider: PaymentProvider.STRIPE,
    metadata: {
      type: 'cashless_topup',
      festivalId: mockFestivalId,
      accountId: mockAccountId,
    },
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((callback) => callback({
      payment: {
        findUnique: jest.fn().mockResolvedValue(mockPayment),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'new-payment-id' }),
      },
      cashlessAccount: {
        findUnique: jest.fn().mockResolvedValue(mockAccount),
        update: jest.fn().mockResolvedValue(mockAccount),
      },
      cashlessTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
      },
      festival: {
        findUnique: jest.fn().mockResolvedValue(mockFestival),
      },
    }));

    const mockPrismaService = {
      cashlessAccount: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cashlessTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      festival: {
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: mockTransaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashlessService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CashlessService>(CashlessService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create a new cashless account', async () => {
      // Arrange
      const createDto: CreateAccountDto = {};
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.cashlessAccount.create as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await service.createAccount(mockUserId, createDto);

      // Assert
      expect(result.id).toBe(mockAccountId);
      expect(prismaService.cashlessAccount.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          nfcTagId: undefined,
          balance: 0,
          isActive: true,
        },
      });
    });

    it('should create account with NFC tag', async () => {
      // Arrange
      const createDto: CreateAccountDto = { nfcTagId: 'new-nfc-tag' };
      (prismaService.cashlessAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // User check
        .mockResolvedValueOnce(null); // NFC check
      (prismaService.cashlessAccount.create as jest.Mock).mockResolvedValue({
        ...mockAccount,
        nfcTagId: 'new-nfc-tag',
      });

      // Act
      const result = await service.createAccount(mockUserId, createDto);

      // Assert
      expect(result.nfcTagId).toBe('new-nfc-tag');
    });

    it('should throw ConflictException when user already has account', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.createAccount(mockUserId, {})).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createAccount(mockUserId, {})).rejects.toThrow(
        'User already has a cashless account',
      );
    });

    it('should throw ConflictException when NFC tag is already in use', async () => {
      // Arrange
      const createDto: CreateAccountDto = { nfcTagId: 'existing-nfc' };
      (prismaService.cashlessAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // User check - no account
        .mockResolvedValueOnce(mockAccount); // NFC check - already exists

      // Act & Assert
      await expect(service.createAccount(mockUserId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createAccount(mockUserId, createDto)).rejects.toThrow(
        'NFC tag is already linked to another account',
      );
    });
  });

  describe('getAccount', () => {
    it('should return user account', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await service.getAccount(mockUserId);

      // Assert
      expect(result.id).toBe(mockAccountId);
      expect(result.balance).toBe(100);
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAccount('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAccount('unknown-user')).rejects.toThrow(
        'Cashless account not found',
      );
    });
  });

  describe('getAccountByNfcTag', () => {
    it('should return account by NFC tag', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await service.getAccountByNfcTag(mockNfcTagId);

      // Assert
      expect(result.accountId).toBe(mockAccountId);
      expect(result.balance).toBe(100);
      expect(result.userName).toBe('John Doe');
    });

    it('should throw NotFoundException for unknown NFC tag', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAccountByNfcTag('unknown-nfc')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAccountByNfcTag('unknown-nfc')).rejects.toThrow(
        'No account linked to this NFC tag',
      );
    });

    it('should throw ForbiddenException for deactivated account', async () => {
      // Arrange
      const deactivatedAccount = { ...mockAccount, isActive: false };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(
        deactivatedAccount,
      );

      // Act & Assert
      await expect(service.getAccountByNfcTag(mockNfcTagId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getAccountByNfcTag(mockNfcTagId)).rejects.toThrow(
        'This cashless account is deactivated',
      );
    });
  });

  describe('topup', () => {
    it('should create topup request', async () => {
      // Arrange
      const topupDto: TopupDto = {
        festivalId: mockFestivalId,
        amount: 50,
      };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockPublishedFestival);
      (prismaService.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      // Act
      const result = await service.topup(mockUserId, topupDto);

      // Assert
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('checkoutUrl');
      expect(result.amount).toBe(50);
    });

    it('should throw ForbiddenException for deactivated account', async () => {
      // Arrange
      const deactivatedAccount = { ...mockAccount, isActive: false };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(
        deactivatedAccount,
      );

      // Act & Assert
      await expect(
        service.topup(mockUserId, { festivalId: mockFestivalId, amount: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.topup(mockUserId, { festivalId: 'unknown', amount: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-active festival', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);

      // Act & Assert
      await expect(
        service.topup(mockUserId, { festivalId: mockFestivalId, amount: 50 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.topup(mockUserId, { festivalId: mockFestivalId, amount: 50 }),
      ).rejects.toThrow('Festival is not accepting cashless topups at this time');
    });
  });

  describe('pay', () => {
    it('should process payment successfully', async () => {
      // Arrange
      const payDto: PayDto = {
        festivalId: mockFestivalId,
        amount: 30,
        description: 'Food purchase',
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(mockAccount),
          update: jest.fn().mockResolvedValue({ ...mockAccount, balance: 70 }),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockFestival),
        },
        cashlessTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.pay(mockUserId, payDto);

      // Assert
      expect(result.transactionId).toBe('tx-123');
      expect(result.newBalance).toBe(70);
      expect(result.amount).toBe(30);
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 30 };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for deactivated account', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 30 };
      const deactivatedAccount = { ...mockAccount, isActive: false };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(deactivatedAccount),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-ongoing festival', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 30 };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(mockAccount),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockPublishedFestival), // Not ONGOING
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(BadRequestException);
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(
        'Payments are only allowed during the festival',
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 200 }; // More than balance
      const lowBalanceAccount = { ...mockAccount, balance: 50 };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(lowBalanceAccount),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockFestival),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(BadRequestException);
      await expect(service.pay(mockUserId, payDto)).rejects.toThrow(/Insufficient balance/);
    });
  });

  describe('transfer', () => {
    it('should transfer balance successfully', async () => {
      // Arrange
      const receiverAccount = {
        ...mockAccount,
        id: 'receiver-account',
        userId: 'receiver-user',
        balance: 50,
      };
      const transferDto: TransferDto = {
        toAccountId: 'receiver-account',
        festivalId: mockFestivalId,
        amount: 30,
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(mockAccount) // Sender
            .mockResolvedValueOnce(receiverAccount), // Receiver
          update: jest.fn(),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockFestival),
        },
        cashlessTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-sender' }),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.transfer(mockUserId, transferDto);

      // Assert
      expect(result.transactionId).toBe('tx-sender');
      expect(result.amount).toBe(30);
      expect(mockTx.cashlessTransaction.create).toHaveBeenCalledTimes(2); // Sender and receiver transactions
    });

    it('should throw BadRequestException when transferring to own account', async () => {
      // Arrange
      const transferDto: TransferDto = {
        toAccountId: mockUserId, // Same as sender
        festivalId: mockFestivalId,
        amount: 30,
      };

      // Act & Assert
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        'Cannot transfer to your own account',
      );
    });

    it('should throw NotFoundException for non-existent sender account', async () => {
      // Arrange
      const transferDto: TransferDto = {
        toAccountId: 'receiver-account',
        festivalId: mockFestivalId,
        amount: 30,
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        'Your cashless account not found',
      );
    });

    it('should throw NotFoundException for non-existent receiver account', async () => {
      // Arrange
      const transferDto: TransferDto = {
        toAccountId: 'unknown-receiver',
        festivalId: mockFestivalId,
        amount: 30,
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(mockAccount) // Sender
            .mockResolvedValueOnce(null), // Receiver not found
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        'Recipient cashless account not found',
      );
    });

    it('should throw BadRequestException for deactivated receiver account', async () => {
      // Arrange
      const deactivatedReceiver = {
        ...mockAccount,
        id: 'receiver-account',
        userId: 'receiver-user',
        isActive: false,
      };
      const transferDto: TransferDto = {
        toAccountId: 'receiver-account',
        festivalId: mockFestivalId,
        amount: 30,
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(mockAccount)
            .mockResolvedValueOnce(deactivatedReceiver),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        'Recipient cashless account is deactivated',
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      // Arrange
      const lowBalanceAccount = { ...mockAccount, balance: 10 };
      const receiverAccount = { ...mockAccount, id: 'receiver', userId: 'receiver-user' };
      const transferDto: TransferDto = {
        toAccountId: 'receiver',
        festivalId: mockFestivalId,
        amount: 50, // More than balance
      };

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(lowBalanceAccount)
            .mockResolvedValueOnce(receiverAccount),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockFestival),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act & Assert
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transfer(mockUserId, transferDto)).rejects.toThrow(
        /Insufficient balance/,
      );
    });
  });

  describe('linkNfcTag', () => {
    it('should link NFC tag to account', async () => {
      // Arrange
      const linkDto: LinkNfcDto = { nfcTagId: 'new-nfc-tag' };
      const accountWithoutNfc = { ...mockAccount, nfcTagId: null };

      (prismaService.cashlessAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // NFC tag check
        .mockResolvedValueOnce(accountWithoutNfc); // User account
      (prismaService.cashlessAccount.update as jest.Mock).mockResolvedValue({
        ...accountWithoutNfc,
        nfcTagId: 'new-nfc-tag',
      });

      // Act
      const result = await service.linkNfcTag(mockUserId, linkDto);

      // Assert
      expect(result.nfcTagId).toBe('new-nfc-tag');
    });

    it('should throw ConflictException when NFC is already linked', async () => {
      // Arrange
      const linkDto: LinkNfcDto = { nfcTagId: 'existing-nfc' };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.linkNfcTag(mockUserId, linkDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.linkNfcTag(mockUserId, linkDto)).rejects.toThrow(
        'NFC tag is already linked to another account',
      );
    });

    it('should throw NotFoundException for non-existent account', async () => {
      // Arrange
      const linkDto: LinkNfcDto = { nfcTagId: 'new-nfc' };
      (prismaService.cashlessAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // NFC check
        .mockResolvedValueOnce(null); // Account not found

      // Act & Assert
      await expect(service.linkNfcTag('unknown-user', linkDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refundBalance', () => {
    it('should request balance refund after festival ends', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockCompletedFestival);
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTx = {
        cashlessTransaction: { create: jest.fn() },
        cashlessAccount: { update: jest.fn() },
        payment: { create: jest.fn().mockResolvedValue({ id: 'refund-payment-123' }) },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.refundBalance(mockUserId, mockFestivalId);

      // Assert
      expect(result.refundRequestId).toBe('refund-payment-123');
      expect(result.amount).toBe(100);
      expect(result.message).toContain('Refund request submitted');
    });

    it('should throw BadRequestException when balance is zero', async () => {
      // Arrange
      const zeroBalanceAccount = { ...mockAccount, balance: 0 };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(zeroBalanceAccount);

      // Act & Assert
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        'No balance to refund',
      );
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.refundBalance(mockUserId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if festival is not completed', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival); // ONGOING

      // Act & Assert
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        'Balance refunds are only available after the festival has ended',
      );
    });

    it('should throw ConflictException if pending refund exists', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockCompletedFestival);
      (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment); // Pending refund exists

      // Act & Assert
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.refundBalance(mockUserId, mockFestivalId)).rejects.toThrow(
        'You already have a pending refund request',
      );
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      // Arrange
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.TOPUP,
          amount: 50,
          createdAt: new Date(),
          festival: { id: mockFestivalId, name: 'Summer Festival' },
        },
        {
          id: 'tx-2',
          type: TransactionType.PAYMENT,
          amount: -20,
          createdAt: new Date(),
          festival: { id: mockFestivalId, name: 'Summer Festival' },
        },
      ];

      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.cashlessTransaction.findMany as jest.Mock).mockResolvedValue(transactions);
      (prismaService.cashlessTransaction.count as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await service.getTransactionHistory(mockUserId);

      // Assert
      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by festival ID', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.cashlessTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.cashlessTransaction.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getTransactionHistory(mockUserId, { festivalId: mockFestivalId });

      // Assert
      expect(prismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: mockFestivalId,
          }),
        }),
      );
    });

    it('should filter by transaction type', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.cashlessTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.cashlessTransaction.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getTransactionHistory(mockUserId, { type: TransactionType.PAYMENT });

      // Assert
      expect(prismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.PAYMENT,
          }),
        }),
      );
    });

    it('should apply pagination', async () => {
      // Arrange
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prismaService.cashlessTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.cashlessTransaction.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await service.getTransactionHistory(mockUserId, {
        limit: 10,
        offset: 20,
      });

      // Assert
      expect(prismaService.cashlessTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
      expect(result.hasMore).toBe(true);
    });
  });

  describe('payByNfc', () => {
    it('should process payment by NFC tag', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 30 };

      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const mockTx = {
        cashlessAccount: {
          findUnique: jest.fn().mockResolvedValue(mockAccount),
          update: jest.fn().mockResolvedValue({ ...mockAccount, balance: 70 }),
        },
        festival: {
          findUnique: jest.fn().mockResolvedValue(mockFestival),
        },
        cashlessTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

      // Act
      const result = await service.payByNfc(mockNfcTagId, payDto);

      // Assert
      expect(result.transactionId).toBe('tx-123');
      expect(result.amount).toBe(30);
    });

    it('should throw NotFoundException for unknown NFC tag', async () => {
      // Arrange
      const payDto: PayDto = { festivalId: mockFestivalId, amount: 30 };
      (prismaService.cashlessAccount.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.payByNfc('unknown-nfc', payDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
