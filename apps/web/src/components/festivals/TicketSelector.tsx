'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  available: number;
  maxPerOrder: number;
  features: string[];
  isPopular?: boolean;
  isSoldOut?: boolean;
}

interface TicketSelectorProps {
  tickets: TicketType[];
  onSelect: (selectedTickets: Record<string, number>) => void;
  currency?: string;
}

export function TicketSelector({ tickets, onSelect, currency = 'EUR' }: TicketSelectorProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return prev;

      const currentQty = prev[ticketId] || 0;
      const newQty = Math.max(0, Math.min(currentQty + delta, ticket.maxPerOrder, ticket.available));

      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[ticketId];
      } else {
        updated[ticketId] = newQty;
      }

      return updated;
    });
  };

  const totalAmount = Object.entries(selectedTickets).reduce((sum, [ticketId, qty]) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    return sum + (ticket ? ticket.price * qty : 0);
  }, 0);

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  const handleContinue = () => {
    onSelect(selectedTickets);
  };

  return (
    <div className="space-y-6">
      {/* Ticket Options */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            variant={ticket.isPopular ? 'gradient' : 'default'}
            padding="none"
            className={`overflow-hidden ${ticket.isSoldOut ? 'opacity-60' : ''}`}
          >
            {ticket.isPopular && (
              <div className="bg-secondary-400 text-festival-dark text-xs font-bold uppercase tracking-wider text-center py-1.5">
                Most Popular
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Ticket Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{ticket.name}</h3>
                    {ticket.isSoldOut && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                        Sold Out
                      </span>
                    )}
                    {ticket.available <= 10 && !ticket.isSoldOut && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                        Only {ticket.available} left
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mb-4">{ticket.description}</p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {ticket.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-white/70 text-sm">
                        <svg className="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price & Quantity */}
                <div className="flex flex-col items-end gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{formatPrice(ticket.price)}</div>
                    <div className="text-white/50 text-sm">per person</div>
                  </div>

                  {!ticket.isSoldOut && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(ticket.id, -1)}
                        disabled={!selectedTickets[ticket.id]}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-12 text-center text-white font-semibold text-lg">
                        {selectedTickets[ticket.id] || 0}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(ticket.id, 1)}
                        disabled={(selectedTickets[ticket.id] || 0) >= Math.min(ticket.maxPerOrder, ticket.available)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      {totalTickets > 0 && (
        <Card variant="glow" className="sticky bottom-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-white/60 text-sm">Order Summary</div>
              <div className="text-white font-semibold">
                {totalTickets} ticket{totalTickets > 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-white/60 text-sm">Total</div>
                <div className="text-2xl font-bold text-secondary-400">{formatPrice(totalAmount)}</div>
              </div>
              <Button onClick={handleContinue} variant="accent" size="lg">
                Continue to Checkout
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Ticket Summary for Checkout
interface TicketSummaryProps {
  tickets: TicketType[];
  selectedTickets: Record<string, number>;
  currency?: string;
}

export function TicketSummary({ tickets, selectedTickets, currency = 'EUR' }: TicketSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const selectedItems = Object.entries(selectedTickets)
    .map(([ticketId, qty]) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      return ticket ? { ticket, qty } : null;
    })
    .filter(Boolean) as { ticket: TicketType; qty: number }[];

  const subtotal = selectedItems.reduce((sum, item) => sum + item.ticket.price * item.qty, 0);
  const serviceFee = subtotal * 0.1; // 10% service fee
  const total = subtotal + serviceFee;

  return (
    <Card variant="solid" padding="lg">
      <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>

      <div className="space-y-3 mb-6">
        {selectedItems.map(({ ticket, qty }) => (
          <div key={ticket.id} className="flex justify-between text-sm">
            <span className="text-white/70">
              {ticket.name} x {qty}
            </span>
            <span className="text-white font-medium">
              {formatPrice(ticket.price * qty)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Subtotal</span>
          <span className="text-white">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Service Fee</span>
          <span className="text-white">{formatPrice(serviceFee)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-3 border-t border-white/10">
          <span className="text-white">Total</span>
          <span className="text-secondary-400">{formatPrice(total)}</span>
        </div>
      </div>
    </Card>
  );
}
