# =============================================================================
# Multi-Layer Rate Limiting Configuration
# Festival Management Platform - Comprehensive DDoS Rate Limiting
# =============================================================================
#
# Layer 1: CloudFront (Edge locations) - First line of defense
# Layer 2: AWS WAF - Application layer protection
# Layer 3: ALB - Load balancer level limiting
# Layer 4: API Gateway - API-specific throttling
# Layer 5: Application (NestJS Throttler) - Fine-grained control
#
# Traffic Profile:
# - Normal: 1,000 RPS
# - Peak (Festival): 10,000 RPS (10x normal)
# - Attack threshold: 50,000+ RPS
# =============================================================================

# =============================================================================
# Variables
# =============================================================================

variable "rate_limit_normal" {
  description = "Normal rate limit per IP (requests per 5 minutes)"
  type        = number
  default     = 2000  # ~6.7 RPS per IP
}

variable "rate_limit_peak" {
  description = "Peak rate limit per IP during festival events (requests per 5 minutes)"
  type        = number
  default     = 10000  # ~33 RPS per IP
}

variable "rate_limit_api" {
  description = "API endpoint rate limit per IP (requests per 5 minutes)"
  type        = number
  default     = 1000  # ~3.3 RPS per IP for API calls
}

variable "rate_limit_auth" {
  description = "Authentication endpoint rate limit (requests per 5 minutes)"
  type        = number
  default     = 50  # Strict limit for auth endpoints
}

variable "rate_limit_payment" {
  description = "Payment endpoint rate limit (requests per 5 minutes)"
  type        = number
  default     = 100  # Strict limit for payment endpoints
}

variable "enable_peak_mode" {
  description = "Enable peak traffic mode for festival events"
  type        = bool
  default     = false
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  type        = string
  default     = ""
}

variable "api_gateway_id" {
  description = "API Gateway ID"
  type        = string
  default     = ""
}

# =============================================================================
# WAF Web ACL - Main Rate Limiting
# =============================================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-rate-limiting-waf"
  description = "Multi-layer rate limiting WAF for Festival Platform"
  scope       = "CLOUDFRONT"  # Use REGIONAL for ALB

  default_action {
    allow {}
  }

  # Rule 1: Global Rate Limit - All Traffic
  rule {
    name     = "global-rate-limit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.enable_peak_mode ? var.rate_limit_peak : var.rate_limit_normal
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-global-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 2: API Rate Limit
  rule {
    name     = "api-rate-limit"
    priority = 2

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_api
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string        = "/api/"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-api-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 3: Authentication Rate Limit (Strict)
  rule {
    name     = "auth-rate-limit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_auth
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string        = "/api/auth/"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }

            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string        = "/auth/"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-auth-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 4: Payment Endpoints Rate Limit (Critical)
  rule {
    name     = "payment-rate-limit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_payment
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string        = "/api/payments/"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }

            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string        = "/api/cashless/"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }

            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string        = "/api/stripe/"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-payment-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 5: Ticket Purchase Rate Limit (High demand endpoint)
  rule {
    name     = "ticket-purchase-rate-limit"
    priority = 5

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 200  # 200 per 5 min = ~0.67 RPS per IP
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string        = "/api/tickets/buy"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-ticket-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 6: Known Bad Actors - IP Reputation List
  rule {
    name     = "aws-ip-reputation-list"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-ip-reputation"
      sampled_requests_enabled  = true
    }
  }

  # Rule 7: Known Bot Control
  rule {
    name     = "aws-bot-control"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-bot-control"
      sampled_requests_enabled  = true
    }
  }

  # Rule 8: Common Attack Patterns
  rule {
    name     = "aws-common-rules"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-common-rules"
      sampled_requests_enabled  = true
    }
  }

  # Rule 9: SQL Injection Protection
  rule {
    name     = "aws-sqli-rules"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-sqli-rules"
      sampled_requests_enabled  = true
    }
  }

  # Rule 10: Known Bad Inputs
  rule {
    name     = "aws-bad-inputs"
    priority = 50

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-bad-inputs"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-waf-acl"
    sampled_requests_enabled  = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rate-limiting-waf"
  })
}

# =============================================================================
# IP Set for Whitelisted IPs (Internal/VPN/Partners)
# =============================================================================

resource "aws_wafv2_ip_set" "whitelist" {
  name               = "${var.project_name}-ip-whitelist"
  description        = "Whitelisted IP addresses (internal, VPN, partners)"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  addresses = [
    # Add your whitelisted IP ranges here
    # "10.0.0.0/8",        # Internal network
    # "192.168.0.0/16",    # VPN ranges
    # "203.0.113.0/24",    # Partner IPs
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ip-whitelist"
  })
}

# =============================================================================
# IP Set for Blocked IPs (Dynamic Blacklist)
# =============================================================================

resource "aws_wafv2_ip_set" "blacklist" {
  name               = "${var.project_name}-ip-blacklist"
  description        = "Blocked IP addresses (attackers, abuse)"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  addresses = [
    # Initially empty, populated dynamically during attacks
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ip-blacklist"
  })

  lifecycle {
    ignore_changes = [addresses]  # Allow external updates
  }
}

