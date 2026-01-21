'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DownloadableQRCode } from '@/components/ui/QRCode';
import { useAuthStore, selectIsAuthenticated, selectIsLoading } from '@/stores/auth.store';

const API_URL = '/api';

interface Ticket {
  id: string;
  orderId: string;
  festival: {
    name: string;
    slug: string;
    date: string;
    location: string;
    imageUrl: string;
  };
  ticketType: string;
  holderName: string;
  qrCode: string;
  status: 'valid' | 'used' | 'cancelled' | 'expired';
}

export default function TicketsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAuthLoading = useAuthStore(selectIsLoading);
  const initialize = useAuthStore((state) => state.initialize);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/tickets');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/tickets/my-tickets`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }

        const data = await response.json();
        const ticketsArray = Array.isArray(data) ? data : data.data || [];

        // Transform API response to match our interface
        const transformedTickets: Ticket[] = ticketsArray.map((ticket: {
          id: string;
          paymentId?: string;
          payment?: { id: string };
          festival?: {
            name: string;
            slug: string;
            startDate: string;
            endDate: string;
            location: string;
            bannerUrl?: string;
          };
          ticketCategory?: { name: string };
          holderName?: string;
          holderFirstName?: string;
          holderLastName?: string;
          qrCode?: string;
          qrCodeData?: string;
          status: string;
        }) => ({
          id: ticket.id,
          orderId: ticket.paymentId || ticket.payment?.id || 'N/A',
          festival: {
            name: ticket.festival?.name || 'Unknown Festival',
            slug: ticket.festival?.slug || '',
            date: formatFestivalDate(ticket.festival?.startDate, ticket.festival?.endDate),
            location: ticket.festival?.location || 'Location TBA',
            imageUrl: ticket.festival?.bannerUrl || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
          },
          ticketType: ticket.ticketCategory?.name || 'Standard',
          holderName: ticket.holderName || `${ticket.holderFirstName || ''} ${ticket.holderLastName || ''}`.trim() || 'Ticket Holder',
          qrCode: ticket.qrCode || ticket.qrCodeData || ticket.id,
          status: mapTicketStatus(ticket.status),
        }));

        setTickets(transformedTickets);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError('Unable to load your tickets. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
  }, [isAuthenticated]);

  // Helper function to format festival dates
  function formatFestivalDate(startDate?: string, endDate?: string): string {
    if (!startDate) return 'Date TBA';

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  }

  // Map API status to our status type
  function mapTicketStatus(status: string): 'valid' | 'used' | 'cancelled' | 'expired' {
    const statusLower = status.toLowerCase();
    if (statusLower === 'valid' || statusLower === 'active') return 'valid';
    if (statusLower === 'used' || statusLower === 'scanned') return 'used';
    if (statusLower === 'cancelled' || statusLower === 'refunded') return 'cancelled';
    if (statusLower === 'expired') return 'expired';
    return 'valid';
  }

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/account" className="text-white/50 hover:text-white transition-colors">
            Account
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">My Tickets</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Tickets</h1>
          <p className="text-white/60">View and manage your festival tickets</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-white/60 mt-4">Loading your tickets...</p>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Tickets</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Tickets List */}
        {!isLoading && !error && tickets.length > 0 && (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} variant="solid" padding="none" className="overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Festival Image */}
                  <div className="lg:w-64 h-48 lg:h-auto relative">
                    <img
                      src={ticket.festival.imageUrl}
                      alt={ticket.festival.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-festival-darker lg:bg-gradient-to-t" />
                  </div>

                  {/* Ticket Details */}
                  <div className="flex-1 p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold text-white">{ticket.festival.name}</h2>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                              ticket.status === 'valid'
                                ? 'bg-green-500/20 text-green-400'
                                : ticket.status === 'used'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60 mb-4">
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {ticket.festival.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {ticket.festival.location}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5">
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                              Ticket ID
                            </div>
                            <div className="text-white font-mono text-sm">{ticket.id.slice(0, 8)}...</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                              Type
                            </div>
                            <div className="text-white text-sm">{ticket.ticketType}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                              Holder
                            </div>
                            <div className="text-white text-sm">{ticket.holderName}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                              Order
                            </div>
                            {ticket.orderId !== 'N/A' ? (
                              <Link
                                href={`/account/orders/${ticket.orderId}`}
                                className="text-primary-400 text-sm hover:underline"
                              >
                                {ticket.orderId.slice(0, 8)}...
                              </Link>
                            ) : (
                              <span className="text-white/60 text-sm">{ticket.orderId}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                        <div className="bg-white rounded-xl p-2">
                          <DownloadableQRCode
                            value={ticket.qrCode}
                            size={112}
                            filename={`ticket-${ticket.id.slice(0, 8)}`}
                            showDownload={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tickets.length === 0 && (
          <Card variant="solid" padding="lg" className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Tickets Yet</h2>
            <p className="text-white/60 mb-6">
              You haven&apos;t purchased any tickets yet. Explore our festivals and find your next
              adventure!
            </p>
            <Button as="link" href="/festivals" variant="primary">
              Explore Festivals
            </Button>
          </Card>
        )}

        {/* Info Section */}
        {!isLoading && !error && tickets.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Mobile Tickets</h3>
                  <p className="text-white/60 text-sm">
                    Show your ticket on your phone at the entrance. No printing required.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Secure QR Codes</h3>
                  <p className="text-white/60 text-sm">
                    Each ticket has a unique QR code that can only be scanned once.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Need Help?</h3>
                  <p className="text-white/60 text-sm">
                    Contact our support team for any ticket-related questions.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
