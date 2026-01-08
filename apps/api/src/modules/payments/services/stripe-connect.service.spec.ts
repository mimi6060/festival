/**
 * Stripe Connect Service Unit Tests
 *
 * Comprehensive tests for Stripe Connect functionality:
 * - Account creation and onboarding
 * - Account links and login links
 * - Balance and transfers
 * - Payouts management
 * - Account updates and deletion
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConnectAccountType } from '../dto/stripe-connect.dto';
import Stripe from 'stripe';

describe('StripeConnectService', () => {
  let stripeConnectService: StripeConnectService;
  let mockStripe: any;

  const mockPrismaService = {
    vendor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
      };
      return config[key];
    }),
  };

  const mockVendor = {
    id: 'vendor-uuid-test-123',
    name: 'Test Vendor',
    email: 'vendor@example.com',
    festivalId: 'festival-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStripeAccount: Partial<Stripe.Account> = {
    id: 'acct_test_123',
    type: 'express',
    email: 'vendor@example.com',
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    created: Math.floor(Date.now() / 1000),
    business_profile: {
      name: 'Test Vendor Business',
      url: 'https://vendor.example.com',
    } as Stripe.Account.BusinessProfile,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Stripe instance
    mockStripe = {
      accounts: {
        create: jest.fn().mockResolvedValue(mockStripeAccount),
        retrieve: jest.fn().mockResolvedValue(mockStripeAccount),
        update: jest.fn().mockResolvedValue(mockStripeAccount),
        del: jest.fn().mockResolvedValue({ deleted: true }),
        createLoginLink: jest.fn().mockResolvedValue({ url: 'https://dashboard.stripe.com/login' }),
      },
      accountLinks: {
        create: jest.fn().mockResolvedValue({
          url: 'https://connect.stripe.com/setup/account_onboarding',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      },
      balance: {
        retrieve: jest.fn().mockResolvedValue({
          available: [{ amount: 50000, currency: 'eur' }],
          pending: [{ amount: 10000, currency: 'eur' }],
        }),
      },
      transfers: {
        create: jest.fn().mockResolvedValue({
          id: 'tr_test_123',
          amount: 10000,
          currency: 'eur',
          destination: 'acct_test_123',
          created: Math.floor(Date.now() / 1000),
        }),
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'tr_test_1',
              amount: 5000,
              currency: 'eur',
              destination: 'acct_test_123',
              created: Math.floor(Date.now() / 1000),
            },
          ],
          has_more: false,
        }),
        createReversal: jest.fn().mockResolvedValue({
          id: 'trr_test_123',
          amount: 5000,
        }),
      },
      payouts: {
        create: jest.fn().mockResolvedValue({
          id: 'po_test_123',
          amount: 10000,
          currency: 'eur',
          status: 'pending',
          arrival_date: Math.floor(Date.now() / 1000) + 86400,
        }),
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'po_test_1',
              amount: 5000,
              currency: 'eur',
              status: 'paid',
              arrival_date: Math.floor(Date.now() / 1000),
            },
          ],
          has_more: false,
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeConnectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    stripeConnectService = module.get<StripeConnectService>(StripeConnectService);

    // Inject mock stripe instance directly
    (stripeConnectService as any).stripe = mockStripe;
  });

  // ==========================================================================
  // Create Connect Account Tests
  // ==========================================================================

  describe('createConnectAccount', () => {
    const validDto = {
      vendorId: mockVendor.id,
      type: ConnectAccountType.EXPRESS,
      email: 'vendor@example.com',
      country: 'FR',
      businessType: 'individual' as const,
      businessProfileName: 'Test Vendor',
      businessProfileUrl: 'https://vendor.example.com',
    };

    it('should create Connect account successfully', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendor.update.mockResolvedValue(mockVendor);

      const result = await stripeConnectService.createConnectAccount(validDto);

      expect(result.accountId).toBe(mockStripeAccount.id);
      expect(result.type).toBe(mockStripeAccount.type);
      expect(result.chargesEnabled).toBe(mockStripeAccount.charges_enabled);
      expect(result.payoutsEnabled).toBe(mockStripeAccount.payouts_enabled);
      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          email: validDto.email,
          country: validDto.country,
        })
      );
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(
        stripeConnectService.createConnectAccount(validDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include business profile when provided', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendor.update.mockResolvedValue(mockVendor);

      await stripeConnectService.createConnectAccount(validDto);

      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          business_profile: {
            name: validDto.businessProfileName,
            url: validDto.businessProfileUrl,
          },
        })
      );
    });

    it('should include metadata with vendorId', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendor.update.mockResolvedValue(mockVendor);

      await stripeConnectService.createConnectAccount({
        ...validDto,
        metadata: { customField: 'value' },
      });

      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            vendorId: validDto.vendorId,
            customField: 'value',
          }),
        })
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid request',
        type: 'invalid_request_error',
      });
      mockStripe.accounts.create.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.createConnectAccount(validDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should create standard account when type is STANDARD', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendor.update.mockResolvedValue(mockVendor);

      await stripeConnectService.createConnectAccount({
        ...validDto,
        type: ConnectAccountType.STANDARD,
      });

      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'standard',
        })
      );
    });
  });

  // ==========================================================================
  // Create Account Link Tests
  // ==========================================================================

  describe('createAccountLink', () => {
    const validDto = {
      accountId: 'acct_test_123',
      refreshUrl: 'https://example.com/refresh',
      returnUrl: 'https://example.com/return',
      type: 'account_onboarding',
    };

    it('should create account link successfully', async () => {
      const result = await stripeConnectService.createAccountLink(validDto);

      expect(result.url).toBe('https://connect.stripe.com/setup/account_onboarding');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: validDto.accountId,
        refresh_url: validDto.refreshUrl,
        return_url: validDto.returnUrl,
        type: validDto.type,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Account not found',
        type: 'invalid_request_error',
      });
      mockStripe.accountLinks.create.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.createAccountLink(validDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Create Login Link Tests
  // ==========================================================================

  describe('createLoginLink', () => {
    it('should create login link successfully', async () => {
      const result = await stripeConnectService.createLoginLink('acct_test_123');

      expect(result.url).toBe('https://dashboard.stripe.com/login');
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith('acct_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Account not found',
        type: 'invalid_request_error',
      });
      mockStripe.accounts.createLoginLink.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.createLoginLink('invalid_account')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Get Account Tests
  // ==========================================================================

  describe('getAccount', () => {
    it('should retrieve account successfully', async () => {
      const result = await stripeConnectService.getAccount('acct_test_123');

      expect(result.accountId).toBe(mockStripeAccount.id);
      expect(result.type).toBe(mockStripeAccount.type);
      expect(result.chargesEnabled).toBe(mockStripeAccount.charges_enabled);
      expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith('acct_test_123');
    });

    it('should throw NotFoundException for invalid account', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such account',
        type: 'invalid_request_error',
        code: 'account_invalid',
      });
      mockStripe.accounts.retrieve.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.getAccount('invalid_account')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other Stripe errors', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Other error',
        type: 'invalid_request_error',
      });
      mockStripe.accounts.retrieve.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.getAccount('acct_test_123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Get Account Balance Tests
  // ==========================================================================

  describe('getAccountBalance', () => {
    it('should retrieve account balance successfully', async () => {
      const result = await stripeConnectService.getAccountBalance('acct_test_123');

      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(50000);
      expect(result[0].pending).toBe(10000);
      expect(result[0].currency).toBe('eur');
      expect(mockStripe.balance.retrieve).toHaveBeenCalledWith({
        stripeAccount: 'acct_test_123',
      });
    });

    it('should handle multiple currencies', async () => {
      mockStripe.balance.retrieve.mockResolvedValue({
        available: [
          { amount: 50000, currency: 'eur' },
          { amount: 10000, currency: 'usd' },
        ],
        pending: [
          { amount: 5000, currency: 'eur' },
          { amount: 2000, currency: 'usd' },
        ],
      });

      const result = await stripeConnectService.getAccountBalance('acct_test_123');

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('eur');
      expect(result[1].currency).toBe('usd');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Account not found',
        type: 'invalid_request_error',
      });
      mockStripe.balance.retrieve.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.getAccountBalance('invalid_account')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Create Transfer Tests
  // ==========================================================================

  describe('createTransfer', () => {
    const validDto = {
      destinationAccountId: 'acct_test_123',
      amount: 10000,
      currency: 'eur',
      description: 'Test transfer',
      transferGroup: 'order_123',
    };

    it('should create transfer successfully', async () => {
      const result = await stripeConnectService.createTransfer(validDto);

      expect(result.transferId).toBe('tr_test_123');
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('eur');
      expect(mockStripe.transfers.create).toHaveBeenCalledWith({
        amount: validDto.amount,
        currency: validDto.currency,
        destination: validDto.destinationAccountId,
        description: validDto.description,
        transfer_group: validDto.transferGroup,
        metadata: undefined,
      });
    });

    it('should include source charge when provided', async () => {
      await stripeConnectService.createTransfer({
        ...validDto,
        sourceChargeId: 'ch_test_123',
      });

      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source_transaction: 'ch_test_123',
        })
      );
    });

    it('should include metadata when provided', async () => {
      await stripeConnectService.createTransfer({
        ...validDto,
        metadata: { orderId: 'order-123' },
      });

      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { orderId: 'order-123' },
        })
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Insufficient funds',
        type: 'invalid_request_error',
      });
      mockStripe.transfers.create.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.createTransfer(validDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Create Payout Tests
  // ==========================================================================

  describe('createPayout', () => {
    const validDto = {
      accountId: 'acct_test_123',
      amount: 10000,
      currency: 'eur',
      description: 'Weekly payout',
      statementDescriptor: 'Festival Payout',
    };

    it('should create payout successfully', async () => {
      const result = await stripeConnectService.createPayout(validDto);

      expect(result.payoutId).toBe('po_test_123');
      expect(result.amount).toBe(10000);
      expect(result.status).toBe('pending');
      expect(mockStripe.payouts.create).toHaveBeenCalledWith(
        {
          amount: validDto.amount,
          currency: validDto.currency,
          description: validDto.description,
          statement_descriptor: validDto.statementDescriptor,
          metadata: undefined,
        },
        { stripeAccount: validDto.accountId }
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Insufficient balance',
        type: 'invalid_request_error',
      });
      mockStripe.payouts.create.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.createPayout(validDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Reverse Transfer Tests
  // ==========================================================================

  describe('reverseTransfer', () => {
    it('should reverse transfer successfully', async () => {
      const result = await stripeConnectService.reverseTransfer('tr_test_123');

      expect(result.reversalId).toBe('trr_test_123');
      expect(result.amount).toBe(5000);
      expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith('tr_test_123', {
        amount: undefined,
        refund_application_fee: undefined,
      });
    });

    it('should reverse partial amount', async () => {
      await stripeConnectService.reverseTransfer('tr_test_123', 2500);

      expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith('tr_test_123', {
        amount: 2500,
        refund_application_fee: undefined,
      });
    });

    it('should refund application fee when specified', async () => {
      await stripeConnectService.reverseTransfer('tr_test_123', undefined, true);

      expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith('tr_test_123', {
        amount: undefined,
        refund_application_fee: true,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Transfer not found',
        type: 'invalid_request_error',
      });
      mockStripe.transfers.createReversal.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.reverseTransfer('invalid_transfer')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Update Account Tests
  // ==========================================================================

  describe('updateAccount', () => {
    it('should update account email', async () => {
      const result = await stripeConnectService.updateAccount('acct_test_123', {
        email: 'newemail@example.com',
      });

      expect(result.accountId).toBe(mockStripeAccount.id);
      expect(mockStripe.accounts.update).toHaveBeenCalledWith('acct_test_123', {
        email: 'newemail@example.com',
      });
    });

    it('should update business profile', async () => {
      await stripeConnectService.updateAccount('acct_test_123', {
        businessProfileName: 'New Business Name',
        businessProfileUrl: 'https://newbusiness.com',
      });

      expect(mockStripe.accounts.update).toHaveBeenCalledWith('acct_test_123', {
        business_profile: {
          name: 'New Business Name',
          url: 'https://newbusiness.com',
        },
      });
    });

    it('should update metadata', async () => {
      await stripeConnectService.updateAccount('acct_test_123', {
        metadata: { key: 'value' },
      });

      expect(mockStripe.accounts.update).toHaveBeenCalledWith('acct_test_123', {
        metadata: { key: 'value' },
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid update',
        type: 'invalid_request_error',
      });
      mockStripe.accounts.update.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.updateAccount('acct_test_123', { email: 'test@test.com' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Delete Account Tests
  // ==========================================================================

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const result = await stripeConnectService.deleteAccount('acct_test_123');

      expect(result.deleted).toBe(true);
      expect(mockStripe.accounts.del).toHaveBeenCalledWith('acct_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Cannot delete account',
        type: 'invalid_request_error',
      });
      mockStripe.accounts.del.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.deleteAccount('acct_test_123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // List Transfers Tests
  // ==========================================================================

  describe('listTransfers', () => {
    it('should list transfers successfully', async () => {
      const result = await stripeConnectService.listTransfers();

      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].transferId).toBe('tr_test_1');
      expect(result.hasMore).toBe(false);
    });

    it('should filter by destination account', async () => {
      await stripeConnectService.listTransfers('acct_test_123', 10);

      expect(mockStripe.transfers.list).toHaveBeenCalledWith({
        limit: 10,
        destination: 'acct_test_123',
      });
    });

    it('should support pagination with startingAfter', async () => {
      await stripeConnectService.listTransfers(undefined, 10, 'tr_last');

      expect(mockStripe.transfers.list).toHaveBeenCalledWith({
        limit: 10,
        starting_after: 'tr_last',
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid request',
        type: 'invalid_request_error',
      });
      mockStripe.transfers.list.mockRejectedValue(stripeError);

      await expect(stripeConnectService.listTransfers()).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ==========================================================================
  // List Payouts Tests
  // ==========================================================================

  describe('listPayouts', () => {
    it('should list payouts successfully', async () => {
      const result = await stripeConnectService.listPayouts('acct_test_123');

      expect(result.payouts).toHaveLength(1);
      expect(result.payouts[0].payoutId).toBe('po_test_1');
      expect(result.hasMore).toBe(false);
    });

    it('should support pagination', async () => {
      await stripeConnectService.listPayouts('acct_test_123', 20, 'po_last');

      expect(mockStripe.payouts.list).toHaveBeenCalledWith(
        { limit: 20, starting_after: 'po_last' },
        { stripeAccount: 'acct_test_123' }
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Account not found',
        type: 'invalid_request_error',
      });
      mockStripe.payouts.list.mockRejectedValue(stripeError);

      await expect(
        stripeConnectService.listPayouts('invalid_account')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Stripe Not Configured Tests
  // ==========================================================================

  describe('Stripe not configured', () => {
    let serviceNoStripe: StripeConnectService;

    beforeEach(async () => {
      const mockConfigServiceNoStripe = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeConnectService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigServiceNoStripe },
        ],
      }).compile();

      serviceNoStripe = module.get<StripeConnectService>(StripeConnectService);
    });

    it('should throw InternalServerErrorException when creating account without Stripe', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      await expect(
        serviceNoStripe.createConnectAccount({
          vendorId: mockVendor.id,
          type: ConnectAccountType.EXPRESS,
          email: 'test@example.com',
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when getting account without Stripe', async () => {
      await expect(serviceNoStripe.getAccount('acct_test_123')).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when creating transfer without Stripe', async () => {
      await expect(
        serviceNoStripe.createTransfer({
          destinationAccountId: 'acct_test_123',
          amount: 1000,
        })
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when creating payout without Stripe', async () => {
      await expect(
        serviceNoStripe.createPayout({
          accountId: 'acct_test_123',
          amount: 1000,
        })
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
