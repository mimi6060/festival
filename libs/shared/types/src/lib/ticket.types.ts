/**
 * Ticket Types
 * Types for ticketing, orders, and access control
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Ticket status
 */
export enum TicketStatus {
  RESERVED = 'reserved',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  USED = 'used',
  EXPIRED = 'expired',
  TRANSFERRED = 'transferred',
}

/**
 * Ticket type/tier
 */
export enum TicketType {
  GENERAL = 'general',
  VIP = 'vip',
  PREMIUM = 'premium',
  BACKSTAGE = 'backstage',
  EARLY_BIRD = 'early_bird',
  LATE_BIRD = 'late_bird',
  GROUP = 'group',
  STUDENT = 'student',
  SENIOR = 'senior',
  CHILD = 'child',
  FAMILY = 'family',
  PRESS = 'press',
  STAFF = 'staff',
  ARTIST = 'artist',
  SPONSOR = 'sponsor',
  COMPLIMENTARY = 'complimentary',
}

/**
 * Ticket validity period
 */
export enum TicketValidity {
  SINGLE_DAY = 'single_day',
  MULTI_DAY = 'multi_day',
  FULL_PASS = 'full_pass',
  WEEKEND = 'weekend',
  WEEKDAY = 'weekday',
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  EXPIRED = 'expired',
}

/**
 * QR code validation result
 */
export enum QrValidationResult {
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  ALREADY_USED = 'already_used',
  WRONG_DATE = 'wrong_date',
  WRONG_ZONE = 'wrong_zone',
  CANCELLED = 'cancelled',
}

/**
 * Transfer status
 */
export enum TransferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Ticket category (template for tickets)
 */
export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  slug: string;
  type: TicketType;
  validity: TicketValidity;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  quantity: number;
  soldCount: number;
  reservedCount: number;
  availableCount: number;
  minPerOrder: number;
  maxPerOrder: number;
  saleStartDate: string;
  saleEndDate: string;
  validFrom?: string;
  validUntil?: string;
  validDays?: string[];
  benefits: TicketBenefit[];
  zoneAccess: string[];
  restrictions: TicketRestrictions;
  isActive: boolean;
  isHidden: boolean;
  sortOrder: number;
  image?: string;
  color?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ticket benefit
 */
