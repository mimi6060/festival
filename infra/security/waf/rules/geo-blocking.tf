# =============================================================================
# Geo-Blocking Rules for Festival Platform
# =============================================================================
# Geographic access control for GDPR compliance and security
# =============================================================================

# =============================================================================
# Variables for Geo-Blocking Configuration
# =============================================================================

variable "geo_blocking_enabled" {
  description = "Enable geo-blocking"
  type        = bool
  default     = true
}

variable "geo_blocking_mode" {
  description = "Geo-blocking mode: ALLOWLIST or BLOCKLIST"
  type        = string
  default     = "ALLOWLIST"

  validation {
    condition     = contains(["ALLOWLIST", "BLOCKLIST"], var.geo_blocking_mode)
    error_message = "Geo-blocking mode must be ALLOWLIST or BLOCKLIST."
  }
}

variable "blocked_countries" {
  description = "List of countries to block (when using BLOCKLIST mode)"
  type        = list(string)
  default = [
    # High-risk countries often blocked
    "RU", "CN", "KP", "IR", "SY", "CU", "VE"
  ]
}

variable "admin_allowed_countries" {
  description = "Countries allowed to access admin endpoints"
  type        = list(string)
  default = [
    "FR", "DE", "BE", "NL", "LU", "CH" # Festival HQ countries
  ]
}

variable "api_allowed_countries" {
  description = "Countries allowed to access API (broader than frontend)"
  type        = list(string)
  default = [
    # EU + EEA + associated countries
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
    "CH", "GB", "MC", "AD", "SM", "VA"
  ]
}

# =============================================================================
# Geo-Blocking Rule Group
# =============================================================================

resource "aws_wafv2_rule_group" "geo_blocking" {
  name        = "${local.name_prefix}-geo-blocking"
  description = "Geographic access control rules"
  scope       = "REGIONAL"
  capacity    = 100

  # -------------------------------------------------------------------------
  # Rule 1: Allowlist mode - Block all except allowed countries
  # -------------------------------------------------------------------------
  dynamic "rule" {
    for_each = var.geo_blocking_mode == "ALLOWLIST" ? [1] : []

    content {
      name     = "GeoAllowlistMode"
      priority = 1

      action {
        dynamic "block" {
          for_each = var.waf_mode == "BLOCK" ? [1] : []
          content {
            custom_response {
              response_code = 403
              response_header {
                name  = "X-Blocked-Reason"
                value = "geographic-restriction"
              }
              custom_response_body_key = "geo_blocked"
            }
          }
        }
        dynamic "count" {
          for_each = var.waf_mode == "COUNT" ? [1] : []
          content {}
        }
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
        metric_name                = "${local.name_prefix}-geo-allowlist"
        sampled_requests_enabled   = true
      }
    }
  }

  # -------------------------------------------------------------------------
  # Rule 2: Blocklist mode - Allow all except blocked countries
  # -------------------------------------------------------------------------
  dynamic "rule" {
    for_each = var.geo_blocking_mode == "BLOCKLIST" ? [1] : []

    content {
      name     = "GeoBlocklistMode"
      priority = 1

      action {
        dynamic "block" {
          for_each = var.waf_mode == "BLOCK" ? [1] : []
          content {
            custom_response {
              response_code = 403
              response_header {
                name  = "X-Blocked-Reason"
                value = "geographic-restriction"
              }
            }
          }
        }
        dynamic "count" {
          for_each = var.waf_mode == "COUNT" ? [1] : []
          content {}
        }
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-geo-blocklist"
        sampled_requests_enabled   = true
      }
    }
  }

  # -------------------------------------------------------------------------
  # Rule 3: Stricter geo-blocking for admin endpoints
  # -------------------------------------------------------------------------
  rule {
    name     = "GeoBlockAdmin"
    priority = 2

    action {
      block {
        custom_response {
          response_code = 403
          response_header {
            name  = "X-Blocked-Reason"
            value = "admin-geographic-restriction"
          }
        }
      }
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/admin"
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
          not_statement {
            statement {
              geo_match_statement {
                country_codes = var.admin_allowed_countries
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-geo-block-admin"
      sampled_requests_enabled   = true
    }
  }

  # -------------------------------------------------------------------------
  # Rule 4: Stricter geo-blocking for API management endpoints
  # -------------------------------------------------------------------------
  rule {
    name     = "GeoBlockAPIManagement"
    priority = 3

    action {
      block {
        custom_response {
          response_code = 403
        }
      }
    }

    statement {
      and_statement {
        statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/api/festivals"
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
                search_string         = "/api/users"
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
        statement {
          or_statement {
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
            statement {
              byte_match_statement {
                search_string         = "PUT"
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
            statement {
              byte_match_statement {
                search_string         = "DELETE"
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
        statement {
          not_statement {
            statement {
              geo_match_statement {
                country_codes = var.admin_allowed_countries
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-geo-block-api-management"
      sampled_requests_enabled   = true
    }
  }

  # -------------------------------------------------------------------------
  # Rule 5: Block payment endpoints from non-EU countries
  # -------------------------------------------------------------------------
  rule {
    name     = "GeoBlockPayments"
    priority = 4

    action {
      block {
        custom_response {
          response_code = 403
          response_header {
            name  = "X-Blocked-Reason"
            value = "payment-geographic-restriction"
          }
        }
      }
    }

    statement {
      and_statement {
        statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/payment"
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
                search_string         = "/cashless"
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
                search_string         = "/tickets/buy"
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
          }
        }
        statement {
          not_statement {
            statement {
              geo_match_statement {
                country_codes = var.api_allowed_countries
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-geo-block-payments"
      sampled_requests_enabled   = true
    }
  }

  # Custom response body for geo-blocked requests
  custom_response_body {
    key          = "geo_blocked"
    content      = jsonencode({
      error   = "Geographic Restriction"
      code    = "GEO_BLOCKED"
      message = "This service is not available in your region"
    })
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-geo-blocking-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# IP-Based Geo Override (for VPN users with valid credentials)
# =============================================================================

resource "aws_wafv2_ip_set" "geo_override_ips" {
  name               = "${local.name_prefix}-geo-override-ips"
  description        = "IPs allowed to bypass geo-blocking (VPN, remote workers)"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = []

  tags = local.common_tags

  lifecycle {
    ignore_changes = [addresses]
  }
}

resource "aws_wafv2_rule_group" "geo_override" {
  name        = "${local.name_prefix}-geo-override"
  description = "Allow specific IPs to bypass geo-blocking"
  scope       = "REGIONAL"
  capacity    = 10

  rule {
    name     = "GeoOverrideIPs"
    priority = 1

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.geo_override_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-geo-override"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-geo-override-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "geo_blocking_rule_group_arn" {
  description = "ARN of the geo-blocking rule group"
  value       = aws_wafv2_rule_group.geo_blocking.arn
}

output "geo_override_ip_set_arn" {
  description = "ARN of the geo-override IP set"
  value       = aws_wafv2_ip_set.geo_override_ips.arn
}

output "geo_override_rule_group_arn" {
  description = "ARN of the geo-override rule group"
  value       = aws_wafv2_rule_group.geo_override.arn
}
