# ============================================================================
# Festival Platform - Staging Environment
# ============================================================================
# Pre-production environment mirroring production configuration with
# reduced capacity for testing and validation.
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment = "staging"
  name_prefix = "festival-${local.environment}"

  common_tags = {
    Project     = "festival"
    Environment = local.environment
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = "staging"
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
  cost_center  = "staging"

  # AWS settings
  aws_region = var.aws_region
  az_count   = 2

  # Networking
  vpc_cidr                 = "10.1.0.0/16"
  enable_nat_gateway       = true
  enable_vpn_gateway       = false
  enable_vpc_flow_logs     = true
  flow_logs_retention_days = 14

  # Database - staging-sized
  database_name     = "festival_staging"
  database_username = var.database_username

  # Redis
  redis_version = "7.0"

  # Container images
  api_image   = var.api_image
  web_image   = var.web_image
  admin_image = var.admin_image

  # Features
  use_eks    = false
  enable_cdn = true
  enable_waf = true

  # DNS
  domain_name = var.domain_name

  # Secrets
  stripe_secret_key     = var.stripe_secret_key
  stripe_webhook_secret = var.stripe_webhook_secret

  # Monitoring
  alert_email                = var.alert_email
  enable_detailed_monitoring = true
}

# ============================================================================
# Additional Staging Resources
# ============================================================================

# S3 bucket for staging test data
resource "aws_s3_bucket" "staging_data" {
  bucket = "${local.name_prefix}-test-data"

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-test-data"
    Purpose = "Staging test data"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "staging_data" {
  bucket = aws_s3_bucket.staging_data.id

  rule {
    id     = "expire-old-data"
    status = "Enabled"

    expiration {
      days = 60
    }
  }
}

# CloudWatch dashboard for staging
resource "aws_cloudwatch_dashboard" "staging" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ECS CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-api"],
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-web"]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ECS Memory Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-api"],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-web"]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "${local.name_prefix}-postgres"]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Redis Memory"
          region = var.aws_region
          metrics = [
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", "${local.name_prefix}-redis-001"]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title  = "ALB Request Count"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${local.name_prefix}-alb"]
          ]
          period = 60
          stat   = "Sum"
        }
      }
    ]
  })
}

# Cost anomaly detection for staging
resource "aws_ce_anomaly_monitor" "staging" {
  name              = "${local.name_prefix}-cost-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = local.common_tags
}

resource "aws_ce_anomaly_subscription" "staging" {
  name      = "${local.name_prefix}-cost-subscription"
  frequency = "DAILY"

  monitor_arn_list = [aws_ce_anomaly_monitor.staging.arn]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_PERCENTAGE"
      values        = ["50"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = local.common_tags
}
