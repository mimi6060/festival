// =============================================================================
// CloudFront Function: Security Headers
// Festival Management Platform
// =============================================================================
// This function adds security headers to responses at the edge for:
// - Cache-Control based on content type
// - Security headers (CSP, HSTS, etc.)
// - Performance headers
// - CORS headers
// =============================================================================

function handler(event) {
  var response = event.response;
  var request = event.request;
  var headers = response.headers;
  var uri = request.uri;

  // ---------------------------------------------------------------------------
  // 1. Determine content type and set appropriate Cache-Control
  // ---------------------------------------------------------------------------
  var cacheControl = 'public, max-age=3600'; // Default 1 hour

  // Immutable assets (hashed filenames from Next.js)
  if (uri.startsWith('/_next/static/') || uri.includes('.') && uri.match(/\.[a-f0-9]{8,}\./)) {
    cacheControl = 'public, max-age=31536000, immutable';
  }
  // Static assets with version query string
  else if (uri.match(/\.(css|js)$/) || uri.match(/\.(css|js)\?/)) {
    cacheControl = 'public, max-age=31536000, immutable';
  }
  // Images
  else if (uri.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i)) {
    cacheControl = 'public, max-age=604800, stale-while-revalidate=86400';
  }
  // Fonts
  else if (uri.match(/\.(woff|woff2|ttf|eot|otf)$/i)) {
    cacheControl = 'public, max-age=31536000, immutable';
  }
  // Media files
  else if (uri.match(/\.(mp3|mp4|webm|ogg|m4a|m4v|mov)$/i)) {
    cacheControl = 'public, max-age=604800';
  }
  // JSON/XML data
  else if (uri.match(/\.(json|xml)$/i)) {
    cacheControl = 'public, max-age=300, stale-while-revalidate=60';
  }
  // HTML pages
  else if (uri.match(/\.html$/) || !uri.includes('.')) {
    cacheControl = 'public, max-age=0, must-revalidate';
  }
  // API responses
  else if (uri.startsWith('/api/')) {
    cacheControl = 'private, no-cache, no-store, must-revalidate';
  }

  headers['cache-control'] = { value: cacheControl };

  // ---------------------------------------------------------------------------
  // 2. Add ETag support
  // ---------------------------------------------------------------------------
  if (!headers['etag'] && headers['last-modified']) {
    // Generate a simple ETag from Last-Modified if not present
    var lastMod = headers['last-modified'].value;
    var etag = '"' + Buffer.from(lastMod).toString('base64').substring(0, 16) + '"';
    headers['etag'] = { value: etag };
  }

  // ---------------------------------------------------------------------------
  // 3. Add Vary header for proper caching
  // ---------------------------------------------------------------------------
  var varyHeaders = ['Accept-Encoding'];

  // For images, vary on Accept for WebP/AVIF support
  if (uri.match(/\.(png|jpg|jpeg|gif)$/i)) {
    varyHeaders.push('Accept');
  }

  // For HTML, vary on Accept-Language for i18n
  if (uri.match(/\.html$/) || !uri.includes('.')) {
    varyHeaders.push('Accept-Language');
  }

  headers['vary'] = { value: varyHeaders.join(', ') };

  // ---------------------------------------------------------------------------
  // 4. Add security headers
  // ---------------------------------------------------------------------------

  // Strict Transport Security (HSTS)
  headers['strict-transport-security'] = {
    value: 'max-age=31536000; includeSubDomains; preload'
  };

  // X-Content-Type-Options
  headers['x-content-type-options'] = { value: 'nosniff' };

  // X-Frame-Options (for non-embeddable content)
  if (!uri.match(/\/embed\//)) {
    headers['x-frame-options'] = { value: 'SAMEORIGIN' };
  }

  // X-XSS-Protection
  headers['x-xss-protection'] = { value: '1; mode=block' };

  // Referrer-Policy
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };

  // Permissions-Policy
  headers['permissions-policy'] = {
    value: 'accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()'
  };

  // ---------------------------------------------------------------------------
  // 5. Add Content Security Policy for HTML pages
  // ---------------------------------------------------------------------------
  if (uri.match(/\.html$/) || (!uri.includes('.') && !uri.startsWith('/api/'))) {
    // Note: This is a relatively permissive CSP for a festival app
    // Adjust based on your specific needs
    var csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.festival.app wss://*.festival.app https://api.stripe.com https://www.google-analytics.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://player.vimeo.com",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    headers['content-security-policy'] = { value: csp };
  }

  // ---------------------------------------------------------------------------
  // 6. Add CORS headers for assets
  // ---------------------------------------------------------------------------
  if (uri.match(/\.(woff|woff2|ttf|eot|otf|css|js)$/i)) {
    var origin = request.headers.origin ? request.headers.origin.value : '';

    // Allow specific origins for CORS
    if (origin.match(/https:\/\/(.*\.)?festival\.app$/)) {
      headers['access-control-allow-origin'] = { value: origin };
    } else {
      // For fonts, we need to allow all origins for web font usage
      if (uri.match(/\.(woff|woff2|ttf|eot|otf)$/i)) {
        headers['access-control-allow-origin'] = { value: '*' };
      }
    }

    headers['access-control-allow-methods'] = { value: 'GET, HEAD, OPTIONS' };
    headers['access-control-max-age'] = { value: '86400' };
    headers['timing-allow-origin'] = { value: '*' };
  }

  // ---------------------------------------------------------------------------
  // 7. Add performance headers
  // ---------------------------------------------------------------------------

  // Server-Timing for debugging
  headers['server-timing'] = {
    value: 'cdn;desc="CloudFront Edge"'
  };

  // Add X-Cache indicator
  if (!headers['x-cache']) {
    headers['x-cache'] = { value: 'Miss from CloudFront Function' };
  }

  // ---------------------------------------------------------------------------
  // 8. Remove unnecessary headers
  // ---------------------------------------------------------------------------
  delete headers['server'];
  delete headers['x-powered-by'];
  delete headers['x-amz-id-2'];
  delete headers['x-amz-request-id'];

  // ---------------------------------------------------------------------------
  // 9. Add custom Festival header
  // ---------------------------------------------------------------------------
  headers['x-festival-cdn'] = { value: 'v1.0' };

  return response;
}
