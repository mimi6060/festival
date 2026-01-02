/**
 * Cashless Controller
 *
 * REST API endpoints for cashless payment operations:
 * - Account creation and management
 * - Balance top-ups
 * - Cashless payments
 * - Transaction history
 * - NFC tag linking
 * - Refunds (staff only)
 * - Account activation/deactivation
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CashlessService, CashlessAccountEntity, CashlessTransactionEntity } from './cashless.service';
import {
  CreateAccountDto,
  AccountResponseDto,
  TopupRequestDto,
  TopupResponseDto,
  PaymentDto,
  PaymentResponseDto,
  RefundRequestDto,
  RefundResponseDto,
  TransferRequestDto,
  LinkNfcRequestDto,
} from './dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Cashless')
@Controller('cashless')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashlessController {
  constructor(private readonly cashlessService: CashlessService) {}

  // ============================================================================
  // Account Management
  // ============================================================================

  @Post('account')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or get cashless account',
    description: `
Creates a new cashless account for the authenticated user if one doesn't exist.
If an account already exists, returns the existing account.
Optionally link an NFC tag during creation.
    `,
  })
  @ApiCreatedResponse({
    description: 'Cashless account created or retrieved',
    type: AccountResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiConflictResponse({ description: 'NFC tag already registered to another account' })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ): Promise<CashlessAccountEntity> {
    return this.cashlessService.getOrCreateAccount(user.id, dto);
  }

  @Get('account')
  @ApiOperation({ summary: 'Get current user cashless account' })
  @ApiOkResponse({
    description: 'Cashless account details',
    type: AccountResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async getAccount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashlessAccountEntity> {
    return this.cashlessService.getAccount(user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Quick balance check' })
  @ApiOkResponse({
    description: 'Current balance',
  })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async getBalance(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ balance: number }> {
    const balance = await this.cashlessService.getBalance(user.id);
    return { balance };
  }

  // ============================================================================
  // Top-up
  // ============================================================================

  @Post('topup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Top up cashless balance' })
  @ApiCreatedResponse({
    description: 'Top-up successful',
    type: TopupResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid amount or max balance exceeded' })
  @ApiForbiddenResponse({ description: 'Account deactivated' })
  @ApiNotFoundResponse({ description: 'Festival not found' })
  async topup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TopupRequestDto,
  ): Promise<CashlessTransactionEntity> {
    return this.cashlessService.topup(user.id, {
      amount: dto.amount,
      festivalId: dto.festivalId,
      paymentMethod: dto.paymentMethod as 'CARD' | 'CASH' | undefined,
    });
  }

  // ============================================================================
  // Payment
  // ============================================================================

  @Post('pay')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Make a cashless payment (STAFF only)',
    description: `
Processes a cashless payment at a festival vendor.
Staff members use this endpoint to charge customer accounts at vendor points.
    `,
  })
  @ApiCreatedResponse({
    status: 201,
    description: 'Payment successful',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Insufficient balance or invalid amount' })
  @ApiForbiddenResponse({ description: 'Account deactivated or festival not ongoing' })
  @ApiNotFoundResponse({ description: 'Account or festival not found' })
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PaymentDto,
  ): Promise<CashlessTransactionEntity> {
    return this.cashlessService.pay(user.id, {
      amount: dto.amount,
      festivalId: dto.festivalId,
      vendorId: dto.vendorId,
      description: dto.description,
    });
  }

  // ============================================================================
  // Transfer
  // ============================================================================

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Transfer balance to another user',
    description: `
Transfers funds from your cashless account to another user's account.
Useful for friends splitting costs or sharing festival credits.
    `,
  })
  @ApiCreatedResponse({
    description: 'Transfer successful',
  })
  @ApiBadRequestResponse({ description: 'Insufficient balance or invalid recipient' })
  @ApiForbiddenResponse({ description: 'Account is deactivated' })
  @ApiNotFoundResponse({ description: 'Account or recipient not found' })
  async transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferRequestDto,
  ): Promise<{ message: string }> {
    // Note: Transfer functionality would need to be implemented in the service
    // For now, throwing an error to indicate it's not yet implemented
    throw new Error('Transfer functionality not yet implemented in service');
  }

  // ============================================================================
  // Transaction History
  // ============================================================================

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({
    name: 'festivalId',
    required: false,
    description: 'Filter by festival ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to return (default: 50, max: 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of transactions to skip (default: 0)',
  })
  @ApiOkResponse({
    description: 'List of transactions',
  })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId') festivalId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ): Promise<CashlessTransactionEntity[]> {
    // Enforce max limit
    const safeLimit = Math.min(limit ?? 50, 100);
    return this.cashlessService.getTransactionHistory(
      user.id,
      festivalId,
      safeLimit,
      offset,
    );
  }

  // ============================================================================
  // Refund (Staff Only)
  // ============================================================================

  @Post('refund')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({ summary: 'Refund to cashless account (STAFF only)' })
  @ApiCreatedResponse({
    description: 'Refund successful',
    type: RefundResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid transaction or already refunded' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or wrong user' })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  @ApiConflictResponse({ description: 'Transaction already refunded' })
  async refund(
    @CurrentUser() staff: AuthenticatedUser,
    @Body() dto: RefundRequestDto,
  ): Promise<CashlessTransactionEntity> {
    return this.cashlessService.refund(
      dto.userId,
      {
        transactionId: dto.transactionId,
        reason: dto.reason,
      },
      staff.id,
    );
  }

  // ============================================================================
  // NFC Tag Management
  // ============================================================================

  @Post('link-nfc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link NFC bracelet to account',
    description: `
Links an NFC tag (typically a festival bracelet) to the authenticated user's cashless account.
Festival attendees receive NFC bracelets at entry and link them to their accounts
to make payments by tapping the bracelet at vendor points.
    `,
  })
  @ApiOkResponse({
    description: 'NFC tag linked successfully',
    type: AccountResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Cashless account not found' })
  @ApiConflictResponse({ description: 'NFC tag already registered to another account' })
  async linkNfc(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LinkNfcRequestDto,
  ): Promise<CashlessAccountEntity> {
    return this.cashlessService.linkNfcTag(user.id, dto.nfcTagId);
  }

  @Get('nfc/:tagId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Find account by NFC tag (STAFF only)',
    description: `
Finds a cashless account associated with a specific NFC tag ID.
Staff at vendor points scan NFC bracelets to look up customer accounts for processing payments.
    `,
  })
  @ApiParam({
    name: 'tagId',
    description: 'NFC tag ID',
    example: 'NFC-ABC123',
  })
  @ApiOkResponse({
    description: 'Account found',
    type: AccountResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'No account found for this NFC tag' })
  async findByNfc(@Param('tagId') tagId: string): Promise<CashlessAccountEntity> {
    return this.cashlessService.findAccountByNfcTag(tagId);
  }

  // ============================================================================
  // Account Activation/Deactivation
  // ============================================================================

  @Post('deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate cashless account',
    description: `
Deactivates the authenticated user's cashless account.
Account balance is preserved but no new transactions can be made.
Users can deactivate their account if they suspect their NFC bracelet has been lost or stolen.
    `,
  })
  @ApiResponse({ status: 204, description: 'Account deactivated successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Cashless account not found' })
  async deactivate(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.cashlessService.deactivateAccount(user.id);
  }

  @Post('reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate cashless account',
    description: `
Reactivates a previously deactivated cashless account.
Account becomes active again and transactions can be made with previous balance retained.
    `,
  })
  @ApiOkResponse({
    description: 'Account reactivated successfully',
    type: AccountResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Cashless account not found' })
  async reactivate(@CurrentUser() user: AuthenticatedUser): Promise<CashlessAccountEntity> {
    return this.cashlessService.reactivateAccount(user.id);
  }
}
