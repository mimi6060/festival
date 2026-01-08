# =============================================================================
# AWS WAF Configuration for Festival Platform
# =============================================================================
# This Terraform configuration sets up AWS WAF v2 for comprehensive web
# application protection including SQL injection, XSS, rate limiting,
# geo-blocking, and bot control.
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

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
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "festival"
}

variable "waf_mode" {
  description = "WAF mode: COUNT for testing/monitoring, BLOCK for production"
  type        = string
  default     = null # When null, mode is automatically determined by environment

  validation {
    condition     = var.waf_mode == null || contains(["COUNT", "BLOCK"], var.waf_mode)
    error_message = "WAF mode must be COUNT, BLOCK, or null (auto-detect from environment)."
  }
}

# =============================================================================
# WAF Mode Configuration
# =============================================================================
# COUNT mode: Logs matching requests but does NOT block them.
#             Use this mode for testing new rules or monitoring traffic patterns.
#             Recommended for: dev, staging, or when first deploying WAF.
#
# BLOCK mode: Actively blocks requests that match WAF rules.
#             Use this mode in production to enforce security policies.
#             Recommended for: production environments.
#
# The effective WAF mode is determined as follows:
# 1. If waf_mode variable is explicitly set, use that value
# 2. Otherwise, auto-detect based on environment:
#    - production -> BLOCK
#    - dev, staging -> COUNT
# =============================================================================

variable "enable_logging" {
  description = "Enable WAF logging to CloudWatch, S3, and Kinesis"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch logs retention in days"
  type        = number
  default     = 90
}

variable "allowed_countries" {
  description = "List of allowed country codes (ISO 3166-1 alpha-2)"
  type        = list(string)
  default = [
    # European Union countries
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    # EEA countries
    "IS", "LI", "NO",
    # Other European countries
    "CH", "GB", "MC", "AD", "SM", "VA"
  ]
}

variable "whitelisted_ips" {
  description = "IP addresses to whitelist (office, VPN, monitoring)"
  type        = list(string)
  default     = []
}

variable "auth_rate_limit" {
  description = "Rate limit for /auth/* endpoints (requests per 5 minutes)"
  type        = number
  default     = 50 # 10 req/min = 50 per 5 minutes
}

variable "payment_rate_limit" {
  description = "Rate limit for /payment/* endpoints (requests per 5 minutes)"
  type        = number
  default     = 25 # 5 req/min = 25 per 5 minutes
}

variable "global_rate_limit" {
  description = "Global rate limit per IP (requests per 5 minutes)"
  type        = number
  default     = 2000
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "waf"
  })

  # Effective WAF mode: use explicit variable if set, otherwise auto-detect from environment
  # Production uses BLOCK mode by default, other environments use COUNT mode for safe testing
  effective_waf_mode = coalesce(
    var.waf_mode,
    var.environment == "production" ? "BLOCK" : "COUNT"
  )

  # WAF action based on effective mode
  waf_action = local.effective_waf_mode == "BLOCK" ? "block" : "count"

  # Log group name (must start with aws-waf-logs-)
  log_group_name = "aws-waf-logs-${local.name_prefix}"
}

# =============================================================================
# IP Sets
# =============================================================================

# Whitelisted IPs (office, VPN, monitoring services)
resource "aws_wafv2_ip_set" "whitelisted_ips" {
  name               = "${local.name_prefix}-whitelisted-ips"
  description        = "Whitelisted IP addresses"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.whitelisted_ips

  tags = local.common_tags
}

# Known malicious IPs (updated via external threat intelligence)
resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "${local.name_prefix}-blocked-ips"
  description        = "Known malicious IP addresses"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = []

  tags = local.common_tags

  lifecycle {
    ignore_changes = [addresses]
  }
}

# =============================================================================
# Regex Pattern Sets
# =============================================================================

# Suspicious user agents pattern set
resource "aws_wafv2_regex_pattern_set" "suspicious_user_agents" {
  name        = "${local.name_prefix}-suspicious-user-agents"
  description = "Patterns for suspicious/malicious user agents"
  scope       = "REGIONAL"

  # Common attack tools and scanners
  regular_expression {
    regex_string = "(?i)(nikto|sqlmap|nmap|masscan|zap|burp|acunetix|netsparker|appscan)"
  }

  # Vulnerability scanners
  regular_expression {
    regex_string = "(?i)(w3af|skipfish|wpscan|dirbuster|gobuster|nuclei|httpx)"
  }

  # Suspicious bots
  regular_expression {
    regex_string = "(?i)(python-requests|curl|wget|libwww|httpclient|java\\/)"
  }

  # Known bad bots
  regular_expression {
    regex_string = "(?i)(ahrefsbot|semrushbot|dotbot|mj12bot|blexbot)"
  }

  tags = local.common_tags
}

