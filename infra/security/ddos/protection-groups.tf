# =============================================================================
# AWS Shield Protection Groups Configuration
# Festival Management Platform - Grouped Resource Protection
# =============================================================================
#
# Protection Groups allow you to organize protected resources logically
# and apply policies to groups of resources.
# =============================================================================

# =============================================================================
# Variables for Protection Groups
# =============================================================================

variable "enable_protection_groups" {
  description = "Enable protection groups (requires Shield Advanced)"
  type        = bool
  default     = true
}

# =============================================================================
# Protection Group: All Resources
# =============================================================================

resource "aws_shield_protection_group" "all" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  protection_group_id = "${var.project_name}-all-resources"
  aggregation         = "MAX"
  pattern             = "ALL"

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-all-resources"
    GroupType   = "all"
    Description = "All protected resources for the festival platform"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Protection Group: Web Tier (CloudFront + ALB)
# =============================================================================

resource "aws_shield_protection_group" "web_tier" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  protection_group_id = "${var.project_name}-web-tier"
  aggregation         = "SUM"
  pattern             = "ARBITRARY"
  resource_type       = "APPLICATION_LOAD_BALANCER"

  members = concat(
    [for p in aws_shield_protection.cloudfront : p.id],
    [for p in aws_shield_protection.alb : p.id]
  )

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-web-tier"
    GroupType   = "web"
    Description = "Web tier protection (CloudFront + ALB)"
  })

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.cloudfront,
    aws_shield_protection.alb
  ]
}

# =============================================================================
# Protection Group: API Layer
# =============================================================================

resource "aws_shield_protection_group" "api" {
  count = var.enable_shield_advanced && var.enable_protection_groups && length(var.alb_arns) > 0 ? 1 : 0

  protection_group_id = "${var.project_name}-api-layer"
  aggregation         = "MEAN"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "APPLICATION_LOAD_BALANCER"

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-api-layer"
    GroupType   = "api"
    Description = "API layer protection (ALB)"
  })

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.alb
  ]
}

# =============================================================================
# Protection Group: DNS Layer
# =============================================================================

resource "aws_shield_protection_group" "dns" {
  count = var.enable_shield_advanced && var.enable_protection_groups && length(var.route53_hosted_zone_ids) > 0 ? 1 : 0

  protection_group_id = "${var.project_name}-dns-layer"
  aggregation         = "SUM"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "ROUTE_53_HOSTED_ZONE"

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-dns-layer"
    GroupType   = "dns"
    Description = "DNS layer protection (Route53)"
  })

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.route53
  ]
}

# =============================================================================
# Protection Group: CDN Layer
# =============================================================================

resource "aws_shield_protection_group" "cdn" {
  count = var.enable_shield_advanced && var.enable_protection_groups && length(var.cloudfront_distribution_arns) > 0 ? 1 : 0

  protection_group_id = "${var.project_name}-cdn-layer"
  aggregation         = "MAX"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "CLOUDFRONT_DISTRIBUTION"

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-cdn-layer"
    GroupType   = "cdn"
    Description = "CDN layer protection (CloudFront)"
  })

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.cloudfront
  ]
}

# =============================================================================
# Protection Group: Critical Infrastructure
# =============================================================================

resource "aws_shield_protection_group" "critical" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  protection_group_id = "${var.project_name}-critical-infra"
  aggregation         = "MAX"
  pattern             = "ARBITRARY"

  # Include only the most critical resources
  members = compact(concat(
    length(var.cloudfront_distribution_arns) > 0 ? [aws_shield_protection.cloudfront[0].id] : [],
    length(var.alb_arns) > 0 ? [aws_shield_protection.alb[0].id] : [],
    length(var.route53_hosted_zone_ids) > 0 ? [aws_shield_protection.route53[0].id] : []
  ))

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-critical-infra"
    GroupType   = "critical"
    Priority    = "high"
    Description = "Critical infrastructure requiring immediate DRT response"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# Protection Group: Payment Processing
# =============================================================================

resource "aws_shield_protection_group" "payment" {
  count = var.enable_shield_advanced && var.enable_protection_groups && length(var.alb_arns) > 0 ? 1 : 0

  protection_group_id = "${var.project_name}-payment-processing"
  aggregation         = "MAX"
  pattern             = "ARBITRARY"

  # Payment-related ALB (typically a separate ALB for PCI compliance)
  members = length(var.alb_arns) > 1 ? [aws_shield_protection.alb[1].id] : [aws_shield_protection.alb[0].id]

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-payment-processing"
    GroupType   = "payment"
    Priority    = "critical"
    Compliance  = "PCI-DSS"
    Description = "Payment processing infrastructure"
  })

  depends_on = [
    aws_shield_subscription.main,
    aws_shield_protection.alb
  ]
}

