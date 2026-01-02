# Web Application Firewall (WAF) Configuration Guide

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0
**Classification:** CONFIDENTIAL - Infrastructure Security
**Status:** PRODUCTION READY

---

## Table of Contents

1. [Overview](#1-overview)
2. [AWS WAF Architecture](#2-aws-waf-architecture)
3. [Managed Rule Groups](#3-managed-rule-groups)
4. [Custom Rules - SQL Injection Protection](#4-custom-rules---sql-injection-protection)
5. [Custom Rules - XSS Protection](#5-custom-rules---xss-protection)
6. [Rate Limiting Rules](#6-rate-limiting-rules)
7. [Festival-Specific Threat Protection](#7-festival-specific-threat-protection)
8. [IP Reputation Lists](#8-ip-reputation-lists)
9. [Geo-Blocking Policies](#9-geo-blocking-policies)
10. [Bot Detection and Mitigation](#10-bot-detection-and-mitigation)
11. [Logging and Monitoring Integration](#11-logging-and-monitoring-integration)
12. [Incident Response Procedures](#12-incident-response-procedures)
13. [Rule Priority and Order](#13-rule-priority-and-order)
14. [Terraform Configuration](#14-terraform-configuration)
15. [Testing and Validation](#15-testing-and-validation)
16. [Maintenance and Updates](#16-maintenance-and-updates)

---

## 1. Overview

### 1.1 Purpose

The Web Application Firewall (WAF) serves as the first line of defense for the Festival Management Platform, protecting:

- **Web Application (web.festival-platform.com)** - Public-facing festival marketplace
- **Admin Dashboard (admin.festival-platform.com)** - Festival management console
- **API Gateway (api.festival-platform.com)** - Backend REST API
- **Mobile API** - React Native application endpoints

### 1.2 Protection Scope

| Component | Traffic Type | Risk Level | WAF Mode |
|-----------|--------------|------------|----------|
| Web App | Public | High | Block |
| Admin Dashboard | Authenticated | Critical | Block |
| Public API | Mixed | High | Block |
| Webhook Endpoints | Partner IPs | Medium | Block |
| Internal Services | VPC Only | Low | Count Only |

### 1.3 Key Objectives

1. **Prevent OWASP Top 10 attacks** (SQL injection, XSS, CSRF)
2. **Protect payment flows** (PCI-DSS requirement)
3. **Mitigate ticket scalping bots** (festival-specific)
4. **Block DDoS attacks** at layer 7
5. **Enforce geo-compliance** for regional events
6. **Enable forensic analysis** through comprehensive logging

### 1.4 Compliance Alignment

- **PCI-DSS 4.0 Requirement 6.4**: Web application firewall for public-facing applications
- **GDPR Article 32**: Appropriate technical measures for data protection
- **SOC 2 CC6.6**: Logical access security measures

---

## 2. AWS WAF Architecture

### 2.1 Deployment Model

```
                                  +-----------------+
                                  |   Route 53      |
                                  |   DNS           |
                                  +--------+--------+
                                           |
                                           v
                                  +--------+--------+
                                  |   CloudFront    |
                                  |   Distribution  |
                                  +--------+--------+
                                           |
                              +------------+------------+
                              |                         |
                              v                         v
                     +--------+--------+       +--------+--------+
                     |    AWS WAF      |       |    AWS WAF      |
                     |    WebACL       |       |    WebACL       |
                     |   (Frontend)    |       |   (API)         |
                     +--------+--------+       +--------+--------+
                              |                         |
                              v                         v
                     +--------+--------+       +--------+--------+
                     |     ALB         |       |     ALB         |
                     |   (Frontend)    |       |   (API)         |
                     +--------+--------+       +--------+--------+
                              |                         |
                              v                         v
                     +--------+--------+       +--------+--------+
                     |     EKS         |       |     EKS         |
                     |   (Web/Admin)   |       |   (API)         |
                     +-----------------+       +-----------------+
```

### 2.2 WebACL Configuration

**Frontend WebACL (festival-frontend-waf)**
- Associated with: CloudFront Distribution (Web + Admin)
- Scope: CLOUDFRONT
- Default Action: ALLOW
- Capacity Units Used: 1,847 / 5,000

**API WebACL (festival-api-waf)**
- Associated with: Application Load Balancer (API)
- Scope: REGIONAL (eu-west-3)
- Default Action: ALLOW
- Capacity Units Used: 2,134 / 5,000

### 2.3 Resource Associations

```hcl
# CloudFront WAF Association
resource "aws_wafv2_web_acl_association" "frontend" {
  resource_arn = aws_cloudfront_distribution.main.arn
  web_acl_arn  = aws_wafv2_web_acl.frontend.arn
}

# ALB WAF Association
resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}
```

---

## 3. Managed Rule Groups

### 3.1 AWS Managed Rules

| Rule Group | Priority | Action | WCU | Description |
|------------|----------|--------|-----|-------------|
| AWSManagedRulesCommonRuleSet | 10 | Block | 700 | Core OWASP protections |
| AWSManagedRulesKnownBadInputsRuleSet | 20 | Block | 200 | Log4j, Java exploits |
| AWSManagedRulesSQLiRuleSet | 30 | Block | 200 | SQL injection patterns |
| AWSManagedRulesLinuxRuleSet | 40 | Block | 200 | Linux-specific attacks |
| AWSManagedRulesAmazonIpReputationList | 50 | Block | 25 | Known bad IPs |
| AWSManagedRulesAnonymousIpList | 60 | Count | 50 | VPN/Tor detection |
| AWSManagedRulesBotControlRuleSet | 70 | See below | 50 | Bot management |

### 3.2 Rule Overrides

Certain rules may cause false positives in festival operations. Configure overrides:

```hcl
rule {
  name     = "AWS-AWSManagedRulesCommonRuleSet"
  priority = 10

  override_action {
    none {}
  }

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesCommonRuleSet"
      vendor_name = "AWS"

      # Override rules that conflict with legitimate traffic
      rule_action_override {
        # Large body requests for file uploads
        name = "SizeRestrictions_BODY"
        action_to_use {
          count {}
        }
      }

      rule_action_override {
        # QR code data in URLs
        name = "CrossSiteScripting_BODY"
        action_to_use {
          count {}
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "AWSCommonRules"
    sampled_requests_enabled   = true
  }
}
```

### 3.3 Exclusion Patterns

| Path Pattern | Excluded Rules | Reason |
|--------------|----------------|--------|
| `/api/webhooks/stripe` | SizeRestrictions_BODY | Stripe payload size |
| `/api/tickets/validate` | CrossSiteScripting_QUERYARGUMENTS | QR code data |
| `/api/upload/*` | SizeRestrictions_BODY | File uploads |
| `/api/support/attachments` | SizeRestrictions_BODY | Support files |

---

## 4. Custom Rules - SQL Injection Protection

### 4.1 Enhanced SQLi Detection

Beyond AWS managed rules, implement custom patterns for festival-specific SQLi vectors:

```hcl
rule {
  name     = "CustomSQLiProtection"
  priority = 100

  action {
    block {
      custom_response {
        response_code = 403
        custom_response_body_key = "sql_injection_blocked"
      }
    }
  }

  statement {
    or_statement {
      statement {
        # SQL comments in parameters
        regex_pattern_set_reference_statement {
          arn = aws_wafv2_regex_pattern_set.sqli_patterns.arn
          field_to_match {
            all_query_arguments {}
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

      statement {
        # SQLi in request body
        sqli_match_statement {
          field_to_match {
            body {}
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
        # SQLi in headers (injection via User-Agent, Referer)
        sqli_match_statement {
          field_to_match {
            headers {
              match_pattern {
                included_headers = ["user-agent", "referer", "x-forwarded-for"]
              }
              match_scope = "VALUE"
              oversize_handling = "MATCH"
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
    metric_name                = "CustomSQLiProtection"
    sampled_requests_enabled   = true
  }
}
```

### 4.2 SQLi Regex Patterns

```hcl
resource "aws_wafv2_regex_pattern_set" "sqli_patterns" {
  name        = "festival-sqli-patterns"
  description = "Custom SQL injection patterns for festival platform"
  scope       = "REGIONAL"

  regular_expression {
    regex_string = "(?i)(union\\s+select|select\\s+.*\\s+from|insert\\s+into|delete\\s+from|drop\\s+table)"
  }

  regular_expression {
    regex_string = "(?i)(--|#|/\\*|\\*/|;\\s*$)"
  }

  regular_expression {
    regex_string = "(?i)(\\bor\\b\\s+\\d+\\s*=\\s*\\d+|\\band\\b\\s+\\d+\\s*=\\s*\\d+)"
  }

  regular_expression {
    regex_string = "(?i)(benchmark|sleep|waitfor|delay)\\s*\\("
  }

  regular_expression {
    regex_string = "(?i)(concat|char|load_file|into\\s+outfile|into\\s+dumpfile)"
  }

  tags = {
    Environment = "production"
    Purpose     = "sql-injection-protection"
  }
}
```

### 4.3 Parameter-Specific SQLi Protection

Protect festival-specific query parameters:

```hcl
rule {
  name     = "FestivalParameterSQLi"
  priority = 101

  action {
    block {}
  }

  statement {
    and_statement {
      statement {
        # Target specific parameters used in database queries
        regex_pattern_set_reference_statement {
          arn = aws_wafv2_regex_pattern_set.festival_params.arn
          field_to_match {
            single_query_argument {
              name = "festivalId"
            }
          }
          text_transformation {
            priority = 0
            type     = "NONE"
          }
        }
      }
      statement {
        # Non-UUID format indicates potential injection
        not_statement {
          statement {
            regex_match_statement {
              regex_string = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
              field_to_match {
                single_query_argument {
                  name = "festivalId"
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
    metric_name                = "FestivalParameterSQLi"
    sampled_requests_enabled   = true
  }
}
```

---

## 5. Custom Rules - XSS Protection

### 5.1 Enhanced XSS Detection

```hcl
rule {
  name     = "CustomXSSProtection"
  priority = 110

  action {
    block {
      custom_response {
        response_code = 403
        custom_response_body_key = "xss_blocked"
      }
    }
  }

  statement {
    or_statement {
      statement {
        # XSS in query string
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
          text_transformation {
            priority = 2
            type     = "JS_DECODE"
          }
        }
      }

      statement {
        # XSS in body (forms, JSON)
        xss_match_statement {
          field_to_match {
            body {}
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

      statement {
        # XSS in cookies
        xss_match_statement {
          field_to_match {
            cookies {
              match_pattern {
                all {}
              }
              match_scope        = "VALUE"
              oversize_handling  = "MATCH"
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
    metric_name                = "CustomXSSProtection"
    sampled_requests_enabled   = true
  }
}
```

### 5.2 XSS Regex Patterns

```hcl
resource "aws_wafv2_regex_pattern_set" "xss_patterns" {
  name        = "festival-xss-patterns"
  description = "Custom XSS patterns for festival platform"
  scope       = "REGIONAL"

  # Script tags
  regular_expression {
    regex_string = "(?i)<script[^>]*>[\\s\\S]*?</script>"
  }

  # Event handlers
  regular_expression {
    regex_string = "(?i)\\bon\\w+\\s*=\\s*['\"]?[^'\"]*['\"]?"
  }

  # JavaScript protocol
  regular_expression {
    regex_string = "(?i)javascript\\s*:"
  }

  # Data URI with script
  regular_expression {
    regex_string = "(?i)data\\s*:[^;]*;base64"
  }

  # SVG with script
  regular_expression {
    regex_string = "(?i)<svg[^>]*>[\\s\\S]*?</svg>"
  }

  # Eval and function calls
  regular_expression {
    regex_string = "(?i)(eval|setTimeout|setInterval|Function)\\s*\\("
  }

  tags = {
    Environment = "production"
    Purpose     = "xss-protection"
  }
}
```

### 5.3 Content-Type Validation

Block XSS attempts through content-type manipulation:

```hcl
rule {
  name     = "ContentTypeValidation"
  priority = 115

  action {
    block {}
  }

  statement {
    and_statement {
      statement {
        # POST/PUT/PATCH requests
        or_statement {
          statement {
            byte_match_statement {
              field_to_match {
                method {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "POST"
              text_transformation {
                priority = 0
                type     = "UPPERCASE"
              }
            }
          }
          statement {
            byte_match_statement {
              field_to_match {
                method {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "PUT"
              text_transformation {
                priority = 0
                type     = "UPPERCASE"
              }
            }
          }
        }
      }

      statement {
        # Missing or invalid content-type
        not_statement {
          statement {
            regex_match_statement {
              regex_string = "^(application/json|application/x-www-form-urlencoded|multipart/form-data)"
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

      statement {
        # Exclude file upload endpoints
        not_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "STARTS_WITH"
              search_string         = "/api/upload"
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
    metric_name                = "ContentTypeValidation"
    sampled_requests_enabled   = true
  }
}
```

---

## 6. Rate Limiting Rules

### 6.1 Global Rate Limits

```hcl
rule {
  name     = "GlobalRateLimit"
  priority = 200

  action {
    block {
      custom_response {
        response_code = 429
        response_header {
          name  = "Retry-After"
          value = "60"
        }
        custom_response_body_key = "rate_limited"
      }
    }
  }

  statement {
    rate_based_statement {
      limit              = 2000
      aggregate_key_type = "IP"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GlobalRateLimit"
    sampled_requests_enabled   = true
  }
}
```

### 6.2 Endpoint-Specific Rate Limits

| Endpoint | Rate Limit | Window | Aggregate |
|----------|------------|--------|-----------|
| `POST /auth/login` | 10/min | 5 min | IP |
| `POST /auth/register` | 5/min | 5 min | IP |
| `POST /auth/forgot-password` | 3/min | 5 min | IP |
| `POST /tickets/buy` | 30/min | 1 min | IP + UserAgent |
| `POST /cashless/topup` | 20/min | 1 min | IP |
| `GET /festivals` | 100/min | 1 min | IP |
| `POST /api/webhooks/*` | 1000/min | 1 min | IP |

```hcl
# Login Rate Limit
rule {
  name     = "LoginRateLimit"
  priority = 210

  action {
    block {
      custom_response {
        response_code = 429
        custom_response_body_key = "login_rate_limited"
      }
    }
  }

  statement {
    rate_based_statement {
      limit              = 10
      aggregate_key_type = "IP"

      scope_down_statement {
        and_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "/api/auth/login"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            byte_match_statement {
              field_to_match {
                method {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "POST"
              text_transformation {
                priority = 0
                type     = "NONE"
              }
            }
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "LoginRateLimit"
    sampled_requests_enabled   = true
  }
}

# Ticket Purchase Rate Limit (Anti-Scalping)
rule {
  name     = "TicketPurchaseRateLimit"
  priority = 220

  action {
    block {
      custom_response {
        response_code = 429
        custom_response_body_key = "ticket_rate_limited"
      }
    }
  }

  statement {
    rate_based_statement {
      limit              = 30
      aggregate_key_type = "FORWARDED_IP"

      forwarded_ip_config {
        header_name       = "X-Forwarded-For"
        fallback_behavior = "MATCH"
      }

      scope_down_statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "STARTS_WITH"
          search_string         = "/api/tickets"
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
    metric_name                = "TicketPurchaseRateLimit"
    sampled_requests_enabled   = true
  }
}
```

### 6.3 Burst Protection

Protect against sudden traffic spikes during ticket sales:

```hcl
rule {
  name     = "TicketSaleBurstProtection"
  priority = 225

  action {
    block {}
  }

  statement {
    rate_based_statement {
      limit              = 100
      aggregate_key_type = "IP"
      evaluation_window_sec = 60

      scope_down_statement {
        and_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "/api/tickets/buy"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            byte_match_statement {
              field_to_match {
                method {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "POST"
              text_transformation {
                priority = 0
                type     = "NONE"
              }
            }
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "TicketSaleBurstProtection"
    sampled_requests_enabled   = true
  }
}
```

---

## 7. Festival-Specific Threat Protection

### 7.1 Ticket Scalping Bot Detection

```hcl
rule {
  name     = "ScalpingBotDetection"
  priority = 300

  action {
    block {
      custom_response {
        response_code = 403
        custom_response_body_key = "bot_detected"
      }
    }
  }

  statement {
    or_statement {
      # Suspicious User-Agent patterns
      statement {
        regex_pattern_set_reference_statement {
          arn = aws_wafv2_regex_pattern_set.scalping_bot_patterns.arn
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

      # Missing required headers for browser requests
      statement {
        and_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "STARTS_WITH"
              search_string         = "/api/tickets"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            not_statement {
              statement {
                size_constraint_statement {
                  field_to_match {
                    single_header {
                      name = "accept-language"
                    }
                  }
                  comparison_operator = "GT"
                  size                = 0
                  text_transformation {
                    priority = 0
                    type     = "NONE"
                  }
                }
              }
            }
          }
        }
      }

      # Rapid sequential requests with same fingerprint
      statement {
        rate_based_statement {
          limit              = 5
          aggregate_key_type = "CUSTOM_KEYS"

          custom_key {
            header {
              name = "X-Device-Fingerprint"
              text_transformation {
                priority = 0
                type     = "NONE"
              }
            }
          }

          scope_down_statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "/api/tickets/buy"
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
    metric_name                = "ScalpingBotDetection"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_regex_pattern_set" "scalping_bot_patterns" {
  name        = "festival-scalping-bots"
  description = "Known ticket scalping bot signatures"
  scope       = "REGIONAL"

  # Known bot frameworks
  regular_expression {
    regex_string = "(selenium|puppeteer|playwright|phantomjs|headless)"
  }

  # Scripting tools
  regular_expression {
    regex_string = "(python-requests|axios|curl|wget|httpclient|java)"
  }

  # Empty or suspicious user agents
  regular_expression {
    regex_string = "^(mozilla/4\\.0|$)"
  }

  # Known scalping services
  regular_expression {
    regex_string = "(ticketmaster-bot|stubhub|viagogo|seatgeek)"
  }

  tags = {
    Environment = "production"
    Purpose     = "anti-scalping"
  }
}
```

### 7.2 QR Code Fraud Prevention

Protect ticket validation endpoints from QR code guessing attacks:

```hcl
rule {
  name     = "QRCodeFraudPrevention"
  priority = 310

  action {
    block {}
  }

  statement {
    and_statement {
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "STARTS_WITH"
          search_string         = "/api/tickets/validate"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }

      statement {
        rate_based_statement {
          limit              = 20
          aggregate_key_type = "IP"
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "QRCodeFraudPrevention"
    sampled_requests_enabled   = true
  }
}
```

### 7.3 Cashless Wallet Protection

```hcl
rule {
  name     = "CashlessWalletProtection"
  priority = 320

  action {
    block {}
  }

  statement {
    or_statement {
      # Rapid topup attempts (fraud pattern)
      statement {
        and_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "/api/cashless/topup"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            rate_based_statement {
              limit              = 10
              aggregate_key_type = "IP"
            }
          }
        }
      }

      # Multiple payment attempts (card testing)
      statement {
        and_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "EXACTLY"
              search_string         = "/api/cashless/pay"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            rate_based_statement {
              limit              = 30
              aggregate_key_type = "IP"
            }
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CashlessWalletProtection"
    sampled_requests_enabled   = true
  }
}
```

### 7.4 Admin Panel Protection

```hcl
rule {
  name     = "AdminPanelProtection"
  priority = 330

  action {
    block {}
  }

  statement {
    and_statement {
      statement {
        # Admin paths
        or_statement {
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "STARTS_WITH"
              search_string         = "/admin"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
          statement {
            byte_match_statement {
              field_to_match {
                single_header {
                  name = "host"
                }
              }
              positional_constraint = "STARTS_WITH"
              search_string         = "admin."
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
        }
      }

      statement {
        # Not from allowed IPs
        not_statement {
          statement {
            ip_set_reference_statement {
              arn = aws_wafv2_ip_set.admin_allowed_ips.arn
            }
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "AdminPanelProtection"
    sampled_requests_enabled   = true
  }
}
```

---

## 8. IP Reputation Lists

### 8.1 IP Set Configuration

```hcl
# Blocked IPs (known attackers, abuse reports)
resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "festival-blocked-ips"
  description        = "Manually blocked IP addresses"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = [
    # Add blocked IPs here
    # "192.0.2.0/24",
  ]

  tags = {
    Environment = "production"
    Purpose     = "manual-blocklist"
    ManagedBy   = "security-team"
  }
}

# Allowed IPs (partners, staff)
resource "aws_wafv2_ip_set" "allowed_ips" {
  name               = "festival-allowed-ips"
  description        = "Trusted IP addresses (bypass some rules)"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = [
    # Office IPs
    # "203.0.113.0/24",
    # Partner IPs
    # "198.51.100.0/24",
  ]

  tags = {
    Environment = "production"
    Purpose     = "allowlist"
  }
}

# Admin allowed IPs
resource "aws_wafv2_ip_set" "admin_allowed_ips" {
  name               = "festival-admin-ips"
  description        = "IPs allowed to access admin panel"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = [
    # HQ Office
    # "203.0.113.10/32",
    # VPN egress
    # "198.51.100.50/32",
  ]

  tags = {
    Environment = "production"
    Purpose     = "admin-access"
  }
}

# Stripe webhook IPs
resource "aws_wafv2_ip_set" "stripe_ips" {
  name               = "stripe-webhook-ips"
  description        = "Stripe webhook source IPs"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  # Stripe webhook IP ranges (keep updated)
  # https://stripe.com/docs/ips
  addresses = [
    "3.18.12.63/32",
    "3.130.192.231/32",
    "13.235.14.237/32",
    "13.235.122.149/32",
    "18.211.135.69/32",
    "35.154.171.200/32",
    "52.15.183.38/32",
    "54.88.130.119/32",
    "54.88.130.237/32",
    "54.187.174.169/32",
    "54.187.205.235/32",
    "54.187.216.72/32",
  ]

  tags = {
    Environment = "production"
    Purpose     = "stripe-webhooks"
    UpdatedAt   = "2026-01-02"
  }
}
```

### 8.2 Manual Blocklist Rule

```hcl
rule {
  name     = "ManualBlocklist"
  priority = 5  # Highest priority

  action {
    block {
      custom_response {
        response_code = 403
        custom_response_body_key = "access_denied"
      }
    }
  }

  statement {
    ip_set_reference_statement {
      arn = aws_wafv2_ip_set.blocked_ips.arn
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ManualBlocklist"
    sampled_requests_enabled   = true
  }
}
```

### 8.3 Third-Party Threat Intelligence

Integrate with external threat feeds:

```hcl
# AbuseIPDB integration (via Lambda)
resource "aws_wafv2_ip_set" "abuseipdb_blocklist" {
  name               = "abuseipdb-blocklist"
  description        = "IPs from AbuseIPDB with confidence > 90"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = []  # Updated by Lambda function

  lifecycle {
    ignore_changes = [addresses]
  }

  tags = {
    Environment = "production"
    Purpose     = "threat-intel"
    Source      = "abuseipdb"
  }
}

# Update schedule
resource "aws_cloudwatch_event_rule" "update_threat_intel" {
  name                = "update-waf-threat-intel"
  description         = "Update WAF IP sets from threat intelligence"
  schedule_expression = "rate(6 hours)"
}
```

---

## 9. Geo-Blocking Policies

### 9.1 Default Geographic Restrictions

```hcl
rule {
  name     = "GeoBlockHighRiskCountries"
  priority = 400

  action {
    block {
      custom_response {
        response_code = 403
        custom_response_body_key = "geo_blocked"
      }
    }
  }

  statement {
    geo_match_statement {
      country_codes = [
        # High-risk countries (adjust based on threat intelligence)
        "RU",  # Russia
        "CN",  # China
        "KP",  # North Korea
        "IR",  # Iran
        "SY",  # Syria
        "CU",  # Cuba
      ]
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GeoBlockHighRisk"
    sampled_requests_enabled   = true
  }
}
```

### 9.2 Festival-Specific Geo-Restrictions

Allow festival organizers to set event-specific geo-rules:

```hcl
# Festival limited to France (example)
rule {
  name     = "FestivalGeoFrance"
  priority = 410

  action {
    block {}
  }

  statement {
    and_statement {
      statement {
        # Festival-specific path
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "CONTAINS"
          search_string         = "/festivals/hellfest-2026"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }

      statement {
        not_statement {
          statement {
            geo_match_statement {
              country_codes = ["FR", "BE", "CH", "LU", "MC"]  # France + neighbors
            }
          }
        }
      }

      statement {
        # Exclude API calls (mobile app users abroad)
        not_statement {
          statement {
            byte_match_statement {
              field_to_match {
                single_header {
                  name = "x-app-platform"
                }
              }
              positional_constraint = "EXACTLY"
              search_string         = "mobile"
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
    metric_name                = "FestivalGeoFrance"
    sampled_requests_enabled   = true
  }
}
```

### 9.3 Geo Allow List (EU/EEA Focus)

```hcl
# Allow EU/EEA countries for GDPR-compliant operations
resource "aws_wafv2_regex_pattern_set" "eu_countries" {
  name  = "eu-country-codes"
  scope = "REGIONAL"

  # EU/EEA Member States
  regular_expression {
    regex_string = "^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE|IS|LI|NO|CH|GB)$"
  }
}
```

---

## 10. Bot Detection and Mitigation

### 10.1 AWS Bot Control Configuration

```hcl
rule {
  name     = "AWSBotControl"
  priority = 500

  override_action {
    none {}
  }

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesBotControlRuleSet"
      vendor_name = "AWS"

      managed_rule_group_configs {
        aws_managed_rules_bot_control_rule_set {
          inspection_level = "TARGETED"
        }
      }

      # Override for specific bot categories
      rule_action_override {
        # Allow search engine bots
        name = "CategorySearchEngine"
        action_to_use {
          allow {}
        }
      }

      rule_action_override {
        # Block scalper bots
        name = "CategoryScrapingFramework"
        action_to_use {
          block {}
        }
      }

      rule_action_override {
        # Challenge suspicious bots
        name = "SignalAutomatedBrowser"
        action_to_use {
          challenge {}
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "AWSBotControl"
    sampled_requests_enabled   = true
  }
}
```

### 10.2 Custom Bot Categories

| Category | Action | Reason |
|----------|--------|--------|
| SearchEngine (Google, Bing) | Allow | SEO |
| Social (Facebook, Twitter) | Allow | Link previews |
| Advertising (Google Ads) | Count | Monitor |
| ScrapingFramework | Block | Prevent data theft |
| HttpLibrary | Challenge | Verify human |
| AutomatedBrowser | Challenge | Verify human |

### 10.3 CAPTCHA Challenge Configuration

```hcl
rule {
  name     = "BotChallengeTicketPages"
  priority = 510

  action {
    challenge {}
  }

  statement {
    and_statement {
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "STARTS_WITH"
          search_string         = "/tickets/buy"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }

      statement {
        # Bot control signals
        label_match_statement {
          scope = "LABEL"
          key   = "awswaf:managed:aws:bot-control:signal:automated_browser"
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "BotChallengeTicketPages"
    sampled_requests_enabled   = true
  }
}
```

### 10.4 JavaScript Challenge for High-Value Pages

```hcl
rule {
  name     = "JSChallengePaymentPages"
  priority = 520

  action {
    challenge {
      custom_request_handling {
        insert_header {
          name  = "x-waf-challenge"
          value = "passed"
        }
      }
    }
  }

  statement {
    or_statement {
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "CONTAINS"
          search_string         = "/checkout"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "CONTAINS"
          search_string         = "/payment"
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
    metric_name                = "JSChallengePaymentPages"
    sampled_requests_enabled   = true
  }
}
```

### 10.5 Honeypot Traps

Detect automated scanners:

```hcl
rule {
  name     = "HoneypotTrap"
  priority = 530

  action {
    block {}
  }

  statement {
    or_statement {
      # Hidden admin paths
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "EXACTLY"
          search_string         = "/wp-admin"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "EXACTLY"
          search_string         = "/phpmyadmin"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "STARTS_WITH"
          search_string         = "/.env"
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
      statement {
        byte_match_statement {
          field_to_match {
            uri_path {}
          }
          positional_constraint = "STARTS_WITH"
          search_string         = "/.git"
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
    metric_name                = "HoneypotTrap"
    sampled_requests_enabled   = true
  }
}
```

---

## 11. Logging and Monitoring Integration

### 11.1 WAF Logging Configuration

```hcl
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [
    aws_kinesis_firehose_delivery_stream.waf_logs.arn
  ]
  resource_arn = aws_wafv2_web_acl.api.arn

  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }

      condition {
        action_condition {
          action = "COUNT"
        }
      }

      condition {
        label_name_condition {
          label_name = "awswaf:managed:aws:bot-control:bot:category:monitoring"
        }
      }
    }
  }

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}
```

### 11.2 Kinesis Firehose to S3/OpenSearch

```hcl
resource "aws_kinesis_firehose_delivery_stream" "waf_logs" {
  name        = "festival-waf-logs"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.waf_logs.arn

    prefix              = "waf-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "waf-logs-errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/"

    buffering_size     = 5
    buffering_interval = 300

    compression_format = "GZIP"

    processing_configuration {
      enabled = true

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.waf_log_processor.arn}:$LATEST"
        }
      }
    }

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "waf-delivery"
    }
  }

  tags = {
    Environment = "production"
    Purpose     = "waf-logging"
  }
}
```

### 11.3 CloudWatch Metrics

**Key Metrics to Monitor:**

| Metric | Threshold | Alert Action |
|--------|-----------|--------------|
| BlockedRequests | > 1000/5min | Notify Security |
| AllowedRequests | > 50000/5min | Capacity alert |
| CountedRequests | > 500/5min | Review rules |
| ChallengedRequests | > 200/5min | Bot activity |
| RateLimitedRequests | > 100/5min | Attack possible |

```hcl
resource "aws_cloudwatch_metric_alarm" "waf_blocked_spike" {
  alarm_name          = "festival-waf-blocked-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "WAF blocked requests spike detected"

  dimensions = {
    WebACL = aws_wafv2_web_acl.api.name
    Rule   = "ALL"
    Region = "eu-west-3"
  }

  alarm_actions = [
    aws_sns_topic.security_alerts.arn
  ]

  tags = {
    Environment = "production"
    Purpose     = "security-monitoring"
  }
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limit_triggered" {
  alarm_name          = "festival-waf-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 60
  statistic           = "Sum"
  threshold           = 100

  dimensions = {
    WebACL = aws_wafv2_web_acl.api.name
    Rule   = "GlobalRateLimit"
    Region = "eu-west-3"
  }

  alarm_actions = [
    aws_sns_topic.security_alerts.arn
  ]
}
```

### 11.4 Prometheus Integration

Export WAF metrics to Prometheus:

```yaml
# prometheus/waf-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: waf-metrics-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: waf-exporter
  template:
    metadata:
      labels:
        app: waf-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: waf-exporter
      containers:
        - name: exporter
          image: prom/cloudwatch-exporter:latest
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /config
          args:
            - --config.file=/config/cloudwatch.yml
      volumes:
        - name: config
          configMap:
            name: waf-cloudwatch-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: waf-cloudwatch-config
  namespace: monitoring
data:
  cloudwatch.yml: |
    region: eu-west-3
    metrics:
      - aws_namespace: AWS/WAFV2
        aws_metric_name: BlockedRequests
        aws_dimensions: [WebACL, Rule, Region]
        aws_statistics: [Sum]
      - aws_namespace: AWS/WAFV2
        aws_metric_name: AllowedRequests
        aws_dimensions: [WebACL, Rule, Region]
        aws_statistics: [Sum]
      - aws_namespace: AWS/WAFV2
        aws_metric_name: CountedRequests
        aws_dimensions: [WebACL, Rule, Region]
        aws_statistics: [Sum]
```

### 11.5 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Festival WAF Security Dashboard",
    "panels": [
      {
        "title": "Blocked Requests by Rule",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum by (rule) (aws_wafv2_blocked_requests_sum{webacl=\"festival-api-waf\"})",
            "legendFormat": "{{rule}}"
          }
        ]
      },
      {
        "title": "Top Blocked IPs",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by (client_ip) (waf_blocked_requests_total))"
          }
        ]
      },
      {
        "title": "Geographic Distribution of Blocks",
        "type": "geomap",
        "targets": [
          {
            "expr": "sum by (country_code) (waf_blocked_requests_total)"
          }
        ]
      },
      {
        "title": "Rate Limit Triggers",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(aws_wafv2_blocked_requests_sum{rule=~\".*RateLimit.*\"}[5m]))"
          }
        ]
      }
    ]
  }
}
```

### 11.6 SIEM Integration

Forward WAF logs to Splunk/ELK:

```hcl
resource "aws_lambda_function" "waf_to_siem" {
  function_name = "festival-waf-to-siem"
  role          = aws_iam_role.lambda_siem.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 60

  environment {
    variables = {
      SIEM_ENDPOINT = var.siem_endpoint
      SIEM_TOKEN    = var.siem_token
    }
  }

  tags = {
    Environment = "production"
    Purpose     = "security-logging"
  }
}

resource "aws_lambda_permission" "allow_kinesis" {
  statement_id  = "AllowKinesis"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.waf_to_siem.function_name
  principal     = "firehose.amazonaws.com"
  source_arn    = aws_kinesis_firehose_delivery_stream.waf_logs.arn
}
```

---

## 12. Incident Response Procedures

### 12.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 - Critical | Active attack, service impact | < 15 min | DDoS, mass SQLi |
| P2 - High | Attack detected, no impact yet | < 1 hour | Rate limit spikes |
| P3 - Medium | Suspicious patterns | < 4 hours | Bot probing |
| P4 - Low | Policy violations | < 24 hours | Geo blocks |

### 12.2 Incident Response Playbook

#### P1: Active Attack Response

```bash
#!/bin/bash
# scripts/waf-emergency-response.sh

echo "=== WAF Emergency Response ==="

# 1. Enable emergency rate limiting
aws wafv2 update-rule-group \
  --name festival-emergency-rules \
  --scope REGIONAL \
  --id $RULE_GROUP_ID \
  --rules file://emergency-rules.json

# 2. Block attacking IPs
for IP in $(cat attacking-ips.txt); do
  aws wafv2 update-ip-set \
    --name festival-blocked-ips \
    --scope REGIONAL \
    --id $IP_SET_ID \
    --addresses $(aws wafv2 get-ip-set --name festival-blocked-ips --scope REGIONAL --id $IP_SET_ID --query 'IPSet.Addresses' --output text) $IP/32
done

# 3. Enable CloudFront shield advanced
aws shield create-protection \
  --name festival-emergency \
  --resource-arn $CLOUDFRONT_ARN

# 4. Notify team
aws sns publish \
  --topic-arn $SECURITY_TOPIC \
  --subject "P1: WAF Emergency Response Activated" \
  --message "Emergency WAF rules enabled. Review immediately."

echo "Emergency response complete. Monitor dashboards."
```

#### Step-by-Step Response

**Step 1: Detection & Triage (0-5 minutes)**
1. Verify alert is genuine (not false positive)
2. Identify attack vector (SQLi, DDoS, bot)
3. Assess service impact
4. Notify Security Lead

**Step 2: Containment (5-15 minutes)**
1. Enable emergency rate limits
2. Block source IPs if identifiable
3. Enable geo-blocking if attack is regional
4. Activate Shield Advanced if DDoS

**Step 3: Investigation (15-60 minutes)**
1. Analyze WAF logs for patterns
2. Identify targeted endpoints
3. Check for data exfiltration
4. Document timeline

**Step 4: Remediation (1-4 hours)**
1. Create custom rules for attack patterns
2. Update IP blocklists
3. Patch vulnerabilities if found
4. Review and tune existing rules

**Step 5: Recovery (4-24 hours)**
1. Gradually reduce emergency measures
2. Monitor for attack resumption
3. Complete incident report
4. Update runbooks

### 12.3 Communication Templates

**Internal Alert (Slack/Teams):**
```
:rotating_light: WAF ALERT - P1 Active Attack

**Time:** 2026-01-02 14:30 UTC
**Type:** SQL Injection Attempt
**Source:** 45.33.32.0/24 (Data Center - Netherlands)
**Target:** /api/tickets/validate
**Requests Blocked:** 2,547 in last 5 minutes
**Status:** Emergency rules activated

**Actions Taken:**
- IP range blocked
- Rate limit reduced to 50 req/min
- Shield Advanced enabled

**Next Steps:**
1. Security Lead investigating
2. 15-min status update scheduled

cc: @security-team @on-call
```

**Status Page Update:**
```
**Current Status:** Degraded Performance

We are currently investigating elevated traffic patterns affecting our ticketing system. Some users may experience slower response times. Our team is actively working to resolve this.

**Updates:**
- 14:30 UTC: Issue detected
- 14:35 UTC: Mitigation measures activated
- 14:45 UTC: Performance improving

**Last Updated:** 2026-01-02 14:45 UTC
```

### 12.4 Post-Incident Analysis

**Incident Report Template:**

```markdown
# WAF Incident Report

## Summary
- **Incident ID:** WAF-2026-001
- **Date:** 2026-01-02
- **Duration:** 45 minutes
- **Severity:** P1
- **Impact:** 2% of requests blocked (false positive), 5-minute elevated latency

## Timeline
| Time (UTC) | Event |
|------------|-------|
| 14:30 | Anomaly detected - blocked requests > threshold |
| 14:32 | Alert triggered, Security Lead notified |
| 14:35 | Attack identified as SQLi from NL data center |
| 14:40 | IP range blocked, emergency rules activated |
| 14:55 | Attack subsided, monitoring continued |
| 15:15 | Incident closed, normal operations resumed |

## Root Cause
Automated SQL injection attack from compromised cloud instances. Attack exploited insufficient validation on festivalId parameter.

## Impact Assessment
- Requests blocked: 12,547
- Legitimate traffic affected: ~50 requests (0.4%)
- Revenue impact: None (attack blocked before checkout)
- Data exposure: None

## Actions Taken
1. Blocked attacking IP range (/24)
2. Added custom rule for festivalId validation
3. Reduced rate limit temporarily

## Lessons Learned
1. Need faster automated IP blocking
2. Consider adding JS challenge for high-risk endpoints
3. Improve alerting thresholds

## Follow-up Actions
- [ ] Implement automated IP blocking Lambda
- [ ] Add CAPTCHA to ticket purchase flow
- [ ] Review all ID parameters for injection risks
- [ ] Schedule WAF rule review meeting

## Approval
- Security Lead: _____________ Date: _______
- Engineering Lead: _____________ Date: _______
```

### 12.5 Emergency Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| Security On-Call | +33 1 XX XX XX XX | Immediate |
| Security Lead | security@festival-platform.com | P1: 15 min |
| DevOps On-Call | devops@festival-platform.com | P1: 15 min |
| CTO | cto@festival-platform.com | P1: 30 min |
| AWS Support | Premium Support Case | P1: 15 min |

---

## 13. Rule Priority and Order

### 13.1 Rule Priority Matrix

Rules are evaluated in priority order (lowest number = highest priority):

| Priority | Rule Name | Action | Purpose |
|----------|-----------|--------|---------|
| 5 | ManualBlocklist | Block | Known bad IPs |
| 10 | AWSManagedRulesCommonRuleSet | Block | OWASP Top 10 |
| 20 | AWSManagedRulesKnownBadInputsRuleSet | Block | Known exploits |
| 30 | AWSManagedRulesSQLiRuleSet | Block | SQLi protection |
| 40 | AWSManagedRulesLinuxRuleSet | Block | Linux attacks |
| 50 | AWSManagedRulesAmazonIpReputationList | Block | Bad reputation |
| 60 | AWSManagedRulesAnonymousIpList | Count | Anonymous IPs |
| 70 | AWSManagedRulesBotControlRuleSet | Various | Bot control |
| 100 | CustomSQLiProtection | Block | Enhanced SQLi |
| 110 | CustomXSSProtection | Block | Enhanced XSS |
| 115 | ContentTypeValidation | Block | Content-type |
| 200 | GlobalRateLimit | Block | Rate limiting |
| 210 | LoginRateLimit | Block | Auth protection |
| 220 | TicketPurchaseRateLimit | Block | Anti-scalping |
| 225 | TicketSaleBurstProtection | Block | Burst control |
| 300 | ScalpingBotDetection | Block | Bot detection |
| 310 | QRCodeFraudPrevention | Block | QR protection |
| 320 | CashlessWalletProtection | Block | Wallet security |
| 330 | AdminPanelProtection | Block | Admin access |
| 400 | GeoBlockHighRiskCountries | Block | Geo-blocking |
| 500 | AWSBotControl | Various | Advanced bots |
| 510 | BotChallengeTicketPages | Challenge | Bot challenge |
| 520 | JSChallengePaymentPages | Challenge | JS challenge |
| 530 | HoneypotTrap | Block | Scanner detect |
| 999 | AllowTrustedPartners | Allow | Partner bypass |

### 13.2 Rule Capacity Units (WCU)

| WebACL | Used WCU | Max WCU | Utilization |
|--------|----------|---------|-------------|
| festival-frontend-waf | 1,847 | 5,000 | 37% |
| festival-api-waf | 2,134 | 5,000 | 43% |

**WCU Optimization Tips:**
- Combine similar regex patterns into single pattern set
- Use scope_down_statement to limit rule evaluation
- Remove unused or redundant rules
- Use managed rules efficiently

---

## 14. Terraform Configuration

### 14.1 Complete WebACL Configuration

```hcl
# infra/modules/waf/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# API WAF WebACL
resource "aws_wafv2_web_acl" "api" {
  name        = "festival-api-waf"
  description = "WAF for Festival API"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Custom response bodies
  custom_response_body {
    key          = "access_denied"
    content      = "{\"error\":\"Access denied\",\"code\":\"WAF_BLOCKED\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "rate_limited"
    content      = "{\"error\":\"Too many requests\",\"code\":\"RATE_LIMITED\",\"retryAfter\":60}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "sql_injection_blocked"
    content      = "{\"error\":\"Invalid request\",\"code\":\"INVALID_INPUT\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "xss_blocked"
    content      = "{\"error\":\"Invalid request\",\"code\":\"INVALID_INPUT\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "geo_blocked"
    content      = "{\"error\":\"Service not available in your region\",\"code\":\"GEO_RESTRICTED\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "bot_detected"
    content      = "{\"error\":\"Automated access detected\",\"code\":\"BOT_DETECTED\"}"
    content_type = "APPLICATION_JSON"
  }

  # Include all rules here...
  # (Rules from sections 3-10)

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "festival-api-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = "production"
    Service     = "festival-api"
    ManagedBy   = "terraform"
  }
}

# CloudFront WAF WebACL
resource "aws_wafv2_web_acl" "frontend" {
  provider    = aws.us-east-1  # CloudFront requires us-east-1
  name        = "festival-frontend-waf"
  description = "WAF for Festival Frontend (CloudFront)"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Similar rules adapted for frontend...

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "festival-frontend-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = "production"
    Service     = "festival-frontend"
    ManagedBy   = "terraform"
  }
}
```

### 14.2 Variables

```hcl
# infra/modules/waf/variables.tf

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "rate_limit_global" {
  description = "Global rate limit per IP (5 min window)"
  type        = number
  default     = 2000
}

variable "rate_limit_login" {
  description = "Login rate limit per IP (5 min window)"
  type        = number
  default     = 10
}

variable "rate_limit_tickets" {
  description = "Ticket purchase rate limit per IP (1 min window)"
  type        = number
  default     = 30
}

variable "geo_blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = ["RU", "CN", "KP", "IR", "SY", "CU"]
}

variable "admin_allowed_ips" {
  description = "IPs allowed to access admin panel"
  type        = list(string)
  default     = []
}

variable "enable_bot_control" {
  description = "Enable AWS Bot Control managed rules"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "WAF log retention in S3 (days)"
  type        = number
  default     = 90
}
```

### 14.3 Outputs

```hcl
# infra/modules/waf/outputs.tf

output "api_waf_arn" {
  description = "ARN of the API WAF WebACL"
  value       = aws_wafv2_web_acl.api.arn
}

output "frontend_waf_arn" {
  description = "ARN of the Frontend WAF WebACL"
  value       = aws_wafv2_web_acl.frontend.arn
}

output "blocked_ips_set_id" {
  description = "ID of the blocked IPs set"
  value       = aws_wafv2_ip_set.blocked_ips.id
}

output "log_bucket_name" {
  description = "S3 bucket for WAF logs"
  value       = aws_s3_bucket.waf_logs.id
}
```

---

## 15. Testing and Validation

### 15.1 WAF Testing Strategy

| Test Type | Tool | Frequency | Coverage |
|-----------|------|-----------|----------|
| SQLi | sqlmap | Weekly | All inputs |
| XSS | OWASP ZAP | Weekly | All forms |
| Rate Limiting | k6 | Monthly | Critical endpoints |
| Bot Detection | Selenium | Monthly | Purchase flows |
| Geo-blocking | VPN | Quarterly | Regional rules |

### 15.2 SQLi Testing

```bash
#!/bin/bash
# scripts/test-waf-sqli.sh

echo "Testing WAF SQLi Protection..."

# Test 1: Basic SQLi
echo "Test 1: Basic SQL injection"
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.festival-platform.com/api/festivals?id=1%27%20OR%201=1--"
# Expected: 403

# Test 2: Union-based SQLi
echo "Test 2: Union-based SQL injection"
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"festivalId":"1 UNION SELECT * FROM users"}' \
  "https://api.festival-platform.com/api/tickets"
# Expected: 403

# Test 3: Blind SQLi
echo "Test 3: Blind SQL injection"
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.festival-platform.com/api/festivals?id=1%20AND%20SLEEP(5)"
# Expected: 403
```

### 15.3 XSS Testing

```bash
#!/bin/bash
# scripts/test-waf-xss.sh

echo "Testing WAF XSS Protection..."

# Test 1: Script tag
echo "Test 1: Script tag injection"
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}' \
  "https://api.festival-platform.com/api/support/tickets"
# Expected: 403

# Test 2: Event handler
echo "Test 2: Event handler injection"
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.festival-platform.com/api/search?q=<img%20onerror=alert(1)%20src=x>"
# Expected: 403

# Test 3: JavaScript protocol
echo "Test 3: JavaScript protocol"
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url":"javascript:alert(1)"}' \
  "https://api.festival-platform.com/api/profile"
# Expected: 403
```

### 15.4 Rate Limit Testing

```javascript
// scripts/test-waf-ratelimit.js (k6)

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1m',
      duration: '2m',
      preAllocatedVUs: 10,
    },
  },
};

export default function() {
  const res = http.post('https://api.festival-platform.com/api/auth/login', {
    email: 'test@example.com',
    password: 'testpassword',
  });

  check(res, {
    'rate limit triggered': (r) => r.status === 429 || r.status === 200,
  });
}
```

### 15.5 Validation Checklist

**Pre-Deployment:**
- [ ] All managed rules enabled and tested
- [ ] Custom rules reviewed by security team
- [ ] Rate limits appropriate for traffic patterns
- [ ] Geo-blocks align with business requirements
- [ ] IP allowlists verified and up-to-date
- [ ] Logging configured and flowing
- [ ] Alerts configured and tested
- [ ] Runbooks updated and accessible

**Post-Deployment:**
- [ ] No increase in 5xx errors
- [ ] False positive rate < 0.1%
- [ ] Legitimate traffic unaffected
- [ ] Logs appearing in S3/SIEM
- [ ] Metrics visible in Grafana
- [ ] Alerts firing appropriately

---

## 16. Maintenance and Updates

### 16.1 Regular Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Review blocked IPs | Daily | Security Analyst |
| Check false positives | Daily | Security Analyst |
| Update IP allowlists | Weekly | DevOps |
| Review WAF logs | Weekly | Security Lead |
| Update threat intel feeds | Weekly | Automated |
| Review rate limits | Monthly | Security Lead |
| Full rule audit | Quarterly | Security Team |
| Penetration testing | Annually | External |

### 16.2 Rule Update Process

1. **Proposal**
   - Document new rule requirement
   - Estimate WCU impact
   - Identify potential false positives

2. **Development**
   - Create rule in staging environment
   - Set action to COUNT initially
   - Deploy and monitor for 1 week

3. **Validation**
   - Analyze matched requests
   - Verify no legitimate traffic blocked
   - Test edge cases

4. **Deployment**
   - Change action to BLOCK
   - Deploy to production
   - Monitor closely for 48 hours

5. **Documentation**
   - Update this document
   - Update runbooks
   - Notify relevant teams

### 16.3 AWS Managed Rule Updates

AWS regularly updates managed rules. Monitor for updates:

```bash
# Check for managed rule updates
aws wafv2 describe-managed-rule-group \
  --vendor-name AWS \
  --name AWSManagedRulesCommonRuleSet \
  --scope REGIONAL \
  --query 'VersionName'
```

### 16.4 Emergency Rule Deployment

For zero-day vulnerabilities:

```bash
#!/bin/bash
# scripts/emergency-rule-deploy.sh

RULE_NAME=$1
PATTERN=$2

echo "Deploying emergency rule: $RULE_NAME"

# Create emergency regex pattern
aws wafv2 create-regex-pattern-set \
  --name "emergency-${RULE_NAME}" \
  --scope REGIONAL \
  --regular-expression-list RegexString="$PATTERN"

# Update WebACL with emergency rule
# (Use Terraform or manual console for complex changes)

echo "Emergency rule deployed. Monitor for false positives."
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Engineering Team | Initial document |

---

## Quick Reference

### Common Commands

```bash
# View current WebACL rules
aws wafv2 get-web-acl --name festival-api-waf --scope REGIONAL --id $ACL_ID

# Add IP to blocklist
aws wafv2 update-ip-set \
  --name festival-blocked-ips \
  --scope REGIONAL \
  --id $IP_SET_ID \
  --addresses "192.0.2.1/32"

# Get sampled requests (last 3 hours)
aws wafv2 get-sampled-requests \
  --web-acl-arn $ACL_ARN \
  --rule-metric-name CustomSQLiProtection \
  --scope REGIONAL \
  --time-window StartTime=$(date -d '3 hours ago' +%s),EndTime=$(date +%s) \
  --max-items 100

# Enable/disable rule (change action)
# Use Terraform or console for production changes
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| Security On-Call | security-oncall@festival-platform.com |
| AWS Premium Support | via Console |
| Incident Channel | #security-incidents (Slack) |

---

**Next Review:** 2026-04-02 (Quarterly)

**Questions:** Contact security@festival-platform.com
