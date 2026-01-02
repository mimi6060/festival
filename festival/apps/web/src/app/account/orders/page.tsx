import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export const metadata: Metadata = {
  title: 'Order History',
  description: 'View your order history and invoices.',
};

// Mock order data
const orders = [
  {
    id: 'FH-ABC123',
    date: '2024-12-15',
    festival: {
      name: 'Electric Dreams Festival',
      slug: 'electric-dreams-2025',
      date: 'July 15-18, 2025',
    },
    items: [
      { type: 'VIP Pass', quantity: 2, price: 399 },
    ],
    subtotal: 798,
    serviceFee: 79.80,
    total: 877.80,
    currency: 'EUR',
    status: 'confirmed',
    paymentMethod: 'Visa ending in 4242',
  },
  {
    id: 'FH-XYZ789',
    date: '2024-08-20',
    festival: {
      name: 'Summer Vibes 2024',
      slug: 'summer-vibes-2024',
      date: 'August 25-27, 2024',
    },
    items: [
      { type: 'General Admission', quantity: 3, price: 149 },
    ],
    subtotal: 447,
    serviceFee: 44.70,
    total: 491.70,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'Mastercard ending in 5555',
  },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
};

export default function OrdersPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/account" className="text-white/50 hover:text-white transition-colors">
            Account
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Order History</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
          <p className="text-white/60">View all your past orders and download invoices</p>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} variant="solid" padding="none">
                {/* Order Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-lg font-semibold text-white font-mono">{order.id}</h2>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm">
                          Placed on {new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Invoice
                      </Button>
                      {order.status === 'confirmed' && (
                        <Button as="link" href="/account/tickets" variant="primary" size="sm">
                          View Tickets
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Festival Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">{order.festival.name}</h3>
                      <p className="text-white/60 text-sm mb-4">{order.festival.date}</p>

                      {/* Items */}
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-semibold">
                                {item.quantity}x
                              </div>
                              <span className="text-white">{item.type}</span>
                            </div>
                            <span className="text-white font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:w-72 p-4 rounded-xl bg-white/5">
                      <h4 className="font-medium text-white mb-4">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Subtotal</span>
                          <span className="text-white">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Service Fee</span>
                          <span className="text-white">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.serviceFee)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                          <span className="text-white">Total</span>
                          <span className="text-secondary-400">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.total)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Payment Method</div>
                        <div className="flex items-center gap-2 text-white text-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {order.paymentMethod}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Orders Yet</h2>
            <p className="text-white/60 mb-6">
              Once you purchase tickets, your orders will appear here.
            </p>
            <Button as="link" href="/festivals" variant="primary">
              Explore Festivals
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
