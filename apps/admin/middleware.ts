import { NextResponse, type NextRequest } from 'next/server';

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

// Routes API publiques
const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'];

// Content-Security-Policy directives
const isDev = process.env.NODE_ENV === 'development';
const apiUrls = isDev ? 'http://localhost:3000 http://localhost:3001 http://localhost:3333' : '';

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' https://api.stripe.com wss: ws: ${apiUrls}`.trim(),
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

/**
 * Add security headers to the response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si c'est une ressource statique
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // fichiers comme favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // Vérifier si c'est une route publique
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute || isPublicApiRoute) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Récupérer le token d'authentification
  const token = request.cookies.get('admin_token')?.value;

  // Si pas de token, rediriger vers la page de login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vérifier si le token est valide (version simplifiée)
  // En production, vous devriez vérifier la signature JWT
  try {
    // Décoder le token JWT pour vérifier son expiration
    const [, payload] = token.split('.');
    if (payload) {
      const decodedPayload = JSON.parse(atob(payload));
      const expirationTime = decodedPayload.exp * 1000; // Convertir en millisecondes

      if (Date.now() >= expirationTime) {
        // Token expiré, rediriger vers login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        loginUrl.searchParams.set('expired', 'true');

        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('admin_token');
        return response;
      }
    }
  } catch {
    // Token invalide, rediriger vers login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('admin_token');
    return response;
  }

  // Ajouter des headers de sécurité et retourner la réponse
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
