'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
  billingAddress: string;
  city: string;
  postalCode: string;
  country: string;
  acceptTerms: boolean;
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isProcessing?: boolean;
}

export function CheckoutForm({ onSubmit, isProcessing = false }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    billingAddress: '',
    city: '',
    postalCode: '',
    country: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [step, setStep] = useState<'contact' | 'payment'>('contact');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof CheckoutFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').substr(0, 19) : '';
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substr(0, 2)}/${cleaned.substr(2, 2)}`;
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setFormData((prev) => ({ ...prev, expiryDate: formatted }));
  };

  const validateContact = () => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) {newErrors.firstName = 'First name is required';}
    if (!formData.lastName) {newErrors.lastName = 'Last name is required';}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePayment = () => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {};

    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Valid card number is required';
    }

    if (!formData.expiryDate || formData.expiryDate.length < 5) {
      newErrors.expiryDate = 'Valid expiry date is required';
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      newErrors.cvv = 'Valid CVV is required';
    }

    if (!formData.cardName) {newErrors.cardName = 'Cardholder name is required';}
    if (!formData.acceptTerms) {newErrors.acceptTerms = 'You must accept the terms';}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateContact()) {
      setStep('payment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePayment()) {
      await onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact Information */}
      <Card variant="solid" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Contact Information</h2>
          {step === 'payment' && (
            <button
              type="button"
              onClick={() => setStep('contact')}
              className="text-primary-400 text-sm hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {step === 'contact' ? (
          <div className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
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

            <Button
              type="button"
              onClick={handleContinue}
              variant="primary"
              fullWidth
            >
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="text-white/60">
            <p>{formData.email}</p>
            <p>{formData.firstName} {formData.lastName}</p>
            {formData.phone && <p>{formData.phone}</p>}
          </div>
        )}
      </Card>

      {/* Payment Information */}
      {step === 'payment' && (
        <Card variant="solid" padding="lg">
          <h2 className="text-xl font-bold text-white mb-6">Payment Details</h2>

          <div className="space-y-4">
            {/* Card Type Icons */}
            <div className="flex items-center gap-2 mb-4">
              <div className="px-3 py-2 rounded bg-white/10">
                <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="#1A1F71" />
                  <path d="M18.5 21.5L21 10.5H24L21.5 21.5H18.5Z" fill="white" />
                  <path d="M32.5 10.7C31.9 10.5 31 10.3 29.9 10.3C26.9 10.3 24.8 11.8 24.8 14C24.8 15.6 26.2 16.5 27.3 17.1C28.4 17.7 28.8 18.1 28.8 18.6C28.8 19.4 27.8 19.8 26.9 19.8C25.7 19.8 25 19.6 23.9 19.1L23.5 18.9L23.1 21.5C23.9 21.9 25.3 22.2 26.8 22.2C30 22.2 32 20.7 32 18.4C32 17.1 31.2 16.1 29.5 15.3C28.5 14.8 27.9 14.4 27.9 13.9C27.9 13.4 28.5 12.9 29.7 12.9C30.7 12.9 31.4 13.1 32 13.3L32.3 13.5L32.5 10.7Z" fill="white" />
                  <path d="M37 10.5H34.6C33.9 10.5 33.3 10.7 33 11.4L28.5 21.5H31.7L32.3 19.8H36.2L36.6 21.5H39.5L37 10.5ZM33.2 17.5C33.5 16.7 34.6 13.8 34.6 13.8C34.6 13.8 34.9 13 35.1 12.5L35.3 13.7C35.3 13.7 36 16.9 36.1 17.5H33.2Z" fill="white" />
                  <path d="M16.5 10.5L13.5 17.8L13.2 16.3C12.6 14.5 11 12.5 9.2 11.5L12 21.5H15.2L19.7 10.5H16.5Z" fill="white" />
                </svg>
              </div>
              <div className="px-3 py-2 rounded bg-white/10">
                <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="#EB001B" fillOpacity="0.9" />
                  <circle cx="18" cy="16" r="10" fill="#EB001B" />
                  <circle cx="30" cy="16" r="10" fill="#F79E1B" />
                  <path d="M24 8.5C26.4 10.3 28 13 28 16C28 19 26.4 21.7 24 23.5C21.6 21.7 20 19 20 16C20 13 21.6 10.3 24 8.5Z" fill="#FF5F00" />
                </svg>
              </div>
            </div>

            <Input
              label="Card Number"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              error={errors.cardNumber}
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date"
                name="expiryDate"
                placeholder="MM/YY"
                value={formData.expiryDate}
                onChange={handleExpiryChange}
                error={errors.expiryDate}
              />
              <Input
                label="CVV"
                name="cvv"
                type="password"
                placeholder="123"
                maxLength={4}
                value={formData.cvv}
                onChange={handleChange}
                error={errors.cvv}
              />
            </div>

            <Input
              label="Cardholder Name"
              name="cardName"
              placeholder="JOHN DOE"
              value={formData.cardName}
              onChange={handleChange}
              error={errors.cardName}
            />

            {/* Terms Checkbox */}
            <div className="pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                />
                <span className="text-sm text-white/70">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary-400 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary-400 hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-2 text-sm text-red-400">{errors.acceptTerms}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="accent"
              fullWidth
              size="lg"
              isLoading={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Complete Purchase'}
            </Button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm pt-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your payment is secured with SSL encryption</span>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
}

// Order Confirmation Component
interface OrderConfirmationProps {
  orderNumber: string;
  email: string;
  festivalName: string;
}

export function OrderConfirmation({ orderNumber, email, festivalName }: OrderConfirmationProps) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
      <p className="text-white/60 mb-8">
        Thank you for your purchase. Your tickets are on their way!
      </p>

      <Card variant="solid" padding="lg" className="max-w-md mx-auto text-left">
        <div className="space-y-4">
          <div>
            <div className="text-white/50 text-sm">Order Number</div>
            <div className="text-white font-mono text-lg">{orderNumber}</div>
          </div>
          <div>
            <div className="text-white/50 text-sm">Festival</div>
            <div className="text-white">{festivalName}</div>
          </div>
          <div>
            <div className="text-white/50 text-sm">Confirmation Email</div>
            <div className="text-white">{email}</div>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button as="link" href="/account/tickets" variant="primary">
          View My Tickets
        </Button>
        <Button as="link" href="/festivals" variant="secondary">
          Explore More Festivals
        </Button>
      </div>
    </div>
  );
}
