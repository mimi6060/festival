# =============================================================================
# CloudFront Distribution Configuration
# Festival Management Platform
# =============================================================================
# Main CloudFront distribution with multiple origins:
# - S3 for static assets (immutable, long cache)
# - S3 for user uploads (signed URLs)
# - S3 for media content (streaming)
# - API Gateway for dynamic content
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control (OAC) - Modern replacement for OAI
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${var.project_name}-assets-oac-${var.environment}"
  description                       = "OAC for static assets bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "uploads" {
  name                              = "${var.project_name}-uploads-oac-${var.environment}"
  description                       = "OAC for user uploads bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project_name}-media-oac-${var.environment}"
  description                       = "OAC for media content bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CloudFront Key Group for Signed URLs
# -----------------------------------------------------------------------------

resource "aws_cloudfront_public_key" "signed_urls" {
  count = var.signed_url_private_key != "" ? 1 : 0

  comment     = "Public key for signed URLs - ${var.environment}"
  encoded_key = var.signed_url_private_key
  name        = "${var.project_name}-signed-urls-key-${var.environment}"
}

resource "aws_cloudfront_key_group" "signed_urls" {
  count = var.signed_url_private_key != "" ? 1 : 0

  comment = "Key group for signed URLs - ${var.environment}"
  items   = [aws_cloudfront_public_key.signed_urls[0].id]
  name    = "${var.project_name}-signed-urls-${var.environment}"
}

# -----------------------------------------------------------------------------
# Main CloudFront Distribution
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = var.enable_ipv6
  comment             = "Festival CDN - ${var.environment}"
  default_root_object = var.default_root_object
  price_class         = var.price_class
  http_version        = var.enable_http3 ? "http3" : "http2"

  # WAF Integration
  web_acl_id = var.enable_waf && var.waf_web_acl_arn != "" ? var.waf_web_acl_arn : null

  # Domain aliases
  aliases = [var.cdn_domain]

  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn            = data.aws_acm_certificate.cdn.arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = var.minimum_protocol_version
    cloudfront_default_certificate = false
  }

  # Geo restrictions (optimized for European festivals)
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.geo_restriction_locations
    }
  }

  # Access logging
  dynamic "logging_config" {
    for_each = var.enable_logging ? [1] : []
    content {
      include_cookies = false
      bucket          = aws_s3_bucket.logs.bucket_domain_name
      prefix          = "cloudfront/"
    }
  }

  # ---------------------------------------------------------------------------
  # Origin: Static Assets (S3)
  # ---------------------------------------------------------------------------
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
    origin_id                = local.s3_origin_id_assets

    dynamic "origin_shield" {
      for_each = var.enable_origin_shield ? [1] : []
      content {
        enabled              = true
        origin_shield_region = var.origin_shield_region
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Origin: User Uploads (S3)
  # ---------------------------------------------------------------------------
  origin {
    domain_name              = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.uploads.id
    origin_id                = local.s3_origin_id_uploads

    dynamic "origin_shield" {
      for_each = var.enable_origin_shield ? [1] : []
      content {
        enabled              = true
        origin_shield_region = var.origin_shield_region
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Origin: Media Content (S3)
  # ---------------------------------------------------------------------------
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
    origin_id                = local.s3_origin_id_media

    dynamic "origin_shield" {
      for_each = var.enable_origin_shield ? [1] : []
      content {
        enabled              = true
        origin_shield_region = var.origin_shield_region
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Origin: API Backend
  # ---------------------------------------------------------------------------
  origin {
    domain_name = var.api_domain
    origin_id   = local.api_origin_id

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify.result
    }
  }

  # ---------------------------------------------------------------------------
  # Default Cache Behavior (Static Assets)
  # ---------------------------------------------------------------------------
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id_assets
    compress         = var.enable_compression

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    viewer_protocol_policy = "redirect-to-https"

    # CloudFront Functions
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: User Uploads (/uploads/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/uploads/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id_uploads
    compress         = var.enable_compression

    cache_policy_id            = aws_cloudfront_cache_policy.user_content.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    viewer_protocol_policy = "redirect-to-https"

    # Require signed URLs for private content
    dynamic "trusted_key_groups" {
      for_each = var.signed_url_private_key != "" ? [1] : []
      content {
        enabled = true
        items   = [aws_cloudfront_key_group.signed_urls[0].id]
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: Media Content (/media/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/media/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id_media
    compress         = false # Don't compress already-compressed media

    cache_policy_id            = aws_cloudfront_cache_policy.media_content.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.media_headers.id

    viewer_protocol_policy = "redirect-to-https"

    # Signed URLs for premium content
    dynamic "trusted_key_groups" {
      for_each = var.signed_url_private_key != "" ? [1] : []
      content {
        enabled = true
        items   = [aws_cloudfront_key_group.signed_urls[0].id]
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: API Responses (/api/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.api_origin_id
    compress         = var.enable_compression

    cache_policy_id            = aws_cloudfront_cache_policy.api_responses.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.api_headers.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: Images with Optimization (/_next/image/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/_next/image/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.api_origin_id
    compress         = var.enable_compression

    cache_policy_id            = aws_cloudfront_cache_policy.optimized_images.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.image_optimization.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: Static Files from Next.js (/_next/static/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id_assets
    compress         = var.enable_compression

    cache_policy_id            = aws_cloudfront_cache_policy.immutable_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.immutable_headers.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # ---------------------------------------------------------------------------
  # Cache Behavior: Fonts (/fonts/*)
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/fonts/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id_assets
    compress         = true

    cache_policy_id            = aws_cloudfront_cache_policy.immutable_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.font_headers.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # ---------------------------------------------------------------------------
  # Custom Error Responses
  # ---------------------------------------------------------------------------
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 500
    response_code         = 500
    response_page_path    = "/500.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 502
    response_code         = 502
    response_page_path    = "/500.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 503
    response_code         = 503
    response_page_path    = "/500.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 504
    response_code         = 504
    response_page_path    = "/500.html"
    error_caching_min_ttl = 10
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-cdn-${var.environment}"
  })

  depends_on = [
    aws_s3_bucket.assets,
    aws_s3_bucket.uploads,
    aws_s3_bucket.media,
    aws_s3_bucket.logs
  ]
}

# -----------------------------------------------------------------------------
# Origin Verification Secret
# -----------------------------------------------------------------------------

resource "random_password" "origin_verify" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "origin_verify" {
  name        = "/${var.project_name}/${var.environment}/cdn/origin-verify-secret"
  description = "Secret for verifying CloudFront origin requests"
  type        = "SecureString"
  value       = random_password.origin_verify.result

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Route53 DNS Record for CDN
# -----------------------------------------------------------------------------

resource "aws_route53_record" "cdn" {
  count = var.create_dns_records ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.cdn_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn_ipv6" {
  count = var.create_dns_records && var.enable_ipv6 ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.cdn_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# CloudFront Distribution Outputs
# -----------------------------------------------------------------------------

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cdn_url" {
  description = "CDN URL"
  value       = "https://${var.cdn_domain}"
}
