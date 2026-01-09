/**
 * Webhook Event Emitter
 *
 * Listens to internal application events and dispatches them to webhooks.
 * Uses NestJS EventEmitter2 for loose coupling between services.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
// Note: EventEmitter2 is used by both @OnEvent decorator (in this class) and WebhookEventHelper (separate class)
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookEvent } from './webhook-events.enum';

// ============================================================================
// Event Payload Types
// ============================================================================

/**
 * Base interface for all webhook-emittable events
 */
interface BaseWebhookEventPayload {
  festivalId: string;
}

/**
 * Ticket purchased event payload
 */
export interface TicketPurchasedEventPayload extends BaseWebhookEventPayload {
  ticketId: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  price: number;
  currency: string;
  purchasedAt: Date;
}

/**
 * Ticket validated event payload
 */
export interface TicketValidatedEventPayload extends BaseWebhookEventPayload {
  ticketId: string;
  userId: string;
  validatedAt: Date;
  zoneId?: string;
  zoneName?: string;
  staffId?: string;
}

/**
 * Ticket refunded event payload
 */
export interface TicketRefundedEventPayload extends BaseWebhookEventPayload {
  ticketId: string;
  userId: string;
  refundedAt: Date;
  refundAmount: number;
  currency: string;
  reason?: string;
}

/**
 * Ticket cancelled event payload
 */
export interface TicketCancelledEventPayload extends BaseWebhookEventPayload {
  ticketId: string;
  userId: string;
  cancelledAt: Date;
  reason?: string;
}

/**
 * Ticket transferred event payload
 */
export interface TicketTransferredEventPayload extends BaseWebhookEventPayload {
  ticketId: string;
  fromUserId: string;
  toUserId: string;
  toUserEmail: string;
  transferredAt: Date;
}

/**
 * Payment completed event payload
 */
export interface PaymentCompletedEventPayload extends BaseWebhookEventPayload {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId?: string;
  completedAt: Date;
}

/**
 * Payment failed event payload
 */
