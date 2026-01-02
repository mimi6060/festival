/**
 * Cashless Controller
 *
 * REST API endpoints for cashless payment operations:
 * - Account management
 * - Balance top-ups
 * - Cashless payments
 * - Transaction history
 * - Refunds (staff only)
 */

import {
  Controller,
  Get,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CashlessService, CashlessAccountEntity, CashlessTransactionEntity } from './cashless.service';
import { TopupRequestDto, TopupResponseDto } from './dto/topup.dto';
import { PaymentDto, PaymentResponseDto } from './dto/payment.dto';
import { RefundRequestDto, RefundResponseDto } from './dto/refund.dto';

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

  @Get('account')
  @ApiOperation({ summary: 'Get current user cashless account' })
  @ApiResponse({
    status: 200,
    description: 'Cashless account details',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashlessAccountEntity> {
    return this.cashlessService.getOrCreateAccount(user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Quick balance check' })
  @ApiResponse({
    status: 200,
    description: 'Current balance',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
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
  @ApiResponse({
    status: 201,
    description: 'Top-up successful',
    type: TopupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or max balance exceeded' })
  @ApiResponse({ status: 403, description: 'Account deactivated' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
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
  @ApiOperation({ summary: 'Make a cashless payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment successful',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid amount' })
  @ApiResponse({ status: 403, description: 'Account deactivated or festival not ongoing' })
  @ApiResponse({ status: 404, description: 'Account or festival not found' })
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
  @ApiResponse({
    status: 200,
    description: 'List of transactions',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
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
  @ApiResponse({
    status: 201,
    description: 'Refund successful',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transaction or already refunded' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or wrong user' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 409, description: 'Transaction already refunded' })
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
}
