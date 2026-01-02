/**
 * Stripe Connect DTOs
 *
 * DTOs for managing Stripe Connect accounts for vendors
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsUrl,
  IsBoolean,
  IsObject,
  IsEmail,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConnectAccountType {
  STANDARD = 'standard',
  EXPRESS = 'express',
  CUSTOM = 'custom',
}

export enum BusinessType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  NON_PROFIT = 'non_profit',
  GOVERNMENT_ENTITY = 'government_entity',
}

export class CreateConnectAccountDto {
  @ApiProperty({ description: 'Vendor ID in our system' })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ description: 'Account type', enum: ConnectAccountType, default: ConnectAccountType.EXPRESS })
  @IsEnum(ConnectAccountType)
  type!: ConnectAccountType;

  @ApiPropertyOptional({ description: 'Business type', enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiProperty({ description: 'Email for the connected account' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)', default: 'FR', example: 'FR' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional({ description: 'Business profile URL' })
  @IsOptional()
  @IsUrl()
  businessProfileUrl?: string;

  @ApiPropertyOptional({ description: 'Business profile name' })
  @IsOptional()
  @IsString()
  businessProfileName?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class CreateAccountLinkDto {
  @ApiProperty({ description: 'Stripe Connect Account ID' })
  @IsString()
  accountId!: string;

  @ApiProperty({ description: 'Refresh URL when link expires', example: 'https://festival.com/vendor/onboarding/refresh' })
  @IsUrl()
  refreshUrl!: string;

  @ApiProperty({ description: 'Return URL after onboarding', example: 'https://festival.com/vendor/dashboard' })
  @IsUrl()
  returnUrl!: string;

  @ApiPropertyOptional({ description: 'Link type', default: 'account_onboarding' })
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateLoginLinkDto {
  @ApiProperty({ description: 'Stripe Connect Account ID' })
  @IsString()
  accountId!: string;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Destination Stripe Connect Account ID' })
  @IsString()
  destinationAccountId!: string;

  @ApiProperty({ description: 'Amount in cents to transfer' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'eur' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Transfer description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Source charge ID (for transfers from payments)' })
  @IsOptional()
  @IsString()
  sourceChargeId?: string;

  @ApiPropertyOptional({ description: 'Transfer group for grouping related transfers' })
  @IsOptional()
  @IsString()
  transferGroup?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class CreatePayoutDto {
  @ApiProperty({ description: 'Stripe Connect Account ID' })
  @IsString()
  accountId!: string;

  @ApiProperty({ description: 'Amount in cents to payout' })
  @IsNumber()
  @Min(100) // Minimum payout is usually 1 EUR
  amount!: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'eur' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payout description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Statement descriptor' })
  @IsOptional()
  @IsString()
  statementDescriptor?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class ConnectAccountResponseDto {
  @ApiProperty({ description: 'Stripe Connect Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Account type' })
  type!: string;

  @ApiProperty({ description: 'Whether charges are enabled' })
  chargesEnabled!: boolean;

  @ApiProperty({ description: 'Whether payouts are enabled' })
  payoutsEnabled!: boolean;

  @ApiProperty({ description: 'Whether onboarding is complete' })
  detailsSubmitted!: boolean;

  @ApiPropertyOptional({ description: 'Account email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Business profile' })
  businessProfile?: {
    name?: string;
    url?: string;
  };

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class AccountLinkResponseDto {
  @ApiProperty({ description: 'URL for the account link' })
  url!: string;

  @ApiProperty({ description: 'Expiration timestamp' })
  expiresAt!: Date;
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Available balance in cents' })
  available!: number;

  @ApiProperty({ description: 'Pending balance in cents' })
  pending!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;
}

export class TransferResponseDto {
  @ApiProperty({ description: 'Stripe Transfer ID' })
  transferId!: string;

  @ApiProperty({ description: 'Amount transferred in cents' })
  amount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Destination account ID' })
  destinationAccountId!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class PayoutResponseDto {
  @ApiProperty({ description: 'Stripe Payout ID' })
  payoutId!: string;

  @ApiProperty({ description: 'Amount in cents' })
  amount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Payout status' })
  status!: string;

  @ApiProperty({ description: 'Expected arrival date' })
  arrivalDate!: Date;
}
