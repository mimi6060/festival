import { redirect } from 'next/navigation';

/**
 * /profile route redirects to /account
 * This page is protected by middleware and requires authentication.
 * Once authenticated, users are redirected to their account page.
 */
export default function ProfileRedirectPage() {
  redirect('/account');
}
