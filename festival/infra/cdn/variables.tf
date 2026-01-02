# =============================================================================
# CDN Infrastructure - Variables
# Festival Management Platform
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "festival"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region for resources (eu-west-3 = Paris for French festivals)"
  type        = string
  default     = "eu-west-3"
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = "Main domain name (e.g., festival.app)"
  type        = string
}

variable "cdn_domain" {
  description = "CDN subdomain (e.g., cdn.festival.app)"
  type        = string
}

variable "api_domain" {
  description = "API domain for origin (e.g., api.festival.app)"
  type        = string
}

variable "create_dns_records" {
  description = "Whether to create Route53 DNS records"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------

variable "price_class" {
  description = "CloudFront price class (optimized for Europe)"
  type        = string
  default     = "PriceClass_100" # Europe & North America only - cost optimized

  validation {
    condition = contains([
      "PriceClass_100", # US, Canada, Europe
      "PriceClass_200", # US, Canada, Europe, Asia, Middle East, Africa
      "PriceClass_All"  # All edge locations
    ], var.price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "enable_http3" {
  description = "Enable HTTP/3 (QUIC) support"
  type        = bool
  default     = true
}

variable "enable_compression" {
  description = "Enable automatic compression (Brotli + Gzip)"
  type        = bool
  default     = true
}

variable "enable_ipv6" {
  description = "Enable IPv6 support"
  type        = bool
  default     = true
}

variable "minimum_protocol_version" {
  description = "Minimum TLS protocol version"
  type        = string
  default     = "TLSv1.2_2021"
}

variable "default_root_object" {
  description = "Default root object for the distribution"
  type        = string
  default     = "index.html"
}

# -----------------------------------------------------------------------------
# Cache Configuration
# -----------------------------------------------------------------------------

variable "static_assets_ttl" {
  description = "TTL for static assets in seconds (default: 1 year)"
  type        = number
  default     = 31536000
}

variable "api_cache_ttl" {
  description = "TTL for API responses in seconds (default: 5 minutes)"
  type        = number
  default     = 300
}

variable "user_content_ttl" {
  description = "TTL for user-generated content in seconds (default: 24 hours)"
  type        = number
  default     = 86400
}

variable "media_content_ttl" {
  description = "TTL for media content in seconds (default: 7 days)"
  type        = number
  default     = 604800
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------

variable "enable_waf" {
  description = "Enable AWS WAF integration"
  type        = bool
  default     = true
}

variable "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL to associate (if enable_waf is true)"
  type        = string
  default     = ""
}

variable "geo_restriction_type" {
  description = "Type of geo restriction (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "signed_url_key_pair_id" {
  description = "CloudFront key pair ID for signed URLs"
  type        = string
  default     = ""
  sensitive   = true
}

variable "signed_url_private_key" {
  description = "Private key for signing URLs (PEM format)"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# S3 Configuration
# -----------------------------------------------------------------------------

variable "enable_versioning" {
  description = "Enable versioning on S3 buckets"
  type        = bool
  default     = true
}

variable "enable_replication" {
  description = "Enable cross-region replication for S3 buckets"
  type        = bool
  default     = false
}

variable "replication_region" {
  description = "Target region for S3 replication"
  type        = string
  default     = "eu-west-1"
}

variable "lifecycle_rules" {
  description = "S3 lifecycle rules configuration"
  type = object({
    uploads_expiration_days      = number
    logs_expiration_days         = number
    incomplete_upload_days       = number
    transition_to_ia_days        = number
    transition_to_glacier_days   = number
  })
  default = {
    uploads_expiration_days      = 365   # Delete uploads after 1 year
    logs_expiration_days         = 90    # Delete logs after 90 days
    incomplete_upload_days       = 7     # Abort incomplete uploads after 7 days
    transition_to_ia_days        = 30    # Move to IA after 30 days
    transition_to_glacier_days   = 90    # Move to Glacier after 90 days
  }
}

# -----------------------------------------------------------------------------
# Logging & Monitoring
# -----------------------------------------------------------------------------

variable "enable_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = true
}

variable "enable_realtime_logs" {
  description = "Enable CloudFront real-time logs (additional cost)"
  type        = bool
  default     = false
}

variable "realtime_logs_sampling_rate" {
  description = "Sampling rate for real-time logs (1-100)"
  type        = number
  default     = 10

  validation {
    condition     = var.realtime_logs_sampling_rate >= 1 && var.realtime_logs_sampling_rate <= 100
    error_message = "Sampling rate must be between 1 and 100."
  }
}

variable "alarm_cache_hit_rate_threshold" {
  description = "Minimum cache hit rate percentage for CloudWatch alarm"
  type        = number
  default     = 80
}

variable "alarm_error_rate_threshold" {
  description = "Maximum error rate percentage for CloudWatch alarm"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# Cost Optimization
# -----------------------------------------------------------------------------

variable "enable_origin_shield" {
  description = "Enable CloudFront Origin Shield (reduces origin load)"
  type        = bool
  default     = true
}

variable "origin_shield_region" {
  description = "Region for Origin Shield (closest to origin)"
  type        = string
  default     = "eu-west-3"
}

# -----------------------------------------------------------------------------
# Image Optimization
# -----------------------------------------------------------------------------

variable "enable_image_optimization" {
  description = "Enable automatic image optimization (WebP, AVIF)"
  type        = bool
  default     = true
}

variable "image_optimization_sizes" {
  description = "Allowed image sizes for optimization"
  type        = list(number)
  default     = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
}

variable "image_optimization_quality" {
  description = "Default image quality (1-100)"
  type        = number
  default     = 80
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
