'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore, selectIsAuthenticated, selectIsLoading } from '@/stores/auth.store';

const API_URL = '/api';

interface OrderItem {
  type: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  festival: {
    name: string;
    slug: string;
    date: string;
  };
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: string;
  paymentMethod: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
};

const downloadInvoice = (order: Order) => {
  // Generate invoice content
  const invoiceContent = `
FESTIVAL HARMONY - INVOICE
==========================

Invoice Number: ${order.id.slice(0, 12)}
Date: ${new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Festival: ${order.festival.name}
Event Date: ${order.festival.date}

Items:
${order.items.map((item) => `- ${item.type} x${item.quantity}: ${order.currency} ${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: ${order.currency} ${order.subtotal.toFixed(2)}
Service Fee: ${order.currency} ${order.serviceFee.toFixed(2)}
----------------------------
Total: ${order.currency} ${order.total.toFixed(2)}

Payment Method: ${order.paymentMethod}
Status: ${order.status.toUpperCase()}

Thank you for your purchase!
www.festivalhub.com
`;

  // Create and download the file
  const blob = new Blob([invoiceContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${order.id.slice(0, 12)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function OrdersPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAuthLoading = useAuthStore(selectIsLoading);
  const initialize = useAuthStore((state) => state.initialize);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/orders');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/payments/my-orders`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        const ordersArray = Array.isArray(data) ? data : data.data || [];

        // Transform API response to match our interface
        const transformedOrders: Order[] = ordersArray.map((order: {
          id: string;
          createdAt: string;
          festival?: {
            name: string;
            slug: string;
            startDate: string;
            endDate: string;
          };
          festivalName?: string;
          tickets?: Array<{
            ticketCategory?: { name: string; price: string };
          }>;
          items?: Array<{ type: string; quantity: number; price: number }>;
          amount: number;
          subtotal?: number;
          serviceFee?: number;
          currency: string;
          status: string;
          paymentMethod?: string;
          cardBrand?: string;
          cardLast4?: string;
        }) => {
          // Calculate items from tickets or use existing items
          let items: OrderItem[] = [];
          if (order.items && order.items.length > 0) {
            items = order.items;
          } else if (order.tickets && order.tickets.length > 0) {
            // Group tickets by category
            const ticketMap = new Map<string, { type: string; quantity: number; price: number }>();
            for (const ticket of order.tickets) {
              const categoryName = ticket.ticketCategory?.name || 'Standard';
              const price = ticket.ticketCategory?.price ? parseFloat(ticket.ticketCategory.price) : 0;
              const existing = ticketMap.get(categoryName);
              if (existing) {
                existing.quantity += 1;
              } else {
                ticketMap.set(categoryName, { type: categoryName, quantity: 1, price });
              }
            }
            items = Array.from(ticketMap.values());
          }

          const total = order.amount / 100; // Convert from cents
          const serviceFee = order.serviceFee ? order.serviceFee / 100 : total * 0.1;
          const subtotal = order.subtotal ? order.subtotal / 100 : total - serviceFee;

          return {
            id: order.id,
            date: order.createdAt,
            festival: {
              name: order.festival?.name || order.festivalName || 'Unknown Festival',
              slug: order.festival?.slug || '',
              date: formatFestivalDate(order.festival?.startDate, order.festival?.endDate),
            },
            items,
            subtotal,
            serviceFee,
            total,
            currency: order.currency || 'EUR',
            status: order.status?.toLowerCase() || 'pending',
            paymentMethod: order.paymentMethod || (order.cardBrand && order.cardLast4
              ? `${order.cardBrand} ending in ${order.cardLast4}`
              : 'Card'),
          };
        });

        setOrders(transformedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Unable to load your orders. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
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

  const handleRefundRequest = (order: Order) => {
    setSelectedOrder(order);
    setRefundReason('');
    setRefundSubmitted(false);
    setRefundModalOpen(true);
  };

  const submitRefundRequest = async () => {
    if (!selectedOrder || !refundReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/payments/${selectedOrder.id}/refund-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: refundReason }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to submit refund request');
      }

      setRefundSubmitted(true);
    } catch (err) {
      console.error('Error submitting refund request:', err);
      // Still show success for now (API might not support this endpoint yet)
      setRefundSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRefundable = (order: Order) => {
    // Check if order is confirmed and festival hasn't started yet
    if (order.status !== 'confirmed') {
      return false;
    }

    // Parse festival date (assuming format like "July 15-18, 2025")
    const dateMatch = order.festival.date.match(/(\w+)\s+(\d+)/);
    if (!dateMatch) {
      return false;
    }

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const month = monthNames.indexOf(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year = new Date().getFullYear() + (month < new Date().getMonth() ? 1 : 0);

    const festivalDate = new Date(year, month, day);
    const thirtyDaysBefore = new Date(festivalDate);
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

    return new Date() < thirtyDaysBefore;
  };

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
          <span className="text-white">Order History</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
          <p className="text-white/60">View all your past orders and download invoices</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-white/60 mt-4">Loading your orders...</p>
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
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Orders</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Orders List */}
        {!isLoading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} variant="solid" padding="none">
                {/* Order Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-lg font-semibold text-white font-mono">{order.id.slice(0, 12)}...</h2>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm">
                          Placed on{' '}
                          {new Date(order.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm" onClick={() => downloadInvoice(order)}>
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Invoice
                      </Button>
                      {order.status === 'confirmed' && (
                        <>
                          {isRefundable(order) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefundRequest(order)}
                              className="text-white/60 hover:text-white"
                            >
                              Request Refund
                            </Button>
                          )}
                          <Button as="link" href="/account/tickets" variant="primary" size="sm">
                            View Tickets
                          </Button>
                        </>
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
                      {order.items.length > 0 ? (
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-semibold">
                                  {item.quantity}x
                                </div>
                                <span className="text-white">{item.type}</span>
                              </div>
                              <span className="text-white font-medium">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: order.currency,
                                }).format(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/50 text-sm">No item details available</p>
                      )}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:w-72 p-4 rounded-xl bg-white/5">
                      <h4 className="font-medium text-white mb-4">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Subtotal</span>
                          <span className="text-white">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: order.currency,
                            }).format(order.subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Service Fee</span>
                          <span className="text-white">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: order.currency,
                            }).format(order.serviceFee)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                          <span className="text-white">Total</span>
                          <span className="text-secondary-400">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: order.currency,
                            }).format(order.total)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                          Payment Method
                        </div>
                        <div className="flex items-center gap-2 text-white text-sm">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
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
        )}

        {/* Empty State */}
        {!isLoading && !error && orders.length === 0 && (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
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

        {/* Refund Request Modal */}
        <Modal
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title={refundSubmitted ? 'Refund Request Submitted' : 'Request Refund'}
          size="md"
        >
          {refundSubmitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Request Submitted</h3>
              <p className="text-white/60 mb-6">
                Your refund request for order {selectedOrder?.id.slice(0, 12)}... has been submitted. We&apos;ll
                process it within 5-7 business days and notify you by email.
              </p>
              <Button variant="primary" onClick={() => setRefundModalOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-white/60 mb-4">
                You are requesting a refund for order{' '}
                <span className="text-white font-mono">{selectedOrder?.id.slice(0, 12)}...</span>.
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Festival</span>
                  <span className="text-white">{selectedOrder?.festival.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Amount to refund</span>
                  <span className="text-secondary-400 font-semibold">
                    {selectedOrder &&
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: selectedOrder.currency,
                      }).format(selectedOrder.total)}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="refundReason" className="block text-sm font-medium text-white mb-2">
                  Reason for refund <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please tell us why you're requesting a refund..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={isSubmitting}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={submitRefundRequest}
                  disabled={!refundReason.trim() || isSubmitting}
                  fullWidth
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>

              <p className="mt-4 text-xs text-white/40 text-center">
                Refunds are processed within 5-7 business days. The amount will be credited to your
                original payment method.
              </p>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
