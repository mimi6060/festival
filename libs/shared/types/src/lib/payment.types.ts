/**
 * Payment Types
 * Types for payment processing and transactions
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  EXPIRED = 'expired',
}

/**
 * Payment provider
 */
export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
}

/**
 * Payment method type
 */
export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  WALLET = 'wallet',
  CASH = 'cash',
}

/**
 * Refund reason
 */
export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  EVENT_CANCELLED = 'event_cancelled',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  FRAUD = 'fraud',
  OTHER = 'other',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Payment record
 */
export interface Payment {
  id: string;
  userId: string;
  festivalId?: string;
  orderId?: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  providerCustomerId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  fees: number;
  netAmount: number;
  description?: string;
  metadata?: Record<string, unknown>;
  paymentMethod?: PaymentMethod;
  billingDetails?: BillingDetails;
  receiptUrl?: string;
  refunds?: Refund[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Payment method details
 */
export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Billing details
 */
export interface BillingDetails {
  name: string;
  email: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Refund record
 */
export interface Refund {
  id: string;
  paymentId: string;
  providerRefundId: string;
  amount: number;
  currency: string;
  reason: RefundReason;
  reasonDetails?: string;
  status: RefundStatus;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

/**
 * Refund status
 */
export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Checkout session
 */
export interface CheckoutSession {
  id: string;
  userId: string;
  festivalId: string;
  orderId: string;
  provider: PaymentProvider;
  providerSessionId: string;
  status: CheckoutStatus;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Checkout status
 */
export enum CheckoutStatus {
  OPEN = 'open',
  COMPLETE = 'complete',
  EXPIRED = 'expired',
}

/**
 * Payment intent (for Stripe-like flows)
 */
export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  paymentMethodTypes: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Payment intent status
 */
export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  CANCELLED = 'cancelled',
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  festivalId?: string;
  orderId?: string;
  paymentId?: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  currency: string;
  dueDate?: string;
  paidAt?: string;
  billingDetails: BillingDetails;
  pdfUrl?: string;
  createdAt: string;
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a checkout session
 */
export interface CreateCheckoutDto {
  orderId: string;
  provider?: PaymentProvider;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for creating a payment intent
 */
export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  orderId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for processing a refund
 */
export interface CreateRefundDto {
  paymentId: string;
  amount?: number;
  reason: RefundReason;
  reasonDetails?: string;
}

/**
 * DTO for adding a payment method
 */
export interface AddPaymentMethodDto {
  provider: PaymentProvider;
  providerPaymentMethodId: string;
  setAsDefault?: boolean;
}

/**
 * Webhook event from payment provider
 */
export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProvider;
  type: string;
  data: Record<string, unknown>;
  signature: string;
  receivedAt: string;
}

/**
 * Payment filters for queries
 */
export interface PaymentFilters {
  userId?: string;
  festivalId?: string;
  orderId?: string;
  provider?: PaymentProvider;
  status?: PaymentStatus | PaymentStatus[];
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid PaymentStatus
 */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

/**
 * Check if value is a valid PaymentProvider
 */
export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return Object.values(PaymentProvider).includes(value as PaymentProvider);
}

/**
 * Check if value is a valid RefundStatus
 */
export function isRefundStatus(value: unknown): value is RefundStatus {
  return Object.values(RefundStatus).includes(value as RefundStatus);
}

/**
 * Check if payment is completed
 */
export function isPaymentCompleted(payment: Payment): boolean {
  return payment.status === PaymentStatus.COMPLETED;
}

/**
 * Check if payment is refundable
 */
export function isPaymentRefundable(payment: Payment): boolean {
  return (
    payment.status === PaymentStatus.COMPLETED &&
    payment.provider !== PaymentProvider.CASH
  );
}

/**
 * Check if payment can be cancelled
 */
export function isPaymentCancellable(payment: Payment): boolean {
  return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(
    payment.status
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate refundable amount
 */
export function getRefundableAmount(payment: Payment): number {
  const refundedAmount =
    payment.refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
  return Math.max(0, payment.amount - refundedAmount);
}

/**
 * Format payment amount
 */
export function formatPaymentAmount(
  amount: number,
  currency: string,
  locale = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100); // Assuming amounts are in cents
}

/**
 * Get payment provider display name
 */
export function getPaymentProviderName(provider: PaymentProvider): string {
  const names: Record<PaymentProvider, string> = {
    [PaymentProvider.STRIPE]: 'Stripe',
    [PaymentProvider.PAYPAL]: 'PayPal',
    [PaymentProvider.APPLE_PAY]: 'Apple Pay',
    [PaymentProvider.GOOGLE_PAY]: 'Google Pay',
    [PaymentProvider.BANK_TRANSFER]: 'Virement bancaire',
    [PaymentProvider.CASH]: 'Especes',
  };
  return names[provider];
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(
  festivalPrefix: string,
  sequence: number
): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${festivalPrefix}-${year}-${paddedSequence}`;
}
