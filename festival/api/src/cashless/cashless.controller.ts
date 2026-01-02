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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CashlessService } from './cashless.service';
import {
  CreateAccountDto,
  TopupDto,
  PayDto,
  TransferDto,
  LinkNfcDto,
} from './dto';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Cashless')
@ApiBearerAuth('JWT-auth')
@Controller('cashless')
@UseGuards(JwtAuthGuard)
export class CashlessController {
  constructor(private readonly cashlessService: CashlessService) {}

  /**
   * Create a new cashless account for the authenticated user
   * POST /cashless/account
   */
  @Post('account')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a cashless account',
    description: `
Creates a new cashless account for the authenticated user.

**Features:**
- Each user can have one cashless account
- Account can be linked to an NFC wristband
- Balance starts at 0

**NFC Linking:**
- Optional: Provide NFC tag ID during creation
- Can also be linked later via /cashless/link-nfc endpoint
    `,
    operationId: 'cashless_create_account',
  })
  @ApiBody({
    type: CreateAccountDto,
    description: 'Account creation data',
    examples: {
      minimal: {
        summary: 'Create without NFC',
        value: {},
      },
      with_nfc: {
        summary: 'Create with NFC tag',
        value: {
          nfcTagId: 'NFC-TAG-12345678',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Cashless account created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          balance: 0,
          nfcTagId: null,
          isActive: true,
          createdAt: '2025-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Account already exists or invalid NFC tag',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Cashless account already exists for this user',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ) {
    const account = await this.cashlessService.createAccount(user.id, dto);
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
  @ApiOperation({
    summary: 'Get my cashless account',
    description: `
Returns the cashless account details for the authenticated user.

**Includes:**
- Current balance
- NFC tag status
- Account status
- Creation/update timestamps
    `,
    operationId: 'cashless_get_my_account',
  })
  @ApiOkResponse({
    description: 'Account details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          balance: 150.50,
          nfcTagId: 'NFC-TAG-12345678',
          isActive: true,
          createdAt: '2025-01-15T10:30:00.000Z',
          updatedAt: '2025-01-20T15:45:00.000Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No cashless account found for user',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Cashless account not found. Please create one first.',
      },
    },
  })
  async getMyAccount(@CurrentUser() user: AuthenticatedUser) {
    const account = await this.cashlessService.getAccount(user.id);
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
  @ApiOperation({
    summary: 'Top up cashless balance',
    description: `
Initiates a balance top-up via Stripe payment.

**Process:**
1. Creates a Stripe checkout session
2. User completes payment on Stripe
3. Webhook confirms payment
4. Balance is credited to account

**Limits:**
- Minimum: 1 EUR
- Maximum: 500 EUR per top-up

**Note:** Balance is only credited after successful payment confirmation.
    `,
    operationId: 'cashless_topup',
  })
  @ApiBody({
    type: TopupDto,
    description: 'Top-up details',
    examples: {
      standard: {
        summary: 'Standard top-up',
        value: {
          amount: 50,
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          successUrl: 'https://festival.io/topup/success',
          cancelUrl: 'https://festival.io/topup/cancel',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Top-up session created successfully',
    schema: {
      example: {
        success: true,
        data: {
          sessionId: 'cs_test_a1b2c3d4e5f6...',
          sessionUrl: 'https://checkout.stripe.com/pay/cs_test_...',
          amount: 50,
          transactionId: '550e8400-e29b-41d4-a716-446655440010',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid amount or no cashless account',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Amount must be between 1 and 500 EUR',
      },
    },
  })
  async topup(@CurrentUser() user: AuthenticatedUser, @Body() dto: TopupDto) {
    const result = await this.cashlessService.topup(user.id, dto);
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
  @ApiOperation({
    summary: 'Make a cashless payment',
    description: `
Deducts amount from the user's cashless balance.

**Use Cases:**
- Food and beverage purchases at stands
- Merchandise purchases
- Any on-site payment

**Requirements:**
- Sufficient balance
- Active cashless account
- Festival must be ongoing

**Transaction Record:**
Each payment creates a transaction record with:
- Amount
- Vendor ID (if applicable)
- Description
- Balance before/after
    `,
    operationId: 'cashless_pay',
  })
  @ApiBody({
    type: PayDto,
    description: 'Payment details',
    examples: {
      food: {
        summary: 'Food purchase',
        value: {
          amount: 12.50,
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          description: '2x Beer, 1x Burger',
          vendorId: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
      merch: {
        summary: 'Merchandise',
        value: {
          amount: 35.00,
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Festival T-Shirt XL',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Payment successful',
    schema: {
      example: {
        success: true,
        data: {
          transactionId: '550e8400-e29b-41d4-a716-446655440020',
          amount: 12.50,
          balanceBefore: 150.50,
          balanceAfter: 138.00,
          description: '2x Beer, 1x Burger',
          timestamp: '2025-08-22T18:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient balance or invalid request',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Insufficient balance. Current: 10.00 EUR, Required: 12.50 EUR',
      },
    },
  })
  async pay(@CurrentUser() user: AuthenticatedUser, @Body() dto: PayDto) {
    const result = await this.cashlessService.pay(user.id, dto);
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
  @ApiOperation({
    summary: 'Transfer balance to another user',
    description: `
Transfers cashless balance to another user's account.

**Requirements:**
- Both accounts must exist and be active
- Sufficient balance in sender's account
- Same festival context

**Use Cases:**
- Sharing balance with friends
- Group purchases
- Refunds between users
    `,
    operationId: 'cashless_transfer',
  })
  @ApiBody({
    type: TransferDto,
    description: 'Transfer details',
    examples: {
      friend: {
        summary: 'Transfer to friend',
        value: {
          toAccountId: '550e8400-e29b-41d4-a716-446655440099',
          amount: 25.00,
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          description: 'For concert tickets',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Transfer successful',
    schema: {
      example: {
        success: true,
        data: {
          transactionId: '550e8400-e29b-41d4-a716-446655440030',
          amount: 25.00,
          toAccountId: '550e8400-e29b-41d4-a716-446655440099',
          balanceBefore: 150.50,
          balanceAfter: 125.50,
          timestamp: '2025-08-22T19:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid transfer or insufficient balance',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Cannot transfer to your own account',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Recipient account not found',
  })
  async transfer(@CurrentUser() user: AuthenticatedUser, @Body() dto: TransferDto) {
    const result = await this.cashlessService.transfer(user.id, dto);
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
  @ApiOperation({
    summary: 'Get transaction history',
    description: `
Returns the transaction history for the authenticated user's cashless account.

**Filters:**
- By festival
- By transaction type (TOPUP, PAYMENT, TRANSFER, REFUND)

**Pagination:**
- Default limit: 50 transactions
- Use offset for pagination

**Transaction Types:**
- TOPUP: Balance addition via payment
- PAYMENT: Purchase at vendor
- TRANSFER_OUT: Sent to another user
- TRANSFER_IN: Received from another user
- REFUND: Balance refund
    `,
    operationId: 'cashless_get_transactions',
  })
  @ApiQuery({
    name: 'festivalId',
    description: 'Filter by festival UUID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by transaction type',
    required: false,
    enum: TransactionType,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of transactions to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of transactions to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiOkResponse({
    description: 'Transaction history retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          transactions: [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              type: 'PAYMENT',
              amount: -12.50,
              balanceBefore: 150.50,
              balanceAfter: 138.00,
              description: '2x Beer, 1x Burger',
              createdAt: '2025-08-22T18:30:00.000Z',
              festival: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Rock en Seine 2025',
              },
            },
          ],
          pagination: {
            total: 25,
            hasMore: true,
          },
        },
      },
    },
  })
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId') festivalId?: string,
    @Query('type') type?: TransactionType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.cashlessService.getTransactionHistory(
      user.id,
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
  @ApiOperation({
    summary: 'Link NFC wristband to account',
    description: `
Links an NFC wristband to the user's cashless account.

**Process:**
1. User presents NFC wristband at registration point
2. Staff scans the NFC tag ID
3. Tag is linked to user's account

**Requirements:**
- NFC tag must not be already linked to another account
- User must have a cashless account

**Note:** Once linked, the wristband can be used for contactless payments at vendors.
    `,
    operationId: 'cashless_link_nfc',
  })
  @ApiBody({
    type: LinkNfcDto,
    description: 'NFC tag details',
    examples: {
      link: {
        summary: 'Link NFC tag',
        value: {
          nfcTagId: 'NFC-TAG-12345678',
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'NFC tag linked successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          nfcTagId: 'NFC-TAG-12345678',
          message: 'NFC tag successfully linked to your account',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'NFC tag already linked or invalid',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'This NFC tag is already linked to another account',
      },
    },
  })
  async linkNfc(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkNfcDto) {
    const account = await this.cashlessService.linkNfcTag(user.id, dto);
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
  @ApiOperation({
    summary: 'Request balance refund',
    description: `
Requests a refund of remaining cashless balance.

**Requirements:**
- Festival must have ended
- Account must have positive balance
- Refund request period must be open (typically 30 days after festival)

**Process:**
1. User requests refund
2. System validates eligibility
3. Refund is processed to original payment method
4. Balance is set to 0

**Note:** Minimum refund amount may apply (usually 1 EUR).
    `,
    operationId: 'cashless_refund_balance',
  })
  @ApiBody({
    description: 'Festival ID for refund',
    schema: {
      type: 'object',
      properties: {
        festivalId: {
          type: 'string',
          format: 'uuid',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      required: ['festivalId'],
    },
  })
  @ApiOkResponse({
    description: 'Refund request submitted successfully',
    schema: {
      example: {
        success: true,
        data: {
          refundId: '550e8400-e29b-41d4-a716-446655440040',
          amount: 45.50,
          status: 'PENDING',
          message: 'Refund request submitted. Processing in 3-5 business days.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Refund not available',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Refund not available. Festival has not ended yet.',
      },
    },
  })
  async refundBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Body('festivalId') festivalId: string,
  ) {
    const result = await this.cashlessService.refundBalance(
      user.id,
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
  @ApiOperation({
    summary: 'Get balance by NFC tag',
    description: `
Looks up account balance using NFC tag ID.

**Access:** Typically used by vendors/cashiers at payment terminals

**Use Case:**
When a customer presents their NFC wristband, the terminal can
check their balance before processing a payment.
    `,
    operationId: 'cashless_get_balance_by_nfc',
  })
  @ApiParam({
    name: 'nfcTagId',
    description: 'NFC tag identifier',
    type: String,
    example: 'NFC-TAG-12345678',
  })
  @ApiOkResponse({
    description: 'Balance retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          balance: 138.00,
          isActive: true,
          ownerFirstName: 'Jean',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'NFC tag not found or not linked',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'No account found for this NFC tag',
      },
    },
  })
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
   */
  @Post('pay-nfc/:nfcTagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process payment by NFC tag',
    description: `
Processes a payment using the customer's NFC wristband.

**Access:** Typically used by vendors/cashiers at payment terminals

**Process:**
1. Customer presents NFC wristband
2. Terminal reads NFC tag ID
3. Vendor enters amount
4. Payment is processed against customer's balance

**Note:** This endpoint may require special vendor authentication in production.
    `,
    operationId: 'cashless_pay_by_nfc',
  })
  @ApiParam({
    name: 'nfcTagId',
    description: 'NFC tag identifier',
    type: String,
    example: 'NFC-TAG-12345678',
  })
  @ApiBody({
    type: PayDto,
    description: 'Payment details',
    examples: {
      vendor_payment: {
        summary: 'Vendor payment',
        value: {
          amount: 8.50,
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          description: '2x Soft drinks',
          vendorId: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Payment successful',
    schema: {
      example: {
        success: true,
        data: {
          transactionId: '550e8400-e29b-41d4-a716-446655440050',
          amount: 8.50,
          balanceAfter: 129.50,
          timestamp: '2025-08-22T20:15:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient balance or invalid request',
  })
  @ApiNotFoundResponse({
    description: 'NFC tag not found',
  })
  async payByNfc(
    @Param('nfcTagId') nfcTagId: string,
    @Body() dto: PayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.cashlessService.payByNfc(
      nfcTagId,
      dto,
      user.id,
    );
    return {
      success: true,
      data: result,
    };
  }
}
