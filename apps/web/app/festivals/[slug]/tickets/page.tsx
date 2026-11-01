'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@festival/ui';
import { TicketSelector, TicketType, TicketSummary } from '@/components/festivals/TicketSelector';
import { CheckoutForm, OrderConfirmation } from '@/components/checkout/CheckoutForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

interface ApiFestival {
  id: string;
  name: string;
  slug: string;
  location: string;
  startDate: string;
  endDate: string;
  currency: string;
  ticketCategories?: ApiTicketCategory[];
}

interface ApiTicketCategory {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: string;
  quota: number;
  soldCount: number;
  maxPerUser: number;
  isActive: boolean;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', options)}`;
}

function getTicketFeatures(type: string, name: string): string[] {
  const baseFeatures: Record<string, string[]> = {
    STANDARD: ['Acces aux scenes principales', 'Application festival gratuite'],
    VIP: [
      'Acces VIP avec vue privilegiee',
      'Lounge VIP avec boissons',
      'Entree rapide',
      'Application festival gratuite',
    ],
    BACKSTAGE: [
      'Tous les avantages VIP',
      'Acces aux coulisses',
      'Rencontre avec les artistes',
      'Catering premium',
    ],
    CAMPING: ['Emplacement reserve', 'Acces sanitaires'],
    PARKING: ['Place de parking garantie', 'Acces 24h/24'],
    COMBO: ['Pack complet a tarif reduit', 'Reservation garantie'],
  };

  const features = baseFeatures[type] || ['Acces standard'];

  // Add specific features based on name
  if (name.includes('3 Jours') || name.includes('3 jours')) {
    features.unshift('Acces aux 3 jours du festival');
  } else if (name.includes('1 Jour') || name.includes('1 jour')) {
    features.unshift('Acces 1 journee');
  }

  if (name.includes('Early Bird')) {
    features.push('Tarif preferentiel');
  }

  if (name.includes('Confort')) {
    features.push('Acces douches privees');
  }

  if (name.includes('Premium')) {
    features.push('Experience exclusive');
  }

  if (name.includes('Family')) {
    features.push('4 personnes incluses');
  }

  return features;
}

function transformApiTickets(categories: ApiTicketCategory[], currency: string): TicketType[] {
  return categories
    .filter((cat) => cat.isActive)
    .map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || `Billet ${cat.name}`,
      price: parseFloat(cat.price),
      currency: currency,
      available: cat.quota - cat.soldCount,
      maxPerOrder: cat.maxPerUser,
      features: getTicketFeatures(cat.type, cat.name),
      isPopular: cat.type === 'VIP' || index === 3, // Mark VIP or 4th item as popular
    }));
}

type Step = 'select' | 'checkout' | 'confirmation';

export default function TicketsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const [festival, setFestival] = useState<ApiFestival | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('select');
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function fetchFestival() {
      if (!slug) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/festivals/by-slug/${slug}`);

        if (!res.ok) {
          throw new Error('Festival non trouve');
        }

        const data: ApiFestival = await res.json();
        setFestival(data);

        if (data.ticketCategories && data.ticketCategories.length > 0) {
          const transformedTickets = transformApiTickets(
            data.ticketCategories,
            data.currency || 'EUR'
          );
          setTicketTypes(transformedTickets);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchFestival();
  }, [slug]);

  const handleTicketSelect = (tickets: Record<string, number>) => {
    setSelectedTickets(tickets);
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutSubmit = async (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    setIsProcessing(true);
    setUserEmail(data.email);

    // TODO: Call real payment API
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const order = `FH-${Date.now().toString(36).toUpperCase()}`;
    setOrderNumber(order);
    setIsProcessing(false);
    setStep('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-white/60">Chargement des billets...</p>
        </div>
      </div>
    );
  }

  if (error || !festival) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container-app">
          <Card variant="solid" padding="lg" className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              {error || 'Festival non trouve'}
            </h2>
            <p className="text-white/60 mb-4">
              Impossible de charger les informations de billetterie.
            </p>
            <Link
              href="/festivals"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300"
            >
              Retour aux festivals
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const dateRange = formatDateRange(festival.startDate, festival.endDate);
  const currency = festival.currency || 'EUR';

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
            href={`/festivals/${slug}`}
            className="text-white/50 hover:text-white transition-colors"
          >
            {festival.name}
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Billets</span>
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    '1'
                  )}
                </div>
                <span className="hidden sm:inline font-medium">Choisir les billets</span>
              </div>

              <div className="w-12 h-0.5 bg-white/10" />

              <div
                className={`flex items-center gap-2 ${
                  step === 'checkout' ? 'text-primary-400' : 'text-white/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'checkout' ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/50'
                  }`}
                >
                  2
                </div>
                <span className="hidden sm:inline font-medium">Paiement</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        {step !== 'confirmation' && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 'select' ? 'Choisissez vos billets' : 'Finalisez votre commande'}
            </h1>
            <p className="text-white/60">
              {festival.name} - {dateRange} - {festival.location}
            </p>
          </div>
        )}

        {/* No tickets available */}
        {step === 'select' && ticketTypes.length === 0 && (
          <Card variant="solid" padding="lg" className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Billetterie non disponible</h2>
            <p className="text-white/60 mb-4">
              Les billets pour ce festival ne sont pas encore en vente.
            </p>
            <Link
              href={`/festivals/${slug}`}
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300"
            >
              Retour au festival
            </Link>
          </Card>
        )}

        {/* Content */}
        {step === 'select' && ticketTypes.length > 0 && (
          <TicketSelector tickets={ticketTypes} onSelect={handleTicketSelect} currency={currency} />
        )}

        {step === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Retour a la selection
              </button>

              <CheckoutForm onSubmit={handleCheckoutSubmit} isProcessing={isProcessing} />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <TicketSummary
                  tickets={ticketTypes}
                  selectedTickets={selectedTickets}
                  currency={currency}
                />

                <Card variant="solid" padding="md" className="mt-4">
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span>Vos billets sont reserves pendant 15 minutes</span>
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
            festivalName={festival.name}
          />
        )}
      </div>
    </div>
  );
}
