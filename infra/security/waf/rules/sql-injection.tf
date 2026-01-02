# =============================================================================
# SQL Injection Protection Rules for Festival Platform
# =============================================================================
# Custom SQL injection detection rules that complement AWS Managed Rules
# =============================================================================

# =============================================================================
# Regex Pattern Sets for SQL Injection Detection
# =============================================================================

resource "aws_wafv2_regex_pattern_set" "sqli_patterns_body" {
  name        = "${local.name_prefix}-sqli-patterns-body"
  description = "SQL injection patterns for request body inspection"
  scope       = "REGIONAL"

  # Basic SQL injection patterns
  regular_expression {
    regex_string = "(?i)(\\bor\\b|\\band\\b)\\s*['\"]?\\d+['\"]?\\s*=\\s*['\"]?\\d+['\"]?"
  }

  # UNION-based injection
  regular_expression {
    regex_string = "(?i)\\bunion\\b.*\\bselect\\b"
  }

  # Comment-based evasion
  regular_expression {
    regex_string = "(/\\*.*\\*/|--\\s|#)"
  }

  # Stacked queries
  regular_expression {
    regex_string = ";\\s*(drop|delete|truncate|alter|update|insert|create)\\s"
  }

  # Time-based blind SQL injection
  regular_expression {
    regex_string = "(?i)(sleep|benchmark|waitfor|delay|pg_sleep)\\s*\\("
  }

  # Error-based SQL injection
  regular_expression {
    regex_string = "(?i)(extractvalue|updatexml|floor\\(rand)\\s*\\("
  }

  tags = local.common_tags
}

resource "aws_wafv2_regex_pattern_set" "sqli_patterns_query" {
  name        = "${local.name_prefix}-sqli-patterns-query"
  description = "SQL injection patterns for query string inspection"
  scope       = "REGIONAL"

  # Parameter manipulation
  regular_expression {
    regex_string = "(?i)['\"][\\s]*(or|and)[\\s]*['\"]"
  }

  # Numeric comparison attacks
  regular_expression {
    regex_string = "(?i)\\d+\\s*(=|<|>|<=|>=|<>|!=)\\s*\\d+"
  }

  # SQL keywords in parameters
  regular_expression {
    regex_string = "(?i)(select|insert|update|delete|drop|create|alter|truncate|exec|execute)\\s+"
  }

  # Encoded SQL injection
  regular_expression {
    regex_string = "(%27|%22|%3D|%3B|%2D%2D|%23)"
  }

  tags = local.common_tags
}

# =============================================================================
# Custom SQL Injection Rules
# =============================================================================

# Custom SQLi protection for request body
resource "aws_wafv2_rule_group" "sqli_custom" {
  name        = "${local.name_prefix}-sqli-custom"
  description = "Custom SQL injection protection rules"
  scope       = "REGIONAL"
  capacity    = 100

  # Rule 1: Block SQL injection in request body
  rule {
    name     = "SQLiBodyPatterns"
    priority = 1

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      regex_pattern_set_reference_statement {
        arn = aws_wafv2_regex_pattern_set.sqli_patterns_body.arn
        field_to_match {
          body {
            oversize_handling = "CONTINUE"
          }
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
        text_transformation {
          priority = 2
          type     = "LOWERCASE"
        }
        text_transformation {
          priority = 3
          type     = "COMPRESS_WHITE_SPACE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-body"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Block SQL injection in query string
  rule {
    name     = "SQLiQueryStringPatterns"
    priority = 2

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      regex_pattern_set_reference_statement {
        arn = aws_wafv2_regex_pattern_set.sqli_patterns_query.arn
        field_to_match {
          query_string {}
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
      metric_name                = "${local.name_prefix}-sqli-query"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Detect SQL injection in URI path
  rule {
    name     = "SQLiURIPatterns"
    priority = 3

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      sqli_match_statement {
        field_to_match {
          uri_path {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-uri"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Block common SQL injection in cookies
  rule {
    name     = "SQLiCookiePatterns"
    priority = 4

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      sqli_match_statement {
        field_to_match {
          cookies {
            match_pattern {
              all {}
            }
            match_scope       = "ALL"
            oversize_handling = "CONTINUE"
          }
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-cookies"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Block SQL injection in JSON body (for API endpoints)
  rule {
    name     = "SQLiJSONBody"
    priority = 5

    action {
      dynamic "block" {
        for_each = var.waf_mode == "BLOCK" ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_mode == "COUNT" ? [1] : []
        content {}
      }
    }

    statement {
      sqli_match_statement {
        field_to_match {
          json_body {
            match_pattern {
              all {}
            }
            match_scope               = "ALL"
            invalid_fallback_behavior = "MATCH"
            oversize_handling         = "CONTINUE"
          }
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-json"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-sqli-custom-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# SQLi Rule Group for Payment Endpoints (Stricter)
# =============================================================================

resource "aws_wafv2_rule_group" "sqli_payment" {
  name        = "${local.name_prefix}-sqli-payment"
  description = "Strict SQL injection protection for payment endpoints"
  scope       = "REGIONAL"
  capacity    = 50

  # Extra strict SQLi for payment paths
  rule {
    name     = "StrictSQLiPayment"
    priority = 1

    action {
      block {}
    }

    statement {
      and_statement {
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
          or_statement {
            statement {
              sqli_match_statement {
                field_to_match {
                  body {
                    oversize_handling = "CONTINUE"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "URL_DECODE"
                }
                text_transformation {
                  priority = 1
                  type     = "HTML_ENTITY_DECODE"
                }
                text_transformation {
                  priority = 2
                  type     = "LOWERCASE"
                }
              }
            }
            statement {
              sqli_match_statement {
                field_to_match {
                  query_string {}
                }
                text_transformation {
                  priority = 0
                  type     = "URL_DECODE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-payment-strict"
      sampled_requests_enabled   = true
    }
  }

  # Extra strict SQLi for cashless paths
  rule {
    name     = "StrictSQLiCashless"
    priority = 2

    action {
      block {}
    }

    statement {
      and_statement {
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
          sqli_match_statement {
            field_to_match {
              json_body {
                match_pattern {
                  all {}
                }
                match_scope               = "ALL"
                invalid_fallback_behavior = "MATCH"
                oversize_handling         = "CONTINUE"
              }
            }
            text_transformation {
              priority = 0
              type     = "URL_DECODE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-sqli-cashless-strict"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-sqli-payment-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "sqli_custom_rule_group_arn" {
  description = "ARN of the custom SQLi rule group"
  value       = aws_wafv2_rule_group.sqli_custom.arn
}

output "sqli_payment_rule_group_arn" {
  description = "ARN of the payment SQLi rule group"
  value       = aws_wafv2_rule_group.sqli_payment.arn
}
