# =============================================================================
# Cross-Site Scripting (XSS) Protection Rules for Festival Platform
# =============================================================================
# Comprehensive XSS protection including reflected, stored, and DOM-based XSS
# =============================================================================

# =============================================================================
# Regex Pattern Sets for XSS Detection
# =============================================================================

resource "aws_wafv2_regex_pattern_set" "xss_patterns_script" {
  name        = "${local.name_prefix}-xss-patterns-script"
  description = "XSS patterns for script injection detection"
  scope       = "REGIONAL"

  # Script tags and variations
  regular_expression {
    regex_string = "(?i)<script[^>]*>.*?<\\/script>"
  }

  # Event handlers
  regular_expression {
    regex_string = "(?i)\\s(on\\w+)\\s*=\\s*['\"][^'\"]*['\"]"
  }

  # JavaScript protocol
  regular_expression {
    regex_string = "(?i)javascript\\s*:"
  }

  # Data URI with script
  regular_expression {
    regex_string = "(?i)data\\s*:[^;]*;base64"
  }

  # VBScript protocol
  regular_expression {
    regex_string = "(?i)vbscript\\s*:"
  }

  tags = local.common_tags
}

resource "aws_wafv2_regex_pattern_set" "xss_patterns_html" {
  name        = "${local.name_prefix}-xss-patterns-html"
  description = "XSS patterns for HTML injection detection"
  scope       = "REGIONAL"

  # SVG with scripts
  regular_expression {
    regex_string = "(?i)<svg[^>]*onload\\s*="
  }

  # Iframe injection
  regular_expression {
    regex_string = "(?i)<iframe[^>]*>"
  }

  # Object/embed tags
  regular_expression {
    regex_string = "(?i)<(object|embed|applet)[^>]*>"
  }

  # Form injection
  regular_expression {
    regex_string = "(?i)<form[^>]*action\\s*="
  }

  # Meta refresh
  regular_expression {
    regex_string = "(?i)<meta[^>]*http-equiv\\s*=\\s*['\"]refresh['\"]"
  }

  # Base tag hijacking
  regular_expression {
    regex_string = "(?i)<base[^>]*href\\s*="
  }

  tags = local.common_tags
}

resource "aws_wafv2_regex_pattern_set" "xss_patterns_encoded" {
  name        = "${local.name_prefix}-xss-patterns-encoded"
  description = "XSS patterns for encoded/obfuscated attacks"
  scope       = "REGIONAL"

  # HTML encoded script
  regular_expression {
    regex_string = "(?i)(&lt;|%3C|\\\\x3c|\\\\u003c)script"
  }

  # Unicode/hex encoded event handlers
  regular_expression {
    regex_string = "(?i)(\\\\x|\\\\u|%)[0-9a-f]{2,4}(on\\w+)"
  }

  # Expression() CSS injection
  regular_expression {
    regex_string = "(?i)expression\\s*\\("
  }

  # URL encoded angle brackets
  regular_expression {
    regex_string = "(%3C|%3E|%22|%27|%3D)"
  }

  tags = local.common_tags
}

# =============================================================================
# Custom XSS Protection Rule Group
# =============================================================================

resource "aws_wafv2_rule_group" "xss_custom" {
  name        = "${local.name_prefix}-xss-custom"
  description = "Custom XSS protection rules"
  scope       = "REGIONAL"
  capacity    = 150

  # Rule 1: Detect XSS in request body using AWS built-in XSS match
  rule {
    name     = "XSSBodyBuiltIn"
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
      xss_match_statement {
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-body-builtin"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Detect XSS in query string
  rule {
    name     = "XSSQueryString"
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
      xss_match_statement {
        field_to_match {
          query_string {}
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
      metric_name                = "${local.name_prefix}-xss-query"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Detect XSS in URI path
  rule {
    name     = "XSSURIPath"
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
      xss_match_statement {
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
      metric_name                = "${local.name_prefix}-xss-uri"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Detect XSS in cookies
  rule {
    name     = "XSSCookies"
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
      xss_match_statement {
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
      metric_name                = "${local.name_prefix}-xss-cookies"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Detect XSS in JSON body (API endpoints)
  rule {
    name     = "XSSJSONBody"
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
      xss_match_statement {
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
      metric_name                = "${local.name_prefix}-xss-json"
      sampled_requests_enabled   = true
    }
  }

  # Rule 6: Block script tag patterns
  rule {
    name     = "XSSScriptPatterns"
    priority = 6

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
        arn = aws_wafv2_regex_pattern_set.xss_patterns_script.arn
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-script-patterns"
      sampled_requests_enabled   = true
    }
  }

  # Rule 7: Block HTML injection patterns
  rule {
    name     = "XSSHTMLPatterns"
    priority = 7

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
        arn = aws_wafv2_regex_pattern_set.xss_patterns_html.arn
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-html-patterns"
      sampled_requests_enabled   = true
    }
  }

  # Rule 8: Block encoded XSS patterns
  rule {
    name     = "XSSEncodedPatterns"
    priority = 8

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
        arn = aws_wafv2_regex_pattern_set.xss_patterns_encoded.arn
        field_to_match {
          all_query_arguments {}
        }
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-encoded-patterns"
      sampled_requests_enabled   = true
    }
  }

  # Rule 9: Block XSS in headers (Referer, User-Agent, etc.)
  rule {
    name     = "XSSHeaders"
    priority = 9

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
      xss_match_statement {
        field_to_match {
          headers {
            match_pattern {
              included_headers = ["referer", "user-agent", "x-forwarded-for"]
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
      metric_name                = "${local.name_prefix}-xss-headers"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-xss-custom-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# XSS Protection for User-Generated Content Endpoints
# =============================================================================

resource "aws_wafv2_rule_group" "xss_ugc" {
  name        = "${local.name_prefix}-xss-ugc"
  description = "XSS protection for user-generated content endpoints"
  scope       = "REGIONAL"
  capacity    = 75

  # Rule 1: Strict XSS protection for support ticket content
  rule {
    name     = "XSSSupport"
    priority = 1

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/support"
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
          xss_match_statement {
            field_to_match {
              json_body {
                match_pattern {
                  included_paths = ["/message", "/content", "/description"]
                }
                match_scope               = "VALUE"
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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-support"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Strict XSS protection for vendor product descriptions
  rule {
    name     = "XSSVendorProducts"
    priority = 2

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/vendors"
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
          xss_match_statement {
            field_to_match {
              json_body {
                match_pattern {
                  included_paths = ["/name", "/description", "/bio"]
                }
                match_scope               = "VALUE"
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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-vendor-products"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Strict XSS protection for festival descriptions
  rule {
    name     = "XSSFestivalContent"
    priority = 3

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/festivals"
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
          xss_match_statement {
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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-xss-festival-content"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-xss-ugc-group"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "xss_custom_rule_group_arn" {
  description = "ARN of the custom XSS rule group"
  value       = aws_wafv2_rule_group.xss_custom.arn
}

output "xss_ugc_rule_group_arn" {
  description = "ARN of the UGC XSS rule group"
  value       = aws_wafv2_rule_group.xss_ugc.arn
}