export interface PaymentFailedEventPayload extends BaseWebhookEventPayload {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: string;
  failedAt: Date;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Payment refunded event payload
 */
export interface PaymentRefundedEventPayload extends BaseWebhookEventPayload {
  paymentId: string;
  userId: string;
  refundAmount: number;
  currency: string;
  refundedAt: Date;
  reason?: string;
}

/**
 * Cashless topup event payload
 */
export interface CashlessTopupEventPayload extends BaseWebhookEventPayload {
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  transactionId: string;
  toppedUpAt: Date;
}

/**
 * Cashless payment event payload
 */
export interface CashlessPaymentEventPayload extends BaseWebhookEventPayload {
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  transactionId: string;
  vendorId?: string;
  vendorName?: string;
  paidAt: Date;
}

/**
 * Cashless refund event payload
 */
export interface CashlessRefundEventPayload extends BaseWebhookEventPayload {
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  transactionId: string;
  originalTransactionId: string;
  refundedAt: Date;
  reason?: string;
}

/**
 * Festival updated event payload
 */
export interface FestivalUpdatedEventPayload extends BaseWebhookEventPayload {
  name: string;
  status: string;
  updatedFields: string[];
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Festival published event payload
 */
export interface FestivalPublishedEventPayload extends BaseWebhookEventPayload {
  name: string;
  publishedAt: Date;
  publishedBy?: string;
  startDate: Date;
  endDate: Date;
}

/**
 * User registered event payload
 */
export interface UserRegisteredEventPayload extends BaseWebhookEventPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  registeredAt: Date;
}

// ============================================================================
// Event Name Constants
// ============================================================================

/**
 * Internal event names (emitted by services)
 */
export const InternalEvents = {
  TICKET_PURCHASED: 'ticket.purchased',
  TICKET_VALIDATED: 'ticket.validated',
  TICKET_REFUNDED: 'ticket.refunded',
  TICKET_CANCELLED: 'ticket.cancelled',
  TICKET_TRANSFERRED: 'ticket.transferred',

  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  CASHLESS_TOPUP: 'cashless.topup',
  CASHLESS_PAYMENT: 'cashless.payment',
  CASHLESS_REFUND: 'cashless.refund',

  FESTIVAL_UPDATED: 'festival.updated',
  FESTIVAL_PUBLISHED: 'festival.published',
  FESTIVAL_STATUS_CHANGED: 'festival.status_changed',

  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
} as const;

// ============================================================================
// Event Emitter Service
// ============================================================================

@Injectable()
export class WebhookEventEmitter implements OnModuleInit {
  private readonly logger = new Logger(WebhookEventEmitter.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  onModuleInit() {
    this.logger.log('Webhook event emitter initialized');
  }

  // ============================================================================
  // Ticket Events
  // ============================================================================

  @OnEvent(InternalEvents.TICKET_PURCHASED, { async: true })
  async handleTicketPurchased(payload: TicketPurchasedEventPayload): Promise<void> {
    this.logger.debug(`Handling ticket.purchased event for ticket ${payload.ticketId}`);
    await this.dispatcher.dispatchTicketPurchased(payload.festivalId, {
      ticketId: payload.ticketId,
      userId: payload.userId,
      categoryId: payload.categoryId,
      categoryName: payload.categoryName,
      price: payload.price,
      currency: payload.currency,
      purchasedAt: payload.purchasedAt.toISOString(),
    });
  }

  @OnEvent(InternalEvents.TICKET_VALIDATED, { async: true })
  async handleTicketValidated(payload: TicketValidatedEventPayload): Promise<void> {
    this.logger.debug(`Handling ticket.validated event for ticket ${payload.ticketId}`);
    await this.dispatcher.dispatchTicketValidated(payload.festivalId, {
      ticketId: payload.ticketId,
      userId: payload.userId,
      validatedAt: payload.validatedAt.toISOString(),
      zoneId: payload.zoneId,
      zoneName: payload.zoneName,
      staffId: payload.staffId,
    });
  }

  @OnEvent(InternalEvents.TICKET_REFUNDED, { async: true })
  async handleTicketRefunded(payload: TicketRefundedEventPayload): Promise<void> {
    this.logger.debug(`Handling ticket.refunded event for ticket ${payload.ticketId}`);
    await this.dispatcher.dispatchTicketRefunded(payload.festivalId, {
      ticketId: payload.ticketId,
      userId: payload.userId,
      refundedAt: payload.refundedAt.toISOString(),
      refundAmount: payload.refundAmount,
      currency: payload.currency,
      reason: payload.reason,
    });
  }

  @OnEvent(InternalEvents.TICKET_CANCELLED, { async: true })
  async handleTicketCancelled(payload: TicketCancelledEventPayload): Promise<void> {
    this.logger.debug(`Handling ticket.cancelled event for ticket ${payload.ticketId}`);
    await this.dispatcher.dispatch({
      festivalId: payload.festivalId,
      event: WebhookEvent.TICKET_CANCELLED,
      data: {
        ticketId: payload.ticketId,
        userId: payload.userId,
        cancelledAt: payload.cancelledAt.toISOString(),
        reason: payload.reason,
      },
    });
  }

  @OnEvent(InternalEvents.TICKET_TRANSFERRED, { async: true })
  async handleTicketTransferred(payload: TicketTransferredEventPayload): Promise<void> {
    this.logger.debug(`Handling ticket.transferred event for ticket ${payload.ticketId}`);
    await this.dispatcher.dispatch({
      festivalId: payload.festivalId,
      event: WebhookEvent.TICKET_TRANSFERRED,
      data: {
        ticketId: payload.ticketId,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
        toUserEmail: payload.toUserEmail,
        transferredAt: payload.transferredAt.toISOString(),
      },
    });
  }

  // ============================================================================
  // Payment Events
  // ============================================================================

  @OnEvent(InternalEvents.PAYMENT_COMPLETED, { async: true })
  async handlePaymentCompleted(payload: PaymentCompletedEventPayload): Promise<void> {
    this.logger.debug(`Handling payment.completed event for payment ${payload.paymentId}`);
    await this.dispatcher.dispatchPaymentCompleted(payload.festivalId, {
      paymentId: payload.paymentId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      provider: payload.provider,
      providerPaymentId: payload.providerPaymentId,
      completedAt: payload.completedAt.toISOString(),
    });
  }

  @OnEvent(InternalEvents.PAYMENT_FAILED, { async: true })
  async handlePaymentFailed(payload: PaymentFailedEventPayload): Promise<void> {
    this.logger.debug(`Handling payment.failed event for payment ${payload.paymentId}`);
    await this.dispatcher.dispatchPaymentFailed(payload.festivalId, {
      paymentId: payload.paymentId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      provider: payload.provider,
      failedAt: payload.failedAt.toISOString(),
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
    });
  }

  @OnEvent(InternalEvents.PAYMENT_REFUNDED, { async: true })
  async handlePaymentRefunded(payload: PaymentRefundedEventPayload): Promise<void> {
    this.logger.debug(`Handling payment.refunded event for payment ${payload.paymentId}`);
    await this.dispatcher.dispatchPaymentRefunded(payload.festivalId, {
      paymentId: payload.paymentId,
      userId: payload.userId,
      refundAmount: payload.refundAmount,
      currency: payload.currency,
      refundedAt: payload.refundedAt.toISOString(),
      reason: payload.reason,
    });
  }

  // ============================================================================
  // Cashless Events
  // ============================================================================

  @OnEvent(InternalEvents.CASHLESS_TOPUP, { async: true })
  async handleCashlessTopup(payload: CashlessTopupEventPayload): Promise<void> {
    this.logger.debug(`Handling cashless.topup event for account ${payload.accountId}`);
    await this.dispatcher.dispatchCashlessTopup(payload.festivalId, {
      accountId: payload.accountId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      balanceAfter: payload.balanceAfter,
      transactionId: payload.transactionId,
      toppedUpAt: payload.toppedUpAt.toISOString(),
    });
  }

  @OnEvent(InternalEvents.CASHLESS_PAYMENT, { async: true })
  async handleCashlessPayment(payload: CashlessPaymentEventPayload): Promise<void> {
    this.logger.debug(`Handling cashless.payment event for account ${payload.accountId}`);
    await this.dispatcher.dispatchCashlessPayment(payload.festivalId, {
      accountId: payload.accountId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      balanceAfter: payload.balanceAfter,
      transactionId: payload.transactionId,
      vendorId: payload.vendorId,
      vendorName: payload.vendorName,
      paidAt: payload.paidAt.toISOString(),
    });
  }

  @OnEvent(InternalEvents.CASHLESS_REFUND, { async: true })
  async handleCashlessRefund(payload: CashlessRefundEventPayload): Promise<void> {
    this.logger.debug(`Handling cashless.refund event for account ${payload.accountId}`);
    await this.dispatcher.dispatch({
      festivalId: payload.festivalId,
      event: WebhookEvent.CASHLESS_REFUND,
      data: {
        accountId: payload.accountId,
        userId: payload.userId,
        amount: payload.amount,
        currency: payload.currency,
        balanceAfter: payload.balanceAfter,
        transactionId: payload.transactionId,
        originalTransactionId: payload.originalTransactionId,
        refundedAt: payload.refundedAt.toISOString(),
        reason: payload.reason,
      },
    });
  }

  // ============================================================================
  // Festival Events
  // ============================================================================

  @OnEvent(InternalEvents.FESTIVAL_UPDATED, { async: true })
  async handleFestivalUpdated(payload: FestivalUpdatedEventPayload): Promise<void> {
    this.logger.debug(`Handling festival.updated event for festival ${payload.festivalId}`);
    await this.dispatcher.dispatchFestivalUpdated(payload.festivalId, {
      name: payload.name,
      status: payload.status,
      updatedFields: payload.updatedFields,
      updatedAt: payload.updatedAt.toISOString(),
      updatedBy: payload.updatedBy,
    });
  }

  @OnEvent(InternalEvents.FESTIVAL_PUBLISHED, { async: true })
  async handleFestivalPublished(payload: FestivalPublishedEventPayload): Promise<void> {
    this.logger.debug(`Handling festival.published event for festival ${payload.festivalId}`);
    await this.dispatcher.dispatchFestivalPublished(payload.festivalId, {
      name: payload.name,
      publishedAt: payload.publishedAt.toISOString(),
      publishedBy: payload.publishedBy,
      startDate: payload.startDate.toISOString(),
      endDate: payload.endDate.toISOString(),
    });
  }

  // ============================================================================
  // User Events
  // ============================================================================

  @OnEvent(InternalEvents.USER_REGISTERED, { async: true })
  async handleUserRegistered(payload: UserRegisteredEventPayload): Promise<void> {
    this.logger.debug(`Handling user.registered event for user ${payload.userId}`);
    await this.dispatcher.dispatchUserRegistered(payload.festivalId, {
      userId: payload.userId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      registeredAt: payload.registeredAt.toISOString(),
    });
  }
}

// ============================================================================
// Helper Functions for Emitting Events
// ============================================================================

/**
 * Helper class for emitting webhook events from services
 */
@Injectable()
export class WebhookEventHelper {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Emit a ticket purchased event
   */
  emitTicketPurchased(payload: TicketPurchasedEventPayload): void {
    this.emitter.emit(InternalEvents.TICKET_PURCHASED, payload);
  }

