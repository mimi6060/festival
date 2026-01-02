/**
 * Vendor Types
 * Types for vendors, products, orders, and merchandising
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Vendor type
 */
export enum VendorType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  MERCHANDISE = 'merchandise',
  SERVICES = 'services',
  SPONSOR = 'sponsor',
  PARTNER = 'partner',
}

/**
 * Vendor status
 */
export enum VendorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

/**
 * Product status
 */
export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  HIDDEN = 'hidden',
}

/**
 * Product category
 */
export enum ProductCategory {
  FOOD = 'food',
  DRINK = 'drink',
  ALCOHOL = 'alcohol',
  SNACK = 'snack',
  DESSERT = 'dessert',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten_free',
  MERCHANDISE = 'merchandise',
  CLOTHING = 'clothing',
  ACCESSORIES = 'accessories',
  SOUVENIRS = 'souvenirs',
  OTHER = 'other',
}

/**
 * Vendor order status
 */
export enum VendorOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Payout status
 */
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Vendor
 */
export interface Vendor {
  id: string;
  festivalId: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  type: VendorType;
  status: VendorStatus;
  categories: ProductCategory[];
  logo?: string;
  coverImage?: string;
  images?: string[];
  location?: VendorLocation;
  contactInfo: VendorContactInfo;
  businessInfo: VendorBusinessInfo;
  operatingHours?: OperatingHours[];
  paymentInfo: VendorPaymentInfo;
  commissionRate: number;
  rating?: VendorRating;
  features: VendorFeatures;
  tags?: string[];
  socialLinks?: SocialLinks;
  metadata?: Record<string, unknown>;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor location
 */
export interface VendorLocation {
  zoneId?: string;
  zoneName?: string;
  standNumber?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

/**
 * Vendor contact info
 */
export interface VendorContactInfo {
  email: string;
  phone: string;
  phoneSecondary?: string;
  contactPerson: string;
  website?: string;
}

/**
 * Vendor business info
 */
export interface VendorBusinessInfo {
  legalName: string;
  registrationNumber?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  licenseNumber?: string;
  insuranceNumber?: string;
  certifications?: string[];
}

/**
 * Operating hours
 */
export interface OperatingHours {
  date: string;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

/**
 * Vendor payment info
 */
export interface VendorPaymentInfo {
  acceptsCashless: boolean;
  acceptsCash: boolean;
  acceptsCard: boolean;
  bankDetails?: {
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
  };
  payoutFrequency: 'daily' | 'weekly' | 'end_of_festival' | 'monthly';
  minimumPayout: number;
  currency: string;
}

/**
 * Vendor rating
 */
export interface VendorRating {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Vendor features
 */
export interface VendorFeatures {
  hasSeating: boolean;
  seatingCapacity?: number;
  isAccessible: boolean;
  acceptsPreOrders: boolean;
  hasDelivery: boolean;
  deliveryZones?: string[];
  preparationTime?: number;
}

/**
 * Social links
 */
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  website?: string;
}

/**
 * Product
 */
export interface Product {
  id: string;
  vendorId: string;
  festivalId: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  originalPrice?: number;
  currency: string;
  image?: string;
  images?: string[];
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
  tags?: string[];
  stockQuantity?: number;
  lowStockThreshold?: number;
  isUnlimited: boolean;
  soldCount: number;
  preparationTime?: number;
  maxQuantityPerOrder?: number;
  sortOrder: number;
  isPopular: boolean;
  isFeatured: boolean;
  availableFrom?: string;
  availableUntil?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product variant
 */
export interface ProductVariant {
  id: string;
  name: string;
  priceModifier: number;
  stockQuantity?: number;
  isAvailable: boolean;
  sortOrder: number;
}

/**
 * Product modifier (add-ons)
 */
export interface ProductModifier {
  id: string;
  name: string;
  options: ModifierOption[];
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Modifier option
 */
export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
  isAvailable: boolean;
}

/**
 * Nutritional info
 */
export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  servingSize?: string;
}

/**
 * Vendor order
 */
export interface VendorOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  festivalId: string;
  userId: string;
  status: VendorOrderStatus;
  items: VendorOrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  commission: number;
  commissionRate: number;
  total: number;
  currency: string;
  cashlessTransactionId?: string;
  paymentMethod: 'cashless' | 'cash' | 'card';
  pickupCode?: string;
  estimatedReadyAt?: string;
  actualReadyAt?: string;
  pickedUpAt?: string;
  notes?: string;
  rating?: OrderRating;
  cancelReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor order item
 */
export interface VendorOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  modifiers: SelectedModifier[];
  modifiersTotal: number;
  totalPrice: number;
  notes?: string;
}

/**
 * Selected modifier
 */
export interface SelectedModifier {
  modifierId: string;
  modifierName: string;
  optionId: string;
  optionName: string;
  price: number;
}

/**
 * Order rating
 */
export interface OrderRating {
  overall: number;
  foodQuality?: number;
  service?: number;
  waitTime?: number;
  comment?: string;
  createdAt: string;
}

/**
 * Vendor payout
 */
export interface VendorPayout {
  id: string;
  vendorId: string;
  festivalId: string;
  status: PayoutStatus;
  period: {
    start: string;
    end: string;
  };
  grossAmount: number;
  commission: number;
  refunds: number;
  adjustments: number;
  netAmount: number;
  currency: string;
  ordersCount: number;
  transactionId?: string;
  paidAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vendor with products
 */
export interface VendorWithProducts extends Vendor {
  products: Product[];
  productsCount: number;
}

/**
 * Vendor summary
 */
export interface VendorSummary {
  id: string;
  name: string;
  type: VendorType;
  status: VendorStatus;
  logo?: string;
  categories: ProductCategory[];
  rating?: number;
  location?: VendorLocation;
}

/**
 * Product with vendor
 */
export interface ProductWithVendor extends Product {
  vendor: VendorSummary;
}

/**
 * Vendor statistics
 */
export interface VendorStats {
  vendorId: string;
  period: { start: string; end: string };
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  commission: number;
  netRevenue: number;
  averageOrderValue: number;
  averageRating: number;
  ratingsCount: number;
  topProducts: ProductSalesStats[];
  hourlyData: HourlyVendorStats[];
}

/**
 * Product sales statistics
 */
export interface ProductSalesStats {
  productId: string;
  productName: string;
  soldCount: number;
  revenue: number;
}

/**
 * Hourly vendor statistics
 */
export interface HourlyVendorStats {
  hour: string;
  orders: number;
  revenue: number;
}

/**
 * Festival vendor statistics
 */
export interface FestivalVendorStats {
  festivalId: string;
  totalVendors: number;
  activeVendors: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  byType: VendorTypeStats[];
  byCategory: CategoryStats[];
  topVendors: VendorSalesStats[];
}

/**
 * Vendor type statistics
 */
export interface VendorTypeStats {
  type: VendorType;
  count: number;
  revenue: number;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  category: ProductCategory;
  productCount: number;
  soldCount: number;
  revenue: number;
}

/**
 * Vendor sales statistics
 */
export interface VendorSalesStats {
  vendorId: string;
  vendorName: string;
  ordersCount: number;
  revenue: number;
  rating: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a vendor
 */
export interface CreateVendorDto {
  name: string;
  description?: string;
  shortDescription?: string;
  type: VendorType;
  categories: ProductCategory[];
  logo?: string;
  location?: VendorLocation;
  contactInfo: VendorContactInfo;
  businessInfo: VendorBusinessInfo;
  operatingHours?: OperatingHours[];
  paymentInfo?: Partial<VendorPaymentInfo>;
  features?: Partial<VendorFeatures>;
  tags?: string[];
  socialLinks?: SocialLinks;
}

/**
 * DTO for updating a vendor
 */
export interface UpdateVendorDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  type?: VendorType;
  status?: VendorStatus;
  categories?: ProductCategory[];
  logo?: string;
  coverImage?: string;
  images?: string[];
  location?: VendorLocation;
  contactInfo?: Partial<VendorContactInfo>;
  businessInfo?: Partial<VendorBusinessInfo>;
  operatingHours?: OperatingHours[];
  paymentInfo?: Partial<VendorPaymentInfo>;
  commissionRate?: number;
  features?: Partial<VendorFeatures>;
  tags?: string[];
  socialLinks?: SocialLinks;
}

/**
 * DTO for creating a product
 */
export interface CreateProductDto {
  name: string;
  description?: string;
  shortDescription?: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  variants?: Omit<ProductVariant, 'id'>[];
  modifiers?: Omit<ProductModifier, 'id'>[];
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
  tags?: string[];
  stockQuantity?: number;
  lowStockThreshold?: number;
  isUnlimited?: boolean;
  preparationTime?: number;
  maxQuantityPerOrder?: number;
  sortOrder?: number;
  availableFrom?: string;
  availableUntil?: string;
}

/**
 * DTO for updating a product
 */
export interface UpdateProductDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  price?: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
  tags?: string[];
  stockQuantity?: number;
  lowStockThreshold?: number;
  isUnlimited?: boolean;
  preparationTime?: number;
  maxQuantityPerOrder?: number;
  sortOrder?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

/**
 * DTO for creating an order
 */
export interface CreateVendorOrderDto {
  vendorId: string;
  items: CreateOrderItemDto[];
  paymentMethod: 'cashless' | 'cash' | 'card';
  discountCode?: string;
  notes?: string;
}

/**
 * DTO for order item
 */
export interface CreateOrderItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
  modifiers?: {
    modifierId: string;
    optionId: string;
  }[];
  notes?: string;
}

/**
 * DTO for updating order status
 */
export interface UpdateVendorOrderStatusDto {
  status: VendorOrderStatus;
  estimatedReadyAt?: string;
  cancelReason?: string;
}

/**
 * DTO for rating an order
 */
export interface RateOrderDto {
  overall: number;
  foodQuality?: number;
  service?: number;
  waitTime?: number;
  comment?: string;
}

/**
 * DTO for requesting payout
 */
export interface RequestPayoutDto {
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

/**
 * Vendor filters
 */
export interface VendorFilters {
  festivalId?: string;
  type?: VendorType | VendorType[];
  status?: VendorStatus | VendorStatus[];
  categories?: ProductCategory[];
  hasAvailableProducts?: boolean;
  isOpen?: boolean;
  minRating?: number;
  zoneId?: string;
  search?: string;
}

/**
 * Product filters
 */
export interface ProductFilters {
  vendorId?: string;
  festivalId?: string;
  category?: ProductCategory | ProductCategory[];
  status?: ProductStatus | ProductStatus[];
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  allergenFree?: string[];
  search?: string;
}

/**
 * Vendor order filters
 */
export interface VendorOrderFilters {
  vendorId?: string;
  festivalId?: string;
  userId?: string;
  status?: VendorOrderStatus | VendorOrderStatus[];
  paymentMethod?: 'cashless' | 'cash' | 'card';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid VendorType
 */
export function isVendorType(value: unknown): value is VendorType {
  return Object.values(VendorType).includes(value as VendorType);
}

/**
 * Check if value is a valid VendorStatus
 */
export function isVendorStatus(value: unknown): value is VendorStatus {
  return Object.values(VendorStatus).includes(value as VendorStatus);
}

/**
 * Check if value is a valid ProductStatus
 */
export function isProductStatus(value: unknown): value is ProductStatus {
  return Object.values(ProductStatus).includes(value as ProductStatus);
}

/**
 * Check if value is a valid VendorOrderStatus
 */
export function isVendorOrderStatus(value: unknown): value is VendorOrderStatus {
  return Object.values(VendorOrderStatus).includes(value as VendorOrderStatus);
}

/**
 * Check if vendor is active
 */
export function isVendorActive(vendor: Vendor): boolean {
  return vendor.status === VendorStatus.ACTIVE;
}

/**
 * Check if product is available
 */
export function isProductAvailable(product: Product): boolean {
  if (product.status !== ProductStatus.ACTIVE) return false;
  if (!product.isUnlimited && product.stockQuantity !== undefined && product.stockQuantity <= 0) {
    return false;
  }
  const now = new Date();
  if (product.availableFrom && new Date(product.availableFrom) > now) return false;
  if (product.availableUntil && new Date(product.availableUntil) < now) return false;
  return true;
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(order: VendorOrder): boolean {
  return [VendorOrderStatus.PENDING, VendorOrderStatus.CONFIRMED].includes(order.status);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get vendor type display name
 */
export function getVendorTypeDisplayName(type: VendorType): string {
  const names: Record<VendorType, string> = {
    [VendorType.FOOD]: 'Restauration',
    [VendorType.BEVERAGE]: 'Boissons',
    [VendorType.MERCHANDISE]: 'Merchandising',
    [VendorType.SERVICES]: 'Services',
    [VendorType.SPONSOR]: 'Sponsor',
    [VendorType.PARTNER]: 'Partenaire',
  };
  return names[type];
}

/**
 * Get vendor status display name
 */
export function getVendorStatusDisplayName(status: VendorStatus): string {
  const names: Record<VendorStatus, string> = {
    [VendorStatus.PENDING]: 'En attente',
    [VendorStatus.APPROVED]: 'Approuve',
    [VendorStatus.ACTIVE]: 'Actif',
    [VendorStatus.SUSPENDED]: 'Suspendu',
    [VendorStatus.TERMINATED]: 'Termine',
  };
  return names[status];
}

/**
 * Get product status display name
 */
export function getProductStatusDisplayName(status: ProductStatus): string {
  const names: Record<ProductStatus, string> = {
    [ProductStatus.DRAFT]: 'Brouillon',
    [ProductStatus.ACTIVE]: 'Actif',
    [ProductStatus.OUT_OF_STOCK]: 'Rupture de stock',
    [ProductStatus.DISCONTINUED]: 'Arrete',
    [ProductStatus.HIDDEN]: 'Cache',
  };
  return names[status];
}

/**
 * Get product category display name
 */
export function getProductCategoryDisplayName(category: ProductCategory): string {
  const names: Record<ProductCategory, string> = {
    [ProductCategory.FOOD]: 'Nourriture',
    [ProductCategory.DRINK]: 'Boisson',
    [ProductCategory.ALCOHOL]: 'Alcool',
    [ProductCategory.SNACK]: 'Snack',
    [ProductCategory.DESSERT]: 'Dessert',
    [ProductCategory.VEGETARIAN]: 'Vegetarien',
    [ProductCategory.VEGAN]: 'Vegan',
    [ProductCategory.GLUTEN_FREE]: 'Sans gluten',
    [ProductCategory.MERCHANDISE]: 'Merchandising',
    [ProductCategory.CLOTHING]: 'Vetements',
    [ProductCategory.ACCESSORIES]: 'Accessoires',
    [ProductCategory.SOUVENIRS]: 'Souvenirs',
    [ProductCategory.OTHER]: 'Autre',
  };
  return names[category];
}

/**
 * Get order status display name
 */
export function getVendorOrderStatusDisplayName(status: VendorOrderStatus): string {
  const names: Record<VendorOrderStatus, string> = {
    [VendorOrderStatus.PENDING]: 'En attente',
    [VendorOrderStatus.CONFIRMED]: 'Confirmee',
    [VendorOrderStatus.PREPARING]: 'En preparation',
    [VendorOrderStatus.READY]: 'Prete',
    [VendorOrderStatus.PICKED_UP]: 'Recuperee',
    [VendorOrderStatus.COMPLETED]: 'Terminee',
    [VendorOrderStatus.CANCELLED]: 'Annulee',
    [VendorOrderStatus.REFUNDED]: 'Remboursee',
  };
  return names[status];
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(items: VendorOrderItem[]): number {
  return items.reduce((total, item) => total + item.totalPrice, 0);
}

/**
 * Calculate commission
 */
export function calculateCommission(amount: number, rate: number): number {
  return Math.round(amount * (rate / 100) * 100) / 100;
}

/**
 * Calculate net amount (after commission)
 */
export function calculateNetAmount(grossAmount: number, commissionRate: number): number {
  const commission = calculateCommission(grossAmount, commissionRate);
  return grossAmount - commission;
}

/**
 * Check if product is low on stock
 */
export function isLowStock(product: Product): boolean {
  if (product.isUnlimited) return false;
  if (product.stockQuantity === undefined) return false;
  const threshold = product.lowStockThreshold || 10;
  return product.stockQuantity > 0 && product.stockQuantity <= threshold;
}

/**
 * Format rating
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Get rating stars
 */
export function getRatingStars(rating: number): number {
  return Math.round(rating * 2) / 2;
}

/**
 * Generate order number
 */
export function generateVendorOrderNumber(
  vendorPrefix: string,
  sequence: number
): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${vendorPrefix}-${dateStr}-${paddedSequence}`;
}

/**
 * Generate pickup code
 */
export function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if vendor is open
 */
export function isVendorOpen(vendor: Vendor, now: Date = new Date()): boolean {
  if (vendor.status !== VendorStatus.ACTIVE) return false;
  if (!vendor.operatingHours || vendor.operatingHours.length === 0) return true;

  const today = now.toISOString().split('T')[0];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const todayHours = vendor.operatingHours.find((h) => h.date === today);
  if (!todayHours) return false;
  if (todayHours.isClosed) return false;

  return currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
}

/**
 * Get estimated wait time
 */
export function getEstimatedWaitTime(
  activeOrders: number,
  avgPreparationTime: number
): number {
  return Math.max(5, activeOrders * avgPreparationTime);
}
