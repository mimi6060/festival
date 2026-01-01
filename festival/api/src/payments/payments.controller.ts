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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto, RefundRequestDto } from './dto';
import { PaymentStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ThrottlePayment, SkipThrottle } from '../throttler';

/**
 * Payment controller handling all payment-related endpoints.
 * Rate limiting: 10 requests/minute for payment endpoints
 */
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
 * Separate controller for festival-specific payment endpoints
 * This handles the /festivals/:festivalId/payments route
 */
@Controller('festivals')
export class FestivalPaymentsController {
  private readonly logger = new Logger(FestivalPaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /festivals/:festivalId/payments
   * Returns all payments for a specific festival (ADMIN/ORGANIZER only)
   */
  @Get(':festivalId/payments')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
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