  /**
   * Emit a ticket validated event
   */
  emitTicketValidated(payload: TicketValidatedEventPayload): void {
    this.emitter.emit(InternalEvents.TICKET_VALIDATED, payload);
  }

  /**
   * Emit a ticket refunded event
   */
  emitTicketRefunded(payload: TicketRefundedEventPayload): void {
    this.emitter.emit(InternalEvents.TICKET_REFUNDED, payload);
  }

  /**
   * Emit a ticket cancelled event
   */
  emitTicketCancelled(payload: TicketCancelledEventPayload): void {
    this.emitter.emit(InternalEvents.TICKET_CANCELLED, payload);
  }

  /**
   * Emit a ticket transferred event
   */
  emitTicketTransferred(payload: TicketTransferredEventPayload): void {
    this.emitter.emit(InternalEvents.TICKET_TRANSFERRED, payload);
  }

  /**
   * Emit a payment completed event
   */
  emitPaymentCompleted(payload: PaymentCompletedEventPayload): void {
    this.emitter.emit(InternalEvents.PAYMENT_COMPLETED, payload);
  }

  /**
   * Emit a payment failed event
   */
  emitPaymentFailed(payload: PaymentFailedEventPayload): void {
    this.emitter.emit(InternalEvents.PAYMENT_FAILED, payload);
  }

