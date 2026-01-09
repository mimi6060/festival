'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface CartItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  festivalId: string;
  festivalName: string;
  festivalSlug: string;
  quantity: number;
  price: number;
  currency: string;
  maxQuantity?: number;
  description?: string;
}

export interface CartPromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
}

export interface CartFees {
  serviceFee: number;
  processingFee: number;
}

// ============================================================================
// State Interface
// ============================================================================

interface CartState {
  items: CartItem[];
  festivalId: string | null;
  expiresAt: number | null;
  promoCode: CartPromoCode | null;
  isProcessing: boolean;
  error: string | null;
}

interface CartActions {
  // Item management
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;

  // Promo code
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;

  // Expiry management
  setExpiry: (minutes?: number) => void;
  isExpired: () => boolean;
  checkExpiry: () => boolean;

  // Calculations
  getSubtotal: () => number;
  getDiscount: () => number;
  getServiceFee: () => number;
  getProcessingFee: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
  getFees: () => CartFees;

  // State management
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
}

export type CartStore = CartState & CartActions;

// ============================================================================
// Constants
// ============================================================================

const STORE_NAME = 'festival-cart';
const DEFAULT_EXPIRY_MINUTES = 15;
const SERVICE_FEE_PERCENTAGE = 0.05; // 5%
const PROCESSING_FEE_PERCENTAGE = 0.029; // 2.9% (Stripe)
const PROCESSING_FEE_FIXED = 0.3; // 30 cents per transaction

// Use relative URL to leverage Next.js proxy
const API_URL = '/api';

// ============================================================================
// Helpers
// ============================================================================

const generateItemId = (ticketTypeId: string, festivalId: string): string => {
  return `${festivalId}-${ticketTypeId}`;
};

