'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCart } from '../../hooks/useCart';
import { CartItem } from '../../stores/cart.store';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const {
    items,
    totalItems,
    subtotal,
    serviceFee,
    total,
    currency,
    isEmpty,
    updateItemQuantity,
    removeFromCart,
    emptyCart,
    getTimeRemaining,
    isExpired,
  } = useCart();

  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen) {return;}

    const updateTimer = () => {
      const remaining = getTimeRemaining();
      if (remaining) {
        setTimeRemaining({ minutes: remaining.minutes, seconds: remaining.seconds });
      } else {
        setTimeRemaining(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, getTimeRemaining]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  if (isEmpty) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Your Cart" size="md">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Your cart is empty</h3>
          <p className="text-white/60 text-sm mb-6">Browse our festivals to find your next adventure!</p>
          <Button as="link" href="/festivals" variant="primary" onClick={onClose}>
            Explore Festivals
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Cart" size="lg">
      {/* Timer Warning */}
      {timeRemaining && !isExpired && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 text-orange-400 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Tickets reserved for{' '}
            <span className="font-semibold">
              {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}
            </span>
          </span>
        </div>
      )}

      {isExpired && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Your reservation has expired. Please add tickets again.</span>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-4 mb-6">
        {items.map((item: CartItem) => (
          <div key={item.ticketTypeId} className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate">{item.ticketTypeName}</h4>
              <p className="text-white/60 text-sm truncate">{item.festivalName}</p>
              <p className="text-primary-400 font-semibold mt-1">
                {formatPrice(item.price)} each
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateItemQuantity(item.ticketTypeId, item.quantity - 1)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-8 text-center text-white font-semibold">{item.quantity}</span>
              <button
                onClick={() => updateItemQuantity(item.ticketTypeId, item.quantity + 1)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.ticketTypeId)}
              className="p-2 text-white/40 hover:text-red-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Subtotal ({totalItems} tickets)</span>
          <span className="text-white">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Service Fee</span>
          <span className="text-white">{formatPrice(serviceFee)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
          <span className="text-white">Total</span>
          <span className="text-secondary-400">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={emptyCart} className="flex-shrink-0">
          Clear Cart
        </Button>
        {isExpired ? (
          <Button
            variant="primary"
            fullWidth
            disabled
          >
            Proceed to Checkout
          </Button>
        ) : (
          <Button
            as="link"
            href={items[0] ? `/festivals/${items[0].festivalSlug}/tickets` : '/festivals'}
            variant="primary"
            fullWidth
            onClick={onClose}
          >
            Proceed to Checkout
          </Button>
        )}
      </div>
    </Modal>
  );
}

// Cart Icon with Badge
interface CartIconProps {
  onClick: () => void;
  className?: string;
}

export function CartIcon({ onClick, className = '' }: CartIconProps) {
  const { totalItems } = useCart();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-white/70 hover:text-white transition-colors ${className}`}
      aria-label={`Cart with ${totalItems} items`}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </button>
  );
}
