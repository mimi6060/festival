// Vendor types for POS operations

export type VendorType = 'FOOD' | 'DRINK' | 'BAR' | 'MERCHANDISE';

export type PaymentMethod = 'CASHLESS' | 'CARD' | 'CASH';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  description?: string;
  logoUrl?: string;
  location?: string;
  isOpen: boolean;
  qrMenuCode: string;
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  stock: number | null; // null = unlimited
  options?: ProductOption[];
}

export interface ProductOption {
  name: string;
  values: string[];
  priceModifiers?: Record<string, number>;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: Record<string, string>;
  notes?: string;
}

export interface VendorOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  commission: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  cashlessTransactionId?: string;
  createdAt: string;
  estimatedReadyAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

export interface CartItem {
  product: VendorProduct;
  quantity: number;
  options?: Record<string, string>;
  notes?: string;
}

export interface POSState {
  vendor: Vendor | null;
  products: VendorProduct[];
  cart: CartItem[];
  currentOrder: VendorOrder | null;
  isLoading: boolean;
  error: string | null;
}