  /**
   * Emit a payment refunded event
   */
  emitPaymentRefunded(payload: PaymentRefundedEventPayload): void {
    this.emitter.emit(InternalEvents.PAYMENT_REFUNDED, payload);
  }

  /**
   * Emit a cashless topup event
   */
  emitCashlessTopup(payload: CashlessTopupEventPayload): void {
    this.emitter.emit(InternalEvents.CASHLESS_TOPUP, payload);
  }

  /**
   * Emit a cashless payment event
   */
  emitCashlessPayment(payload: CashlessPaymentEventPayload): void {
    this.emitter.emit(InternalEvents.CASHLESS_PAYMENT, payload);
  }

  /**
   * Emit a cashless refund event
   */
  emitCashlessRefund(payload: CashlessRefundEventPayload): void {
    this.emitter.emit(InternalEvents.CASHLESS_REFUND, payload);
  }

  /**
   * Emit a festival updated event
   */
  emitFestivalUpdated(payload: FestivalUpdatedEventPayload): void {
    this.emitter.emit(InternalEvents.FESTIVAL_UPDATED, payload);
  }

  /**
   * Emit a festival published event
   */
  emitFestivalPublished(payload: FestivalPublishedEventPayload): void {
    this.emitter.emit(InternalEvents.FESTIVAL_PUBLISHED, payload);
  }

  /**
   * Emit a user registered event
   */
  emitUserRegistered(payload: UserRegisteredEventPayload): void {
    this.emitter.emit(InternalEvents.USER_REGISTERED, payload);
  }
}