// ============================================================================
// Store
// ============================================================================

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        items: [] as CartItem[],
        festivalId: null as string | null,
        expiresAt: null as number | null,
        promoCode: null as CartPromoCode | null,
        isProcessing: false,
        error: null as string | null,

        // Actions
        addItem: (item: Omit<CartItem, 'id' | 'quantity'>, quantity = 1) => {
          const state = get();
          const itemId = generateItemId(item.ticketTypeId, item.festivalId);

          // Check if cart has items from a different festival
          if (state.festivalId && state.festivalId !== item.festivalId) {
            // Clear cart if switching festivals
            set((draft) => {
              draft.items = [];
              draft.festivalId = item.festivalId;
              draft.expiresAt = Date.now() + DEFAULT_EXPIRY_MINUTES * 60 * 1000;
              draft.promoCode = null;
            });
          }

          const existingIndex = state.items.findIndex(
            (i: CartItem) => i.ticketTypeId === item.ticketTypeId
          );

          if (existingIndex > -1) {
            // Update quantity of existing item (respect max quantity)
            set((draft) => {
              const existingItem = draft.items[existingIndex];
              const newQuantity = existingItem.quantity + quantity;
              const maxQty = existingItem.maxQuantity || Infinity;
              existingItem.quantity = Math.min(newQuantity, maxQty);
            });
          } else {
            // Add new item
            set((draft) => {
              draft.items.push({
                ...item,
                id: itemId,
                quantity: Math.min(quantity, item.maxQuantity || Infinity),
              });
              draft.festivalId = item.festivalId;
              draft.expiresAt = draft.expiresAt || Date.now() + DEFAULT_EXPIRY_MINUTES * 60 * 1000;
            });
          }
        },

        updateQuantity: (itemId: string, quantity: number) => {
          if (quantity <= 0) {
            get().removeItem(itemId);
            return;
          }

          set((draft) => {
            const item = draft.items.find((i) => i.id === itemId);
            if (item) {
              const maxQty = item.maxQuantity || Infinity;
              item.quantity = Math.min(quantity, maxQty);
            }
          });
        },

        removeItem: (itemId: string) => {
          set((draft) => {
            draft.items = draft.items.filter((item) => item.id !== itemId);

            if (draft.items.length === 0) {
              draft.festivalId = null;
              draft.expiresAt = null;
              draft.promoCode = null;
            }
          });
        },

        clearCart: () => {
          set((draft) => {
            draft.items = [];
            draft.festivalId = null;
            draft.expiresAt = null;
            draft.promoCode = null;
            draft.error = null;
          });
        },

        applyPromoCode: async (code: string) => {
          set((draft) => {
            draft.isProcessing = true;
            draft.error = null;
          });

          try {
            const response = await fetch(`${API_URL}/v1/promo-codes/validate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code,
                festivalId: get().festivalId,
                subtotal: get().getSubtotal(),
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.message || 'Invalid promo code');
            }

            set((draft) => {
              draft.promoCode = {
                code: data.code,
                discountType: data.discountType,
                discountValue: data.discountValue,
                minPurchase: data.minPurchase,
                maxDiscount: data.maxDiscount,
              };
              draft.isProcessing = false;
            });

            return true;
          } catch (error) {
            set((draft) => {
              draft.isProcessing = false;
              draft.error = error instanceof Error ? error.message : 'Failed to apply promo code';
            });
            return false;
          }
        },

        removePromoCode: () => {
          set((draft) => {
            draft.promoCode = null;
          });
        },

        setExpiry: (minutes = DEFAULT_EXPIRY_MINUTES) => {
          set((draft) => {
            draft.expiresAt = Date.now() + minutes * 60 * 1000;
          });
        },

        isExpired: () => {
          const { expiresAt } = get();
          if (!expiresAt) {
            return false;
          }
          return Date.now() > expiresAt;
        },

        checkExpiry: () => {
          if (get().isExpired()) {
            get().clearCart();
            return true;
          }
          return false;
        },

        getSubtotal: () => {
          return get().items.reduce(
            (sum: number, item: CartItem) => sum + item.price * item.quantity,
            0
          );
        },

        getDiscount: () => {
          const { promoCode } = get();
          if (!promoCode) {
            return 0;
          }

          const subtotal = get().getSubtotal();

          // Check minimum purchase requirement
          if (promoCode.minPurchase && subtotal < promoCode.minPurchase) {
            return 0;
          }

          let discount = 0;

          if (promoCode.discountType === 'percentage') {
            discount = subtotal * (promoCode.discountValue / 100);
          } else {
            discount = promoCode.discountValue;
          }

          // Apply max discount cap if set
          if (promoCode.maxDiscount) {
            discount = Math.min(discount, promoCode.maxDiscount);
          }

          // Don't exceed subtotal
          return Math.min(discount, subtotal);
        },

        getServiceFee: () => {
          const subtotal = get().getSubtotal();
          const discount = get().getDiscount();
          return (subtotal - discount) * SERVICE_FEE_PERCENTAGE;
        },

        getProcessingFee: () => {
          const subtotal = get().getSubtotal();
          const discount = get().getDiscount();
          const serviceFee = get().getServiceFee();
          const baseAmount = subtotal - discount + serviceFee;

          if (baseAmount <= 0) {
            return 0;
          }

          return baseAmount * PROCESSING_FEE_PERCENTAGE + PROCESSING_FEE_FIXED;
        },

        getFees: () => {
          return {
            serviceFee: get().getServiceFee(),
            processingFee: get().getProcessingFee(),
          };
        },

        getTotal: () => {
          const subtotal = get().getSubtotal();
          const discount = get().getDiscount();
          const serviceFee = get().getServiceFee();
          const processingFee = get().getProcessingFee();

          return Math.max(0, subtotal - discount + serviceFee + processingFee);
        },

        getTotalItems: () => {
          return get().items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        },

        setProcessing: (processing: boolean) => {
          set((draft) => {
            draft.isProcessing = processing;
          });
        },

        setError: (error: string | null) => {
          set((draft) => {
            draft.error = error;
          });
        },
      })),
      {
        name: STORE_NAME,
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setItem: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            removeItem: () => {},
          };
        }),
        partialize: (state) => ({
          items: state.items,
          festivalId: state.festivalId,
          expiresAt: state.expiresAt,
          promoCode: state.promoCode,
        }),
      }
    ),
    { name: 'CartStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectCartItems = (state: CartStore) => state.items;
export const selectCartTotal = (state: CartStore) => state.getTotal();
export const selectCartItemCount = (state: CartStore) => state.getTotalItems();
export const selectCartFestivalId = (state: CartStore) => state.festivalId;
export const selectCartPromoCode = (state: CartStore) => state.promoCode;
export const selectCartIsEmpty = (state: CartStore) => state.items.length === 0;
export const selectCartIsProcessing = (state: CartStore) => state.isProcessing;
