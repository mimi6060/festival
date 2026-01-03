import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CashlessService, TopupDto, CashlessPaymentDto, RefundDto } from './cashless.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('api/wallet')
export class CashlessController {
  constructor(private readonly cashlessService: CashlessService) {}

  /**
   * Get or create cashless account for authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Get('account')
  async getAccount(@Request() req) {
    return this.cashlessService.getOrCreateAccount(req.user.id);
  }

  /**
   * Get wallet balance
   */
  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(@Request() req) {
    const account = await this.cashlessService.getOrCreateAccount(req.user.id);
    return {
      available: account.balance,
      pending: 0,
      currency: 'EUR',
    };
  }

  /**
   * Top up wallet
   */
  @UseGuards(JwtAuthGuard)
  @Post('topup')
  async topup(@Request() req, @Body() dto: TopupDto) {
    return this.cashlessService.topup(req.user.id, dto);
  }

  /**
   * Make a payment
   */
  @UseGuards(JwtAuthGuard)
  @Post('pay')
  @HttpCode(HttpStatus.OK)
  async pay(@Request() req, @Body() dto: CashlessPaymentDto) {
    return this.cashlessService.pay(req.user.id, dto);
  }

  /**
   * Get transaction history
   */
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('festivalId') festivalId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.cashlessService.getTransactionHistory(
      req.user.id,
      festivalId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * Link NFC tag to account
   */
  @UseGuards(JwtAuthGuard)
  @Post('nfc/link')
  async linkNfcTag(@Request() req, @Body() body: { nfcTagId: string }) {
    return this.cashlessService.linkNfcTag(req.user.id, body.nfcTagId);
  }

  /**
   * Process refund (staff only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Request() req, @Body() dto: RefundDto) {
    return this.cashlessService.refund(req.user.id, dto, req.user.id);
  }
}
