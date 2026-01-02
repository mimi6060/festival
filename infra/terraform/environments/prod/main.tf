# ============================================================================
# Festival Platform - Production Environment
# ============================================================================
# Production-grade infrastructure with high availability, security,
# and comprehensive monitoring for the Festival Management Platform.
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  environment = "prod"
  name_prefix = "festival-${local.environment}"

  common_tags = {
    Project     = "festival"
    Environment = local.environment
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = "production"
    Criticality = "high"
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
  cost_center  = "production"

  # AWS settings - 3 AZs for high availability
  aws_region = var.aws_region
  az_count   = 3

  # Networking
  vpc_cidr                 = "10.2.0.0/16"
  enable_nat_gateway       = true
  enable_vpn_gateway       = var.enable_vpn
  enable_vpc_flow_logs     = true
  flow_logs_retention_days = 90

  # Database - production-grade
  database_name     = "festival_prod"
  database_username = var.database_username

  # Redis
  redis_version = "7.0"

  # Container images
  api_image   = var.api_image
  web_image   = var.web_image
  admin_image = var.admin_image

  # Features
  use_eks    = var.use_eks
  enable_cdn = true
  enable_waf = true

  # EKS configuration (if enabled)
  eks_cluster_version = var.eks_cluster_version

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
# Production-Specific Resources
# ============================================================================

# Backup S3 Bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${local.name_prefix}-backups"

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-backups"
    Purpose = "Database and application backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555 # 7 years retention for compliance
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backups.arn
    }
  }
}

# KMS Key for Backups
resource "aws_kms_key" "backups" {
  description             = "KMS key for backup encryption - ${local.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backups-key"
  })
}

resource "aws_kms_alias" "backups" {
  name          = "alias/${local.name_prefix}-backups"
  target_key_id = aws_kms_key.backups.key_id
}

# ============================================================================
# CloudWatch Dashboard
# ============================================================================

resource "aws_cloudwatch_dashboard" "production" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Header Row
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Festival Platform - Production Monitoring"
        }
      },
      # ECS Metrics
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "ECS CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-api", { stat = "Average", label = "API" }],
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-web", { stat = "Average", label = "Web" }],
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-admin", { stat = "Average", label = "Admin" }]
          ]
          period = 60
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "ECS Memory Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-api", { stat = "Average", label = "API" }],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-web", { stat = "Average", label = "Web" }],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-admin", { stat = "Average", label = "Admin" }]
          ]
          period = 60
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "ECS Running Task Count"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "RunningTaskCount", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-api", { stat = "Average", label = "API" }],
            ["AWS/ECS", "RunningTaskCount", "ClusterName", "${local.name_prefix}-cluster", "ServiceName", "${local.name_prefix}-web", { stat = "Average", label = "Web" }]
          ]
          period = 60
        }
      },
      # RDS Metrics
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS CPU & Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${local.name_prefix}-postgres", { stat = "Average", label = "CPU %" }],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "${local.name_prefix}-postgres", { stat = "Average", label = "Connections", yAxis = "right" }]
          ]
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS Latency"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", "${local.name_prefix}-postgres", { stat = "Average", label = "Read" }],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", "${local.name_prefix}-postgres", { stat = "Average", label = "Write" }]
          ]
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS Free Storage"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", "${local.name_prefix}-postgres", { stat = "Average" }]
          ]
          period = 300
        }
      },
      # Redis Metrics
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Redis CPU & Memory"
          region = var.aws_region
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${local.name_prefix}-redis-001", { stat = "Average", label = "CPU %" }],
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", "${local.name_prefix}-redis-001", { stat = "Average", label = "Memory %", yAxis = "right" }]
          ]
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Redis Cache Hit Rate"
          region = var.aws_region
          metrics = [
            ["AWS/ElastiCache", "CacheHitRate", "CacheClusterId", "${local.name_prefix}-redis-001", { stat = "Average" }]
          ]
          period = 60
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Redis Evictions"
          region = var.aws_region
          metrics = [
            ["AWS/ElastiCache", "Evictions", "CacheClusterId", "${local.name_prefix}-redis-001", { stat = "Sum" }]
          ]
          period = 300
        }
      },
      # ALB Metrics
      {
        type   = "metric"
        x      = 0
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "ALB Request Count & Latency"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${local.name_prefix}-alb", { stat = "Sum", label = "Requests" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${local.name_prefix}-alb", { stat = "Average", label = "Latency", yAxis = "right" }]
          ]
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "ALB HTTP Errors"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", "${local.name_prefix}-alb", { stat = "Sum", label = "4XX" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "${local.name_prefix}-alb", { stat = "Sum", label = "5XX" }],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", "${local.name_prefix}-alb", { stat = "Sum", label = "ELB 5XX" }]
          ]
          period = 60
        }
      }
    ]
  })
}

# ============================================================================
# Additional CloudWatch Alarms for Production
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${local.name_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High 5XX error rate on API"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    LoadBalancer = "${local.name_prefix}-alb"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${local.name_prefix}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "High API latency (> 2s)"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    LoadBalancer = "${local.name_prefix}-alb"
  }

  tags = local.common_tags
}

# ============================================================================
# SNS Topics for Alerting
# ============================================================================

resource "aws_sns_topic" "critical" {
  name = "${local.name_prefix}-critical-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic" "warning" {
  name = "${local.name_prefix}-warning-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "critical_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "critical_pagerduty" {
  count     = var.pagerduty_endpoint != "" ? 1 : 0
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "https"
  endpoint  = var.pagerduty_endpoint
}

# ============================================================================
# AWS Backup for RDS
# ============================================================================

resource "aws_backup_vault" "main" {
  name        = "${local.name_prefix}-backup-vault"
  kms_key_arn = aws_kms_key.backups.arn

  tags = local.common_tags
}

resource "aws_backup_plan" "rds" {
  name = "${local.name_prefix}-rds-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)" # 3 AM UTC daily

    lifecycle {
      cold_storage_after = 30
      delete_after       = 90
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.main.arn
      lifecycle {
        delete_after = 365
      }
    }
  }

  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)" # 3 AM UTC every Sunday

    lifecycle {
      cold_storage_after = 90
      delete_after       = 365
    }
  }

  tags = local.common_tags
}

resource "aws_backup_selection" "rds" {
  name         = "${local.name_prefix}-rds-selection"
  plan_id      = aws_backup_plan.rds.id
  iam_role_arn = aws_iam_role.backup.arn

  resources = [
    module.festival.rds_endpoint != "" ? "arn:aws:rds:${var.aws_region}:*:db:${local.name_prefix}-postgres" : ""
  ]
}

resource "aws_iam_role" "backup" {
  name = "${local.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# ============================================================================
# Cost Monitoring
# ============================================================================

resource "aws_ce_anomaly_monitor" "production" {
  name              = "${local.name_prefix}-cost-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = local.common_tags
}

resource "aws_ce_anomaly_subscription" "production" {
  name      = "${local.name_prefix}-cost-subscription"
  frequency = "IMMEDIATE"

  monitor_arn_list = [aws_ce_anomaly_monitor.production.arn]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = local.common_tags
}

# AWS Budgets
resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}
