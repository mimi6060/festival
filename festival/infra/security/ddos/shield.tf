# =============================================================================
# AWS Shield Advanced Configuration
# Festival Management Platform - DDoS Protection
# =============================================================================
#
# COSTS (AWS Shield Advanced):
# - Monthly subscription: $3,000/month (fixed)
# - Data Transfer Out (DTO): $0.025 per GB for first 100 TB
# - WAF requests included when used with Shield Advanced protected resources
# - Cost Protection: AWS credits for scaling charges during attacks
#
# Benefits:
# - 24/7 DDoS Response Team (DRT) access
# - Cost protection during attacks
# - Advanced attack visibility and forensics
# - SLA with credits for attacks that impact availability
# =============================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Variables
# =============================================================================

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "festival-platform"
}

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced (requires $3000/month subscription)"
  type        = bool
  default     = true
}

variable "drt_access_role_arn" {
  description = "IAM role ARN for DRT team access"
  type        = string
  default     = ""
}

variable "emergency_contacts" {
  description = "List of emergency contact emails for DDoS notifications"
  type        = list(object({
    email_address = string
    phone_number  = optional(string)
  }))
  default = [
    {
      email_address = "security@festival-platform.com"
      phone_number  = "+33600000000"
    },
    {
      email_address = "ops@festival-platform.com"
      phone_number  = "+33600000001"
    }
  ]
}

variable "cloudfront_distribution_arns" {
  description = "List of CloudFront distribution ARNs to protect"
  type        = list(string)
  default     = []
}

variable "alb_arns" {
  description = "List of Application Load Balancer ARNs to protect"
  type        = list(string)
  default     = []
}

variable "eip_arns" {
  description = "List of Elastic IP ARNs to protect"
  type        = list(string)
  default     = []
}

variable "route53_hosted_zone_ids" {
  description = "List of Route53 hosted zone IDs to protect"
  type        = list(string)
  default     = []
}

# =============================================================================
# Locals
# =============================================================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "ddos-protection"
  }

  # Combine all resources to protect
  all_protected_resources = concat(
    var.cloudfront_distribution_arns,
    var.alb_arns,
    var.eip_arns,
    [for zone_id in var.route53_hosted_zone_ids : "arn:aws:route53:::hostedzone/${zone_id}"]
  )
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# =============================================================================
# AWS Shield Advanced Subscription
# =============================================================================

resource "aws_shield_subscription" "main" {
  count = var.enable_shield_advanced ? 1 : 0

  auto_renew = true

  # Note: This will initiate the $3,000/month subscription
  # Minimum commitment is 12 months
}

# =============================================================================
# Shield Advanced Proactive Engagement
# =============================================================================

resource "aws_shield_proactive_engagement" "main" {
  count = var.enable_shield_advanced ? 1 : 0

  enabled = true

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# DRT Access Configuration
# =============================================================================

# IAM Role for DRT Access
resource "aws_iam_role" "drt_access" {
  count = var.enable_shield_advanced && var.drt_access_role_arn == "" ? 1 : 0

  name = "${var.project_name}-drt-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "drt.shield.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-drt-access-role"
  })
}

resource "aws_iam_role_policy" "drt_access" {
  count = var.enable_shield_advanced && var.drt_access_role_arn == "" ? 1 : 0

  name = "${var.project_name}-drt-access-policy"
  role = aws_iam_role.drt_access[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:DescribeAlarms",
          "wafv2:GetWebACL",
          "wafv2:GetWebACLForResource",
          "wafv2:ListResourcesForWebACL",
          "wafv2:UpdateWebACL",
          "wafv2:GetRuleGroup",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth",
          "route53:GetHostedZone",
          "route53:ListResourceRecordSets",
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig",
          "ec2:DescribeAddresses",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-*",
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
      }
    ]
  })
}

