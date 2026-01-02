# =============================================================================
# CDN Infrastructure - Outputs
# Festival Management Platform
# =============================================================================
# Comprehensive outputs for CDN infrastructure including CloudFront,
# S3 buckets, cache policies, and monitoring endpoints
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Distribution Outputs
# -----------------------------------------------------------------------------

output "cloudfront_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "The domain name corresponding to the distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID for alias records"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_status" {
  description = "The current status of the distribution"
  value       = aws_cloudfront_distribution.main.status
}

output "cloudfront_etag" {
  description = "The current version of the distribution's information"
  value       = aws_cloudfront_distribution.main.etag
}

output "cdn_url" {
  description = "The custom domain URL for the CDN"
  value       = "https://${var.cdn_domain}"
}

output "cdn_domain" {
  description = "The custom domain for the CDN"
  value       = var.cdn_domain
}

# -----------------------------------------------------------------------------
# S3 Bucket Outputs
# -----------------------------------------------------------------------------

output "assets_bucket_id" {
  description = "The name of the static assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "The ARN of the static assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "assets_bucket_domain_name" {
  description = "The bucket domain name for static assets"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}

output "uploads_bucket_id" {
  description = "The name of the user uploads S3 bucket"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "The ARN of the user uploads S3 bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_domain_name" {
  description = "The bucket domain name for user uploads"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

output "media_bucket_id" {
  description = "The name of the media content S3 bucket"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "The ARN of the media content S3 bucket"
  value       = aws_s3_bucket.media.arn
}

output "media_bucket_domain_name" {
  description = "The bucket domain name for media content"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

output "logs_bucket_id" {
  description = "The name of the CDN logs S3 bucket"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "The ARN of the CDN logs S3 bucket"
  value       = aws_s3_bucket.logs.arn
}

# -----------------------------------------------------------------------------
# Cache Policy Outputs
# -----------------------------------------------------------------------------

output "cache_policy_static_assets_id" {
  description = "ID of the cache policy for static assets"
  value       = aws_cloudfront_cache_policy.static_assets.id
}

output "cache_policy_user_content_id" {
  description = "ID of the cache policy for user content"
  value       = aws_cloudfront_cache_policy.user_content.id
}

output "cache_policy_media_content_id" {
  description = "ID of the cache policy for media content"
  value       = aws_cloudfront_cache_policy.media_content.id
}

output "cache_policy_api_responses_id" {
  description = "ID of the cache policy for API responses"
  value       = aws_cloudfront_cache_policy.api_responses.id
}

output "cache_policy_immutable_assets_id" {
  description = "ID of the cache policy for immutable assets"
  value       = aws_cloudfront_cache_policy.immutable_assets.id
}

# -----------------------------------------------------------------------------
# Origin Request Policy Outputs
# -----------------------------------------------------------------------------

output "origin_request_policy_cors_id" {
  description = "ID of the CORS origin request policy"
  value       = aws_cloudfront_origin_request_policy.cors.id
}

output "origin_request_policy_api_id" {
  description = "ID of the API origin request policy"
  value       = aws_cloudfront_origin_request_policy.api.id
}

# -----------------------------------------------------------------------------
# Response Headers Policy Outputs
# -----------------------------------------------------------------------------

output "response_headers_policy_security_id" {
  description = "ID of the security response headers policy"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}

output "response_headers_policy_api_id" {
  description = "ID of the API response headers policy"
  value       = aws_cloudfront_response_headers_policy.api_headers.id
}

# -----------------------------------------------------------------------------
# CloudFront Function Outputs
# -----------------------------------------------------------------------------

output "cloudfront_function_url_rewrite_arn" {
  description = "ARN of the URL rewrite CloudFront function"
  value       = aws_cloudfront_function.url_rewrite.arn
}

output "cloudfront_function_security_headers_arn" {
  description = "ARN of the security headers CloudFront function"
  value       = aws_cloudfront_function.security_headers.arn
}

# -----------------------------------------------------------------------------
# Origin Access Control Outputs
# -----------------------------------------------------------------------------

output "oac_assets_id" {
  description = "ID of the Origin Access Control for assets bucket"
  value       = aws_cloudfront_origin_access_control.assets.id
}

output "oac_uploads_id" {
  description = "ID of the Origin Access Control for uploads bucket"
  value       = aws_cloudfront_origin_access_control.uploads.id
}

output "oac_media_id" {
  description = "ID of the Origin Access Control for media bucket"
  value       = aws_cloudfront_origin_access_control.media.id
}

# -----------------------------------------------------------------------------
# Route53 DNS Outputs
# -----------------------------------------------------------------------------

output "route53_record_name" {
  description = "The Route53 record name for the CDN"
  value       = var.create_dns_records ? aws_route53_record.cdn[0].name : null
}

output "route53_record_fqdn" {
  description = "The fully qualified domain name of the Route53 record"
  value       = var.create_dns_records ? aws_route53_record.cdn[0].fqdn : null
}

# -----------------------------------------------------------------------------
# CDN URLs for Different Content Types
# -----------------------------------------------------------------------------

output "cdn_urls" {
  description = "CDN URLs for different content types"
  value = {
    base       = "https://${var.cdn_domain}"
    assets     = "https://${var.cdn_domain}/assets"
    uploads    = "https://${var.cdn_domain}/uploads"
    media      = "https://${var.cdn_domain}/media"
    fonts      = "https://${var.cdn_domain}/fonts"
    api        = "https://${var.cdn_domain}/api"
    next_image = "https://${var.cdn_domain}/_next/image"
  }
}

# -----------------------------------------------------------------------------
# Integration Information
# -----------------------------------------------------------------------------

output "integration_info" {
  description = "Information needed for application integration"
  value = {
    cdn_domain              = var.cdn_domain
    cloudfront_distribution = aws_cloudfront_distribution.main.id
    assets_bucket           = aws_s3_bucket.assets.id
    uploads_bucket          = aws_s3_bucket.uploads.id
    media_bucket            = aws_s3_bucket.media.id
    origin_verify_header    = "X-Origin-Verify"
  }
}

# -----------------------------------------------------------------------------
# Monitoring Endpoints
# -----------------------------------------------------------------------------

output "monitoring_endpoints" {
  description = "CloudWatch monitoring endpoints and metrics namespaces"
  value = {
    cloudwatch_namespace     = "AWS/CloudFront"
    distribution_id          = aws_cloudfront_distribution.main.id
    logs_bucket              = aws_s3_bucket.logs.id
    logs_prefix              = "cloudfront/"
    realtime_metrics_enabled = true
  }
}
