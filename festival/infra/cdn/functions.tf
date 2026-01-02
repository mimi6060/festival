# =============================================================================
# CloudFront Functions Configuration
# Festival Management Platform
# =============================================================================
# Edge functions for:
# - URL rewriting and redirects
# - Security headers injection
# - Image optimization routing
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Function: URL Rewrite
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project_name}-url-rewrite-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "URL rewriting, trailing slash removal, locale detection"
  publish = true

  code = file("${path.module}/functions/url-rewrite.js")
}

# -----------------------------------------------------------------------------
# CloudFront Function: Security Headers
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.project_name}-security-headers-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "Security headers, cache control, CORS"
  publish = true

  code = file("${path.module}/functions/security-headers.js")
}

# -----------------------------------------------------------------------------
# CloudFront Function: Image Optimization Router
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "image_optimization" {
  name    = "${var.project_name}-image-opt-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "Image optimization routing based on device and format support"
  publish = true

  code = file("${path.module}/functions/image-optimization.js")
}

# -----------------------------------------------------------------------------
# Function Outputs
# -----------------------------------------------------------------------------

output "url_rewrite_function_arn" {
  description = "ARN of the URL rewrite function"
  value       = aws_cloudfront_function.url_rewrite.arn
}

output "security_headers_function_arn" {
  description = "ARN of the security headers function"
  value       = aws_cloudfront_function.security_headers.arn
}

output "image_optimization_function_arn" {
  description = "ARN of the image optimization function"
  value       = aws_cloudfront_function.image_optimization.arn
}