# Common attack patterns in URIs
resource "aws_wafv2_regex_pattern_set" "attack_patterns_uri" {
  name        = "${local.name_prefix}-attack-patterns-uri"
  description = "Common attack patterns in URIs"
  scope       = "REGIONAL"

  # Path traversal attempts
  regular_expression {
    regex_string = "(\\.\\.\\/|\\.\\.\\\\)"
  }

  # Common exploit files
  regular_expression {
    regex_string = "(?i)(\\.htaccess|\\.htpasswd|\\.git|\\.svn|\\.env)"
  }

  # PHP/shell upload attempts
  regular_expression {
    regex_string = "(?i)(\\.php[3-7]?|\\.phtml|\\.asp[x]?|\\.jsp[x]?|\\.sh|\\.bash)"
  }

  # WordPress/CMS specific attacks
  regular_expression {
    regex_string = "(?i)(wp-admin|wp-login|wp-config|xmlrpc\\.php)"
  }

  # Admin/config exposure attempts
  regular_expression {
    regex_string = "(?i)(\\/admin\\/config|\\/phpinfo|\\/server-status|\\/debug)"
  }

  tags = local.common_tags
}

# =============================================================================
# Main WAF Web ACL
# =============================================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name_prefix}-waf"
  description = "WAF for Festival Platform - ${var.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Custom response for blocked requests
  custom_response_body {
    key          = "blocked_request"
    content      = jsonencode({
      error   = "Access Denied"
      code    = "WAF_BLOCKED"
      message = "Your request has been blocked by security policies"
    })
    content_type = "APPLICATION_JSON"
  }

  # Token domains for challenge actions
  token_domains = []

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf"
    sampled_requests_enabled   = true
  }

  # =========================================================================
  # Rule Priority Guide:
  # 0-99: IP-based rules (whitelist, blacklist)
  # 100-199: Rate limiting rules
  # 200-299: AWS Managed Rules
  # 300-399: Custom security rules
  # 400-499: Geo-blocking
  # 500+: Additional custom rules
  # =========================================================================

  # -------------------------------------------------------------------------
  # Priority 0: Whitelist known good IPs
  # -------------------------------------------------------------------------
  rule {
    name     = "AllowWhitelistedIPs"
    priority = 0

    override_action {
      none {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.whitelisted_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-whitelisted-ips"
      sampled_requests_enabled   = true
    }

    action {
      allow {}
    }
  }

  # -------------------------------------------------------------------------
  # Priority 1: Block known malicious IPs
  # -------------------------------------------------------------------------
  rule {
    name     = "BlockMaliciousIPs"
    priority = 1

    override_action {
      none {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blocked_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-blocked-ips"
      sampled_requests_enabled   = true
    }

    action {
      block {
        custom_response {
          response_code            = 403
          custom_response_body_key = "blocked_request"
        }
      }
    }
  }

  # -------------------------------------------------------------------------
  # Priority 100-149: Rate Limiting Rules
  # -------------------------------------------------------------------------

  # Rate limit for authentication endpoints
  rule {
    name     = "RateLimitAuth"
    priority = 100

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.auth_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/auth/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-auth"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {
          custom_response {
            response_code = 429
            response_header {
              name  = "Retry-After"
              value = "300"
            }
          }
        }
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # Rate limit for payment endpoints
  rule {
    name     = "RateLimitPayment"
    priority = 101

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.payment_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/payment/"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
            statement {
              byte_match_statement {
                search_string         = "/cashless/"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-payment"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {
          custom_response {
            response_code = 429
          }
        }
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # Global rate limit per IP
  rule {
    name     = "RateLimitGlobal"
    priority = 102

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.global_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-global"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {
          custom_response {
            response_code = 429
          }
        }
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # -------------------------------------------------------------------------
  # Priority 200-249: AWS Managed Rules
  # -------------------------------------------------------------------------

  # AWS Managed Rules - Core Rule Set (CRS)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 200

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that may cause false positives
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "SizeRestrictions_BODY"
        }

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-common"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 201

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-sqli"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 202

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Linux OS
  rule {
    name     = "AWSManagedRulesLinuxRuleSet"
    priority = 203

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-linux"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Amazon IP Reputation
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 204

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Anonymous IP List
  rule {
    name     = "AWSManagedRulesAnonymousIpList"
    priority = 205

    override_action {
      dynamic "none" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"

        # Allow legitimate VPN users but block hosting providers
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "AnonymousIPList"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-anonymous-ip"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Bot Control
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 206

    override_action {
      count {}
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

        # Allow verified bots (Google, Bing, etc.)
        rule_action_override {
          action_to_use {
            allow {}
          }
          name = "CategoryVerifiedSearchEngine"
        }

        rule_action_override {
          action_to_use {
            allow {}
          }
          name = "CategoryVerifiedSocialMedia"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-aws-bot-control"
      sampled_requests_enabled   = true
    }
  }

  # -------------------------------------------------------------------------
  # Priority 300-399: Custom Security Rules
  # -------------------------------------------------------------------------

  # Block suspicious user agents
  rule {
    name     = "BlockSuspiciousUserAgents"
    priority = 300

    override_action {
      none {}
    }

    statement {
      regex_pattern_set_reference_statement {
        arn = aws_wafv2_regex_pattern_set.suspicious_user_agents.arn
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-suspicious-ua"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # Block common attack patterns in URI
  rule {
    name     = "BlockAttackPatternsURI"
    priority = 301

    override_action {
      none {}
    }

    statement {
      regex_pattern_set_reference_statement {
        arn = aws_wafv2_regex_pattern_set.attack_patterns_uri.arn
        field_to_match {
          uri_path {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-attack-patterns-uri"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # Block requests with no User-Agent
  rule {
    name     = "BlockNoUserAgent"
    priority = 302

    override_action {
      none {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "EQ"
        size                = 0
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-no-user-agent"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  # Block oversized request bodies (prevent DoS)
  rule {
    name     = "BlockOversizedBody"
    priority = 303

    override_action {
      none {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "GT"
        size                = 10485760 # 10MB
        field_to_match {
          body {
            oversize_handling = "CONTINUE"
          }
        }
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-oversized-body"
      sampled_requests_enabled   = true
    }

    action {
      block {
        custom_response {
          response_code = 413
        }
      }
    }
  }

  # -------------------------------------------------------------------------
  # Priority 400-499: Geo-blocking
  # -------------------------------------------------------------------------

  # Block non-allowed countries (GDPR compliance - EU + EEA + selected countries)
  rule {
    name     = "GeoBlockNonAllowedCountries"
    priority = 400

    override_action {
      none {}
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = var.allowed_countries
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-geo-block"
      sampled_requests_enabled   = true
    }

    action {
      dynamic "block" {
        for_each = local.effective_waf_mode == "BLOCK" ? [1] : []
        content {
          custom_response {
            response_code = 403
            response_header {
              name  = "X-Blocked-Reason"
              value = "geo-restriction"
            }
          }
        }
      }
      dynamic "count" {
        for_each = local.effective_waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }
  }

  tags = local.common_tags
}

# =============================================================================
# WAF Associations
# =============================================================================

# Associate with ALB (when ALB ARN is provided)
resource "aws_wafv2_web_acl_association" "alb" {
  count = var.alb_arn != "" ? 1 : 0

  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# Associate with API Gateway (when API Gateway ARN is provided)
resource "aws_wafv2_web_acl_association" "api_gateway" {
  count = var.api_gateway_arn != "" ? 1 : 0

  resource_arn = var.api_gateway_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer to associate with WAF"
  type        = string
  default     = ""
}

variable "api_gateway_arn" {
  description = "ARN of the API Gateway stage to associate with WAF"
  type        = string
  default     = ""
}

# =============================================================================
# Outputs
# =============================================================================

output "web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_capacity" {
  description = "The web ACL capacity units (WCUs) used by this web ACL"
  value       = aws_wafv2_web_acl.main.capacity
}

output "whitelisted_ip_set_arn" {
  description = "ARN of the whitelisted IP set"
  value       = aws_wafv2_ip_set.whitelisted_ips.arn
}

output "blocked_ip_set_arn" {
  description = "ARN of the blocked IP set"
  value       = aws_wafv2_ip_set.blocked_ips.arn
}

output "effective_waf_mode" {
  description = "The effective WAF mode (COUNT or BLOCK) - useful to verify the active mode"
  value       = local.effective_waf_mode
}
