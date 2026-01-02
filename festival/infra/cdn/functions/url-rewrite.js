// =============================================================================
// CloudFront Function: URL Rewrite
// Festival Management Platform
// =============================================================================
// This function handles URL rewriting at the edge for:
// - Clean URLs (removing .html extension)
// - Trailing slash normalization
// - Locale detection and redirect
// - Index file handling
// =============================================================================

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var headers = request.headers;

  // ---------------------------------------------------------------------------
  // 1. Redirect www to non-www
  // ---------------------------------------------------------------------------
  var host = headers.host ? headers.host.value : '';
  if (host.startsWith('www.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: 'https://' + host.substring(4) + uri }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Remove trailing slash (except root)
  // ---------------------------------------------------------------------------
  if (uri.length > 1 && uri.endsWith('/')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: uri.slice(0, -1) }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Handle static file extensions - pass through
  // ---------------------------------------------------------------------------
  var staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.json', '.xml', '.txt', '.pdf',
    '.mp3', '.mp4', '.webm', '.ogg', '.m4a',
    '.webp', '.avif',
    '.map', '.br', '.gz'
  ];

  for (var i = 0; i < staticExtensions.length; i++) {
    if (uri.endsWith(staticExtensions[i])) {
      return request;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Handle Next.js paths - pass through
  // ---------------------------------------------------------------------------
  if (uri.startsWith('/_next/') || uri.startsWith('/api/')) {
    return request;
  }

  // ---------------------------------------------------------------------------
  // 5. Handle special paths - pass through
  // ---------------------------------------------------------------------------
  var specialPaths = ['/uploads/', '/media/', '/fonts/', '/images/'];
  for (var j = 0; j < specialPaths.length; j++) {
    if (uri.startsWith(specialPaths[j])) {
      return request;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Locale detection for root path
  // ---------------------------------------------------------------------------
  if (uri === '/' || uri === '') {
    var acceptLanguage = headers['accept-language'] ? headers['accept-language'].value : '';
    var preferredLocale = 'fr'; // Default to French for French festivals

    // Simple locale detection
    if (acceptLanguage.indexOf('en') === 0) {
      preferredLocale = 'en';
    } else if (acceptLanguage.indexOf('de') === 0) {
      preferredLocale = 'de';
    } else if (acceptLanguage.indexOf('es') === 0) {
      preferredLocale = 'es';
    }

    // Check if locale cookie exists
    var cookies = headers.cookie ? headers.cookie.value : '';
    var localeMatch = cookies.match(/festival_locale=([a-z]{2})/);
    if (localeMatch) {
      preferredLocale = localeMatch[1];
    }

    // Don't redirect, just pass locale info
    request.headers['x-preferred-locale'] = { value: preferredLocale };
    return request;
  }

  // ---------------------------------------------------------------------------
  // 7. Handle clean URLs - add .html if needed
  // ---------------------------------------------------------------------------
  // Check if URI points to a directory (for Next.js static export)
  if (!uri.includes('.')) {
    // For Next.js, try to serve index.html for directory paths
    // or add .html extension for page paths

    // Check for common page patterns
    var segments = uri.split('/').filter(function(s) { return s !== ''; });

    if (segments.length > 0) {
      var lastSegment = segments[segments.length - 1];

      // If last segment looks like a slug, it's likely a page
      if (lastSegment.match(/^[a-z0-9-]+$/i)) {
        // Try .html extension first
        request.uri = uri + '.html';
      }
    }
  }

  return request;
}