resource "aws_shield_drt_access_role_arn_association" "main" {
  count = var.enable_shield_advanced ? 1 : 0

  role_arn = var.drt_access_role_arn != "" ? var.drt_access_role_arn : aws_iam_role.drt_access[0].arn

  depends_on = [aws_shield_subscription.main]
}

# S3 bucket for DRT log access
resource "aws_s3_bucket" "drt_logs" {
  count = var.enable_shield_advanced ? 1 : 0

  bucket = "${var.project_name}-drt-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-drt-logs"
  })
}

resource "aws_s3_bucket_versioning" "drt_logs" {
  count = var.enable_shield_advanced ? 1 : 0

  bucket = aws_s3_bucket.drt_logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "drt_logs" {
  count = var.enable_shield_advanced ? 1 : 0

  bucket = aws_s3_bucket.drt_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "drt_logs" {
  count = var.enable_shield_advanced ? 1 : 0

  bucket = aws_s3_bucket.drt_logs[0].id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_shield_drt_access_log_bucket_association" "main" {
  count = var.enable_shield_advanced ? 1 : 0

  log_bucket              = aws_s3_bucket.drt_logs[0].bucket
  role_arn_association_id = aws_shield_drt_access_role_arn_association.main[0].id

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Emergency Contact Configuration
# =============================================================================

resource "aws_shield_application_layer_automatic_response" "main" {
  count = var.enable_shield_advanced ? 1 : 0

  resource_arn = var.cloudfront_distribution_arns[0]
  action       = "COUNT"  # Start with COUNT, can be changed to BLOCK

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.cloudfront
  ]
}

# =============================================================================
# CloudFront Protection
# =============================================================================

resource "aws_shield_protection" "cloudfront" {
  count = var.enable_shield_advanced ? length(var.cloudfront_distribution_arns) : 0

  name         = "${var.project_name}-cloudfront-protection-${count.index}"
  resource_arn = var.cloudfront_distribution_arns[count.index]

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-cloudfront-protection-${count.index}"
    Resource = "cloudfront"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# ALB Protection
# =============================================================================

resource "aws_shield_protection" "alb" {
  count = var.enable_shield_advanced ? length(var.alb_arns) : 0

  name         = "${var.project_name}-alb-protection-${count.index}"
  resource_arn = var.alb_arns[count.index]

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-alb-protection-${count.index}"
    Resource = "alb"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Elastic IP Protection
# =============================================================================

resource "aws_shield_protection" "eip" {
  count = var.enable_shield_advanced ? length(var.eip_arns) : 0

  name         = "${var.project_name}-eip-protection-${count.index}"
  resource_arn = var.eip_arns[count.index]

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-eip-protection-${count.index}"
    Resource = "eip"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Route53 Hosted Zone Protection
# =============================================================================

resource "aws_shield_protection" "route53" {
  count = var.enable_shield_advanced ? length(var.route53_hosted_zone_ids) : 0

  name         = "${var.project_name}-route53-protection-${count.index}"
  resource_arn = "arn:aws:route53:::hostedzone/${var.route53_hosted_zone_ids[count.index]}"

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-route53-protection-${count.index}"
    Resource = "route53"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Health Checks for Protected Resources
# =============================================================================

resource "aws_route53_health_check" "api" {
  count = var.enable_shield_advanced ? 1 : 0

  fqdn              = "api.festival-platform.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  regions = [
    "us-east-1",
    "eu-west-1",
    "ap-southeast-1"
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-api-health-check"
  })
}

resource "aws_shield_protection_health_check_association" "api" {
  count = var.enable_shield_advanced && length(var.alb_arns) > 0 ? 1 : 0

  health_check_arn     = aws_route53_health_check.api[0].arn
  shield_protection_id = aws_shield_protection.alb[0].id

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# SNS Topic for DDoS Alerts
# =============================================================================

resource "aws_sns_topic" "ddos_alerts" {
  name = "${var.project_name}-ddos-alerts"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ddos-alerts"
  })
}

resource "aws_sns_topic_policy" "ddos_alerts" {
  arn = aws_sns_topic.ddos_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.ddos_alerts.arn
      },
      {
        Sid    = "AllowShieldService"
        Effect = "Allow"
        Principal = {
          Service = "shield.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.ddos_alerts.arn
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "ddos_email" {
  for_each = { for idx, contact in var.emergency_contacts : idx => contact }

  topic_arn = aws_sns_topic.ddos_alerts.arn
  protocol  = "email"
  endpoint  = each.value.email_address
}

# =============================================================================
# CloudWatch Alarms for DDoS Detection
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "ddos_detected" {
  count = var.enable_shield_advanced ? 1 : 0

  alarm_name          = "${var.project_name}-ddos-attack-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DDoS attack detected on protected resources"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
  ok_actions    = [aws_sns_topic.ddos_alerts.arn]

  dimensions = {
    ResourceArn = var.cloudfront_distribution_arns[0]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ddos-attack-detected"
  })
}

resource "aws_cloudwatch_metric_alarm" "attack_volume" {
  count = var.enable_shield_advanced ? 1 : 0

  alarm_name          = "${var.project_name}-ddos-attack-volume"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AttackBitsPerSecond"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1000000000  # 1 Gbps
  alarm_description   = "DDoS attack volume exceeds 1 Gbps"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ddos-attack-volume"
  })
}

resource "aws_cloudwatch_metric_alarm" "request_rate_anomaly" {
  count = var.enable_shield_advanced ? 1 : 0

  alarm_name          = "${var.project_name}-request-rate-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3

  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/CloudFront"
      period      = 60
      stat        = "Sum"

      dimensions = {
        DistributionId = "PLACEHOLDER"  # Replace with actual distribution ID
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "RequestCount (Expected)"
    return_data = true
  }

  alarm_description  = "Request rate anomaly detected - possible DDoS"
  treat_missing_data = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-request-rate-anomaly"
  })
}

