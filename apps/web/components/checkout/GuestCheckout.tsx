'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface GuestCheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface GuestCheckoutProps {
  festivalId: string;
  categoryId: string;
  quantity: number;
  onSubmit: (data: GuestCheckoutFormData) => Promise<void>;
  onCancel?: () => void;
  isProcessing?: boolean;
}

export function GuestCheckout({
  festivalId: _festivalId,
  categoryId: _categoryId,
  quantity: _quantity,
  onSubmit,
  onCancel,
  isProcessing = false,
}: GuestCheckoutProps) {
  const [formData, setFormData] = useState<GuestCheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GuestCheckoutFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof GuestCheckoutFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof GuestCheckoutFormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <Card variant="solid" padding="lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Guest Checkout</h2>
        <p className="text-white/60 text-sm">
          Complete your purchase without creating an account. Your tickets will be sent to your
          email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          label="Phone Number (optional)"
          name="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={formData.phone}
          onChange={handleChange}
        />

        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-white/80">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>You'll receive your tickets via email</li>
                <li>Each ticket will have a unique QR code</li>
                <li>Present your QR code at the festival entrance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary" fullWidth>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="accent" fullWidth isLoading={isProcessing}>
            {isProcessing ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </div>

        <div className="text-center pt-4">
          <p className="text-white/40 text-sm">
            Already have an account?{' '}
            <a href="/auth/login" className="text-primary-400 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </form>
    </Card>
  );
}

// Guest Order Confirmation Component
interface GuestOrderConfirmationProps {
  tickets: {
    id: string;
    qrCode: string;
    category: {
      name: string;
      type: string;
    };
  }[];
  email: string;
  festivalName: string;
}

export function GuestOrderConfirmation({
  tickets,
  email,
  festivalName,
}: GuestOrderConfirmationProps) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
      <p className="text-white/60 mb-8">
        Thank you for your purchase. Your tickets have been sent to your email!
      </p>

      <Card variant="solid" padding="lg" className="max-w-md mx-auto text-left">
        <div className="space-y-4">
          <div>
            <div className="text-white/50 text-sm">Festival</div>
            <div className="text-white font-semibold">{festivalName}</div>
          </div>
          <div>
            <div className="text-white/50 text-sm">Tickets</div>
            <div className="text-white">{tickets.length} ticket(s)</div>
          </div>
          <div>
            <div className="text-white/50 text-sm">Confirmation Email</div>
            <div className="text-white">{email}</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div className="text-sm">
              <p className="text-white/80 font-medium">Check your email</p>
              <p className="text-white/60 mt-1">
                We've sent your tickets with QR codes to{' '}
                <strong className="text-white">{email}</strong>
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button as="link" href="/festivals" variant="primary">
          Explore More Festivals
        </Button>
        <Button as="link" href="/auth/register" variant="secondary">
          Create an Account
        </Button>
      </div>
    </div>
  );
}
