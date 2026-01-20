import { create } from 'zustand';
import type {
  Vendor,
  VendorProduct,
  VendorOrder,
  CartItem,
  PaymentMethod,
  OrderItem,
} from '../types/vendor';
import { apiService } from '../services/api';

interface VendorState {
  vendor: Vendor | null;
  products: VendorProduct[];
  cart: CartItem[];
  currentOrder: VendorOrder | null;
  recentOrders: VendorOrder[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setVendor: (vendor: Vendor | null) => void;
  loadVendorByQR: (qrCode: string) => Promise<void>;
  loadVendorById: (vendorId: string) => Promise<void>;
  loadProducts: (vendorId: string) => Promise<void>;
  addToCart: (product: VendorProduct, quantity?: number, options?: Record<string, string>) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  createOrder: (paymentMethod: PaymentMethod) => Promise<VendorOrder>;
  updateOrderStatus: (orderId: string, status: VendorOrder['status']) => Promise<void>;
  loadRecentOrders: (vendorId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  vendor: null,
  products: [],
  cart: [],
  currentOrder: null,
  recentOrders: [],
  isLoading: false,
  error: null,
};

export const useVendorStore = create<VendorState>((set, get) => ({
  ...initialState,

  setVendor: (vendor) => set({ vendor }),

  loadVendorByQR: async (qrCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{
        data: { vendor: Vendor; products: VendorProduct[] };
      }>(`/vendors/menu/${qrCode}`);
      const { vendor, products } = response.data;
      set({ vendor, products, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load vendor',
        isLoading: false,
      });
    }
  },

  loadVendorById: async (vendorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<{ data: Vendor }>(`/vendors/${vendorId}`);
      set({ vendor: response.data, isLoading: false });
      // Also load products
      get().loadProducts(vendorId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load vendor',
        isLoading: false,
      });
    }
  },

  loadProducts: async (vendorId: string) => {
    try {
      const response = await apiService.get<{ data: VendorProduct[] }>(
        `/vendors/${vendorId}/products`
      );
      set({ products: response.data });
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  },

  addToCart: (product, quantity = 1, options) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      const existingItem = newCart[existingIndex];
      if (existingItem) {
        existingItem.quantity += quantity;
      }
      set({ cart: newCart });
    } else {
      set({
        cart: [...cart, { product, quantity, options }],
      });
    }
  },

  removeFromCart: (productId) => {
    const { cart } = get();
    set({ cart: cart.filter((item) => item.product.id !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    const { cart } = get();
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const newCart = cart.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    set({ cart: newCart });
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    const { cart } = get();
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  },

  getCartItemCount: () => {
    const { cart } = get();
    return cart.reduce((count, item) => count + item.quantity, 0);
  },

  createOrder: async (paymentMethod: PaymentMethod) => {
    const { vendor, cart } = get();
    if (!vendor) {
      throw new Error('No vendor selected');
    }
    if (cart.length === 0) {
      throw new Error('Cart is empty');
    }

    set({ isLoading: true, error: null });

    try {
      const items: Omit<OrderItem, 'productName' | 'totalPrice'>[] = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        options: item.options,
        notes: item.notes,
      }));

      const response = await apiService.post<{ data: VendorOrder }>(
        `/vendors/${vendor.id}/orders`,
        {
          items,
          paymentMethod,
        }
      );

      const order = response.data;
      set({ currentOrder: order, cart: [], isLoading: false });
      return order;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, status: VendorOrder['status']) => {
    const { vendor } = get();
    if (!vendor) {
      return;
    }

    try {
      await apiService.patch(`/vendors/${vendor.id}/orders/${orderId}/status`, { status });

      // Update local state
      set((state) => ({
        recentOrders: state.recentOrders.map((order) =>
          order.id === orderId ? { ...order, status } : order
        ),
        currentOrder:
          state.currentOrder?.id === orderId
            ? { ...state.currentOrder, status }
            : state.currentOrder,
      }));
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  },

  loadRecentOrders: async (vendorId: string) => {
    try {
      const response = await apiService.get<{ data: VendorOrder[] }>(
        `/vendors/${vendorId}/orders?limit=20`
      );
      set({ recentOrders: response.data });
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
