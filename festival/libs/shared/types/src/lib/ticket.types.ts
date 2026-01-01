/**
 * Ticket Types
 * Types for ticket management, purchasing, and validation
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Ticket status
 */
export enum TicketStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  USED = 'used',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

/**
 * Ticket type
 */
export enum TicketType {
  GENERAL = 'general',
  VIP = 'vip',
  PREMIUM = 'premium',
  EARLY_BIRD = 'early_bird',
  STUDENT = 'student',
  GROUP = 'group',
  PRESS = 'press',
  STAFF = 'staff',
  COMPLIMENTARY = 'complimentary',
}

/**
 * Ticket access level
 */
export enum TicketAccessLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ALL_ACCESS = 'all_access',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Ticket category (defines pricing and availability)
 */
export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  type: TicketType;
  accessLevel: TicketAccessLevel;
  price: number;
  currency: string;
  quantity: number;
  quantitySold: number;
  maxPerOrder: number;
  minPerOrder: number;
  saleStartDate: string;
  saleEndDate: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  benefits?: string[];
  restrictions?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual ticket instance
 */
export interface Ticket {
  id: string;
  festivalId: string;
  categoryId: string;
  orderId: string;
  userId: string;
  status: TicketStatus;
  ticketNumber: string;
  qrCode: string;
  nfcId?: string;
  holderName: string;
  holderEmail: string;
  holderPhone?: string;
  purchaseDate: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  transferredFrom?: string;
  transferredAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ticket with category details
 */
export interface TicketWithCategory extends Ticket {
  category: TicketCategory;
}

/**
 * Ticket order
 */
export interface TicketOrder {
  id: string;
  festivalId: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  items: TicketOrderItem[];
  subtotal: number;
  fees: number;
  discount: number;
  total: number;
  currency: string;
  paymentId?: string;
  promoCode?: string;
  billingInfo: BillingInfo;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

/**
 * Ticket order item
 */
export interface TicketOrderItem {
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tickets?: Ticket[];
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Billing information
 */
export interface BillingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
}

/**
 * Ticket validation result
 */
export interface TicketValidationResult {
  valid: boolean;
  ticket?: Ticket;
  category?: TicketCategory;
  message: string;
  errorCode?: string;
}

/**
 * Check-in record
 */
export interface CheckInRecord {
  id: string;
  ticketId: string;
  festivalId: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInBy: string;
  location?: string;
  method: 'qr' | 'nfc' | 'manual';
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a ticket category
 */
export interface CreateTicketCategoryDto {
  name: string;
  description?: string;
  type: TicketType;
  accessLevel: TicketAccessLevel;
  price: number;
  quantity: number;
  maxPerOrder?: number;
  minPerOrder?: number;
  saleStartDate: string;
  saleEndDate: string;
  validFrom: string;
  validUntil: string;
  benefits?: string[];
  restrictions?: string[];
}

/**
 * DTO for updating a ticket category
 */
export interface UpdateTicketCategoryDto {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  maxPerOrder?: number;
  minPerOrder?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  isActive?: boolean;
  benefits?: string[];
  restrictions?: string[];
}

/**
 * DTO for purchasing tickets
 */
export interface PurchaseTicketsDto {
  festivalId: string;
  items: PurchaseItemDto[];
  billingInfo: BillingInfo;
  promoCode?: string;
  paymentMethod: string;
}

/**
 * Purchase item
 */
export interface PurchaseItemDto {
  categoryId: string;
  quantity: number;
  attendees?: AttendeeInfoDto[];
}

/**
 * Attendee information
 */
export interface AttendeeInfoDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * DTO for transferring a ticket
 */
export interface TransferTicketDto {
  ticketId: string;
  recipientEmail: string;
  recipientName: string;
  message?: string;
}

/**
 * DTO for validating a ticket
 */
export interface ValidateTicketDto {
  ticketNumber?: string;
  qrCode?: string;
  nfcId?: string;
}

/**
 * DTO for checking in a ticket
 */
export interface CheckInTicketDto {
  ticketId: string;
  location?: string;
  method: 'qr' | 'nfc' | 'manual';
}

/**
 * Ticket filters for queries
 */
export interface TicketFilters {
  festivalId?: string;
  categoryId?: string;
  userId?: string;
  status?: TicketStatus | TicketStatus[];
  type?: TicketType | TicketType[];
  search?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  checkedIn?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid TicketStatus
 */
export function isTicketStatus(value: unknown): value is TicketStatus {
  return Object.values(TicketStatus).includes(value as TicketStatus);
}

/**
 * Check if value is a valid TicketType
 */
export function isTicketType(value: unknown): value is TicketType {
  return Object.values(TicketType).includes(value as TicketType);
}

/**
 * Check if value is a valid OrderStatus
 */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus);
}

/**
 * Check if ticket is valid for entry
 */
export function isTicketValidForEntry(ticket: Ticket): boolean {
  return ticket.status === TicketStatus.SOLD && !ticket.checkedInAt;
}

/**
 * Check if ticket is checked in
 */
export function isTicketCheckedIn(ticket: Ticket): boolean {
  return ticket.status === TicketStatus.USED && !!ticket.checkedInAt;
}

/**
 * Check if ticket category is on sale
 */
export function isCategoryOnSale(category: TicketCategory): boolean {
  const now = new Date();
  const start = new Date(category.saleStartDate);
  const end = new Date(category.saleEndDate);
  return (
    category.isActive &&
    now >= start &&
    now <= end &&
    category.quantitySold < category.quantity
  );
}

/**
 * Check if ticket category is sold out
 */
export function isCategorySoldOut(category: TicketCategory): boolean {
  return category.quantitySold >= category.quantity;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get available quantity for a category
 */
export function getAvailableQuantity(category: TicketCategory): number {
  return Math.max(0, category.quantity - category.quantitySold);
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(
  items: TicketOrderItem[],
  discount = 0
): { subtotal: number; fees: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const fees = Math.round(subtotal * 0.03 * 100) / 100; // 3% service fee
  const total = Math.max(0, subtotal + fees - discount);
  return { subtotal, fees, total };
}

/**
 * Generate ticket number
 */
export function generateTicketNumber(
  festivalId: string,
  sequence: number
): string {
  const prefix = festivalId.substring(0, 4).toUpperCase();
  const paddedSequence = sequence.toString().padStart(8, '0');
  return `${prefix}-${paddedSequence}`;
}

/**
 * Format ticket price
 */
export function formatTicketPrice(
  price: number,
  currency: string,
  locale = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price);
}
