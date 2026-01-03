import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for Authentication
 *
 * This middleware runs on the edge before requests are completed.
 * It checks for authentication cookies and handles redirects.
 *
 * Note: With httpOnly cookies, we can't read the JWT payload here,
 * but we can check if the cookie exists for basic auth checks.
 */

// Routes that require authentication
const protectedRoutes = [
  '/account',
  '/tickets',
  '/orders',
  '/profile',
];

// Routes that should redirect to /account if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the user has an access token cookie
  // Note: We can't read httpOnly cookies in middleware, but we can check if they exist
  const hasAuthToken = request.cookies.has('access_token') ||
                       request.cookies.has('accessToken') ||
                       request.cookies.has('jwt');

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route)) && hasAuthToken) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  // Redirect unauthenticated users to login
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !hasAuthToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes should run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
