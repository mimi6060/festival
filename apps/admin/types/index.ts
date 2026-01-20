// Admin Dashboard Types

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'organizer' | 'staff' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    address: string;
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  coverImage?: string;
  organizerId: string;
  organizer?: User;
  capacity: number;
  ticketsSold: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  maxPerOrder: number;
  salesStart: string;
  salesEnd: string;
  isActive: boolean;
  benefits?: string[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  categoryId: string;
  category?: TicketCategory;
  festivalId: string;
  festival?: Festival;
  userId: string;
  user?: User;
  orderId: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  qrCode: string;
  purchasedAt: string;
  usedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  festivalId: string;
  festival?: Festival;
  items: OrderItem[];
  subtotal: number;
  fees: number;
  total: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string;
  paymentIntentId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface OrderItem {
  id: string;
  categoryId: string;
  category?: TicketCategory;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  orderId: string;
  order?: Order;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider: 'stripe' | 'paypal';
  providerTransactionId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface Staff {
  id: string;
  userId: string;
  user?: User;
  festivalId: string;
  festival?: Festival;
  role: 'manager' | 'security' | 'ticket_scanner' | 'info_desk' | 'volunteer';
  permissions: string[];
  assignedAt: string;
  isActive: boolean;
}

export interface DashboardStats {
  totalFestivals: number;
  activeFestivals: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  totalTicketsSold: number;
  ticketsSoldThisMonth: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueChartData {
  daily: ChartDataPoint[];
  monthly: ChartDataPoint[];
  byFestival: {
    festivalId: string;
    festivalName: string;
    revenue: number;
  }[];
}

export interface TicketSalesChartData {
  daily: ChartDataPoint[];
  byCategory: {
    categoryId: string;
    categoryName: string;
    sold: number;
    total: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  key: string;
  value: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
}

// POI Types
export type PoiType =
  | 'STAGE'
  | 'FOOD'
  | 'DRINK'
  | 'TOILET'
  | 'MEDICAL'
  | 'INFO'
  | 'ATM'
  | 'PARKING'
  | 'CAMPING'
  | 'ENTRANCE'
  | 'EXIT'
  | 'CHARGING'
  | 'LOCKER';

export interface Poi {
  id: string;
  festivalId?: string;
  name: string;
  type: PoiType;
  description?: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface CreatePoiDto {
  name: string;
  type: PoiType;
  description?: string;
  latitude: number;
  longitude: number;
  isActive?: boolean;
}

export interface UpdatePoiDto {
  name?: string;
  type?: PoiType;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

// Stage Types
export interface Stage {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    performances: number;
  };
}

export interface CreateStageDto {
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  imageUrl?: string;
}

export interface UpdateStageDto {
  name?: string;
  description?: string;
  capacity?: number;
  location?: string;
  imageUrl?: string;
}

// Artist Types
export interface Artist {
  id: string;
  name: string;
  bio?: string;
  genre?: string;
  imageUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    performances: number;
    favoriteArtists?: number;
  };
}

// Performance Types
export interface Performance {
  id: string;
  artistId: string;
  stageId: string;
  startTime: string;
  endTime: string;
  description?: string;
  isCancelled: boolean;
  createdAt?: string;
  updatedAt?: string;
  artist: {
    id: string;
    name: string;
    genre?: string;
    imageUrl?: string;
    spotifyUrl?: string;
    instagramUrl?: string;
  };
  stage: {
    id: string;
    name: string;
    festivalId?: string;
    location?: string;
    capacity?: number;
  };
}

export interface CreatePerformanceDto {
  artistId: string;
  stageId: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface UpdatePerformanceDto {
  artistId?: string;
  stageId?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  isCancelled?: boolean;
}

// Vendor Types
export type VendorType = 'FOOD' | 'DRINK' | 'BAR' | 'MERCHANDISE';

export interface Vendor {
  id: string;
  festivalId: string;
  name: string;
  type: VendorType;
  description?: string;
  location?: string;
  isOpen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVendorDto {
  name: string;
  type: VendorType;
  description?: string;
  location?: string;
  isOpen?: boolean;
}

export interface UpdateVendorDto {
  name?: string;
  type?: VendorType;
  description?: string;
  location?: string;
  isOpen?: boolean;
}

// Camping Types
export interface CampingZone {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  type: 'TENT' | 'CARAVAN' | 'GLAMPING' | 'CABIN' | 'CAMPERVAN';
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  isActive: boolean;
  spotsAvailable?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCampingZoneDto {
  name: string;
  description?: string;
  type: 'TENT' | 'CARAVAN' | 'GLAMPING' | 'CABIN' | 'CAMPERVAN';
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  isActive: boolean;
}

export interface UpdateCampingZoneDto {
  name?: string;
  description?: string;
  type?: 'TENT' | 'CARAVAN' | 'GLAMPING' | 'CABIN' | 'CAMPERVAN';
  capacity?: number;
  pricePerNight?: number;
  amenities?: string[];
  isActive?: boolean;
}

// Promo Codes
export interface PromoCode {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  minAmount: number | null;
  expiresAt: string | null;
  isActive: boolean;
  festivalId: string | null;
  festival?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoCodeDto {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number;
  minAmount?: number;
  expiresAt?: string;
  isActive?: boolean;
  festivalId?: string;
}

export interface UpdatePromoCodeDto {
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  maxUses?: number;
  minAmount?: number;
  expiresAt?: string;
  isActive?: boolean;
  festivalId?: string;
}

export interface PromoCodeStats {
  id: string;
  code: string;
  currentUses: number;
  maxUses: number | null;
  usageRate: number;
  isActive: boolean;
  isExpired: boolean;
  isExhausted: boolean;
  remainingUses: number | null;
}

// Session Types
export interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
  } | null;
  isActive: boolean;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

// API Key Types
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  keyPrefix: string;
  tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scopes: string[];
  description?: string;
  ipWhitelist: string[];
  lastUsedAt?: string;
  lastUsedIp?: string;
  usageCount: number;
  expiresAt?: string;
  festivalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  plaintextKey: string;
}

// Webhook Types
export interface Webhook {
  id: string;
  festivalId: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  description?: string;
  headers?: Record<string, string>;
  lastTriggeredAt?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  responseCode?: number;
  errorMessage?: string;
  duration?: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: string[];
  isActive?: boolean;
  description?: string;
  headers?: Record<string, string>;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  description?: string;
  headers?: Record<string, string>;
}

// Two-Factor Authentication Types
export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt?: string;
}

// Organization Settings Types
export interface OrganizationSettings {
  id: string;
  name: string;
  email: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
}

// Refund Types
export type RefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'event_cancelled'
  | 'event_postponed'
  | 'partial_attendance'
  | 'quality_issue'
  | 'other';

export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | 'requires_action';

export interface CreateRefundRequest {
  paymentId: string;
  amount?: number; // Amount in cents, full refund if not specified
  reason: RefundReason;
  explanation?: string;
  refundApplicationFee?: boolean;
  reverseTransfer?: boolean;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface PartialRefundRequest {
  paymentId: string;
  amount: number; // Amount in cents
  reason: RefundReason;
  explanation?: string;
  lineItemIds?: string[];
  metadata?: Record<string, string>;
}

export interface BulkRefundRequest {
  paymentIds: string[];
  reason: RefundReason;
  explanation?: string;
  percentageToRefund?: number; // 1-100, defaults to 100
}

export interface RefundResponse {
  refundId: string;
  stripeRefundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  failureReason?: string;
  createdAt: string;
}

export interface BulkRefundResponse {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  totalAmountRefunded: number;
  results: RefundResultItem[];
}

export interface RefundResultItem {
  paymentId: string;
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

export interface RefundPolicy {
  refundsAllowed: boolean;
  daysBeforeEventLimit: number;
  fullRefundPercentage: number;
  partialRefundPercentage: number;
  minimumRefundAmount: number;
  processingFeeRetained: number;
  processingTimeDays: number;
}

export interface RefundEligibility {
  eligible: boolean;
  maxRefundAmount: number;
  refundPercentage: number;
  ineligibilityReason?: string;
  originalAmount: number;
  refundedAmount: number;
  daysUntilEvent?: number;
  policy: RefundPolicy;
}

// Cashless Refund Types
export interface CashlessAccount {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  balance: number;
  totalTopUp: number;
  totalSpent: number;
  nfcTagId?: string;
  festivalId: string;
  festivalName: string;
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  lastTransaction?: string;
}

export interface CashlessMassRefundRequest {
  festivalId: string;
  accountIds?: string[]; // If not provided, refund all accounts with balance > 0
  reason: string;
}

export interface CashlessMassRefundResponse {
  totalAccounts: number;
  successCount: number;
  failedCount: number;
  totalAmountRefunded: number;
  results: CashlessRefundResultItem[];
}

export interface CashlessRefundResultItem {
  accountId: string;
  userId: string;
  userName: string;
  balance: number;
  success: boolean;
  error?: string;
}
