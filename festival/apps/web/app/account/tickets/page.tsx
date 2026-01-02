import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Tickets',
  description: 'View and manage your festival tickets.',
};

// Mock ticket data
const tickets = [
  {
    id: 'TK-001',
    orderId: 'FH-ABC123',
    festival: {
      name: 'Electric Dreams Festival',
      slug: 'electric-dreams-2025',
      date: 'July 15-18, 2025',
      location: 'Barcelona, Spain',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
    },
    ticketType: 'VIP Pass',
    holderName: 'John Doe',
    qrCode: 'EDVIP2025JD001',
    status: 'valid',
  },
  {
    id: 'TK-002',
    orderId: 'FH-ABC123',
    festival: {
      name: 'Electric Dreams Festival',
      slug: 'electric-dreams-2025',
      date: 'July 15-18, 2025',
      location: 'Barcelona, Spain',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
    },
    ticketType: 'VIP Pass',
    holderName: 'Jane Doe',
    qrCode: 'EDVIP2025JD002',
    status: 'valid',
  },
];

export default function TicketsPage() {
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

        {tickets.length > 0 ? (
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
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            ticket.status === 'valid'
                              ? 'bg-green-500/20 text-green-400'
                              : ticket.status === 'used'
                              ? 'bg-gray-500/20 text-gray-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60 mb-4">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {ticket.festival.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {ticket.festival.location}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5">
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Ticket ID</div>
                            <div className="text-white font-mono text-sm">{ticket.id}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Type</div>
                            <div className="text-white text-sm">{ticket.ticketType}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Holder</div>
                            <div className="text-white text-sm">{ticket.holderName}</div>
                          </div>
                          <div>
                            <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Order</div>
                            <Link href={`/account/orders/${ticket.orderId}`} className="text-primary-400 text-sm hover:underline">
                              {ticket.orderId}
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 bg-white rounded-xl p-2 mb-3">
                          {/* Placeholder for QR code - in production, use a QR library */}
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="solid" padding="lg" className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Tickets Yet</h2>
            <p className="text-white/60 mb-6">
              You haven&apos;t purchased any tickets yet. Explore our festivals and find your next adventure!
            </p>
            <Button as="link" href="/festivals" variant="primary">
              Explore Festivals
            </Button>
          </Card>
        )}

        {/* Info Section */}
        {tickets.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Mobile Tickets</h3>
                  <p className="text-white/60 text-sm">Show your ticket on your phone at the entrance. No printing required.</p>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Secure QR Codes</h3>
                  <p className="text-white/60 text-sm">Each ticket has a unique QR code that can only be scanned once.</p>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Need Help?</h3>
                  <p className="text-white/60 text-sm">Contact our support team for any ticket-related questions.</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
