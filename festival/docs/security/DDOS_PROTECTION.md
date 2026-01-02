# DDoS Protection Strategy

**Festival Management Platform**

**Document Version:** 1.0
**Last Updated:** 2026-01-02
**Classification:** CONFIDENTIAL - Internal Use Only
**Owner:** Security Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Threat Landscape](#2-threat-landscape)
3. [Defense-in-Depth Architecture](#3-defense-in-depth-architecture)
4. [AWS Shield Configuration](#4-aws-shield-configuration)
5. [CloudFront Edge Protection](#5-cloudfront-edge-protection)
6. [AWS WAF Rate Limiting](#6-aws-waf-rate-limiting)
7. [API Gateway Throttling](#7-api-gateway-throttling)
8. [Application-Level Throttling](#8-application-level-throttling)
9. [Bot Mitigation](#9-bot-mitigation)
10. [Monitoring and Detection](#10-monitoring-and-detection)
11. [Emergency Response Procedures](#11-emergency-response-procedures)
12. [Communication Templates](#12-communication-templates)
13. [Recovery Procedures](#13-recovery-procedures)
14. [Testing and Validation](#14-testing-and-validation)
15. [Compliance and Reporting](#15-compliance-and-reporting)

---

## 1. Executive Summary

### Overview

The Festival Management Platform implements a comprehensive, multi-layered DDoS protection strategy designed to maintain availability during high-traffic festival events (10,000-500,000 concurrent users) while defending against volumetric, protocol, and application-layer attacks.

### Protection Layers

| Layer | Component | Protection Type | Response Time |
|-------|-----------|-----------------|---------------|
| L1 | AWS Shield | Network/Transport | Automatic |
| L2 | CloudFront | Edge/CDN | < 50ms |
| L3 | AWS WAF | Application Layer | < 100ms |
| L4 | API Gateway | API Throttling | < 100ms |
| L5 | Application | Fine-grained Control | < 200ms |

### Key Metrics

- **Target Availability:** 99.99% (52.56 minutes downtime/year)
- **Maximum Attack Mitigation:** 100 Gbps+ volumetric, 10M+ RPS application
- **Detection Time:** < 30 seconds
- **Automatic Mitigation:** < 60 seconds
- **Manual Escalation:** < 5 minutes

---

## 2. Threat Landscape

### 2.1 Attack Categories

#### Volumetric Attacks (Layer 3/4)

| Attack Type | Description | Peak Volume | Mitigation Layer |
|-------------|-------------|-------------|------------------|
| UDP Flood | Mass UDP packets to random ports | 100+ Gbps | AWS Shield |
| ICMP Flood | Ping flood overwhelming bandwidth | 50+ Gbps | AWS Shield |
| DNS Amplification | Amplified DNS responses | 500+ Gbps | AWS Shield + Route53 |
| NTP Amplification | Amplified NTP responses | 200+ Gbps | AWS Shield |
| SYN Flood | TCP handshake exhaustion | 10M+ PPS | AWS Shield |

#### Protocol Attacks (Layer 4)

| Attack Type | Description | Impact | Mitigation Layer |
|-------------|-------------|--------|------------------|
| SYN-ACK Flood | Reflection attack | Connection exhaustion | AWS Shield |
| Fragmented Packets | Reassembly exhaustion | Memory exhaustion | AWS Shield |
| Ping of Death | Oversized ICMP packets | System crash | AWS Shield |
| Smurf Attack | ICMP broadcast amplification | Bandwidth exhaustion | AWS Shield |

#### Application Layer Attacks (Layer 7)

| Attack Type | Description | Volume | Mitigation Layer |
|-------------|-------------|--------|------------------|
| HTTP Flood | Mass HTTP requests | 100K+ RPS | CloudFront + WAF |
| Slowloris | Slow partial requests | 10K connections | ALB + WAF |
| HTTP POST Flood | Form submission flood | 50K+ RPS | WAF + Rate Limit |
| API Abuse | Expensive endpoint targeting | 10K+ RPS | WAF + App Throttle |
| Credential Stuffing | Login brute force | 1K+ RPS | WAF + CAPTCHA |
| Ticket Scalping Bots | Automated ticket purchase | 5K+ RPS | Bot Control + CAPTCHA |

### 2.2 Festival-Specific Threats

| Scenario | Threat | Expected Traffic | Mitigation |
|----------|--------|------------------|------------|
| Ticket Sale Launch | Bot attacks for scalping | 50K+ RPS spike | CAPTCHA + Queue |
| Festival Opening | Legitimate traffic surge | 500K concurrent | Auto-scaling + CDN |
| Payment Processing | Card testing attacks | 1K+ TPS | Stripe + Rate Limits |
| Artist Announcement | Viral traffic spike | 100K+ RPS | CDN caching |

---

## 3. Defense-in-Depth Architecture

### 3.1 Traffic Flow Diagram

```
                                    INTERNET
                                        |
                                        v
                    +-------------------+-------------------+
                    |           AWS Shield Advanced         |
                    |  (Network/Transport Layer Protection) |
                    +-----------------+---------------------+
                                      |
                    +-----------------v---------------------+
                    |              Route 53                 |
                    |      (DNS DDoS Protection)            |
                    +-----------------+---------------------+
                                      |
                    +-----------------v---------------------+
                    |          CloudFront CDN               |
                    |  - Edge Locations (400+ PoPs)         |
                    |  - Origin Shield                      |
                    |  - CloudFront Functions               |
                    +-----------------+---------------------+
                                      |
                    +-----------------v---------------------+
                    |           AWS WAF v2                  |
                    |  - Managed Rules (Bot, IP Rep)        |
                    |  - Rate Limiting Rules                |
                    |  - Custom CAPTCHA/Challenge           |
                    +-----------------+---------------------+
                                      |
            +-------------------------+-------------------------+
            |                         |                         |
+-----------v-----------+ +-----------v-----------+ +-----------v-----------+
|   Application LB      | |   Application LB      | |   Application LB      |
|   (API Region 1)      | |   (API Region 2)      | |   (API Region 3)      |
+-----------+-----------+ +-----------+-----------+ +-----------+-----------+
            |                         |                         |
+-----------v-----------+ +-----------v-----------+ +-----------v-----------+
|    API Pods (K8s)     | |    API Pods (K8s)     | |    API Pods (K8s)     |
|  - Rate Limit Service | |  - Rate Limit Service | |  - Rate Limit Service |
|  - Redis Cluster      | |  - Redis Cluster      | |  - Redis Cluster      |
+-----------------------+ +-----------------------+ +-----------------------+
```

### 3.2 Protection Layers Summary

| Layer | Service | Scope | Key Features |
|-------|---------|-------|--------------|
| Edge | AWS Shield | Global | DRT access, Cost protection, Automatic mitigation |
| Edge | CloudFront | Global | 400+ PoPs, Origin Shield, HTTP/3 |
| Edge | Route 53 | Global | Anycast DNS, Health checks |
| Application | AWS WAF | Regional/Global | Managed rules, Custom rules, CAPTCHA |
| Infrastructure | ALB | Regional | Connection draining, Cross-zone LB |
| Application | NestJS API | Pod-level | Redis rate limiting, Circuit breaker |

---

## 4. AWS Shield Configuration

### 4.1 Shield Standard (Included)

AWS Shield Standard is automatically enabled for all AWS resources:

- **Protection:** Layer 3/4 DDoS attacks
- **Coverage:** All CloudFront, Route 53, and Global Accelerator resources
- **Cost:** Included with AWS services
- **SLA:** No specific SLA

### 4.2 Shield Advanced Configuration

Shield Advanced provides enhanced protection for the Festival Platform:

```hcl
# Terraform Configuration Reference
# File: infra/security/ddos/shield.tf

resource "aws_shield_subscription" "main" {
  auto_renew = true
  # Minimum 12-month commitment
  # Cost: $3,000/month + data transfer
}
```

#### Protected Resources

| Resource Type | ARN Pattern | Protection Group |
|---------------|-------------|------------------|
| CloudFront Distributions | `arn:aws:cloudfront::*:distribution/*` | cdn-layer |
| Application Load Balancers | `arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*` | api-layer |
| Elastic IPs | `arn:aws:ec2:*:*:eip-allocation/*` | network-layer |
| Route 53 Hosted Zones | `arn:aws:route53:::hostedzone/*` | dns-layer |

#### Protection Groups

```hcl
# Critical Infrastructure Group
resource "aws_shield_protection_group" "critical" {
  protection_group_id = "festival-platform-critical-infra"
  aggregation         = "MAX"
  pattern             = "ARBITRARY"
  members             = [cloudfront_protection_id, alb_protection_id]
}

# Payment Processing Group (PCI-DSS)
resource "aws_shield_protection_group" "payment" {
  protection_group_id = "festival-platform-payment-processing"
  aggregation         = "MAX"
  pattern             = "ARBITRARY"
  # Separate ALB for payment endpoints
}
```

### 4.3 DDoS Response Team (DRT) Access

**DRT Role Configuration:**

```hcl
resource "aws_iam_role" "drt_access" {
  name = "festival-platform-drt-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "drt.shield.amazonaws.com"
      }
    }]
  })
}
```

**DRT Permissions:**

- CloudWatch metrics and alarms
- WAF rule modifications
- Load balancer configuration
- CloudFront distribution settings
- Route 53 health checks

### 4.4 Proactive Engagement

Enable proactive engagement for automatic DRT involvement:

```hcl
resource "aws_shield_proactive_engagement" "main" {
  enabled = true
}
```

**Requirements:**

1. Shield Advanced subscription active
2. Route 53 health checks configured
3. Emergency contacts registered
4. DRT access role configured

### 4.5 Cost Protection

Shield Advanced provides cost protection during attacks:

- **Automatic credits** for scaling charges during verified DDoS attacks
- **Coverage:** EC2, ELB, CloudFront, Route 53, Global Accelerator
- **Claim process:** Automatic via AWS Support case

---

## 5. CloudFront Edge Protection

### 5.1 Distribution Configuration

```hcl
# Reference: infra/cdn/cloudfront.tf

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http3"  # Enables QUIC
  price_class     = "PriceClass_100"

  # WAF Integration
  web_acl_id = aws_wafv2_web_acl.main.arn
}
```

### 5.2 Origin Shield

Origin Shield provides an additional caching layer:

```hcl
origin {
  origin_id = "api-origin"

  origin_shield {
    enabled              = true
    origin_shield_region = "eu-west-1"  # Primary region
  }
}
```

**Benefits:**

- Reduces origin load by 30-50%
- Centralizes cache misses
- Reduces attack surface at origin

### 5.3 Cache Policies

| Path Pattern | Cache Policy | TTL | Purpose |
|--------------|--------------|-----|---------|
| `/_next/static/*` | Immutable | 365 days | Static assets |
| `/api/*` | No Cache | 0 | Dynamic API |
| `/media/*` | Media Content | 1 day | Images/Videos |
| `/fonts/*` | Immutable | 365 days | Font files |

### 5.4 CloudFront Functions

**Security Headers Function:**

```javascript
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  // Security headers
  headers['strict-transport-security'] = {
    value: 'max-age=31536000; includeSubDomains; preload'
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };

  return response;
}
```

### 5.5 Geo-Restriction

For European festival focus:

```hcl
restrictions {
  geo_restriction {
    restriction_type = "whitelist"
    locations        = [
      "FR", "DE", "BE", "NL", "LU", "CH",  # Core markets
      "ES", "IT", "PT", "GB", "IE",         # Secondary markets
      "AT", "PL", "CZ", "DK", "SE", "NO"    # Extended EU
    ]
  }
}
```

---

## 6. AWS WAF Rate Limiting

### 6.1 WAF Web ACL Structure

```hcl
# Reference: infra/security/ddos/rate-limiting.tf

resource "aws_wafv2_web_acl" "main" {
  name        = "festival-platform-rate-limiting-waf"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rules ordered by priority
  # 1. IP Blacklist (highest priority)
  # 2. Global Rate Limit
  # 3. API Rate Limit
  # 4. Auth Rate Limit
  # 5. Payment Rate Limit
  # 6. Managed Rules
}
```

### 6.2 Rate Limit Rules

#### Global Rate Limit

| Mode | Limit | Window | Action |
|------|-------|--------|--------|
| Normal | 2,000 requests | 5 minutes | Count |
| Peak Festival | 10,000 requests | 5 minutes | Count |
| Attack | 500 requests | 5 minutes | Block |

#### Endpoint-Specific Limits

| Endpoint | Limit | Window | Action | Reason |
|----------|-------|--------|--------|--------|
| `/api/auth/login` | 5 | 5 min | Block | Brute force prevention |
| `/api/auth/register` | 3 | 1 hour | Block | Spam prevention |
| `/api/tickets/buy` | 200 | 5 min | Block | Anti-scalping |
| `/api/payments/*` | 100 | 5 min | Block | Fraud prevention |
| `/api/cashless/*` | 100 | 5 min | Block | Transaction limits |

### 6.3 Managed Rule Groups

```hcl
# AWS Managed Rules (included with WAF)
rule {
  name     = "aws-ip-reputation-list"
  priority = 10

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesAmazonIpReputationList"
      vendor_name = "AWS"
    }
  }
}

rule {
  name     = "aws-common-rules"
  priority = 30

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesCommonRuleSet"
      vendor_name = "AWS"
    }
  }
}

rule {
  name     = "aws-sqli-rules"
  priority = 40

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesSQLiRuleSet"
      vendor_name = "AWS"
    }
  }
}
```

### 6.4 IP Sets Management

**Whitelist (Bypass Rate Limiting):**

- Internal office IPs
- VPN gateway IPs
- Partner API IPs
- Load testing infrastructure

**Blacklist (Dynamic Block List):**

- Updated automatically during attacks
- Managed via Lambda function
- Synced across CloudFront and ALB WAFs

```bash
# Emergency IP block command
aws wafv2 update-ip-set \
  --name festival-platform-ip-blacklist \
  --scope CLOUDFRONT \
  --id <ip-set-id> \
  --addresses "1.2.3.4/32" "5.6.7.0/24"
```

---

## 7. API Gateway Throttling

### 7.1 Usage Plans

```hcl
# Reference: infra/security/ddos/rate-limiting.tf

resource "aws_api_gateway_usage_plan" "main" {
  name = "festival-platform-usage-plan"

  # Global throttle
  throttle_settings {
    burst_limit = 5000   # Peak: 5000
    rate_limit  = 2000   # Sustained: 2000 RPS
  }

  # Daily quota
  quota_settings {
    limit  = 100000  # Peak: 100K/day
    period = "DAY"
  }
}
```

### 7.2 Method-Level Throttling

| Method Path | Burst | Rate | Purpose |
|-------------|-------|------|---------|
| `POST /auth/*` | 20 | 10 | Authentication endpoints |
| `POST /payments/*` | 50 | 20 | Payment processing |
| `POST /tickets/buy` | 100 | 50 | Ticket purchases |
| `GET /analytics/*` | 10 | 5 | Heavy reporting |

### 7.3 API Keys for Partners

```hcl
resource "aws_api_gateway_api_key" "partner" {
  name        = "partner-${var.partner_name}"
  enabled     = true
  description = "API key for ${var.partner_name}"
}
```

---

## 8. Application-Level Throttling

### 8.1 NestJS Rate Limit Service

The application implements distributed rate limiting using Redis:

```typescript
// Reference: apps/api/src/common/services/rate-limit.service.ts

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
  algorithm?: 'sliding_window' | 'token_bucket' | 'fixed_window' | 'leaky_bucket';
  cost?: number;
  burstLimit?: number;
}

@Injectable()
export class RateLimitService {
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    // Redis-based distributed rate limiting
    // Falls back to in-memory if Redis unavailable
  }
}
```

### 8.2 Rate Limit Configuration

```typescript
// Reference: apps/api/src/common/config/rate-limit.config.ts

export const ENDPOINT_LIMITS = {
  auth: {
    login: { limit: 5, windowSeconds: 300, perUser: false },
    register: { limit: 3, windowSeconds: 3600, perUser: false },
    forgotPassword: { limit: 3, windowSeconds: 3600, perUser: false },
  },
  payments: {
    checkout: { limit: 10, windowSeconds: 60, perUser: true, cost: 5 },
    refund: { limit: 5, windowSeconds: 300, perUser: true, cost: 10 },
  },
  tickets: {
    buy: { limit: 10, windowSeconds: 60, perUser: true, cost: 5 },
    validate: { limit: 120, windowSeconds: 60, perUser: true },
  },
};
```

### 8.3 Plan-Based Quotas

| Plan | Requests/Min | Requests/Hour | Requests/Day |
|------|--------------|---------------|--------------|
| FREE | 60 | 1,000 | 10,000 |
| PREMIUM | 300 | 10,000 | 100,000 |
| ENTERPRISE | 1,000 | 50,000 | 500,000 |
| INTERNAL | 100,000 | 1,000,000 | 10,000,000 |

### 8.4 Response Headers

Standard rate limit headers returned:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704153600
X-RateLimit-Window: 60
X-RateLimit-Policy: sliding_window
X-RateLimit-Plan: PREMIUM
```

---

## 9. Bot Mitigation

### 9.1 AWS WAF Bot Control

```hcl
# Reference: infra/security/ddos/bot-mitigation.tf

rule {
  name     = "aws-bot-control-targeted"
  priority = 1

  statement {
    managed_rule_group_statement {
      name        = "AWSManagedRulesBotControlRuleSet"
      vendor_name = "AWS"

      managed_rule_group_configs {
        aws_managed_rules_bot_control_rule_set {
          inspection_level        = "TARGETED"
          enable_machine_learning = true
        }
      }
    }
  }
}
```

### 9.2 Bot Categories

| Category | Action | Headers Added |
|----------|--------|---------------|
| Verified Bots (Google, Bing) | Allow | `x-bot-category: verified` |
| Scraping Bots | CAPTCHA | `x-bot-category: scraping` |
| HTTP Libraries | Challenge | `x-bot-category: http-library` |
| Automation Tools | Block | `x-bot-category: automation` |
| Bad Bots | Block | `x-bot-blocked: true` |

### 9.3 CAPTCHA Configuration

```hcl
# CAPTCHA for suspicious activities
captcha_config {
  immunity_time_property {
    immunity_time = 300  # 5 minutes
  }
}

# JavaScript Challenge
challenge_config {
  immunity_time_property {
    immunity_time = 300  # 5 minutes
  }
}
```

**CAPTCHA Triggers:**

- More than 10 login attempts in 5 minutes
- Ticket purchase endpoint (anti-scalping)
- Suspicious user-agent patterns
- Geographic anomalies

### 9.4 Blocked User Agents

```hcl
# Block known bad user agents
statement {
  or_statement {
    statement {
      byte_match_statement {
        search_string = "curl/"
        field_to_match { single_header { name = "user-agent" } }
      }
    }
    statement {
      byte_match_statement {
        search_string = "python-requests"
        field_to_match { single_header { name = "user-agent" } }
      }
    }
    statement {
      byte_match_statement {
        search_string = "scrapy"
        field_to_match { single_header { name = "user-agent" } }
      }
    }
  }
}
```

---

## 10. Monitoring and Detection

### 10.1 CloudWatch Alarms

```hcl
# DDoS Detection Alarm
resource "aws_cloudwatch_metric_alarm" "ddos_detected" {
  alarm_name          = "festival-platform-ddos-attack-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
  ok_actions    = [aws_sns_topic.ddos_alerts.arn]
}

# Attack Volume Alarm
resource "aws_cloudwatch_metric_alarm" "attack_volume" {
  alarm_name  = "festival-platform-ddos-attack-volume"
  threshold   = 1000000000  # 1 Gbps
  metric_name = "AttackBitsPerSecond"
}

# Request Rate Anomaly
resource "aws_cloudwatch_metric_alarm" "request_rate_anomaly" {
  alarm_name = "festival-platform-request-rate-anomaly"
  # Uses ANOMALY_DETECTION_BAND
  threshold_metric_id = "ad1"
}
```

### 10.2 Key Metrics

| Metric | Namespace | Threshold | Severity |
|--------|-----------|-----------|----------|
| DDoSDetected | AWS/DDoSProtection | > 0 | CRITICAL |
| AttackBitsPerSecond | AWS/DDoSProtection | > 1 Gbps | HIGH |
| AttackPacketsPerSecond | AWS/DDoSProtection | > 100K PPS | HIGH |
| AttackRequestsPerSecond | AWS/DDoSProtection | > 10K RPS | MEDIUM |
| BlockedRequests (WAF) | AWS/WAFV2 | > 1000/min | MEDIUM |
| 5XXError (CloudFront) | AWS/CloudFront | > 1% | HIGH |

### 10.3 SNS Alerting

```hcl
resource "aws_sns_topic" "ddos_alerts" {
  name = "festival-platform-ddos-alerts"
}

# Email subscriptions
resource "aws_sns_topic_subscription" "ddos_email" {
  for_each = toset([
    "security@festival-platform.com",
    "ops@festival-platform.com",
    "oncall@festival-platform.com"
  ])

  topic_arn = aws_sns_topic.ddos_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}
```

### 10.4 Grafana Dashboards

**DDoS Protection Dashboard includes:**

- Real-time request rate
- Blocked requests by rule
- Geographic distribution of traffic
- Top attacking IPs
- Shield protection status
- WAF rule match counts
- Origin server health

---

## 11. Emergency Response Procedures

### 11.1 Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| SEV-1 | Platform unavailable | Immediate | CTO + AWS DRT |
| SEV-2 | Degraded performance | < 15 minutes | Engineering Lead |
| SEV-3 | Elevated attack traffic | < 30 minutes | On-call Engineer |
| SEV-4 | Suspicious patterns | < 2 hours | Security Team |

### 11.2 Response Flowchart

```
                    +-------------------+
                    |  Alert Triggered  |
                    +--------+----------+
                             |
                    +--------v----------+
                    | Assess Severity   |
                    +--------+----------+
                             |
          +------------------+------------------+
          |                  |                  |
    +-----v-----+      +-----v-----+      +-----v-----+
    |   SEV-1   |      |   SEV-2   |      | SEV-3/4   |
    +-----+-----+      +-----+-----+      +-----+-----+
          |                  |                  |
    +-----v-----+      +-----v-----+      +-----v-----+
    | Page All  |      | Page Eng  |      | Notify    |
    | + AWS DRT |      | Lead      |      | Team      |
    +-----+-----+      +-----+-----+      +-----+-----+
          |                  |                  |
    +-----v-------------------------------------------+
    |            Mitigation Actions                   |
    | 1. Enable enhanced rate limiting                |
    | 2. Block attacking IPs                          |
    | 3. Enable geographic restrictions               |
    | 4. Scale infrastructure                         |
    | 5. Enable CAPTCHA challenges                    |
    +-----+-------------------------------------------+
          |
    +-----v-----+
    | Monitor   |
    | & Adjust  |
    +-----+-----+
          |
    +-----v-----+
    | All Clear |
    | Post-     |
    | mortem    |
    +-----------+
```

### 11.3 Immediate Actions Checklist

#### First 5 Minutes

- [ ] Acknowledge alert in PagerDuty/OpsGenie
- [ ] Open incident channel (#incident-ddos in Slack)
- [ ] Check AWS Shield console for attack details
- [ ] Check CloudFront metrics for origin health
- [ ] Check ALB target health
- [ ] Notify stakeholders of potential impact

#### First 15 Minutes

- [ ] Identify attack vector (volumetric/protocol/application)
- [ ] Review top attacking IPs in WAF logs
- [ ] Enable stricter rate limiting if needed
- [ ] Add attacking IPs to blacklist
- [ ] Consider geographic restrictions
- [ ] Enable CAPTCHA challenges
- [ ] Contact AWS DRT if SEV-1/SEV-2

#### First 30 Minutes

- [ ] Scale origin infrastructure if needed
- [ ] Enable Origin Shield if not active
- [ ] Review and adjust WAF rules
- [ ] Enable CloudFront caching for static content
- [ ] Consider failover to backup region
- [ ] Update status page

### 11.4 Emergency Commands

**Block IP Range:**

```bash
# Add IP to WAF blacklist
aws wafv2 update-ip-set \
  --name festival-platform-ip-blacklist \
  --scope CLOUDFRONT \
  --id "$IP_SET_ID" \
  --lock-token "$LOCK_TOKEN" \
  --addresses "$(aws wafv2 get-ip-set --name festival-platform-ip-blacklist --scope CLOUDFRONT --id "$IP_SET_ID" --query 'IPSet.Addresses' --output text) 1.2.3.0/24"
```

**Enable Peak Mode:**

```bash
# Switch to peak traffic mode (higher limits)
terraform apply -var="enable_peak_mode=true" \
  -target=module.ddos_protection
```

**Scale API Pods:**

```bash
# Emergency scale-out
kubectl scale deployment/api --replicas=20 -n production
```

**Enable Maintenance Mode:**

```bash
# Redirect to maintenance page
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/*"

# Update CloudFront behavior to serve maintenance page
```

### 11.5 AWS DRT Engagement

**When to Contact DRT:**

1. Attack exceeds 10 Gbps volumetric
2. Attack impacts availability
3. Standard mitigations ineffective
4. Need custom WAF rule assistance

**DRT Contact Process:**

1. Open AWS Support case (Severity: Critical)
2. Select "DDoS attack mitigation assistance"
3. Provide attack details:
   - Start time
   - Affected resources (ARNs)
   - Attack vector if known
   - Current impact
   - Mitigations attempted

**DRT Response:**

- Initial response: 15 minutes (Shield Advanced SLA)
- DRT will analyze traffic patterns
- DRT may modify WAF rules on your behalf
- DRT provides attack forensics report

---

## 12. Communication Templates

### 12.1 Internal Alert Template

```
Subject: [INCIDENT] DDoS Attack Detected - SEV-{LEVEL}

Severity: SEV-{LEVEL}
Time Detected: {TIMESTAMP} UTC
Status: {INVESTIGATING|MITIGATING|RESOLVED}

Impact:
- {DESCRIPTION OF IMPACT}
- Affected Services: {LIST}
- User Impact: {ESTIMATE}

Attack Details:
- Type: {VOLUMETRIC|PROTOCOL|APPLICATION}
- Volume: {X} Gbps / {Y} RPS
- Source: {GEOGRAPHIC/IP RANGE}
- Target: {CLOUDFRONT|ALB|API}

Current Actions:
1. {ACTION 1}
2. {ACTION 2}
3. {ACTION 3}

Next Update: {TIME} or upon significant change

Incident Commander: {NAME}
War Room: #incident-ddos (Slack)
Bridge: {ZOOM/MEET LINK}
```

### 12.2 Executive Summary Template

```
Subject: DDoS Incident Summary - {DATE}

Executive Summary:
On {DATE} at {TIME} UTC, our platform experienced a {TYPE} DDoS attack
targeting {TARGET}. The attack peaked at {VOLUME} and lasted {DURATION}.

Business Impact:
- Service availability: {X}% during incident
- Estimated affected users: {COUNT}
- Revenue impact: {ESTIMATE}
- Reputational impact: {ASSESSMENT}

Response Timeline:
- {TIME}: Attack detected
- {TIME}: Incident declared
- {TIME}: Mitigation activated
- {TIME}: Attack mitigated
- {TIME}: All-clear declared

Root Cause:
{BRIEF DESCRIPTION}

Prevention Measures:
1. {MEASURE 1}
2. {MEASURE 2}
3. {MEASURE 3}

Cost:
- AWS Shield coverage: Yes/No
- Scaling costs: ${X}
- AWS credits applied: ${Y}

Lessons Learned:
{SUMMARY}
```

### 12.3 Customer Communication Template

**Status Page Update:**

```
Title: Service Degradation Due to Network Attack

Status: {INVESTIGATING|IDENTIFIED|MONITORING|RESOLVED}

{TIMESTAMP} UTC - Update:
We are currently experiencing elevated traffic levels that are impacting
some services. Our team is actively working to restore normal operations.

Affected Services:
- Ticket Purchase: {OPERATIONAL|DEGRADED|MAJOR OUTAGE}
- Account Access: {OPERATIONAL|DEGRADED|MAJOR OUTAGE}
- Payment Processing: {OPERATIONAL|DEGRADED|MAJOR OUTAGE}
- Mobile App: {OPERATIONAL|DEGRADED|MAJOR OUTAGE}

What We're Doing:
Our security and infrastructure teams have implemented additional
protections and are monitoring the situation closely.

Next Update:
We will provide another update in {X} minutes or when significant
changes occur.

We apologize for any inconvenience this may cause.
```

### 12.4 Post-Incident Customer Email

```
Subject: Service Incident Resolution - {DATE}

Dear Customer,

We wanted to follow up regarding the service disruption that occurred
on {DATE} between {START_TIME} and {END_TIME} UTC.

What Happened:
Our platform experienced a distributed denial-of-service (DDoS) attack
that temporarily affected service availability.

Your Data:
Your data remained secure throughout this incident. No customer data
was accessed, compromised, or lost.

Our Response:
Our security team successfully mitigated the attack and restored
normal operations within {DURATION}. We have implemented additional
protections to prevent similar incidents.

Compensation (if applicable):
{COMPENSATION DETAILS}

Questions:
If you have any questions, please contact our support team at
support@festival-platform.com.

We apologize for any inconvenience and thank you for your patience.

Sincerely,
The Festival Platform Team
```

---

## 13. Recovery Procedures

### 13.1 Service Restoration Checklist

#### Immediate Post-Attack

- [ ] Confirm attack has subsided (CloudWatch metrics stable)
- [ ] Verify all services operational (health checks green)
- [ ] Check origin server health and resource usage
- [ ] Review blocked legitimate traffic (false positives)
- [ ] Gradually relax emergency rate limits
- [ ] Monitor for attack resurgence

#### Within 1 Hour

- [ ] Remove emergency IP blocks (legitimate sources)
- [ ] Restore normal rate limiting thresholds
- [ ] Disable emergency CAPTCHA (if applicable)
- [ ] Verify payment processing functional
- [ ] Test critical user flows
- [ ] Update status page to "Resolved"

#### Within 24 Hours

- [ ] Collect attack forensics from AWS
- [ ] Export WAF logs for analysis
- [ ] Document timeline and actions
- [ ] Calculate infrastructure costs
- [ ] File AWS Shield cost protection claim (if applicable)
- [ ] Begin post-mortem analysis

### 13.2 Infrastructure Recovery

**Scale Down Procedure:**

```bash
# Gradual scale-down after attack
kubectl scale deployment/api --replicas=10 -n production
# Wait 30 minutes, monitor metrics
kubectl scale deployment/api --replicas=5 -n production
# Return to normal after 1 hour stable
kubectl scale deployment/api --replicas=3 -n production
```

**Restore Normal WAF Rules:**

```bash
# Disable peak mode
terraform apply -var="enable_peak_mode=false" \
  -target=module.ddos_protection

# Clear emergency blacklist entries
aws wafv2 update-ip-set \
  --name festival-platform-ip-blacklist-emergency \
  --scope CLOUDFRONT \
  --id "$IP_SET_ID" \
  --addresses ""
```

### 13.3 Post-Mortem Requirements

**Required Documentation:**

1. **Timeline:** Minute-by-minute account of events
2. **Metrics:** Graphs showing attack and mitigation
3. **Actions:** All commands and changes made
4. **Impact:** User impact assessment
5. **Cost:** Infrastructure and business cost
6. **Root Cause:** Why protections didn't prevent impact
7. **Action Items:** Improvements with owners and deadlines

**Post-Mortem Template:**

```markdown
# DDoS Incident Post-Mortem - {DATE}

## Summary
{ONE PARAGRAPH SUMMARY}

## Impact
- Duration: {X} hours
- Users Affected: {COUNT}
- Revenue Impact: ${X}
- SLA Impact: {X}% availability

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Attack detected |
| HH:MM | ... |
| HH:MM | Incident resolved |

## Root Cause
{DETAILED ANALYSIS}

## What Went Well
- {ITEM 1}
- {ITEM 2}

## What Didn't Go Well
- {ITEM 1}
- {ITEM 2}

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| {ACTION} | {NAME} | {DATE} | {STATUS} |

## Lessons Learned
{SUMMARY}
```

---

## 14. Testing and Validation

### 14.1 Regular Testing Schedule

| Test Type | Frequency | Owner | Method |
|-----------|-----------|-------|--------|
| Table-top Exercise | Quarterly | Security Team | Scenario-based discussion |
| Runbook Validation | Monthly | On-call Engineers | Execute runbooks |
| WAF Rule Testing | After changes | DevOps | Controlled traffic |
| Load Testing | Before major events | SRE | k6/Artillery |
| Failover Testing | Bi-annually | Infrastructure | Region failover |

### 14.2 Load Testing Guidelines

**Pre-Festival Load Test:**

```javascript
// k6 load test script
// Reference: scripts/k6-load-test.js

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp-up
    { duration: '10m', target: 5000 },  // Sustained load
    { duration: '5m', target: 10000 },  // Peak simulation
    { duration: '5m', target: 0 },      // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

**Coordination Requirements:**

1. Notify AWS 72 hours before large-scale tests
2. Whitelist load testing IPs in WAF
3. Schedule during low-traffic windows
4. Have rollback plan ready
5. Monitor all protection layers

### 14.3 Chaos Engineering

**Periodic Failure Injection:**

- WAF rule misconfiguration simulation
- Origin server failure simulation
- Rate limit threshold testing
- CloudFront failover testing

---

## 15. Compliance and Reporting

### 15.1 Regulatory Requirements

| Framework | Requirement | Our Implementation |
|-----------|-------------|-------------------|
| PCI-DSS | 11.4 - IDS/IPS | AWS Shield + WAF |
| SOC 2 | CC6.6 - Boundary protection | Multi-layer DDoS |
| GDPR | Art. 32 - Security measures | DDoS protection |
| ISO 27001 | A.13.1 - Network security | Defense-in-depth |

### 15.2 Reporting Schedule

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| DDoS Protection Status | Weekly | Security Team | Metrics, blocked traffic |
| Incident Report | Per incident | Executive Team | Impact, response, lessons |
| Quarterly Security Review | Quarterly | Board | Trends, investments, risks |
| Annual Penetration Test | Annually | Auditors | External assessment |

### 15.3 Metrics for Reporting

**Key Performance Indicators:**

- Mean Time to Detect (MTTD): Target < 30 seconds
- Mean Time to Mitigate (MTTM): Target < 5 minutes
- Availability during attacks: Target > 99.9%
- False positive rate: Target < 0.1%
- Attack mitigation success rate: Target > 99%

---

## Appendix A: Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Security Lead | {NAME} | {PHONE} | security@festival-platform.com |
| DevOps Lead | {NAME} | {PHONE} | devops@festival-platform.com |
| CTO | {NAME} | {PHONE} | cto@festival-platform.com |
| AWS TAM | {NAME} | {PHONE} | {EMAIL} |
| AWS DRT | N/A | Support Case | N/A |

## Appendix B: Resource ARNs

| Resource | ARN |
|----------|-----|
| CloudFront Distribution | `arn:aws:cloudfront::{ACCOUNT}:distribution/{ID}` |
| API ALB | `arn:aws:elasticloadbalancing:{REGION}:{ACCOUNT}:loadbalancer/app/{NAME}` |
| WAF Web ACL | `arn:aws:wafv2::{ACCOUNT}:global/webacl/{NAME}/{ID}` |
| SNS DDoS Alerts | `arn:aws:sns:{REGION}:{ACCOUNT}:festival-platform-ddos-alerts` |

## Appendix C: Terraform Module Reference

| Module | Path | Description |
|--------|------|-------------|
| Shield | `infra/security/ddos/shield.tf` | AWS Shield Advanced configuration |
| Rate Limiting | `infra/security/ddos/rate-limiting.tf` | WAF rate limiting rules |
| Bot Mitigation | `infra/security/ddos/bot-mitigation.tf` | Bot control and CAPTCHA |
| Protection Groups | `infra/security/ddos/protection-groups.tf` | Shield protection groups |
| CloudFront | `infra/cdn/cloudfront.tf` | CDN configuration |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

---

**Next Review Date:** 2026-04-02

**Questions:** Contact security@festival-platform.com
