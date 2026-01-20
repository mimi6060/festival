import { redirect } from 'next/navigation';

/**
 * /tickets route redirects to /account/tickets
 * This page is protected by middleware and requires authentication.
 * Once authenticated, users are redirected to their tickets page.
 */
export default function TicketsRedirectPage() {
  redirect('/account/tickets');
}