# =============================================================================
# Protection Group: Festival Events (Peak Traffic)
# =============================================================================

resource "aws_shield_protection_group" "festival_events" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  protection_group_id = "${var.project_name}-festival-events"
  aggregation         = "SUM"  # Sum to capture total attack volume across events
  pattern             = "ALL"

  tags = merge(local.common_tags, {
    Name          = "${var.project_name}-festival-events"
    GroupType     = "events"
    TrafficProfile = "burst"  # 10x normal traffic expected
    Description   = "Festival event periods with expected traffic spikes"
  })

  depends_on = [aws_shield_subscription.main]
}

# =============================================================================
# CloudWatch Alarms for Protection Groups
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "web_tier_attack" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  alarm_name          = "${var.project_name}-web-tier-ddos-attack"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DDoS attack detected on web tier resources"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
  ok_actions    = [aws_sns_topic.ddos_alerts.arn]

  dimensions = {
    ProtectionGroupId = "${var.project_name}-web-tier"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-web-tier-ddos-attack"
  })
}

resource "aws_cloudwatch_metric_alarm" "critical_attack" {
  count = var.enable_shield_advanced && var.enable_protection_groups ? 1 : 0

  alarm_name          = "${var.project_name}-critical-infra-attack"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "CRITICAL: DDoS attack detected on critical infrastructure"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
  ok_actions    = [aws_sns_topic.ddos_alerts.arn]

  dimensions = {
    ProtectionGroupId = "${var.project_name}-critical-infra"
  }

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-critical-infra-attack"
    Priority = "critical"
  })
}

resource "aws_cloudwatch_metric_alarm" "payment_attack" {
  count = var.enable_shield_advanced && var.enable_protection_groups && length(var.alb_arns) > 0 ? 1 : 0

  alarm_name          = "${var.project_name}-payment-ddos-attack"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "CRITICAL: DDoS attack detected on payment processing infrastructure"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
  ok_actions    = [aws_sns_topic.ddos_alerts.arn]

  dimensions = {
    ProtectionGroupId = "${var.project_name}-payment-processing"
  }

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-payment-ddos-attack"
    Priority   = "critical"
    Compliance = "PCI-DSS"
  })
}

# =============================================================================
# Attack Vector Monitoring
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "syn_flood" {
  count = var.enable_shield_advanced ? 1 : 0

  alarm_name          = "${var.project_name}-syn-flood-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AttackPacketsPerSecond"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Maximum"
  threshold           = 100000  # 100K packets/second
  alarm_description   = "Possible SYN flood attack detected"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-syn-flood-detected"
    AttackType  = "syn-flood"
  })
}

resource "aws_cloudwatch_metric_alarm" "http_flood" {
  count = var.enable_shield_advanced ? 1 : 0

  alarm_name          = "${var.project_name}-http-flood-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AttackRequestsPerSecond"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Maximum"
  threshold           = 10000  # 10K requests/second
  alarm_description   = "Possible HTTP flood attack detected"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-http-flood-detected"
    AttackType  = "http-flood"
  })
}

# =============================================================================
# Outputs for Protection Groups
# =============================================================================

output "protection_groups" {
  description = "Created protection groups"
  value = var.enable_shield_advanced && var.enable_protection_groups ? {
    all               = aws_shield_protection_group.all[0].protection_group_id
    web_tier          = aws_shield_protection_group.web_tier[0].protection_group_id
    api               = length(var.alb_arns) > 0 ? aws_shield_protection_group.api[0].protection_group_id : null
    dns               = length(var.route53_hosted_zone_ids) > 0 ? aws_shield_protection_group.dns[0].protection_group_id : null
    cdn               = length(var.cloudfront_distribution_arns) > 0 ? aws_shield_protection_group.cdn[0].protection_group_id : null
    critical          = aws_shield_protection_group.critical[0].protection_group_id
    payment           = length(var.alb_arns) > 0 ? aws_shield_protection_group.payment[0].protection_group_id : null
    festival_events   = aws_shield_protection_group.festival_events[0].protection_group_id
  } : {}
}
