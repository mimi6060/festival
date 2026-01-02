# =============================================================================
# Bot Mitigation Configuration
# Festival Management Platform - CAPTCHA, Fingerprinting, JS Challenge
# =============================================================================
#
# Multi-layer bot detection:
# 1. AWS WAF Bot Control (managed rules)
# 2. CAPTCHA Challenge (hCaptcha/reCAPTCHA)
# 3. JavaScript Challenge
# 4. Device Fingerprinting
# 5. Behavioral Analysis
# =============================================================================

# =============================================================================
# Variables
# =============================================================================

variable "captcha_immunity_time" {
  description = "Time in seconds a valid CAPTCHA token remains valid"
  type        = number
  default     = 300  # 5 minutes
}

variable "challenge_immunity_time" {
  description = "Time in seconds a valid JS challenge token remains valid"
  type        = number
  default     = 300  # 5 minutes
}

variable "enable_captcha" {
  description = "Enable CAPTCHA challenges for suspicious traffic"
  type        = bool
  default     = true
}

variable "enable_js_challenge" {
  description = "Enable JavaScript challenges"
  type        = bool
  default     = true
}

# =============================================================================
# WAF Bot Control Rules with CAPTCHA
# =============================================================================

resource "aws_wafv2_web_acl" "bot_mitigation" {
  name        = "${var.project_name}-bot-mitigation"
  description = "Bot mitigation with CAPTCHA and JS challenges"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: AWS Managed Bot Control with targeted rules
  rule {
    name     = "aws-bot-control-targeted"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "TARGETED"  # More aggressive detection

            enable_machine_learning = true
          }
        }

        # Override specific rules to use CAPTCHA instead of block
        rule_action_override {
          name = "CategoryScrapingBot"

          action_to_use {
            captcha {
              custom_request_handling {
                insert_header {
                  name  = "x-bot-category"
                  value = "scraping"
                }
              }
            }
          }
        }

        rule_action_override {
          name = "CategoryHttpLibrary"

          action_to_use {
            challenge {
              custom_request_handling {
                insert_header {
                  name  = "x-bot-category"
                  value = "http-library"
                }
              }
            }
          }
        }

        rule_action_override {
          name = "SignalNonBrowserUserAgent"

          action_to_use {
            captcha {
              custom_request_handling {
                insert_header {
                  name  = "x-bot-signal"
                  value = "non-browser-ua"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-bot-control-targeted"
      sampled_requests_enabled  = true
    }
  }

  # Rule 2: CAPTCHA for suspicious login attempts
  rule {
    name     = "captcha-suspicious-login"
    priority = 2

    action {
      captcha {
        custom_request_handling {
          insert_header {
            name  = "x-captcha-required"
            value = "login-protection"
          }
        }
      }
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string        = "/api/auth/login"

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
          rate_based_statement {
            limit              = 10  # More than 10 login attempts in 5 min
            aggregate_key_type = "IP"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-captcha-login"
      sampled_requests_enabled  = true
    }
  }

  # Rule 3: JavaScript Challenge for API access
  rule {
    name     = "js-challenge-api"
    priority = 3

    action {
      challenge {}
    }

    statement {
      and_statement {
        statement {
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

        statement {
          not_statement {
            statement {
              byte_match_statement {
                positional_constraint = "CONTAINS"
                search_string        = "application/json"

                field_to_match {
                  single_header {
                    name = "content-type"
                  }
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }

        # Only challenge if no valid token
        statement {
          not_statement {
            statement {
              byte_match_statement {
                positional_constraint = "EXACTLY"
                search_string        = "valid"

                field_to_match {
                  single_header {
                    name = "x-aws-waf-token-status"
                  }
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
      metric_name               = "${var.project_name}-js-challenge-api"
      sampled_requests_enabled  = true
    }
  }

  # Rule 4: CAPTCHA for ticket purchase (anti-scalping)
  rule {
    name     = "captcha-ticket-purchase"
    priority = 4

    action {
      captcha {
        custom_request_handling {
          insert_header {
            name  = "x-captcha-required"
            value = "ticket-purchase"
          }
        }
      }
    }

    statement {
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-captcha-ticket"
      sampled_requests_enabled  = true
    }
  }

  # Rule 5: Block known bad bots
  rule {
    name     = "block-bad-bots"
    priority = 5

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "curl/"

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

        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "python-requests"

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

        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "scrapy"

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

        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "phantomjs"

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

        statement {
          byte_match_statement {
            positional_constraint = "EXACTLY"
            search_string        = ""

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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-block-bad-bots"
      sampled_requests_enabled  = true
    }
  }

  # Rule 6: Challenge automation tools
  rule {
    name     = "challenge-automation"
    priority = 6

    action {
      challenge {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "headless"

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

        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "selenium"

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

        statement {
          byte_match_statement {
            positional_constraint = "CONTAINS"
            search_string        = "puppeteer"

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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${var.project_name}-challenge-automation"
      sampled_requests_enabled  = true
    }
  }

  # CAPTCHA configuration
  captcha_config {
    immunity_time_property {
      immunity_time = var.captcha_immunity_time
    }
  }

  # Challenge configuration
  challenge_config {
    immunity_time_property {
      immunity_time = var.challenge_immunity_time
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-bot-mitigation"
    sampled_requests_enabled  = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-bot-mitigation"
  })
}

# =============================================================================
# CloudWatch Alarms for Bot Detection
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "bot_requests_high" {
  alarm_name          = "${var.project_name}-high-bot-traffic"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CountedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 10000
  alarm_description   = "High bot traffic detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = "${var.project_name}-bot-mitigation"
    Rule   = "aws-bot-control-targeted"
    Region = "global"
  }

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-high-bot-traffic"
  })
}

resource "aws_cloudwatch_metric_alarm" "captcha_failures" {
  alarm_name          = "${var.project_name}-captcha-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CaptchaRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "High number of CAPTCHA challenges - possible bot attack"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = "${var.project_name}-bot-mitigation"
    Region = "global"
  }

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-captcha-failures"
  })
}

# =============================================================================
# Outputs
# =============================================================================

output "bot_mitigation_waf_arn" {
  description = "ARN of the bot mitigation WAF Web ACL"
  value       = aws_wafv2_web_acl.bot_mitigation.arn
}

output "bot_mitigation_waf_id" {
  description = "ID of the bot mitigation WAF Web ACL"
  value       = aws_wafv2_web_acl.bot_mitigation.id
}

output "captcha_config" {
  description = "CAPTCHA configuration"
  value = {
    immunity_time = var.captcha_immunity_time
    enabled       = var.enable_captcha
  }
}

output "challenge_config" {
  description = "Challenge configuration"
  value = {
    immunity_time = var.challenge_immunity_time
    enabled       = var.enable_js_challenge
  }
}