export interface TicketBenefit {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

/**
 * Ticket restrictions
 */
export interface TicketRestrictions {
  minAge?: number;
  maxAge?: number;
  requiresId: boolean;
  requiresStudentId?: boolean;
  requiresCompanion?: boolean;
  companionTicketType?: TicketType;
  maxTransfers?: number;
  isTransferable: boolean;
  isRefundable: boolean;
  refundDeadlineDays?: number;
}

/**
 * Individual ticket instance
 */
export interface Ticket {
  id: string;
  ticketCategoryId: string;
  festivalId: string;
  orderId: string;
  userId: string;
  originalUserId?: string;
  status: TicketStatus;
  qrCode: string;
  qrCodeHash: string;
  barcode?: string;
  ticketNumber: string;
  holderInfo: TicketHolder;
  validFrom: string;
  validUntil: string;
  validDays: string[];
  zoneAccess: string[];
  checkIns: CheckIn[];
  transferHistory: TicketTransfer[];
  walletPassUrl?: string;
  pdfUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ticket holder information
 */
export interface TicketHolder {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  documentType?: 'id' | 'passport' | 'driver_license';
  documentNumber?: string;
}

/**
 * Check-in record
 */
export interface CheckIn {
  id: string;
  ticketId: string;
  zoneId?: string;
  zoneName?: string;
  gateId?: string;
  gateName?: string;
  scannedBy: string;
  scannedByName?: string;
  direction: 'in' | 'out';
  method: 'qr' | 'nfc' | 'manual';
  deviceId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

/**
 * Ticket transfer record
 */
export interface TicketTransfer {
  id: string;
  ticketId: string;
  fromUserId: string;
  toUserId?: string;
  toEmail: string;
  status: TransferStatus;
  transferCode?: string;
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

/**
 * Ticket with category details
 */
export interface TicketWithCategory extends Ticket {
  category: TicketCategory;
}

/**
 * Order
 */
export interface Order {
  id: string;
  orderNumber: string;
  festivalId: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  tickets: Ticket[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  fees: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  currency: string;
  paymentId?: string;
  paymentMethod?: string;
  billingInfo: BillingInfo;
  notes?: string;
  expiresAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Order item
 */
export interface OrderItem {
  id: string;
  ticketCategoryId: string;
  categoryName: string;
  categoryType: TicketType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tickets?: Ticket[];
}

/**
 * Billing information
 */
export interface BillingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  vatNumber?: string;
  address?: {
    street: string;
    street2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Discount/promo code
 */
export interface PromoCode {
  id: string;
  festivalId: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'free_ticket';
  value: number;
  maxDiscount?: number;
  applicableCategories?: string[];
  minOrderAmount?: number;
  minQuantity?: number;
  maxUses?: number;
  usedCount: number;
  maxUsesPerUser?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ticket category with availability
 */
export interface TicketCategoryWithAvailability extends TicketCategory {
  isOnSale: boolean;
  isSoldOut: boolean;
  isComingSoon: boolean;
  isEnded: boolean;
  percentageSold: number;
}

/**
 * QR code validation request
 */
export interface QrValidationRequest {
  qrCode: string;
  zoneId?: string;
  gateId?: string;
  direction?: 'in' | 'out';
}

/**
 * QR code validation response
 */
export interface QrValidationResponse {
  result: QrValidationResult;
  ticket?: TicketWithCategory;
  message: string;
  checkIn?: CheckIn;
}

/**
 * Ticket statistics
 */
export interface TicketStats {
  festivalId: string;
  totalCapacity: number;
  totalSold: number;
  totalReserved: number;
  totalAvailable: number;
  totalCheckedIn: number;
  totalRevenue: number;
  currency: string;
  byCategory: CategoryStats[];
  byDay: DailyStats[];
}

/**
 * Category statistics
 */
export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryType: TicketType;
  capacity: number;
  sold: number;
  reserved: number;
  available: number;
  checkedIn: number;
  revenue: number;
}

/**
 * Daily statistics
 */
export interface DailyStats {
  date: string;
  sold: number;
  revenue: number;
  checkedIn: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a ticket category
 */
export interface CreateTicketCategoryDto {
  name: string;
  type: TicketType;
  validity: TicketValidity;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  quantity: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  saleStartDate: string;
  saleEndDate: string;
  validFrom?: string;
  validUntil?: string;
  validDays?: string[];
  benefits?: Omit<TicketBenefit, 'id'>[];
  zoneAccess?: string[];
  restrictions?: Partial<TicketRestrictions>;
  image?: string;
  color?: string;
}

/**
 * DTO for updating a ticket category
 */
export interface UpdateTicketCategoryDto {
  name?: string;
  type?: TicketType;
  validity?: TicketValidity;
  description?: string;
  shortDescription?: string;
  price?: number;
  originalPrice?: number;
  quantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  validFrom?: string;
  validUntil?: string;
  validDays?: string[];
  benefits?: Omit<TicketBenefit, 'id'>[];
  zoneAccess?: string[];
  restrictions?: Partial<TicketRestrictions>;
  isActive?: boolean;
  isHidden?: boolean;
  sortOrder?: number;
  image?: string;
  color?: string;
}

/**
 * DTO for creating an order
 */
export interface CreateOrderDto {
  festivalId: string;
  items: CreateOrderItemDto[];
  billingInfo: BillingInfo;
  discountCode?: string;
  ticketHolders?: TicketHolder[];
}

/**
 * DTO for order item
 */
export interface CreateOrderItemDto {
  ticketCategoryId: string;
  quantity: number;
}

/**
 * DTO for updating ticket holder
 */
export interface UpdateTicketHolderDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

/**
 * DTO for initiating transfer
 */
export interface InitiateTransferDto {
  ticketId: string;
  toEmail: string;
  message?: string;
}

/**
 * DTO for accepting transfer
 */
export interface AcceptTransferDto {
  transferCode: string;
  holderInfo: TicketHolder;
}

/**
 * DTO for applying promo code
 */
export interface ApplyPromoCodeDto {
  code: string;
  items: CreateOrderItemDto[];
}

/**
 * Promo code validation result
 */
export interface PromoCodeValidation {
  isValid: boolean;
  promoCode?: PromoCode;
  discount: number;
  message: string;
}

/**
 * Ticket filters
 */
export interface TicketFilters {
  festivalId?: string;
  categoryId?: string;
  userId?: string;
  orderId?: string;
  status?: TicketStatus | TicketStatus[];
  type?: TicketType | TicketType[];
  validDate?: string;
  checkedIn?: boolean;
  search?: string;
}

/**
 * Order filters
 */
export interface OrderFilters {
  festivalId?: string;
  userId?: string;
  status?: OrderStatus | OrderStatus[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
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
 * Check if ticket is valid for use
 */
export function isTicketValid(ticket: Ticket): boolean {
  return ticket.status === TicketStatus.CONFIRMED;
}

/**
 * Check if ticket can be transferred
 */
export function canTransferTicket(
  ticket: Ticket,
  restrictions: TicketRestrictions
): boolean {
  if (!restrictions.isTransferable) return false;
  if (ticket.status !== TicketStatus.CONFIRMED) return false;
  if (restrictions.maxTransfers && ticket.transferHistory.length >= restrictions.maxTransfers) {
    return false;
  }
  return true;
}

/**
 * Check if ticket can be refunded
 */
export function canRefundTicket(
  ticket: Ticket,
  restrictions: TicketRestrictions,
  festivalStartDate: string
): boolean {
  if (!restrictions.isRefundable) return false;
  if (ticket.status !== TicketStatus.CONFIRMED) return false;
  if (restrictions.refundDeadlineDays) {
    const deadline = new Date(festivalStartDate);
    deadline.setDate(deadline.getDate() - restrictions.refundDeadlineDays);
    if (new Date() > deadline) return false;
  }
  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get ticket type display name
 */
export function getTicketTypeDisplayName(type: TicketType): string {
  const names: Record<TicketType, string> = {
    [TicketType.GENERAL]: 'General Admission',
    [TicketType.VIP]: 'VIP',
    [TicketType.PREMIUM]: 'Premium',
    [TicketType.BACKSTAGE]: 'Backstage',
    [TicketType.EARLY_BIRD]: 'Early Bird',
    [TicketType.LATE_BIRD]: 'Late Bird',
    [TicketType.GROUP]: 'Groupe',
    [TicketType.STUDENT]: 'Etudiant',
    [TicketType.SENIOR]: 'Senior',
    [TicketType.CHILD]: 'Enfant',
    [TicketType.FAMILY]: 'Famille',
    [TicketType.PRESS]: 'Presse',
    [TicketType.STAFF]: 'Staff',
    [TicketType.ARTIST]: 'Artiste',
    [TicketType.SPONSOR]: 'Sponsor',
    [TicketType.COMPLIMENTARY]: 'Invitation',
  };
  return names[type];
}

/**
 * Get ticket status display name
 */
export function getTicketStatusDisplayName(status: TicketStatus): string {
  const names: Record<TicketStatus, string> = {
    [TicketStatus.RESERVED]: 'Reserve',
    [TicketStatus.CONFIRMED]: 'Confirme',
    [TicketStatus.CANCELLED]: 'Annule',
    [TicketStatus.REFUNDED]: 'Rembourse',
    [TicketStatus.USED]: 'Utilise',
    [TicketStatus.EXPIRED]: 'Expire',
    [TicketStatus.TRANSFERRED]: 'Transfere',
  };
  return names[status];
}

/**
 * Get order status display name
 */
export function getOrderStatusDisplayName(status: OrderStatus): string {
  const names: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'En attente',
    [OrderStatus.PROCESSING]: 'En cours',
    [OrderStatus.CONFIRMED]: 'Confirme',
    [OrderStatus.PAID]: 'Paye',
    [OrderStatus.FAILED]: 'Echoue',
    [OrderStatus.CANCELLED]: 'Annule',
    [OrderStatus.REFUNDED]: 'Rembourse',
    [OrderStatus.PARTIALLY_REFUNDED]: 'Partiellement rembourse',
    [OrderStatus.EXPIRED]: 'Expire',
  };
  return names[status];
}

/**
 * Calculate category availability
 */
export function calculateAvailability(category: TicketCategory): TicketCategoryWithAvailability {
  const now = new Date();
  const saleStart = new Date(category.saleStartDate);
  const saleEnd = new Date(category.saleEndDate);
  const percentageSold = category.quantity > 0
    ? Math.round((category.soldCount / category.quantity) * 100)
    : 0;

  return {
    ...category,
    isOnSale: now >= saleStart && now <= saleEnd && category.availableCount > 0 && category.isActive,
    isSoldOut: category.availableCount === 0,
    isComingSoon: now < saleStart,
    isEnded: now > saleEnd,
    percentageSold,
  };
}

/**
 * Generate ticket number
 */
export function generateTicketNumber(
  festivalPrefix: string,
  sequence: number
): string {
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${festivalPrefix}-${paddedSequence}`;
}

/**
 * Generate order number
 */
export function generateOrderNumber(
  festivalPrefix: string,
  sequence: number
): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${festivalPrefix}-${year}-${paddedSequence}`;
}

/**
 * Check if ticket is valid for a specific date
 */
export function isValidForDate(ticket: Ticket, date: string): boolean {
  if (ticket.validDays.length === 0) {
    return date >= ticket.validFrom && date <= ticket.validUntil;
  }
  return ticket.validDays.includes(date);
}

/**
 * Get check-in count for ticket
 */
export function getCheckInCount(ticket: Ticket, direction: 'in' | 'out' = 'in'): number {
  return ticket.checkIns.filter(c => c.direction === direction).length;
}

/**
 * Check if ticket is currently checked in
 */
export function isCurrentlyCheckedIn(ticket: Ticket): boolean {
  const checkIns = ticket.checkIns.filter(c => c.direction === 'in').length;
  const checkOuts = ticket.checkIns.filter(c => c.direction === 'out').length;
  return checkIns > checkOuts;
}
