import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto, RefundRequestDto } from './dto';
import { PaymentStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ThrottlePayment, SkipThrottle } from '../throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Payment controller handling all payment-related endpoints.
 * Rate limiting: 10 requests/minute for payment endpoints
 */
@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
@ThrottlePayment()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * POST /payments/create-checkout
   * Creates a Stripe Checkout session for ticket purchase or cashless topup
   */
  @Post('create-checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Stripe checkout session',
    description: `
Creates a Stripe Checkout session for processing payments.

**Supported Payment Types:**
- \`ticket\`: Purchase festival tickets
- \`cashless\`: Top up cashless balance

**Process:**
1. Validate items and calculate total
2. Create Stripe Checkout session
3. Return session URL for redirect

**Stripe Checkout Features:**
- Secure payment processing
- Multiple payment methods (cards, Apple Pay, Google Pay)
- Automatic currency conversion
- PCI-compliant card handling

**After Payment:**
- Webhook confirms successful payment
- Tickets/balance are issued automatically
- Confirmation email sent to user
    `,
    operationId: 'payments_create_checkout',
  })
  @ApiBody({
    type: CreateCheckoutDto,
    description: 'Checkout session details',
    examples: {
      ticket_purchase: {
        summary: 'Ticket purchase',
        description: 'Create checkout for ticket purchase',
        value: {
          type: 'ticket',
          items: [
            {
              itemId: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2,
              name: 'Pass 3 Jours',
              unitPrice: 8999,
            },
          ],
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          successUrl: 'https://festival.io/tickets/success',
          cancelUrl: 'https://festival.io/tickets/cancel',
          currency: 'eur',
        },
      },
      cashless_topup: {
        summary: 'Cashless top-up',
        description: 'Create checkout for cashless balance top-up',
        value: {
          type: 'cashless',
          items: [
            {
              itemId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 1,
              name: 'Balance Top-up',
              unitPrice: 5000,
            },
          ],
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          successUrl: 'https://festival.io/topup/success',
          cancelUrl: 'https://festival.io/topup/cancel',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Checkout session created successfully',
    schema: {
      example: {
        success: true,
        data: {
          sessionId: 'cs_test_a1b2c3d4e5f6g7h8i9j0...',
          sessionUrl: 'https://checkout.stripe.com/pay/cs_test_...',
          paymentId: '550e8400-e29b-41d4-a716-446655440010',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkout data',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Invalid ticket category or insufficient stock',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const result = await this.paymentsService.createCheckoutSession(user.id, dto);

    return {
      success: true,
      data: {
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
        paymentId: result.paymentId,
      },
    };
  }

  /**
   * POST /payments/webhook
   * Handles incoming Stripe webhook events
   * Note: This endpoint must receive raw body for signature verification
   * This endpoint is public (no auth required) as Stripe sends the requests
   * Rate limiting is skipped for webhooks as Stripe handles its own retry logic
   */
  @Post('webhook')
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger - internal endpoint for Stripe
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    if (!signature) {
      this.logger.warn('Webhook received without signature');
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Missing stripe-signature header',
      });
    }

    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.error('Raw body not available. Ensure rawBody is enabled in NestJS config.');
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Raw body not available',
      });
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);

      await this.paymentsService.handleWebhook(event);

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /payments/me
   * Returns payment history for the authenticated user
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get my payment history',
    description: `
Returns the payment history for the authenticated user.

**Includes:**
- All payments (completed, pending, failed)
- Payment type (ticket, cashless)
- Associated items
- Refund status

**Pagination:**
Use limit and offset for pagination.
    `,
    operationId: 'payments_get_my_payments',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of payments to return',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of payments to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiOkResponse({
    description: 'Payment history retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            type: 'TICKET',
            amount: 17998,
            currency: 'eur',
            status: 'COMPLETED',
            stripeSessionId: 'cs_test_...',
            items: [
              {
                name: 'Pass 3 Jours',
                quantity: 2,
                unitPrice: 8999,
              },
            ],
            createdAt: '2025-01-15T10:30:00.000Z',
            completedAt: '2025-01-15T10:35:00.000Z',
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const payments = await this.paymentsService.getPaymentHistory(user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: payments,
    };
  }

  /**
   * GET /payments/:id
   * Returns details for a specific payment
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details',
    description: `
Returns detailed information about a specific payment.

**Access Control:**
- Users can view their own payments
- Admins/Organizers can view any payment

**Includes:**
- Full payment details
- Associated items (tickets, top-up)
- Refund history
- Stripe metadata
    `,
    operationId: 'payments_get_payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiOkResponse({
    description: 'Payment details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          type: 'TICKET',
          amount: 17998,
          currency: 'eur',
          status: 'COMPLETED',
          stripeSessionId: 'cs_test_...',
          stripePaymentIntentId: 'pi_...',
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440011',
              name: 'Pass 3 Jours',
              quantity: 2,
              unitPrice: 8999,
            },
          ],
          tickets: [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              qrCode: 'FEST-2025-ABC123',
              status: 'VALID',
            },
          ],
          user: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'user@example.com',
            firstName: 'Jean',
            lastName: 'Dupont',
          },
          createdAt: '2025-01-15T10:30:00.000Z',
          completedAt: '2025-01-15T10:35:00.000Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to view this payment',
  })
  async getPayment(
    @Param('id') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER;

    const payment = await this.paymentsService.getPaymentById(
      paymentId,
      user.id,
      isAdmin,
    );

    return {
      success: true,
      data: payment,
    };
  }

  /**
   * POST /payments/:id/refund
   * Requests a refund for a payment
   */
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a refund',
    description: `
Requests a refund for a payment.

**Refund Types:**
- \`full\`: Refund entire payment amount
- \`partial\`: Refund specified amount

**Requirements:**
- Payment must be completed
- Within refund period (typically 30 days)
- Not already refunded

**Processing:**
1. Validates refund eligibility
2. Initiates Stripe refund
3. Updates payment status
4. Cancels associated tickets/balance

**Note:** Refunds typically take 5-10 business days to appear on card.
    `,
    operationId: 'payments_request_refund',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment UUID to refund',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiBody({
    type: RefundRequestDto,
    description: 'Refund details',
    examples: {
      full_refund: {
        summary: 'Full refund',
        value: {
          reason: 'Event cancelled',
        },
      },
      partial_refund: {
        summary: 'Partial refund',
        value: {
          amount: 8999,
          reason: 'One ticket cancelled',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Refund request submitted successfully',
    schema: {
      example: {
        success: true,
        data: {
          refundId: 're_1234567890',
          status: 'pending',
          message: 'Refund request submitted successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Refund not allowed or invalid amount',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Payment is not eligible for refund',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to refund this payment',
  })
  async requestRefund(
    @Param('id') paymentId: string,
    @Body() dto: RefundRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER;

    const result = await this.paymentsService.processRefund(
      paymentId,
      user.id,
      dto,
      isAdmin,
    );

    return {
      success: true,
      data: {
        refundId: result.refundId,
        status: result.status,
        message: 'Refund request submitted successfully',
      },
    };
  }
}

/**
 * Controller for festival-specific payment endpoints
 * This handles the /festivals/:festivalId/payments route
 */
@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller('festivals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FestivalPaymentsController {
  private readonly logger = new Logger(FestivalPaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /festivals/:festivalId/payments
   * Returns all payments for a specific festival (ADMIN/ORGANIZER only)
   */
  @Get(':festivalId/payments')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Get festival payments',
    description: `
Returns all payments for a specific festival.

**Access:** ADMIN and ORGANIZER roles only

**Filters:**
- By status (PENDING, COMPLETED, FAILED, REFUNDED)

**Use Cases:**
- Revenue reporting
- Payment monitoring
- Refund management
    `,
    operationId: 'payments_get_festival_payments',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by payment status',
    required: false,
    enum: PaymentStatus,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of payments to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of payments to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiOkResponse({
    description: 'Festival payments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            type: 'TICKET',
            amount: 17998,
            currency: 'eur',
            status: 'COMPLETED',
            user: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              email: 'user@example.com',
            },
            createdAt: '2025-01-15T10:30:00.000Z',
          },
        ],
        meta: {
          total: 1500,
          limit: 50,
          offset: 0,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
  })
  async getFestivalPayments(
    @Param('festivalId') festivalId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    const result = await this.paymentsService.getFestivalPayments(festivalId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status,
    });

    return {
      success: true,
      data: result.payments,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }
}
