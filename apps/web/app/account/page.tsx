'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore, selectUser, selectIsAuthenticated, selectIsLoading } from '@/stores/auth.store';

const API_URL = '/api';

interface UpcomingFestival {
  id: string;
  name: string;
  date: string;
  location: string;
  ticketType: string;
  ticketCount: number;
}

interface RecentOrder {
  id: string;
  date: string;
  festival: string;
  total: number;
  currency: string;
  status: string;
}

const quickLinks = [
  {
    title: 'My Tickets',
    description: 'View and download your festival tickets',
    href: '/account/tickets',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    title: 'Order History',
    description: 'View all your past orders and invoices',
    href: '/account/orders',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Saved Festivals',
    description: 'Festivals you have saved for later',
    href: '/account/saved',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: 'Account Settings',
    description: 'Update your profile and preferences',
    href: '/account/settings',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAuthLoading = useAuthStore(selectIsLoading);
  const initialize = useAuthStore((state) => state.initialize);

  const [upcomingFestivals, setUpcomingFestivals] = useState<UpcomingFestival[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Fetch user data (tickets and orders)
  useEffect(() => {
    async function fetchUserData() {
      if (!isAuthenticated || !user) return;

      setIsLoadingData(true);
      try {
        // Fetch upcoming festivals from tickets
        const ticketsRes = await fetch(`${API_URL}/tickets/my-tickets`, {
          credentials: 'include',
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          const tickets = Array.isArray(ticketsData) ? ticketsData : ticketsData.data || [];

          // Group tickets by festival
          const festivalMap = new Map<string, UpcomingFestival>();
          for (const ticket of tickets) {
            if (ticket.status === 'valid' && ticket.festival) {
              const existing = festivalMap.get(ticket.festival.id);
              if (existing) {
                existing.ticketCount += 1;
              } else {
                festivalMap.set(ticket.festival.id, {
                  id: ticket.festival.id,
                  name: ticket.festival.name,
                  date: formatFestivalDate(ticket.festival.startDate, ticket.festival.endDate),
                  location: ticket.festival.location,
                  ticketType: ticket.ticketCategory?.name || 'Standard',
                  ticketCount: 1,
                });
              }
            }
          }
          setUpcomingFestivals(Array.from(festivalMap.values()));
        }

        // Fetch recent orders
        const ordersRes = await fetch(`${API_URL}/payments/my-orders?limit=5`, {
          credentials: 'include',
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const orders = Array.isArray(ordersData) ? ordersData : ordersData.data || [];
          setRecentOrders(
            orders.slice(0, 5).map((order: {
              id: string;
              createdAt: string;
              festival?: { name: string };
              festivalName?: string;
              amount: number;
              currency: string;
              status: string;
            }) => ({
              id: order.id,
              date: order.createdAt,
              festival: order.festival?.name || order.festivalName || 'Unknown Festival',
              total: order.amount / 100, // Convert from cents
              currency: order.currency || 'EUR',
              status: order.status,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchUserData();
  }, [isAuthenticated, user]);

  // Helper function to format festival dates
  function formatFestivalDate(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show nothing while redirecting (user not authenticated)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, {user.firstName || 'User'}!
                </h1>
                <p className="text-white/60">{user.email}</p>
              </div>
            </div>
            <Button as="link" href="/account/settings" variant="secondary">
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card variant="glow" padding="md" className="h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                    {link.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{link.title}</h3>
                    <p className="text-white/50 text-sm">{link.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Festivals */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Upcoming Festivals</h2>
                <Link href="/account/tickets" className="text-primary-400 text-sm hover:underline">
                  View All
                </Link>
              </div>

              {isLoadingData ? (
                <Card variant="solid" padding="lg" className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-white/60 mt-4">Loading your festivals...</p>
                </Card>
              ) : upcomingFestivals.length > 0 ? (
                <div className="space-y-4">
                  {upcomingFestivals.map((festival) => (
                    <Card key={festival.id} variant="gradient" padding="md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-white text-lg">{festival.name}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/60">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {festival.date}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {festival.location}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-secondary-400/20 text-secondary-400 text-xs font-medium">
                              {festival.ticketCount}x {festival.ticketType}
                            </span>
                          </div>
                        </div>
                        <Button as="link" href="/account/tickets" variant="primary" size="sm">
                          View Tickets
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card variant="solid" padding="lg" className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-2">No upcoming festivals</h3>
                  <p className="text-white/50 text-sm mb-4">Discover amazing festivals and get your tickets today!</p>
                  <Button as="link" href="/festivals" variant="primary">
                    Explore Festivals
                  </Button>
                </Card>
              )}
            </section>

            {/* Recent Orders */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Recent Orders</h2>
                <Link href="/account/orders" className="text-primary-400 text-sm hover:underline">
                  View All
                </Link>
              </div>

              {isLoadingData ? (
                <Card variant="solid" padding="lg" className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-white/60 mt-4">Loading your orders...</p>
                </Card>
              ) : recentOrders.length > 0 ? (
                <Card variant="solid" padding="none">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/50 font-medium text-sm px-6 py-4">Order</th>
                          <th className="text-left text-white/50 font-medium text-sm px-6 py-4">Festival</th>
                          <th className="text-left text-white/50 font-medium text-sm px-6 py-4">Date</th>
                          <th className="text-left text-white/50 font-medium text-sm px-6 py-4">Total</th>
                          <th className="text-left text-white/50 font-medium text-sm px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-white/5 last:border-0">
                            <td className="px-6 py-4">
                              <Link href={`/account/orders/${order.id}`} className="text-primary-400 font-mono text-sm hover:underline">
                                {order.id.slice(0, 12)}...
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-white text-sm">{order.festival}</td>
                            <td className="px-6 py-4 text-white/60 text-sm">
                              {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-white font-semibold text-sm">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.total)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                                order.status === 'confirmed' || order.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : order.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : order.status === 'cancelled' || order.status === 'refunded'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card variant="solid" padding="lg" className="text-center">
                  <p className="text-white/50">No orders yet</p>
                </Card>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-white mb-4">Account Details</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Full Name</div>
                  <div className="text-white">{user.firstName} {user.lastName}</div>
                </div>
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Email</div>
                  <div className="text-white">{user.email}</div>
                </div>
                {user.phone && (
                  <div>
                    <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Phone</div>
                    <div className="text-white">{user.phone}</div>
                  </div>
                )}
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Member Since</div>
                  <div className="text-white">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-white mb-4">Need Help?</h3>
              <p className="text-white/60 text-sm mb-4">
                Our support team is here to help you with any questions or issues.
              </p>
              <div className="space-y-2">
                <Button as="link" href="/help" variant="secondary" fullWidth size="sm">
                  Visit Help Center
                </Button>
                <Button as="link" href="/contact" variant="ghost" fullWidth size="sm">
                  Contact Support
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
