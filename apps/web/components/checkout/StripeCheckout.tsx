'use client';

import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

// Load Stripe outside of component to avoid recreating on each render
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
};

interface StripeCheckoutProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  returnUrl?: string;
}

function StripePaymentForm({
  amount,
  currency,
  onSuccess,
  onError,
  returnUrl,
}: Omit<StripeCheckoutProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl || `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment');
      onError(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        fullWidth
        disabled={!stripe || !elements || isProcessing}
        isLoading={isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
      </Button>

      <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
}

export function StripeCheckout({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onError,
  returnUrl,
}: StripeCheckoutProps) {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    getStripe().then(() => setStripeReady(true));
  }, []);

  if (!stripeReady || !clientSecret) {
    return (
      <Card variant="solid" padding="lg" className="text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="mt-4 text-white/60">Loading payment form...</p>
      </Card>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#d946ef',
        colorBackground: '#1a1a2e',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '12px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.Input:focus': {
          border: '1px solid #d946ef',
          boxShadow: '0 0 0 2px rgba(217, 70, 239, 0.2)',
        },
        '.Label': {
          color: 'rgba(255, 255, 255, 0.8)',
        },
        '.Tab': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.Tab--selected': {
          backgroundColor: 'rgba(217, 70, 239, 0.1)',
          border: '1px solid rgba(217, 70, 239, 0.3)',
        },
      },
    },
  };

  return (
    <Elements stripe={getStripe()} options={options}>
      <StripePaymentForm
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}

// Simplified checkout form without Stripe Elements (for demo/testing)
interface DemoCheckoutFormProps {
  amount: number;
  currency: string;
  onSubmit: () => Promise<void>;
  isProcessing?: boolean;
}

export function DemoCheckoutForm({
  amount,
  currency,
  onSubmit,
  isProcessing = false,
}: DemoCheckoutFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').substring(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Icons */}
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-2 rounded bg-white/10">
          <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none">
            <rect width="48" height="32" rx="4" fill="#1A1F71" />
            <path d="M18.5 21.5L21 10.5H24L21.5 21.5H18.5Z" fill="white" />
            <path d="M32.5 10.7C31.9 10.5 31 10.3 29.9 10.3C26.9 10.3 24.8 11.8 24.8 14C24.8 15.6 26.2 16.5 27.3 17.1C28.4 17.7 28.8 18.1 28.8 18.6C28.8 19.4 27.8 19.8 26.9 19.8C25.7 19.8 25 19.6 23.9 19.1L23.5 18.9L23.1 21.5C23.9 21.9 25.3 22.2 26.8 22.2C30 22.2 32 20.7 32 18.4C32 17.1 31.2 16.1 29.5 15.3C28.5 14.8 27.9 14.4 27.9 13.9C27.9 13.4 28.5 12.9 29.7 12.9C30.7 12.9 31.4 13.1 32 13.3L32.3 13.5L32.5 10.7Z" fill="white" />
          </svg>
        </div>
        <div className="px-3 py-2 rounded bg-white/10">
          <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none">
            <rect width="48" height="32" rx="4" fill="#252525" />
            <circle cx="18" cy="16" r="10" fill="#EB001B" />
            <circle cx="30" cy="16" r="10" fill="#F79E1B" />
            <path d="M24 8.5C26.4 10.3 28 13 28 16C28 19 26.4 21.7 24 23.5C21.6 21.7 20 19 20 16C20 13 21.6 10.3 24 8.5Z" fill="#FF5F00" />
          </svg>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Card Number</label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Expiry Date</label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            maxLength={5}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">CVV</label>
          <input
            type="password"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
            placeholder="123"
            maxLength={4}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        fullWidth
        isLoading={isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
      </Button>

      <div className="flex items-center justify-center gap-2 text-white/40 text-sm pt-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Your payment is secured with SSL encryption</span>
      </div>
    </form>
  );
}
