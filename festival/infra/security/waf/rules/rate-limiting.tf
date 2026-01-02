# =============================================================================
# Rate Limiting Rules for Festival Platform
# =============================================================================
# Comprehensive rate limiting to protect against brute force, DDoS, and abuse
# =============================================================================

# =============================================================================
# Variables for Rate Limiting Configuration
# =============================================================================

variable "rate_limit_login" {
  description = "Login attempts per IP per 5 minutes"
  type        = number
  default     = 10
}

variable "rate_limit_register" {
  description = "Registration attempts per IP per 5 minutes"
  type        = number
  default     = 5
}

variable "rate_limit_password_reset" {
  description = "Password reset requests per IP per 5 minutes"
  type        = number
  default     = 3
}

variable "rate_limit_api_general" {
  description = "General API requests per IP per 5 minutes"
  type        = number
  default     = 1000
}

variable "rate_limit_ticket_purchase" {
  description = "Ticket purchase attempts per IP per 5 minutes"
  type        = number
  default     = 20
}

variable "rate_limit_qr_scan" {
  description = "QR code scan attempts per IP per 5 minutes"
  type        = number
  default     = 100
}

variable "rate_limit_search" {
  description = "Search requests per IP per 5 minutes"
  type        = number
  default     = 100
}

variable "rate_limit_webhook" {
  description = "Webhook requests per IP per 5 minutes (Stripe, etc.)"
  type        = number
  default     = 500
}

# =============================================================================
# Rate Limiting Rule Group
# =============================================================================