# =============================================================================
# Regex Pattern Set for Attack Detection
# =============================================================================

resource "aws_wafv2_regex_pattern_set" "attack_patterns" {
  name        = "${var.project_name}-attack-patterns"
  description = "Regex patterns for known attack vectors"
  scope       = "CLOUDFRONT"

  regular_expression {
    regex_string = "(?i)(select|union|insert|update|delete|drop|truncate|exec|execute)"
  }

  regular_expression {
    regex_string = "(?i)(script|javascript|vbscript|onload|onerror|onclick)"
  }

  regular_expression {
    regex_string = "(?i)(\\.\\./|\\.\\.\\\\|/etc/passwd|/windows/system32)"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-attack-patterns"
  })
}

# =============================================================================
# WAF Web ACL for ALB (Regional)
# =============================================================================

resource "aws_wafv2_web_acl" "alb" {
  name        = "${var.project_name}-alb-rate-limiting"
  description = "Rate limiting WAF for ALB"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Similar rules as CloudFront but for regional resources
  rule {
    name     = "alb-rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.enable_peak_mode ? var.rate_limit_peak : var.rate_limit_normal
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-alb-rate-limit"
      sampled_requests_enabled  = true
    }
  }

  rule {
    name     = "ip-blacklist-block"
    priority = 0  # Highest priority

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blacklist_regional.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-blacklist-blocks"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-alb-waf-acl"
    sampled_requests_enabled  = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-alb-rate-limiting"
  })
}

resource "aws_wafv2_ip_set" "blacklist_regional" {
  name               = "${var.project_name}-ip-blacklist-regional"
  description        = "Regional blocked IP addresses"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = []

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ip-blacklist-regional"
  })

  lifecycle {
    ignore_changes = [addresses]
  }
}

# =============================================================================
# CloudWatch Alarms for Rate Limiting
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "rate_limit_triggered" {
  alarm_name          = "${var.project_name}-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 60
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "Rate limiting is blocking more than 1000 requests per minute"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = "${var.project_name}-rate-limiting-waf"
    Rule   = "global-rate-limit"
    Region = "global"
  }

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rate-limit-triggered"
  })
}

resource "aws_cloudwatch_metric_alarm" "auth_rate_limit" {
  alarm_name          = "${var.project_name}-auth-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Auth rate limiting triggered - possible brute force attack"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = "${var.project_name}-rate-limiting-waf"
    Rule   = "auth-rate-limit"
    Region = "global"
  }

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-auth-rate-limit-triggered"
  })
}

# =============================================================================
# API Gateway Throttling (if using API Gateway)
# =============================================================================

resource "aws_api_gateway_usage_plan" "main" {
  count = var.api_gateway_id != "" ? 1 : 0

  name        = "${var.project_name}-usage-plan"
  description = "API usage plan with throttling"

  api_stages {
    api_id = var.api_gateway_id
    stage  = var.environment
  }

  # Global throttle settings
  throttle_settings {
    burst_limit = var.enable_peak_mode ? 5000 : 1000
    rate_limit  = var.enable_peak_mode ? 2000 : 500
  }

  # Quota limits
  quota_settings {
    limit  = var.enable_peak_mode ? 100000 : 10000
    offset = 0
    period = "DAY"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-usage-plan"
  })
}

# Method-level throttling for specific endpoints
resource "aws_api_gateway_method_settings" "auth" {
  count = var.api_gateway_id != "" ? 1 : 0

  rest_api_id = var.api_gateway_id
  stage_name  = var.environment
  method_path = "auth/*/POST"

  settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
    caching_enabled        = false
    metrics_enabled        = true
    logging_level          = "INFO"
  }
}

resource "aws_api_gateway_method_settings" "payment" {
  count = var.api_gateway_id != "" ? 1 : 0

  rest_api_id = var.api_gateway_id
  stage_name  = var.environment
  method_path = "payments/*/POST"

  settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 20
    caching_enabled        = false
    metrics_enabled        = true
    logging_level          = "INFO"
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL for CloudFront"
  value       = aws_wafv2_web_acl.main.arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "alb_waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL for ALB"
  value       = aws_wafv2_web_acl.alb.arn
}

output "ip_whitelist_arn" {
  description = "ARN of the IP whitelist set"
  value       = aws_wafv2_ip_set.whitelist.arn
}

output "ip_blacklist_arn" {
  description = "ARN of the IP blacklist set"
  value       = aws_wafv2_ip_set.blacklist.arn
}

output "rate_limits" {
  description = "Configured rate limits"
  value = {
    mode           = var.enable_peak_mode ? "peak" : "normal"
    global         = var.enable_peak_mode ? var.rate_limit_peak : var.rate_limit_normal
    api            = var.rate_limit_api
    auth           = var.rate_limit_auth
    payment        = var.rate_limit_payment
    unit           = "requests per 5 minutes"
  }
}
