import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CashlessService } from './cashless.service';
import {
  CreateAccountDto,
  TopupDto,
  PayDto,
  TransferDto,
  LinkNfcDto,
} from './dto';
import { TransactionType } from '@prisma/client';

// Placeholder for auth guard - replace with actual implementation
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '@prisma/client';

// Temporary request interface until auth is implemented
interface RequestWithUser {
  user: {
    id: string;
    role: string;
  };
}

@Controller('cashless')
// @UseGuards(JwtAuthGuard)
export class CashlessController {
  constructor(private readonly cashlessService: CashlessService) {}

  /**
   * Create a new cashless account for the authenticated user
   * POST /cashless/account
   */
  @Post('account')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Req() req: RequestWithUser,
    @Body() dto: CreateAccountDto,
  ) {
    const account = await this.cashlessService.createAccount(req.user.id, dto);
    return {
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        nfcTagId: account.nfcTagId,
        isActive: account.isActive,
        createdAt: account.createdAt,
      },
    };
  }

  /**
   * Get authenticated user's cashless account and balance
   * GET /cashless/me
   */
  @Get('me')
  async getMyAccount(@Req() req: RequestWithUser) {
    const account = await this.cashlessService.getAccount(req.user.id);
    return {
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        nfcTagId: account.nfcTagId,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    };
  }

  /**
   * Initiate a topup via payment
   * POST /cashless/topup
   */
  @Post('topup')
  @HttpCode(HttpStatus.OK)
  async topup(@Req() req: RequestWithUser, @Body() dto: TopupDto) {
    const result = await this.cashlessService.topup(req.user.id, dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Pay using cashless balance (for authenticated users at stands)
   * POST /cashless/pay
   */
  @Post('pay')
  @HttpCode(HttpStatus.OK)
  async pay(@Req() req: RequestWithUser, @Body() dto: PayDto) {
    const result = await this.cashlessService.pay(req.user.id, dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Transfer balance to another account
   * POST /cashless/transfer
   */
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(@Req() req: RequestWithUser, @Body() dto: TransferDto) {
    const result = await this.cashlessService.transfer(req.user.id, dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get transaction history
   * GET /cashless/transactions
   */
  @Get('transactions')
  async getTransactions(
    @Req() req: RequestWithUser,
    @Query('festivalId') festivalId?: string,
    @Query('type') type?: TransactionType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.cashlessService.getTransactionHistory(
      req.user.id,
      {
        festivalId,
        type,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    return {
      success: true,
      data: {
        transactions: result.transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount),
          balanceBefore: Number(tx.balanceBefore),
          balanceAfter: Number(tx.balanceAfter),
          description: tx.description,
          createdAt: tx.createdAt,
          festival: (tx as any).festival,
        })),
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
        },
      },
    };
  }

  /**
   * Link an NFC tag to the user's account
   * POST /cashless/link-nfc
   */
  @Post('link-nfc')
  @HttpCode(HttpStatus.OK)
  async linkNfc(@Req() req: RequestWithUser, @Body() dto: LinkNfcDto) {
    const account = await this.cashlessService.linkNfcTag(req.user.id, dto);
    return {
      success: true,
      data: {
        id: account.id,
        nfcTagId: account.nfcTagId,
        message: 'NFC tag successfully linked to your account',
      },
    };
  }

  /**
   * Request refund of remaining balance (only after festival)
   * POST /cashless/refund-balance
   */
  @Post('refund-balance')
  @HttpCode(HttpStatus.OK)
  async refundBalance(
    @Req() req: RequestWithUser,
    @Body('festivalId') festivalId: string,
  ) {
    const result = await this.cashlessService.refundBalance(
      req.user.id,
      festivalId,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Lookup account balance by NFC tag ID (for terminals/cashiers)
   * GET /cashless/balance/:nfcTagId
   */
  @Get('balance/:nfcTagId')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.STAFF, UserRole.CASHIER, UserRole.ADMIN)
  async getBalanceByNfc(@Param('nfcTagId') nfcTagId: string) {
    const result = await this.cashlessService.getAccountByNfcTag(nfcTagId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Pay by NFC tag (for terminals/cashiers)
   * POST /cashless/pay-nfc/:nfcTagId
   * This endpoint is used by cashiers/staff at terminals
   */
  @Post('pay-nfc/:nfcTagId')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.STAFF, UserRole.CASHIER, UserRole.ADMIN)
  async payByNfc(
    @Param('nfcTagId') nfcTagId: string,
    @Body() dto: PayDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.cashlessService.payByNfc(
      nfcTagId,
      dto,
      req.user.id,
    );
    return {
      success: true,
      data: result,
    };
  }
}
