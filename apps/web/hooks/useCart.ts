'use client';

import { useCallback, useEffect } from 'react';
import { useCartStore, CartItem } from '../stores/cart.store';

export function useCart() {
  const {
    items,
    festivalId,
    expiresAt,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setExpiry,
    isExpired,
    getSubtotal,
    getServiceFee,
    getTotal,
    getTotalItems,
  } = useCartStore();

  // Check expiry on mount and periodically
  useEffect(() => {
    const checkExpiry = () => {
      if (isExpired() && items.length > 0) {
        clearCart();
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isExpired, items.length, clearCart]);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      addItem(item, quantity);
    },
    [addItem]
  );

  const updateItemQuantity = useCallback(
    (ticketTypeId: string, quantity: number) => {
      updateQuantity(ticketTypeId, quantity);
    },
    [updateQuantity]
  );

  const removeFromCart = useCallback(
    (ticketTypeId: string) => {
      removeItem(ticketTypeId);
    },
    [removeItem]
  );

  const emptyCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

  const getTimeRemaining = useCallback(() => {
    if (!expiresAt) {return null;}

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {return null;}

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return { minutes, seconds, total: remaining };
  }, [expiresAt]);

  return {
    items,
    festivalId,
    isEmpty: items.length === 0,
    totalItems: getTotalItems(),
    subtotal: getSubtotal(),
    serviceFee: getServiceFee(),
    total: getTotal(),
    currency: items[0]?.currency || 'EUR',
    addToCart,
    updateItemQuantity,
    removeFromCart,
    emptyCart,
    getTimeRemaining,
    isExpired: isExpired(),
    setExpiry,
  };
}
