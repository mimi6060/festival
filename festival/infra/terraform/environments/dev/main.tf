# ============================================================================
# Festival Platform - Development Environment
# ============================================================================
# Cost-optimized development environment for testing and development.
# Uses smaller instance types and single-AZ configurations.
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment = "dev"
  name_prefix = "festival-${local.environment}"

  common_tags = {
    Project     = "festival"
    Environment = local.environment
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = "development"
  }
}

# ============================================================================
# Root Module
# ============================================================================

module "festival" {
  source = "../../"

  # Project settings
  project_name = "festival"
  environment  = local.environment
  cost_center  = "development"

  # AWS settings
  aws_region = var.aws_region
  az_count   = 2

  # Networking
  vpc_cidr                 = "10.0.0.0/16"
  enable_nat_gateway       = true
  enable_vpn_gateway       = false
  enable_vpc_flow_logs     = true
  flow_logs_retention_days = 7

  # Database - minimal for dev
  database_name     = "festival_dev"
  database_username = var.database_username

  # Redis
  redis_version = "7.0"

  # Container images
  api_image   = var.api_image
  web_image   = var.web_image
  admin_image = var.admin_image

  # Features
  use_eks    = false
  enable_cdn = false
  enable_waf = false

  # DNS (optional for dev)
  domain_name = var.domain_name

  # Secrets
  stripe_secret_key     = var.stripe_secret_key
  stripe_webhook_secret = var.stripe_webhook_secret

  # Monitoring
  alert_email                = var.alert_email
  enable_detailed_monitoring = false
}

# ============================================================================
# Additional Development Resources
# ============================================================================

# S3 bucket for dev test data
resource "aws_s3_bucket" "dev_data" {
  bucket = "${local.name_prefix}-test-data"

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-test-data"
    Purpose = "Test data and fixtures"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "dev_data" {
  bucket = aws_s3_bucket.dev_data.id

  rule {
    id     = "expire-old-data"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# Cost anomaly detection for dev (notify if spending unexpectedly)
resource "aws_ce_anomaly_monitor" "dev" {
  name              = "${local.name_prefix}-cost-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = local.common_tags
}
