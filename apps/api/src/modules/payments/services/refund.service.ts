/**
 * Refund Service
 *
 * Comprehensive refund management:
 * - Full and partial refunds
 * - Bulk refunds (event cancellation)
 * - Refund eligibility checking
 * - Refund policy enforcement
 * - Connect refund handling
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
import { PaymentStatus, Prisma } from '@prisma/client';
import {
  CreateRefundDto,
  PartialRefundDto,
  BulkRefundDto,
  RefundResponseDto,
  BulkRefundResponseDto,
  RefundResultDto,
  RefundStatus,
  RefundEligibilityDto,
  RefundPolicyDto,
  RefundReason,
} from '../dto/refund.dto';

interface RefundablePayment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerPaymentId: string | null;
  refundedAmount: number;
  paidAt: Date | null;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private stripe: Stripe | null = null;

  // Default refund policy (can be configured per festival)
  private readonly defaultPolicy: RefundPolicyDto = {
    refundsAllowed: true,
    daysBeforeEventLimit: 7,
    fullRefundPercentage: 100,
    partialRefundPercentage: 50,
    minimumRefundAmount: 100, // 1 EUR in cents
    processingFeeRetained: 0,
    processingTimeDays: 5,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Refund features disabled');
    }
  }

  /**
   * Process a full or partial refund
   */
  async createRefund(dto: CreateRefundDto): Promise<RefundResponseDto> {
    this.ensureStripeConfigured();

    // Get payment and validate
    const payment = await this.getPaymentForRefund(dto.paymentId);

    // Check eligibility
    const eligibility = await this.checkRefundEligibility(dto.paymentId);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        eligibility.ineligibilityReason || 'Payment is not eligible for refund'
      );
    }

    // Determine refund amount
    const refundAmount = dto.amount || eligibility.maxRefundAmount;

    if (refundAmount > eligibility.maxRefundAmount) {
      throw new BadRequestException(
        `Refund amount exceeds maximum allowed (${eligibility.maxRefundAmount / 100} ${payment.currency})`
      );
    }

    if (refundAmount < this.defaultPolicy.minimumRefundAmount) {
      throw new BadRequestException(
        `Refund amount is below minimum (${this.defaultPolicy.minimumRefundAmount / 100} EUR)`
      );
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.providerPaymentId!,
        amount: refundAmount,
        reason: this.mapRefundReason(dto.reason),
        metadata: {
          paymentId: dto.paymentId,
          reason: dto.reason,
          explanation: dto.explanation || '',
          ...dto.metadata,
        },
      };

      if (dto.refundApplicationFee) {
        refundParams.refund_application_fee = dto.refundApplicationFee;
      }

      if (dto.reverseTransfer) {
        refundParams.reverse_transfer = dto.reverseTransfer;
      }

      const refundOptions: Stripe.RequestOptions = {};
      if (dto.idempotencyKey) {
        refundOptions.idempotencyKey = dto.idempotencyKey;
      }

      const refund = await this.stripe!.refunds.create(refundParams, refundOptions);

      // Update payment record
      const isFullRefund = refundAmount >= Number(payment.amount) * 100;
      await this.updatePaymentAfterRefund(dto.paymentId, refundAmount, isFullRefund, refund.id);

      this.logger.log(
        `Refund ${refund.id} created for payment ${dto.paymentId}: ${refundAmount} cents`
      );

      return this.mapRefundToResponse(refund, dto.paymentId);
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  /**
   * Process a partial refund with line item tracking
   */
  async createPartialRefund(dto: PartialRefundDto): Promise<RefundResponseDto> {
    return this.createRefund({
      paymentId: dto.paymentId,
      amount: dto.amount,
      reason: dto.reason,
      explanation: dto.explanation,
      metadata: {
        ...dto.metadata,
        lineItemIds: dto.lineItemIds?.join(',') || '',
        partialRefund: 'true',
      },
    });
  }

  /**
   * Process bulk refunds (e.g., event cancellation)
   */
  async createBulkRefund(dto: BulkRefundDto): Promise<BulkRefundResponseDto> {
    this.ensureStripeConfigured();

    const results: RefundResultDto[] = [];
    let successCount = 0;
    let failedCount = 0;
    let totalAmountRefunded = 0;

    for (const paymentId of dto.paymentIds) {
      try {
        const payment = await this.getPaymentForRefund(paymentId);
        const refundAmount = dto.percentageToRefund
          ? Math.floor((Number(payment.amount) * 100 * dto.percentageToRefund) / 100)
          : Number(payment.amount) * 100;

        const refund = await this.createRefund({
          paymentId,
          amount: refundAmount,
          reason: dto.reason,
          explanation: dto.explanation,
        });

        results.push({
          paymentId,
          success: true,
          refundId: refund.refundId,
          amount: refund.amount,
        });

        successCount++;
        totalAmountRefunded += refund.amount;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          paymentId,
          success: false,
          error: errorMessage,
        });
        failedCount++;
        this.logger.warn(`Failed to refund payment ${paymentId}: ${errorMessage}`);
      }
    }

    this.logger.log(`Bulk refund completed: ${successCount} succeeded, ${failedCount} failed`);

    return {
      totalRequested: dto.paymentIds.length,
      successCount,
      failedCount,
      totalAmountRefunded,
      results,
    };
  }

  /**
   * Check if a payment is eligible for refund
   */
  async checkRefundEligibility(paymentId: string): Promise<RefundEligibilityDto> {
    const payment = await this.fetchPaymentWithTickets(paymentId);
    const policy = this.defaultPolicy;
    const originalAmount = Number(payment.amount) * 100;
    const refundedAmount = await this.getRefundedAmount(paymentId);

    const basicEligibility = this.checkBasicEligibility(
      payment,
      policy,
      originalAmount,
      refundedAmount
    );
    if (basicEligibility) {
      return basicEligibility;
    }

    const { daysUntilEvent, refundPercentage, eventIneligibility } =
      this.calculateEventBasedEligibility(payment.tickets, policy);

    if (eventIneligibility) {
      return {
        ...eventIneligibility,
        originalAmount,
        refundedAmount,
        daysUntilEvent,
        policy,
      };
    }

    return this.buildFinalEligibility(
      originalAmount,
      refundedAmount,
      refundPercentage,
      daysUntilEvent,
      policy
    );
  }

  /**
   * Get refund history for a payment
   */
  async getRefundHistory(paymentId: string): Promise<RefundResponseDto[]> {
    this.ensureStripeConfigured();

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment?.providerPaymentId) {
      throw new NotFoundException('Payment not found');
    }

    try {
      const refunds = await this.stripe!.refunds.list({
        payment_intent: payment.providerPaymentId,
      });

      return refunds.data.map((r) => this.mapRefundToResponse(r, paymentId));
    } catch (error) {
      this.logger.error(`Failed to get refund history: ${error}`);
      throw new InternalServerErrorException('Failed to get refund history');
    }
  }

  /**
   * Get a single refund by ID
   */
  async getRefund(refundId: string): Promise<RefundResponseDto> {
    this.ensureStripeConfigured();

    try {
      const refund = await this.stripe!.refunds.retrieve(refundId);
      const paymentId = refund.metadata?.paymentId || '';

      return this.mapRefundToResponse(refund, paymentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve refund: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'resource_missing') {
          throw new NotFoundException('Refund not found');
        }
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve refund');
    }
  }

  /**
   * Cancel a pending refund
   */
  async cancelRefund(refundId: string): Promise<RefundResponseDto> {
    this.ensureStripeConfigured();

    try {
      const refund = await this.stripe!.refunds.cancel(refundId);

      this.logger.log(`Cancelled refund ${refundId}`);

      const paymentId = refund.metadata?.paymentId || '';
      return this.mapRefundToResponse(refund, paymentId);
    } catch (error) {
      this.logger.error(`Failed to cancel refund: ${error}`);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to cancel refund');
    }
  }

  /**
   * Handle refund webhooks
   */
  async handleRefundWebhook(event: Stripe.Event): Promise<void> {
    const refund = event.data.object as Stripe.Refund;
    const paymentId = refund.metadata?.paymentId;

    switch (event.type) {
      case 'refund.created':
        this.logger.log(`Refund created via webhook: ${refund.id}`);
        break;

      case 'refund.updated':
        this.logger.log(`Refund updated: ${refund.id} - Status: ${refund.status}`);
        if (paymentId && refund.status === 'succeeded') {
          await this.updatePaymentAfterRefund(paymentId, refund.amount, false, refund.id);
        }
        break;

      case 'refund.failed':
        this.logger.error(`Refund failed: ${refund.id} - Reason: ${refund.failure_reason}`);
        // Could notify support team here
        break;

      default:
        this.logger.log(`Unhandled refund event: ${event.type}`);
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

  private async getPaymentForRefund(paymentId: string): Promise<RefundablePayment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.providerPaymentId) {
      throw new BadRequestException('Payment has no provider ID');
    }

    const refundedAmount = await this.getRefundedAmount(paymentId);

    return {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      providerPaymentId: payment.providerPaymentId,
      refundedAmount,
      paidAt: payment.paidAt,
      metadata: payment.metadata as Record<string, unknown> | null,
    };
  }

  private async getRefundedAmount(paymentId: string): Promise<number> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment?.providerPaymentId || !this.stripe) {
      return 0;
    }

    try {
      const refunds = await this.stripe.refunds.list({
        payment_intent: payment.providerPaymentId,
      });

      return refunds.data
        .filter((r) => r.status === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0);
    } catch {
      return 0;
    }
  }

  private async updatePaymentAfterRefund(
    paymentId: string,
    refundAmount: number,
    isFullRefund: boolean,
    stripeRefundId: string
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return;
    }

    const providerData = (payment.providerData as Record<string, unknown>) || {};

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isFullRefund ? PaymentStatus.REFUNDED : payment.status,
        refundedAt: isFullRefund ? new Date() : payment.refundedAt,
        providerData: {
          ...providerData,
          refunds: [
            ...((providerData.refunds as unknown[]) || []),
            {
              id: stripeRefundId,
              amount: refundAmount,
              createdAt: new Date().toISOString(),
            },
          ],
          totalRefunded: ((providerData.totalRefunded as number) || 0) + refundAmount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Update associated tickets if full refund
    if (isFullRefund) {
      await this.prisma.ticket.updateMany({
        where: { paymentId },
        data: { status: 'REFUNDED' },
      });
    }
  }

  private mapRefundReason(reason: RefundReason): Stripe.RefundCreateParams.Reason {
    const reasonMap: Record<RefundReason, Stripe.RefundCreateParams.Reason> = {
      [RefundReason.DUPLICATE]: 'duplicate',
      [RefundReason.FRAUDULENT]: 'fraudulent',
      [RefundReason.REQUESTED_BY_CUSTOMER]: 'requested_by_customer',
      [RefundReason.EVENT_CANCELLED]: 'requested_by_customer',
      [RefundReason.EVENT_POSTPONED]: 'requested_by_customer',
      [RefundReason.PARTIAL_ATTENDANCE]: 'requested_by_customer',
      [RefundReason.QUALITY_ISSUE]: 'requested_by_customer',
      [RefundReason.OTHER]: 'requested_by_customer',
    };
    return reasonMap[reason];
  }

  private mapRefundToResponse(refund: Stripe.Refund, paymentId: string): RefundResponseDto {
    return {
      refundId: refund.metadata?.paymentId || paymentId,
      stripeRefundId: refund.id,
      paymentId,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status as RefundStatus,
      reason: refund.reason || 'requested_by_customer',
      failureReason: refund.failure_reason || undefined,
      createdAt: new Date(refund.created * 1000),
    };
  }

  // ============================================================================
  // Refund Eligibility Helper Methods
  // ============================================================================

  /**
   * Fetch payment with associated tickets and festivals
   */
  private async fetchPaymentWithTickets(paymentId: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        tickets: {
          include: {
            festival: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Check basic eligibility conditions (policy, status, already refunded)
   */
  private checkBasicEligibility(
    payment: any,
    policy: RefundPolicyDto,
    originalAmount: number,
    refundedAmount: number
  ): RefundEligibilityDto | null {
    if (!policy.refundsAllowed) {
      return {
        eligible: false,
        maxRefundAmount: 0,
        refundPercentage: 0,
        ineligibilityReason: 'Refunds are not allowed for this payment',
        originalAmount,
        refundedAmount,
        policy,
      };
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      return {
        eligible: false,
        maxRefundAmount: 0,
        refundPercentage: 0,
        ineligibilityReason: 'Only completed payments can be refunded',
        originalAmount,
        refundedAmount,
        policy,
      };
    }

    if (refundedAmount >= originalAmount) {
      return {
        eligible: false,
        maxRefundAmount: 0,
        refundPercentage: 0,
        ineligibilityReason: 'Payment has already been fully refunded',
        originalAmount,
        refundedAmount,
        policy,
      };
    }

    return null;
  }

  /**
   * Calculate event-based eligibility (days until event, refund percentage)
   */
  private calculateEventBasedEligibility(
    tickets: any[] | undefined,
    policy: RefundPolicyDto
  ): {
    daysUntilEvent: number | undefined;
    refundPercentage: number;
    eventIneligibility: Partial<RefundEligibilityDto> | null;
  } {
    if (!tickets || tickets.length === 0) {
      return {
        daysUntilEvent: undefined,
        refundPercentage: policy.fullRefundPercentage,
        eventIneligibility: null,
      };
    }

    const earliestFestival = tickets
      .map((t) => t.festival)
      .filter((f) => f)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    if (!earliestFestival) {
      return {
        daysUntilEvent: undefined,
        refundPercentage: policy.fullRefundPercentage,
        eventIneligibility: null,
      };
    }

    const now = new Date();
    const eventDate = new Date(earliestFestival.startDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEvent < 0) {
      return {
        daysUntilEvent,
        refundPercentage: 0,
        eventIneligibility: {
          eligible: false,
          maxRefundAmount: 0,
          refundPercentage: 0,
          ineligibilityReason: 'Event has already started or passed',
        },
      };
    }

    const refundPercentage =
      daysUntilEvent < policy.daysBeforeEventLimit
        ? policy.partialRefundPercentage
        : policy.fullRefundPercentage;

    return { daysUntilEvent, refundPercentage, eventIneligibility: null };
  }

  /**
   * Build the final eligibility response
   */
  private buildFinalEligibility(
    originalAmount: number,
    refundedAmount: number,
    refundPercentage: number,
    daysUntilEvent: number | undefined,
    policy: RefundPolicyDto
  ): RefundEligibilityDto {
    const maxRefundableAmount = originalAmount - refundedAmount;
    const maxRefundAmount =
      Math.floor((maxRefundableAmount * refundPercentage) / 100) - policy.processingFeeRetained;

    return {
      eligible: maxRefundAmount >= policy.minimumRefundAmount,
      maxRefundAmount: Math.max(0, maxRefundAmount),
      refundPercentage,
      originalAmount,
      refundedAmount,
      daysUntilEvent,
      policy,
      ineligibilityReason:
        maxRefundAmount < policy.minimumRefundAmount
          ? 'Refund amount is below minimum threshold'
          : undefined,
    };
  }
}