# =============================================================================
# Outputs
# =============================================================================

output "shield_subscription_arn" {
  description = "ARN of the Shield Advanced subscription"
  value       = var.enable_shield_advanced ? aws_shield_subscription.main[0].id : null
}

output "protected_resources" {
  description = "List of protected resource ARNs"
  value = {
    cloudfront = var.enable_shield_advanced ? [for p in aws_shield_protection.cloudfront : p.resource_arn] : []
    alb        = var.enable_shield_advanced ? [for p in aws_shield_protection.alb : p.resource_arn] : []
    eip        = var.enable_shield_advanced ? [for p in aws_shield_protection.eip : p.resource_arn] : []
    route53    = var.enable_shield_advanced ? [for p in aws_shield_protection.route53 : p.resource_arn] : []
  }
}

output "ddos_alerts_topic_arn" {
  description = "ARN of the SNS topic for DDoS alerts"
  value       = aws_sns_topic.ddos_alerts.arn
}

output "drt_access_role_arn" {
  description = "ARN of the IAM role for DRT access"
  value       = var.enable_shield_advanced && var.drt_access_role_arn == "" ? aws_iam_role.drt_access[0].arn : var.drt_access_role_arn
}

output "health_check_id" {
  description = "ID of the Route53 health check for API"
  value       = var.enable_shield_advanced ? aws_route53_health_check.api[0].id : null
}

output "drt_logs_bucket" {
  description = "S3 bucket for DRT access logs"
  value       = var.enable_shield_advanced ? aws_s3_bucket.drt_logs[0].bucket : null
}

# =============================================================================
# Cost Estimation Output
# =============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost for Shield Advanced"
  value = var.enable_shield_advanced ? {
    subscription     = "$3,000 (fixed monthly)"
    data_transfer    = "~$0.025/GB for first 100TB"
    waf_integration  = "Included when used with Shield"
    cost_protection  = "AWS credits for scaling during attacks"
    minimum_commit   = "12 months"
    total_first_year = "~$36,000 minimum"
  } : "Shield Advanced not enabled"
}