resource "aws_wafv2_rule_group" "rate_limiting" {
  name        = "${local.name_prefix}-rate-limiting"
  description = "Comprehensive rate limiting rules for Festival Platform"
  scope       = "REGIONAL"
  capacity    = 200

  # -------------------------------------------------------------------------
  # Authentication Rate Limits
  # -------------------------------------------------------------------------

  # Rule 1: Login rate limiting (prevent brute force)
  rule {
    name     = "RateLimitLogin"
    priority = 1

    action {
      block {
        custom_response {
          response_code = 429
          response_header {
            name  = "Retry-After"
            value = "300"
          }
          response_header {
            name  = "X-Rate-Limit-Type"
            value = "login"
          }
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_login
        aggregate_key_type = "IP"

        scope_down_statement {
          and_statement {
            statement {
              byte_match_statement {
                search_string         = "/auth/login"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "EXACTLY"
              }
            }
            statement {
              byte_match_statement {
                search_string         = "POST"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "EXACTLY"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-login"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Registration rate limiting (prevent account spam)
  rule {
    name     = "RateLimitRegister"
    priority = 2

    action {
      block {
        custom_response {
          response_code = 429
          response_header {
            name  = "Retry-After"
            value = "600"
          }
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_register
        aggregate_key_type = "IP"

        scope_down_statement {
          and_statement {
            statement {
              byte_match_statement {
                search_string         = "/auth/register"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "EXACTLY"
              }
            }
            statement {
              byte_match_statement {
                search_string         = "POST"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "EXACTLY"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-register"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Password reset rate limiting (prevent email spam)
  rule {
    name     = "RateLimitPasswordReset"
    priority = 3

    action {
      block {
        custom_response {
          response_code = 429
          response_header {
            name  = "Retry-After"
            value = "900"
          }
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_password_reset
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/auth/forgot-password"
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
      metric_name                = "${local.name_prefix}-rate-limit-password-reset"
      sampled_requests_enabled   = true
    }
  }

  # -------------------------------------------------------------------------
  # Payment Rate Limits
  # -------------------------------------------------------------------------

  # Rule 4: Ticket purchase rate limiting
  rule {
    name     = "RateLimitTicketPurchase"
    priority = 4

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_ticket_purchase
        aggregate_key_type = "IP"

        scope_down_statement {
          and_statement {
            statement {
              byte_match_statement {
                search_string         = "/tickets/buy"
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
                search_string         = "POST"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "EXACTLY"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-ticket-purchase"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Cashless topup rate limiting
  rule {
    name     = "RateLimitCashlessTopup"
    priority = 5

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.payment_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/cashless/topup"
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
      metric_name                = "${local.name_prefix}-rate-limit-cashless-topup"
      sampled_requests_enabled   = true
    }
  }

  # Rule 6: Cashless payment rate limiting
  rule {
    name     = "RateLimitCashlessPay"
    priority = 6

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 50 # More lenient for payments at festival
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/cashless/pay"
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
      metric_name                = "${local.name_prefix}-rate-limit-cashless-pay"
      sampled_requests_enabled   = true
    }
  }

  # -------------------------------------------------------------------------
  # Operational Rate Limits
  # -------------------------------------------------------------------------

  # Rule 7: QR code scanning rate limiting (staff terminals)
  rule {
    name     = "RateLimitQRScan"
    priority = 7

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_qr_scan
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/tickets/validate"
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
                search_string         = "/zones/scan"
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
      metric_name                = "${local.name_prefix}-rate-limit-qr-scan"
      sampled_requests_enabled   = true
    }
  }

  # Rule 8: Search rate limiting (prevent scraping)
  rule {
    name     = "RateLimitSearch"
    priority = 8

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_search
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/search"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "CONTAINS"
              }
            }
            statement {
              byte_match_statement {
                search_string         = "q="
                field_to_match {
                  query_string {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "CONTAINS"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-search"
      sampled_requests_enabled   = true
    }
  }

  # Rule 9: General API rate limiting
  rule {
    name     = "RateLimitAPIGeneral"
    priority = 9

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_api_general
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/"
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
      metric_name                = "${local.name_prefix}-rate-limit-api-general"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-rate-limiting-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# Webhook Rate Limiting (separate group for external services)
# =============================================================================

resource "aws_wafv2_rule_group" "rate_limiting_webhooks" {
  name        = "${local.name_prefix}-rate-limiting-webhooks"
  description = "Rate limiting for webhook endpoints"
  scope       = "REGIONAL"
  capacity    = 50

  # Rule 1: Stripe webhook rate limiting
  rule {
    name     = "RateLimitStripeWebhook"
    priority = 1

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_webhook
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/webhooks/stripe"
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
      metric_name                = "${local.name_prefix}-rate-limit-stripe-webhook"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Firebase webhook rate limiting
  rule {
    name     = "RateLimitFirebaseWebhook"
    priority = 2

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_webhook
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/webhooks/firebase"
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
      metric_name                = "${local.name_prefix}-rate-limit-firebase-webhook"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-rate-limiting-webhooks-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# User-Based Rate Limiting (using authenticated user ID)
# =============================================================================

resource "aws_wafv2_rule_group" "rate_limiting_user" {
  name        = "${local.name_prefix}-rate-limiting-user"
  description = "Rate limiting based on authenticated user"
  scope       = "REGIONAL"
  capacity    = 50

  # Rate limit by Authorization header (per-user limiting)
  rule {
    name     = "RateLimitPerUser"
    priority = 1

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {
          custom_response {
            response_code = 429
          }
        }
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      rate_based_statement {
        limit              = 5000
        aggregate_key_type = "CUSTOM_KEYS"

        custom_key {
          header {
            name = "authorization"
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        scope_down_statement {
          size_constraint_statement {
            comparison_operator = "GT"
            size                = 0
            field_to_match {
              single_header {
                name = "authorization"
              }
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-per-user"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-rate-limiting-user-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "rate_limiting_rule_group_arn" {
  description = "ARN of the rate limiting rule group"
  value       = aws_wafv2_rule_group.rate_limiting.arn
}

output "rate_limiting_webhooks_rule_group_arn" {
  description = "ARN of the webhooks rate limiting rule group"
  value       = aws_wafv2_rule_group.rate_limiting_webhooks.arn
}

output "rate_limiting_user_rule_group_arn" {
  description = "ARN of the user rate limiting rule group"
  value       = aws_wafv2_rule_group.rate_limiting_user.arn
}
