// =============================================================================
// CloudFront Function: Image Optimization Router
// Festival Management Platform
// =============================================================================
// This function handles image optimization requests:
// - Detects device type for responsive images
// - Routes to appropriate image size
// - Handles WebP/AVIF format negotiation
// - Manages image quality settings
// =============================================================================

function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var uri = request.uri;

  // ---------------------------------------------------------------------------
  // 1. Check if this is an image request
  // ---------------------------------------------------------------------------
  var imageExtensions = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
  if (!imageExtensions.test(uri)) {
    return request;
  }

  // Skip if already optimized path
  if (uri.includes('/_optimized/') || uri.includes('/_next/image')) {
    return request;
  }

  // ---------------------------------------------------------------------------
  // 2. Parse query parameters
  // ---------------------------------------------------------------------------
  var queryString = request.querystring;
  var params = {};

  // Parse width parameter
  if (queryString.w && queryString.w.value) {
    params.width = parseInt(queryString.w.value, 10);
  }

  // Parse quality parameter
  if (queryString.q && queryString.q.value) {
    params.quality = parseInt(queryString.q.value, 10);
  }

  // Parse format parameter
  if (queryString.format && queryString.format.value) {
    params.format = queryString.format.value;
  }

  // ---------------------------------------------------------------------------
  // 3. Detect device type from User-Agent
  // ---------------------------------------------------------------------------
  var userAgent = headers['user-agent'] ? headers['user-agent'].value.toLowerCase() : '';
  var deviceType = 'desktop';

  if (userAgent.includes('mobile') || userAgent.includes('android')) {
    deviceType = 'mobile';
  } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
    deviceType = 'tablet';
  }

  // ---------------------------------------------------------------------------
  // 4. Determine optimal image size
  // ---------------------------------------------------------------------------
  var allowedWidths = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  var targetWidth = params.width || null;

  // If no width specified, use device-appropriate default
  if (!targetWidth) {
    switch (deviceType) {
      case 'mobile':
        targetWidth = 750;
        break;
      case 'tablet':
        targetWidth = 1080;
        break;
      default:
        targetWidth = 1920;
    }
  }

  // Snap to nearest allowed width
  var closestWidth = allowedWidths[0];
  for (var i = 0; i < allowedWidths.length; i++) {
    if (allowedWidths[i] >= targetWidth) {
      closestWidth = allowedWidths[i];
      break;
    }
    if (i === allowedWidths.length - 1) {
      closestWidth = allowedWidths[i];
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Determine optimal format based on Accept header
  // ---------------------------------------------------------------------------
  var accept = headers['accept'] ? headers['accept'].value : '';
  var targetFormat = params.format || null;

  if (!targetFormat) {
    // Prefer AVIF > WebP > Original format
    if (accept.includes('image/avif')) {
      targetFormat = 'avif';
    } else if (accept.includes('image/webp')) {
      targetFormat = 'webp';
    } else {
      // Keep original format
      var originalExt = uri.match(/\.([a-z]+)$/i);
      targetFormat = originalExt ? originalExt[1].toLowerCase() : 'jpg';
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Determine quality
  // ---------------------------------------------------------------------------
  var quality = params.quality || 80;

  // Adjust quality based on format
  if (targetFormat === 'avif') {
    quality = Math.min(quality, 75); // AVIF is more efficient
  } else if (targetFormat === 'webp') {
    quality = Math.min(quality, 80);
  }

  // ---------------------------------------------------------------------------
  // 7. Build optimized image URL
  // ---------------------------------------------------------------------------
  // Route to Next.js image optimization API
  var originalUrl = encodeURIComponent('https://cdn.festival.app' + uri);

  var optimizedUri = '/_next/image?url=' + originalUrl +
    '&w=' + closestWidth +
    '&q=' + quality;

  request.uri = optimizedUri;

  // ---------------------------------------------------------------------------
  // 8. Add optimization hints as headers
  // ---------------------------------------------------------------------------
  request.headers['x-image-width'] = { value: closestWidth.toString() };
  request.headers['x-image-quality'] = { value: quality.toString() };
  request.headers['x-image-format'] = { value: targetFormat };
  request.headers['x-device-type'] = { value: deviceType };

  return request;
}
