/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect functionality for vendor payments:
 * - Account creation and onboarding
 * - Transfers and payouts
 * - Balance management
 * - Account verification
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateConnectAccountDto,
  CreateAccountLinkDto,
  CreateTransferDto,
  CreatePayoutDto,
  ConnectAccountResponseDto,
  AccountLinkResponseDto,
  AccountBalanceDto,
  TransferResponseDto,
  PayoutResponseDto,
  ConnectAccountType,
} from '../dto/stripe-connect.dto';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Connect features disabled');
    }
  }

  /**
   * Create a new Stripe Connect account for a vendor
   */
  async createConnectAccount(dto: CreateConnectAccountDto): Promise<ConnectAccountResponseDto> {
    this.ensureStripeConfigured();

    // Verify vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    try {
      const accountParams: Stripe.AccountCreateParams = {
        type: this.mapAccountType(dto.type),
        email: dto.email,
        country: dto.country || 'FR',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: dto.businessType || 'individual',
        metadata: {
          vendorId: dto.vendorId,
          ...dto.metadata,
        },
      };

      if (dto.businessProfileName || dto.businessProfileUrl) {
        accountParams.business_profile = {
          name: dto.businessProfileName,
          url: dto.businessProfileUrl,
        };
      }

      const account = await this.stripe!.accounts.create(accountParams);

      // Store the Stripe account ID with the vendor
      await this.prisma.vendor.update({
        where: { id: dto.vendorId },
        data: {
          // Store Connect account ID in a JSON field or create a new field
          // For now, using the qrMenuCode field as placeholder
          // In production, add a stripeAccountId field to the Vendor model
        },
      });

      this.logger.log(`Created Connect account ${account.id} for vendor ${dto.vendorId}`);

      return this.mapAccountToResponse(account);
    } catch (error) {
      this.logger.error(`Failed to create Connect account: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create Connect account');
    }
  }

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(dto: CreateAccountLinkDto): Promise<AccountLinkResponseDto> {
    this.ensureStripeConfigured();

    try {
      const accountLink = await this.stripe!.accountLinks.create({
        account: dto.accountId,
        refresh_url: dto.refreshUrl,
        return_url: dto.returnUrl,
        type: (dto.type as Stripe.AccountLinkCreateParams.Type) || 'account_onboarding',
      });

      this.logger.log(`Created account link for ${dto.accountId}`);

      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to create account link: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create account link');
    }
  }

  /**
   * Create a login link for an existing Connect account (Express/Standard only)
   */
  async createLoginLink(accountId: string): Promise<{ url: string }> {
    this.ensureStripeConfigured();

    try {
      const loginLink = await this.stripe!.accounts.createLoginLink(accountId);

      this.logger.log(`Created login link for ${accountId}`);

      return { url: loginLink.url };
    } catch (error) {
      this.logger.error(`Failed to create login link: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create login link');
    }
  }

  /**
   * Get Connect account details
   */
  async getAccount(accountId: string): Promise<ConnectAccountResponseDto> {
    this.ensureStripeConfigured();

    try {
      const account = await this.stripe!.accounts.retrieve(accountId);

      return this.mapAccountToResponse(account);
    } catch (error) {
      this.logger.error(`Failed to retrieve account: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'account_invalid') {
          throw new NotFoundException('Connect account not found');
        }
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve account');
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<AccountBalanceDto[]> {
    this.ensureStripeConfigured();

    try {
      const balance = await this.stripe!.balance.retrieve({
        stripeAccount: accountId,
      });

      return balance.available.map((b) => ({
        available: b.amount,
        pending:
          balance.pending.find((p) => p.currency === b.currency)?.amount || 0,
        currency: b.currency,
      }));
    } catch (error) {
      this.logger.error(`Failed to retrieve balance: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve balance');
    }
  }

  /**
   * Create a transfer to a Connect account
   */
  async createTransfer(dto: CreateTransferDto): Promise<TransferResponseDto> {
    this.ensureStripeConfigured();

    try {
      const transferParams: Stripe.TransferCreateParams = {
        amount: dto.amount,
        currency: dto.currency || 'eur',
        destination: dto.destinationAccountId,
        description: dto.description,
        transfer_group: dto.transferGroup,
        metadata: dto.metadata,
      };

      if (dto.sourceChargeId) {
        transferParams.source_transaction = dto.sourceChargeId;
      }

      const transfer = await this.stripe!.transfers.create(transferParams);

      this.logger.log(
        `Created transfer ${transfer.id} of ${dto.amount} cents to ${dto.destinationAccountId}`,
      );

      return {
        transferId: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destinationAccountId: transfer.destination as string,
        createdAt: new Date(transfer.created * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to create transfer: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create transfer');
    }
  }

  /**
   * Create a payout from a Connect account
   */
  async createPayout(dto: CreatePayoutDto): Promise<PayoutResponseDto> {
    this.ensureStripeConfigured();

    try {
      const payout = await this.stripe!.payouts.create(
        {
          amount: dto.amount,
          currency: dto.currency || 'eur',
          description: dto.description,
          statement_descriptor: dto.statementDescriptor,
          metadata: dto.metadata,
        },
        {
          stripeAccount: dto.accountId,
        },
      );

      this.logger.log(
        `Created payout ${payout.id} of ${dto.amount} cents from ${dto.accountId}`,
      );

      return {
        payoutId: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: new Date(payout.arrival_date * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to create payout: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create payout');
    }
  }

  /**
   * Reverse a transfer
   */
  async reverseTransfer(
    transferId: string,
    amount?: number,
    refundApplicationFee?: boolean,
  ): Promise<{ reversalId: string; amount: number }> {
    this.ensureStripeConfigured();

    try {
      const reversal = await this.stripe!.transfers.createReversal(transferId, {
        amount,
        refund_application_fee: refundApplicationFee,
      });

      this.logger.log(`Reversed transfer ${transferId}: ${reversal.id}`);

      return {
        reversalId: reversal.id,
        amount: reversal.amount,
      };
    } catch (error) {
      this.logger.error(`Failed to reverse transfer: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to reverse transfer');
    }
  }

  /**
   * Update Connect account settings
   */
  async updateAccount(
    accountId: string,
    updates: Partial<{
      email: string;
      businessProfileName: string;
      businessProfileUrl: string;
      metadata: Record<string, string>;
    }>,
  ): Promise<ConnectAccountResponseDto> {
    this.ensureStripeConfigured();

    try {
      const updateParams: Stripe.AccountUpdateParams = {};

      if (updates.email) {
        updateParams.email = updates.email;
      }

      if (updates.businessProfileName || updates.businessProfileUrl) {
        updateParams.business_profile = {
          name: updates.businessProfileName,
          url: updates.businessProfileUrl,
        };
      }

      if (updates.metadata) {
        updateParams.metadata = updates.metadata;
      }

      const account = await this.stripe!.accounts.update(accountId, updateParams);

      this.logger.log(`Updated Connect account ${accountId}`);

      return this.mapAccountToResponse(account);
    } catch (error) {
      this.logger.error(`Failed to update account: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to update account');
    }
  }

  /**
   * Delete/deactivate a Connect account
   */
  async deleteAccount(accountId: string): Promise<{ deleted: boolean }> {
    this.ensureStripeConfigured();

    try {
      const result = await this.stripe!.accounts.del(accountId);

      this.logger.log(`Deleted Connect account ${accountId}`);

      return { deleted: result.deleted };
    } catch (error) {
      this.logger.error(`Failed to delete account: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to delete account');
    }
  }

  /**
   * List transfers for an account
   */
  async listTransfers(
    destinationAccountId?: string,
    limit = 10,
    startingAfter?: string,
  ): Promise<{ transfers: TransferResponseDto[]; hasMore: boolean }> {
    this.ensureStripeConfigured();

    try {
      const params: Stripe.TransferListParams = {
        limit,
      };

      if (destinationAccountId) {
        params.destination = destinationAccountId;
      }

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const transfers = await this.stripe!.transfers.list(params);

      return {
        transfers: transfers.data.map((t) => ({
          transferId: t.id,
          amount: t.amount,
          currency: t.currency,
          destinationAccountId: t.destination as string,
          createdAt: new Date(t.created * 1000),
        })),
        hasMore: transfers.has_more,
      };
    } catch (error) {
      this.logger.error(`Failed to list transfers: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to list transfers');
    }
  }

  /**
   * List payouts for an account
   */
  async listPayouts(
    accountId: string,
    limit = 10,
    startingAfter?: string,
  ): Promise<{ payouts: PayoutResponseDto[]; hasMore: boolean }> {
    this.ensureStripeConfigured();

    try {
      const params: Stripe.PayoutListParams = {
        limit,
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const payouts = await this.stripe!.payouts.list(params, {
        stripeAccount: accountId,
      });

      return {
        payouts: payouts.data.map((p) => ({
          payoutId: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          arrivalDate: new Date(p.arrival_date * 1000),
        })),
        hasMore: payouts.has_more,
      };
    } catch (error) {
      this.logger.error(`Failed to list payouts: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to list payouts');
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
  }

  private mapAccountType(
    type: ConnectAccountType,
  ): Stripe.AccountCreateParams.Type {
    const typeMap: Record<ConnectAccountType, Stripe.AccountCreateParams.Type> = {
      [ConnectAccountType.STANDARD]: 'standard',
      [ConnectAccountType.EXPRESS]: 'express',
      [ConnectAccountType.CUSTOM]: 'custom',
    };
    return typeMap[type];
  }

  private mapAccountToResponse(account: Stripe.Account): ConnectAccountResponseDto {
    return {
      accountId: account.id,
      type: account.type || 'express',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email || undefined,
      businessProfile: account.business_profile
        ? {
            name: account.business_profile.name || undefined,
            url: account.business_profile.url || undefined,
          }
        : undefined,
      createdAt: account.created ? new Date(account.created * 1000) : new Date(),
    };
  }
}
