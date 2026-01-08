/**
 * Payments Controller
 *
 * REST API endpoints for payment operations:
 * - Checkout sessions
 * - Payment intents
 * - Stripe Connect
 * - Subscriptions
 * - Refunds
 * - Webhooks
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RateLimit, SkipRateLimit } from '../../common/guards/rate-limit.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { CheckoutService } from './services/checkout.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { SubscriptionService } from './services/subscription.service';
import { RefundService } from './services/refund.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
} from './dto/create-checkout-session.dto';
import {
  CreateConnectAccountDto,
  CreateAccountLinkDto,
  CreateTransferDto,
  CreatePayoutDto,
} from './dto/stripe-connect.dto';
import {
  CreateProductDto,
  CreatePriceDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
} from './dto/subscription.dto';
import { CreateRefundDto, PartialRefundDto, BulkRefundDto } from './dto/refund.dto';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly checkoutService: CheckoutService,
    private readonly connectService: StripeConnectService,
    private readonly subscriptionService: SubscriptionService,
    private readonly refundService: RefundService
  ) {}

  // ============================================================================
  // Checkout Sessions
  // ============================================================================

  @Post('checkout')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:checkout',
    perUser: true,
    errorMessage: 'Too many checkout requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create a Stripe Checkout Session' })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({ status: 201, type: CheckoutSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createCheckoutSession(dto);
  }

  @Get('checkout/:sessionId')
  @ApiOperation({ summary: 'Get checkout session status' })
  @ApiParam({ name: 'sessionId', description: 'Stripe session ID' })
  @ApiResponse({ status: 200, description: 'Session status' })
  async getCheckoutSession(@Param('sessionId') sessionId: string) {
    return this.checkoutService.getCheckoutSession(sessionId);
  }

  @Post('checkout/:sessionId/expire')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Expire a checkout session' })
  @ApiParam({ name: 'sessionId', description: 'Stripe session ID' })
  async expireCheckoutSession(@Param('sessionId') sessionId: string): Promise<void> {
    return this.checkoutService.expireCheckoutSession(sessionId);
  }

  @Post('checkout/ticket')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:ticket-checkout',
    perUser: true,
    errorMessage: 'Too many ticket purchase attempts. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create checkout for ticket purchase' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponseDto })
  async createTicketCheckout(
    @Body()
    dto: {
      userId: string;
      festivalId: string;
      tickets: {
        categoryId: string;
        name: string;
        price: number;
        quantity: number;
      }[];
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createTicketCheckout(dto);
  }

  @Post('checkout/cashless-topup')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:cashless-topup',
    perUser: true,
    errorMessage: 'Too many top-up requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create checkout for cashless top-up' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponseDto })
  async createCashlessTopupCheckout(
    @Body()
    dto: {
      userId: string;
      festivalId: string;
      amount: number;
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createCashlessTopupCheckout(dto);
  }

  // ============================================================================
  // Payment Intents
  // ============================================================================

  @Post('intent')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:intent',
    perUser: true,
    errorMessage: 'Too many payment intent requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createPaymentIntent(
    @Body()
    dto: {
      userId: string;
      amount: number;
      currency?: string;
      description?: string;
      metadata?: Record<string, string>;
    }
  ) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user payment history' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Payment list' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getUserPayments(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any
  ) {
    // Authorization: user can only access their own payments, unless they are ADMIN
    const requestingUser = req.user;
    if (requestingUser.id !== userId && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only access your own payment history');
    }
    return this.paymentsService.getUserPayments(userId, limit, offset);
  }

  @Post(':paymentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending payment' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Payment cancelled' })
  async cancelPayment(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentsService.cancelPayment(paymentId);
  }

  // ============================================================================
  // Stripe Connect
  // ============================================================================

  @Post('connect/account')
  @ApiOperation({ summary: 'Create a Stripe Connect account for a vendor' })
  @ApiBody({ type: CreateConnectAccountDto })
  @ApiResponse({ status: 201, description: 'Connect account created' })
  async createConnectAccount(@Body() dto: CreateConnectAccountDto) {
    return this.connectService.createConnectAccount(dto);
  }

  @Post('connect/account-link')
  @ApiOperation({ summary: 'Create an account link for onboarding' })
  @ApiBody({ type: CreateAccountLinkDto })
  @ApiResponse({ status: 201, description: 'Account link created' })
  async createAccountLink(@Body() dto: CreateAccountLinkDto) {
    return this.connectService.createAccountLink(dto);
  }

  @Get('connect/account/:accountId')
  @ApiOperation({ summary: 'Get Connect account details' })
  @ApiParam({ name: 'accountId', description: 'Stripe account ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  async getConnectAccount(@Param('accountId') accountId: string) {
    return this.connectService.getAccount(accountId);
  }

  @Get('connect/account/:accountId/balance')
  @ApiOperation({ summary: 'Get Connect account balance' })
  @ApiParam({ name: 'accountId', description: 'Stripe account ID' })
  @ApiResponse({ status: 200, description: 'Account balance' })
  async getAccountBalance(@Param('accountId') accountId: string) {
    return this.connectService.getAccountBalance(accountId);
  }

  @Post('connect/transfer')
  @ApiOperation({ summary: 'Create a transfer to a Connect account' })
  @ApiBody({ type: CreateTransferDto })
  @ApiResponse({ status: 201, description: 'Transfer created' })
  async createTransfer(@Body() dto: CreateTransferDto) {
    return this.connectService.createTransfer(dto);
  }

  @Post('connect/payout')
  @ApiOperation({ summary: 'Create a payout from a Connect account' })
  @ApiBody({ type: CreatePayoutDto })
  @ApiResponse({ status: 201, description: 'Payout created' })
  async createPayout(@Body() dto: CreatePayoutDto) {
    return this.connectService.createPayout(dto);
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  @Post('subscriptions/product')
  @ApiOperation({ summary: 'Create a subscription product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.subscriptionService.createProduct(dto);
  }

  @Post('subscriptions/price')
  @ApiOperation({ summary: 'Create a subscription price' })
  @ApiBody({ type: CreatePriceDto })
  @ApiResponse({ status: 201, description: 'Price created' })
  async createPrice(@Body() dto: CreatePriceDto) {
    return this.subscriptionService.createPrice(dto);
  }

  @Get('subscriptions/products')
  @ApiOperation({ summary: 'List subscription products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async listProducts(@Query('limit') limit?: number, @Query('active') active?: boolean) {
    return this.subscriptionService.listProducts(limit, active);
  }

  @Get('subscriptions/prices/:productId')
  @ApiOperation({ summary: 'List prices for a product' })
  @ApiParam({ name: 'productId', description: 'Stripe product ID' })
  async listPrices(@Param('productId') productId: string) {
    return this.subscriptionService.listPrices(productId);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(dto);
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'subscriptionId', description: 'Stripe subscription ID' })
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.getSubscription(subscriptionId);
  }

  @Get('subscriptions/user/:userId')
  @ApiOperation({ summary: 'List user subscriptions' })
  @ApiParam({ name: 'userId', type: 'string' })
  async listUserSubscriptions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.subscriptionService.listUserSubscriptions(userId);
  }

  @Post('subscriptions/:subscriptionId/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Stripe subscription ID' })
  @ApiBody({ type: UpdateSubscriptionDto })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto
  ) {
    return this.subscriptionService.updateSubscription(subscriptionId, dto);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Stripe subscription ID' })
  @ApiBody({ type: CancelSubscriptionDto })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: CancelSubscriptionDto
  ) {
    return this.subscriptionService.cancelSubscription(subscriptionId, dto);
  }

  @Post('subscriptions/:subscriptionId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Stripe subscription ID' })
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.resumeSubscription(subscriptionId);
  }

  @Get('invoices/user/:userId')
  @ApiOperation({ summary: 'Get user invoices' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listUserInvoices(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number
  ) {
    return this.subscriptionService.listUserInvoices(userId, limit);
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  @Post('refunds')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:refund',
    perUser: true,
    errorMessage: 'Too many refund requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create a refund' })
  @ApiBody({ type: CreateRefundDto })
  @ApiResponse({ status: 201, description: 'Refund created' })
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.refundService.createRefund(dto);
  }

  @Post('refunds/partial')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'payment:partial-refund',
    perUser: true,
    errorMessage: 'Too many refund requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create a partial refund' })
  @ApiBody({ type: PartialRefundDto })
  @ApiResponse({ status: 201, description: 'Partial refund created' })
  async createPartialRefund(@Body() dto: PartialRefundDto) {
    return this.refundService.createPartialRefund(dto);
  }

  @Post('refunds/bulk')
  @RateLimit({
    limit: 5,
    windowSeconds: 60, // 5 requests per minute (heavy operation)
    keyPrefix: 'payment:bulk-refund',
    perUser: true,
    errorMessage: 'Too many bulk refund requests. Please wait before trying again.',
  })
  @ApiOperation({ summary: 'Create bulk refunds (e.g., event cancellation)' })
  @ApiBody({ type: BulkRefundDto })
  @ApiResponse({ status: 201, description: 'Bulk refund results' })
  async createBulkRefund(@Body() dto: BulkRefundDto) {
    return this.refundService.createBulkRefund(dto);
  }

  @Get('refunds/eligibility/:paymentId')
  @ApiOperation({ summary: 'Check refund eligibility for a payment' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Refund eligibility' })
  async checkRefundEligibility(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.refundService.checkRefundEligibility(paymentId);
  }

  @Get('refunds/history/:paymentId')
  @ApiOperation({ summary: 'Get refund history for a payment' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Refund history' })
  async getRefundHistory(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.refundService.getRefundHistory(paymentId);
  }

  @Get('refunds/:refundId')
  @ApiOperation({ summary: 'Get refund by ID' })
  @ApiParam({ name: 'refundId', description: 'Stripe refund ID' })
  @ApiResponse({ status: 200, description: 'Refund details' })
  async getRefund(@Param('refundId') refundId: string) {
    return this.refundService.getRefund(refundId);
  }

  @Post('refunds/:refundId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending refund' })
  @ApiParam({ name: 'refundId', description: 'Stripe refund ID' })
  async cancelRefund(@Param('refundId') refundId: string) {
    return this.refundService.cancelRefund(refundId);
  }

  // ============================================================================
  // Webhooks
  // ============================================================================

  @Post('webhook')
  @Public() // Stripe webhooks must be accessible without authentication
  @SkipRateLimit() // Webhooks are already protected by Stripe signature verification
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any
  ): Promise<void> {
    const payload = req.rawBody as Buffer | undefined;
    if (!payload) {
      throw new Error('Raw body not available');
    }
    return this.paymentsService.handleWebhook(signature, payload);
  }
}
