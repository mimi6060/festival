# =============================================================================
# CloudFront Cache Policies & Behaviors
# Festival Management Platform
# =============================================================================
# Cache policies optimized for different content types:
# - Static assets: 1 year (immutable)
# - API responses: 5 minutes
# - User content: 24 hours with signed URLs
# - Media: 7 days with range requests
# =============================================================================

# -----------------------------------------------------------------------------
# Cache Policy: Static Assets (Long Cache)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets-${var.environment}"
  comment     = "Cache policy for static assets (CSS, JS, images)"
  default_ttl = var.static_assets_ttl
  max_ttl     = var.static_assets_ttl
  min_ttl     = 3600 # Minimum 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Accept-Encoding"]
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v", "version", "hash"] # Cache busting parameters
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Cache Policy: Immutable Assets (Next.js _next/static)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "immutable_assets" {
  name        = "${var.project_name}-immutable-${var.environment}"
  comment     = "Cache policy for immutable assets (Next.js builds)"
  default_ttl = 31536000 # 1 year
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Cache Policy: API Responses
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "api_responses" {
  name        = "${var.project_name}-api-${var.environment}"
  comment     = "Cache policy for API responses"
  default_ttl = var.api_cache_ttl
  max_ttl     = 3600  # Max 1 hour
  min_ttl     = 0     # Allow no-cache

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "whitelist"
      cookies {
        items = ["festival_session", "festival_locale"]
      }
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "Authorization",
          "Accept",
          "Accept-Language",
          "X-Festival-Id",
          "X-Request-Id"
        ]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Cache Policy: User Content (Short Cache)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "user_content" {
  name        = "${var.project_name}-user-content-${var.environment}"
  comment     = "Cache policy for user-generated content"
  default_ttl = var.user_content_ttl
  max_ttl     = 604800  # Max 7 days
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Accept-Encoding"]
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["Expires", "Signature", "Key-Pair-Id", "w", "q", "format"]
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Cache Policy: Media Content (Streaming)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "media_content" {
  name        = "${var.project_name}-media-${var.environment}"
  comment     = "Cache policy for media content (audio/video)"
  default_ttl = var.media_content_ttl
  max_ttl     = 2592000  # Max 30 days
  min_ttl     = 3600     # Min 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Range", "Accept-Encoding"]
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["Expires", "Signature", "Key-Pair-Id", "quality", "format"]
      }
    }

    enable_accept_encoding_brotli = false # Don't compress already compressed media
    enable_accept_encoding_gzip   = false
  }
}

# -----------------------------------------------------------------------------
# Cache Policy: Optimized Images
# -----------------------------------------------------------------------------

resource "aws_cloudfront_cache_policy" "optimized_images" {
  name        = "${var.project_name}-images-${var.environment}"
  comment     = "Cache policy for optimized images (WebP, AVIF)"
  default_ttl = 604800   # 7 days
  max_ttl     = 2592000  # 30 days
  min_ttl     = 3600     # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept", "Accept-Encoding"]
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["url", "w", "q", "format"]
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Origin Request Policy: CORS
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_request_policy" "cors" {
  name    = "${var.project_name}-cors-${var.environment}"
  comment = "Origin request policy with CORS headers"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

# -----------------------------------------------------------------------------
# Origin Request Policy: API
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.project_name}-api-origin-${var.environment}"
  comment = "Origin request policy for API requests"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Type",
        "Host",
        "Origin",
        "Referer",
        "User-Agent",
        "X-Festival-Id",
        "X-Request-Id",
        "X-Forwarded-For",
        "X-Real-IP"
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# -----------------------------------------------------------------------------
# Origin Request Policy: Image Optimization
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_request_policy" "image_optimization" {
  name    = "${var.project_name}-image-opt-${var.environment}"
  comment = "Origin request policy for image optimization"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Encoding"
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policy: Security Headers
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-security-${var.environment}"
  comment = "Security headers for all responses"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.${var.domain_name} https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
      override                = true
    }
  }

  cors_config {
    access_control_allow_credentials = false
    access_control_max_age_sec       = 86400

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["https://${var.domain_name}", "https://*.${var.domain_name}"]
    }

    access_control_expose_headers {
      items = ["ETag", "Content-Length", "Content-Type"]
    }

    origin_override = true
  }

  custom_headers_config {
    items {
      header   = "X-Powered-By"
      override = true
      value    = "Festival CDN"
    }

    items {
      header   = "X-Content-Type-Options"
      override = true
      value    = "nosniff"
    }
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policy: Immutable Assets
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "immutable_headers" {
  name    = "${var.project_name}-immutable-${var.environment}"
  comment = "Headers for immutable assets"

  security_headers_config {
    content_type_options {
      override = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
  }

  custom_headers_config {
    items {
      header   = "Cache-Control"
      override = true
      value    = "public, max-age=31536000, immutable"
    }
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policy: Font Headers
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "font_headers" {
  name    = "${var.project_name}-fonts-${var.environment}"
  comment = "Headers for font files"

  cors_config {
    access_control_allow_credentials = false
    access_control_max_age_sec       = 86400

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["*"] # Fonts need broad CORS for web fonts
    }

    access_control_expose_headers {
      items = ["ETag", "Content-Length"]
    }

    origin_override = true
  }

  custom_headers_config {
    items {
      header   = "Cache-Control"
      override = true
      value    = "public, max-age=31536000, immutable"
    }
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policy: Media Headers
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "media_headers" {
  name    = "${var.project_name}-media-${var.environment}"
  comment = "Headers for media content"

  cors_config {
    access_control_allow_credentials = false
    access_control_max_age_sec       = 86400

    access_control_allow_headers {
      items = ["Range", "Accept-Ranges", "Content-Range"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["https://${var.domain_name}", "https://*.${var.domain_name}"]
    }

    access_control_expose_headers {
      items = ["Accept-Ranges", "Content-Range", "Content-Length", "Content-Type"]
    }

    origin_override = true
  }

  custom_headers_config {
    items {
      header   = "Accept-Ranges"
      override = true
      value    = "bytes"
    }
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policy: API Headers
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "api_headers" {
  name    = "${var.project_name}-api-headers-${var.environment}"
  comment = "Headers for API responses"

  cors_config {
    access_control_allow_credentials = true
    access_control_max_age_sec       = 3600

    access_control_allow_headers {
      items = [
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Type",
        "X-Festival-Id",
        "X-Request-Id"
      ]
    }

    access_control_allow_methods {
      items = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    }

    access_control_allow_origins {
      items = ["https://${var.domain_name}", "https://*.${var.domain_name}"]
    }

    access_control_expose_headers {
      items = [
        "X-Request-Id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset"
      ]
    }

    origin_override = false
  }

  security_headers_config {
    content_type_options {
      override = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Content-Type-Options"
      override = true
      value    = "nosniff"
    }

    items {
      header   = "Cache-Control"
      override = false
      value    = "no-cache, no-store, must-revalidate"
    }
  }
}

# -----------------------------------------------------------------------------
# Cache Policy Outputs
# -----------------------------------------------------------------------------

output "cache_policy_static_assets_id" {
  description = "ID of the static assets cache policy"
  value       = aws_cloudfront_cache_policy.static_assets.id
}

output "cache_policy_api_id" {
  description = "ID of the API cache policy"
  value       = aws_cloudfront_cache_policy.api_responses.id
}

output "cache_policy_media_id" {
  description = "ID of the media cache policy"
  value       = aws_cloudfront_cache_policy.media_content.id
}
