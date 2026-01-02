import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your FestivalHub account, tickets, and orders.',
};

// Mock user data
const user = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 555 123 4567',
  memberSince: '2024-01-15',
};

const upcomingFestivals = [
  {
    id: '1',
    name: 'Electric Dreams Festival',
    date: 'July 15-18, 2025',
    location: 'Barcelona, Spain',
    ticketType: 'VIP Pass',
    ticketCount: 2,
  },
];

const recentOrders = [
  {
    id: 'FH-ABC123',
    date: '2024-12-15',
    festival: 'Electric Dreams Festival',
    total: 798,
    currency: 'EUR',
    status: 'confirmed',
  },
];

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
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, {user.firstName}!
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

              {upcomingFestivals.length > 0 ? (
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

              {recentOrders.length > 0 ? (
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
                                {order.id}
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
                              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium capitalize">
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
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Phone</div>
                  <div className="text-white">{user.phone}</div>
                </div>
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Member Since</div>
                  <div className="text-white">
                    {new Date(user.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
