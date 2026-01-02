'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { TicketSelector, TicketType, TicketSummary } from '../../../../components/festivals/TicketSelector';
import { CheckoutForm, OrderConfirmation } from '../../../../components/checkout/CheckoutForm';

// Mock data
const festivalData = {
  name: 'Electric Dreams Festival',
  slug: 'electric-dreams-2025',
  dates: 'July 15-18, 2025',
  location: 'Barcelona, Spain',
};

const ticketTypes: TicketType[] = [
  {
    id: 'general',
    name: 'General Admission',
    description: 'Access to all main stages and areas',
    price: 199,
    currency: 'EUR',
    available: 500,
    maxPerOrder: 6,
    features: [
      'Access to all 5 stages',
      'Free festival app',
      'Welcome drink',
    ],
  },
  {
    id: 'vip',
    name: 'VIP Pass',
    description: 'Exclusive VIP areas with premium amenities',
    price: 399,
    currency: 'EUR',
    available: 150,
    maxPerOrder: 4,
    features: [
      'All General Admission perks',
      'VIP viewing platforms',
      'Dedicated VIP bars & lounges',
      'Fast-track entry',
      'Exclusive merchandise pack',
    ],
    isPopular: true,
  },
  {
    id: 'premium',
    name: 'Premium Experience',
    description: 'The ultimate festival experience with backstage access',
    price: 599,
    currency: 'EUR',
    available: 8,
    maxPerOrder: 2,
    features: [
      'All VIP perks',
      'Backstage access',
      'Meet & greet opportunities',
      'Gourmet catering',
      'Private shuttle service',
      'Dedicated concierge',
    ],
  },
];

type Step = 'select' | 'checkout' | 'confirmation';

export default function TicketsPage() {
  const params = useParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleTicketSelect = (tickets: Record<string, number>) => {
    setSelectedTickets(tickets);
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutSubmit = async (data: { email: string; firstName: string; lastName: string }) => {
    setIsProcessing(true);
    setUserEmail(data.email);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate order number
    const order = `FH-${Date.now().toString(36).toUpperCase()}`;
    setOrderNumber(order);
    setIsProcessing(false);
    setStep('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/festivals" className="text-white/50 hover:text-white transition-colors">
            Festivals
          </Link>
          <span className="text-white/30">/</span>
          <Link
            href={`/festivals/${params.slug}`}
            className="text-white/50 hover:text-white transition-colors"
          >
            {festivalData.name}
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Tickets</span>
        </nav>

        {/* Progress Steps */}
        {step !== 'confirmation' && (
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 ${
                  step === 'select' ? 'text-primary-400' : 'text-white/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'select'
                      ? 'bg-primary-500 text-white'
                      : step === 'checkout'
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {step === 'checkout' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    '1'
                  )}
                </div>
                <span className="hidden sm:inline font-medium">Select Tickets</span>
              </div>

              <div className="w-12 h-0.5 bg-white/10" />

              <div
                className={`flex items-center gap-2 ${
                  step === 'checkout' ? 'text-primary-400' : 'text-white/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'checkout'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  2
                </div>
                <span className="hidden sm:inline font-medium">Checkout</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        {step !== 'confirmation' && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 'select' ? 'Select Your Tickets' : 'Complete Your Order'}
            </h1>
            <p className="text-white/60">
              {festivalData.name} - {festivalData.dates} - {festivalData.location}
            </p>
          </div>
        )}

        {/* Content */}
        {step === 'select' && (
          <TicketSelector
            tickets={ticketTypes}
            onSelect={handleTicketSelect}
            currency="EUR"
          />
        )}

        {step === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Ticket Selection
              </button>

              <CheckoutForm
                onSubmit={handleCheckoutSubmit}
                isProcessing={isProcessing}
              />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <TicketSummary
                  tickets={ticketTypes}
                  selectedTickets={selectedTickets}
                  currency="EUR"
                />

                <Card variant="solid" padding="md" className="mt-4">
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Your tickets are reserved for 15 minutes</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <OrderConfirmation
            orderNumber={orderNumber}
            email={userEmail}
            festivalName={festivalData.name}
          />
        )}
      </div>
    </div>
  );
}
