import { redirect } from 'next/navigation';

/**
 * /orders route redirects to /account/orders
 * This page is protected by middleware and requires authentication.
 * Once authenticated, users are redirected to their orders page.
 */
export default function OrdersRedirectPage() {
  redirect('/account/orders');
}
