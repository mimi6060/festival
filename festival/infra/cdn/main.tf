# =============================================================================
# CDN Infrastructure - Main Configuration
# Festival Management Platform
# =============================================================================
# This module configures AWS CloudFront CDN with S3 origins for:
# - Static assets (JS, CSS, images)
# - User uploads (avatars, documents)
# - Media content (audio/video streaming)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "cdn/terraform.tfstate"
    region         = "eu-west-3"
    encrypt        = true
    dynamodb_table = "festival-terraform-locks"
  }
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Festival"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "CDN"
    }
  }
}

# CloudFront requires ACM certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "Festival"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "CDN"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ACM Certificate for CloudFront (must be in us-east-1)
data "aws_acm_certificate" "cdn" {
  provider    = aws.us_east_1
  domain      = var.cdn_domain
  statuses    = ["ISSUED"]
  most_recent = true
}

# Route53 hosted zone for DNS
data "aws_route53_zone" "main" {
  count = var.create_dns_records ? 1 : 0
  name  = var.domain_name
}

# -----------------------------------------------------------------------------
# Random Suffix for Unique Bucket Names
# -----------------------------------------------------------------------------

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  account_id    = data.aws_caller_identity.current.account_id
  region        = data.aws_region.current.name
  bucket_suffix = random_id.bucket_suffix.hex

  # S3 bucket names
  assets_bucket_name  = "${var.project_name}-assets-${var.environment}-${local.bucket_suffix}"
  uploads_bucket_name = "${var.project_name}-uploads-${var.environment}-${local.bucket_suffix}"
  media_bucket_name   = "${var.project_name}-media-${var.environment}-${local.bucket_suffix}"
  logs_bucket_name    = "${var.project_name}-cdn-logs-${var.environment}-${local.bucket_suffix}"

  # CloudFront settings
  s3_origin_id_assets  = "S3-${local.assets_bucket_name}"
  s3_origin_id_uploads = "S3-${local.uploads_bucket_name}"
  s3_origin_id_media   = "S3-${local.media_bucket_name}"
  api_origin_id        = "API-${var.environment}"

  # Cache TTLs (in seconds)
  cache_ttl = {
    static_assets = 31536000  # 1 year
    api_responses = 300       # 5 minutes
    user_content  = 86400     # 24 hours
    media_content = 604800    # 7 days
    no_cache      = 0
  }

  # Common tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Outputs Summary
# -----------------------------------------------------------------------------

output "cdn_summary" {
  description = "CDN configuration summary"
  value = {
    cloudfront_distribution_id     = aws_cloudfront_distribution.main.id
    cloudfront_distribution_domain = aws_cloudfront_distribution.main.domain_name
    cloudfront_distribution_arn    = aws_cloudfront_distribution.main.arn
    cdn_url                        = "https://${var.cdn_domain}"
    assets_bucket                  = aws_s3_bucket.assets.id
    uploads_bucket                 = aws_s3_bucket.uploads.id
    media_bucket                   = aws_s3_bucket.media.id
  }
}
