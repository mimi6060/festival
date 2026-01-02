# PCI-DSS Compliance Requirements

## Festival Management Platform - Payment Card Industry Data Security Standard

**Version:** 1.0
**Date:** 2026-01-02
**Classification:** Confidential
**Compliance Target:** PCI-DSS v4.0 (SAQ A-EP)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope Definition](#2-scope-definition)
3. [Requirements Overview](#3-requirements-overview)
4. [Requirement 1: Network Security](#4-requirement-1-network-security)
5. [Requirement 2: Secure Configuration](#5-requirement-2-secure-configuration)
6. [Requirement 3: Protect Cardholder Data](#6-requirement-3-protect-cardholder-data)
7. [Requirement 4: Encryption in Transit](#7-requirement-4-encryption-in-transit)
8. [Requirement 5: Anti-Malware](#8-requirement-5-anti-malware)
9. [Requirement 6: Secure Development](#9-requirement-6-secure-development)
10. [Requirement 7: Access Control](#10-requirement-7-access-control)
11. [Requirement 8: Authentication](#11-requirement-8-authentication)
12. [Requirement 9: Physical Security](#12-requirement-9-physical-security)
13. [Requirement 10: Logging & Monitoring](#13-requirement-10-logging--monitoring)
14. [Requirement 11: Security Testing](#14-requirement-11-security-testing)
15. [Requirement 12: Security Policies](#15-requirement-12-security-policies)
16. [Implementation Checklist](#16-implementation-checklist)
17. [Compliance Maintenance](#17-compliance-maintenance)

---

## 1. Executive Summary

### 1.1 Overview

Festival Management Platform processes payments for:
- Festival ticket purchases
- Cashless wallet top-ups
- On-site vendor transactions
- Refund processing

### 1.2 Compliance Approach

| Aspect | Details |
|--------|---------|
| **PCI-DSS Version** | 4.0 (effective March 2024) |
| **SAQ Type** | A-EP (E-commerce with partial outsourcing) |
| **Payment Processor** | Stripe (PCI Level 1 Service Provider) |
| **Cardholder Data Stored** | NONE - Full tokenization |
| **Validation Method** | SAQ + Quarterly ASV Scans |

### 1.3 Key Security Principles

1. **Minimize Scope** - No cardholder data touches our systems
2. **Outsource Securely** - Use PCI-certified payment processors
3. **Tokenize Everything** - Only store Stripe tokens/IDs
4. **Defense in Depth** - Multiple layers of security controls

---

## 2. Scope Definition

### 2.1 Cardholder Data Environment (CDE)

**Our CDE is MINIMIZED through Stripe integration:**

| Data Element | PCI Classification | Stored by Us | Processed by Us | Transmitted by Us |
|-------------|-------------------|--------------|-----------------|-------------------|
| Primary Account Number (PAN) | Cardholder Data | NO | NO | NO |
| Cardholder Name | Cardholder Data | NO | NO | NO |
| Expiration Date | Cardholder Data | NO | NO | NO |
| Service Code | Cardholder Data | NO | NO | NO |
| CAV2/CVC2/CVV2/CID | Sensitive Auth Data | NO | NO | NO |
| PIN/PIN Block | Sensitive Auth Data | NO | NO | NO |
| Full Magnetic Stripe | Sensitive Auth Data | NO | NO | NO |

**Data We DO Store (Not Subject to PCI Scope):**

| Data Element | Purpose | Security Level |
|-------------|---------|----------------|
| Stripe Customer ID | Customer reference | Encrypted at rest |
| Stripe Payment Intent ID | Transaction reference | Encrypted at rest |
| Last 4 digits (masked) | Display to user | No special protection needed |
| Transaction amount | Business records | Encrypted at rest |
| Transaction timestamp | Audit trail | Standard protection |

### 2.2 Systems Classification

| System | In Scope | Scope Type | Justification |
|--------|----------|------------|---------------|
| **Web Application (Next.js)** | YES | Connected | Initiates payment, receives webhooks |
| **Mobile App (React Native)** | YES | Connected | Initiates payment flows |
| **API Server (NestJS)** | YES | Connected | Payment orchestration |
| **PostgreSQL Database** | REDUCED | Connected | Tokens only, no card data |
| **Redis Cache** | NO | Out of Scope | No payment data cached |
| **MinIO/S3** | NO | Out of Scope | No payment-related files |
| **Stripe Platform** | N/A | Provider | PCI Level 1 certified |
| **AWS Infrastructure** | REDUCED | Provider | PCI Level 1 certified |

### 2.3 Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC INTERNET                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AWS WAF / Shield                         │
│                     (DDoS Protection)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Load Balancer                │
│                     (TLS Termination)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Web App     │   │   Admin App   │   │   API Server  │
│  (Next.js)    │   │  (Next.js)    │   │  (NestJS)     │
│  Port 3000    │   │  Port 3001    │   │  Port 3333    │
└───────────────┘   └───────────────┘   └───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │    Redis      │   │    MinIO      │
│  Port 5432    │   │  Port 6379    │   │  Port 9000    │
│  (Private)    │   │  (Private)    │   │  (Private)    │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 3. Requirements Overview

### 3.1 SAQ A-EP Applicability Matrix

| Requirement | Full | Partial | N/A | Notes |
|-------------|------|---------|-----|-------|
| Req 1: Network Security | | X | | Firewalls, segmentation |
| Req 2: Secure Configuration | X | | | Remove defaults |
| Req 3: Protect Stored Data | | | X | No card data stored |
| Req 4: Encrypt Transmission | X | | | TLS 1.2+ required |
| Req 5: Anti-Malware | | X | | Server-side only |
| Req 6: Secure Development | X | | | Secure SDLC |
| Req 7: Access Control | X | | | RBAC implementation |
| Req 8: Authentication | X | | | MFA for admin |
| Req 9: Physical Security | | | X | Cloud provider |
| Req 10: Logging | X | | | Audit trails |
| Req 11: Security Testing | X | | | ASV scans, pentests |
| Req 12: Policies | X | | | Documentation |

---

## 4. Requirement 1: Network Security

### 4.1 Install and Maintain Network Security Controls

**Objective:** Protect the CDE from unauthorized network access.

#### 4.1.1 Firewall Configuration

**AWS Security Groups:**

```yaml
# API Server Security Group
api-server-sg:
  inbound:
    - port: 3333
      source: alb-security-group
      protocol: TCP
    - port: 22
      source: bastion-sg
      protocol: TCP
  outbound:
    - port: 443
      destination: 0.0.0.0/0  # Stripe API
      protocol: TCP
    - port: 5432
      destination: database-sg
      protocol: TCP
    - port: 6379
      destination: redis-sg
      protocol: TCP

# Database Security Group
database-sg:
  inbound:
    - port: 5432
      source: api-server-sg
      protocol: TCP
  outbound:
    - all: deny
```

**AWS WAF Rules:**

| Rule | Action | Description |
|------|--------|-------------|
| AWS-AWSManagedRulesCommonRuleSet | Block | OWASP Top 10 |
| AWS-AWSManagedRulesKnownBadInputsRuleSet | Block | Known exploits |
| AWS-AWSManagedRulesSQLiRuleSet | Block | SQL injection |
| AWS-AWSManagedRulesLinuxRuleSet | Block | Linux exploits |
| RateLimit-100 | Block | 100 req/5min per IP |

#### 4.1.2 Network Diagram Requirements

- [ ] Maintain current network diagram
- [ ] Document all connections to/from CDE
- [ ] Review and update quarterly
- [ ] Include all data flows

#### 4.1.3 Implementation Evidence

| Control | Evidence Location |
|---------|-------------------|
| Security Group configs | AWS Console / IaC |
| WAF rules | AWS WAF Console |
| Network diagram | docs/architecture/network-diagram.md |
| Firewall change log | Change management system |

---

## 5. Requirement 2: Secure Configuration

### 5.1 Apply Secure Configurations

**Objective:** Eliminate default credentials and insecure settings.

#### 5.1.1 Vendor Defaults Removed

| System | Default Changed | Evidence |
|--------|----------------|----------|
| PostgreSQL | Password, port | Environment config |
| Redis | Password, bind address | Environment config |
| NestJS | CORS, helmet settings | Application config |
| Node.js | Security headers | Helmet middleware |
| Docker | Non-root user | Dockerfile |

#### 5.1.2 Configuration Standards

**Secure Headers (Helmet.js):**

```typescript
// apps/api/src/main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));
```

**Environment Variables (Never Committed):**

```bash
# Required for payments - NEVER commit actual values
STRIPE_SECRET_KEY=sk_live_xxxxx      # Stripe API key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx    # Webhook signing secret
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx # Public key (can be in code)
```

#### 5.1.3 Hardening Checklist

- [x] Remove/change all default passwords
- [x] Disable unnecessary services
- [x] Configure secure TLS settings
- [x] Implement security headers
- [x] Use non-root Docker users
- [x] Disable directory listing
- [x] Remove server version headers

---

## 6. Requirement 3: Protect Cardholder Data

### 6.1 Data Protection Strategy

**IMPORTANT: We do NOT store any cardholder data.**

#### 6.1.1 Scope Reduction Through Tokenization

**How It Works:**

```
1. Customer → Stripe Checkout (enters card data)
2. Stripe → Tokenizes card → Creates PaymentIntent
3. Stripe → Returns token to our API (no card data)
4. Our API → Stores only: payment_intent_id, last4, amount
5. Stripe → Processes payment → Sends webhook
6. Our API → Updates transaction status (no card data)
```

**What We Store vs. What Stripe Stores:**

| Data | Our Database | Stripe |
|------|--------------|--------|
| Full PAN | NO | YES (encrypted) |
| CVV/CVC | NO | NEVER stored |
| Expiration | NO | YES (encrypted) |
| Cardholder Name | NO | YES |
| Stripe Customer ID | YES | YES |
| Payment Intent ID | YES | YES |
| Last 4 digits | YES | YES |
| Amount | YES | YES |

#### 6.1.2 Data Classification

| Classification | Examples | Protection Required |
|---------------|----------|---------------------|
| Prohibited | Full PAN, CVV, Track data | NEVER stored/processed |
| Sensitive | User passwords, API keys | Encrypted, access controlled |
| Confidential | Transaction details, user PII | Encrypted at rest |
| Internal | Logs, analytics | Access controlled |
| Public | Marketing content | None required |

---

## 7. Requirement 4: Encryption in Transit

### 7.1 Transport Layer Security

**Objective:** Encrypt all transmissions of cardholder data.

#### 7.1.1 TLS Configuration

**Minimum Requirements:**

| Protocol | Version | Status |
|----------|---------|--------|
| TLS 1.0 | Disabled | REQUIRED |
| TLS 1.1 | Disabled | REQUIRED |
| TLS 1.2 | Enabled | MINIMUM |
| TLS 1.3 | Enabled | PREFERRED |
| SSL v2/v3 | Disabled | REQUIRED |

**Cipher Suites (Priority Order):**

```
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_GCM_SHA256
ECDHE-ECDSA-AES256-GCM-SHA384
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-ECDSA-AES128-GCM-SHA256
ECDHE-RSA-AES128-GCM-SHA256
```

#### 7.1.2 Certificate Management

| Certificate | Issuer | Validity | Auto-Renewal |
|-------------|--------|----------|--------------|
| *.festival.com | Let's Encrypt | 90 days | Yes (certbot) |
| api.festival.com | Let's Encrypt | 90 days | Yes |
| admin.festival.com | Let's Encrypt | 90 days | Yes |

#### 7.1.3 Encrypted Connections

| Connection | Encryption | Method |
|------------|------------|--------|
| User → Web App | TLS 1.2+ | AWS ALB |
| Web App → API | TLS 1.2+ | Internal TLS |
| API → Stripe | TLS 1.2+ | Stripe SDK |
| API → Database | TLS 1.2+ | PostgreSQL SSL |
| API → Redis | TLS 1.2+ | Stunnel/TLS |
| Webhook (Stripe → API) | TLS 1.2+ | HTTPS endpoint |

---

## 8. Requirement 5: Anti-Malware

### 8.1 Malware Protection

**Objective:** Protect systems from malicious software.

#### 8.1.1 Server-Side Protection

| Protection Layer | Tool | Frequency |
|-----------------|------|-----------|
| Container Scanning | Trivy | On build |
| Dependency Scanning | Snyk, Dependabot | Daily |
| Runtime Protection | AWS GuardDuty | Continuous |
| File Integrity | AWS CloudWatch | Continuous |

#### 8.1.2 CI/CD Security Scanning

```yaml
# .github/workflows/security.yml
security-scan:
  steps:
    - name: Trivy Container Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'festival-api:latest'
        severity: 'CRITICAL,HIGH'

    - name: Dependency Check
      uses: dependency-check/Dependency-Check_Action@main

    - name: CodeQL Analysis
      uses: github/codeql-action/analyze@v2
```

---

## 9. Requirement 6: Secure Development

### 9.1 Secure Software Development Lifecycle (SSDLC)

**Objective:** Develop and maintain secure systems and applications.

#### 9.1.1 Secure Coding Standards

**Input Validation:**

```typescript
// DTOs with class-validator
export class CreatePaymentDto {
  @IsUUID()
  festivalId: string;

  @IsNumber()
  @Min(1)
  @Max(100000) // Max 1000.00 EUR
  amount: number;

  @IsString()
  @Length(3, 3)
  @IsIn(['EUR', 'USD', 'GBP'])
  currency: string;
}
```

**SQL Injection Prevention (Prisma ORM):**

```typescript
// SAFE - Parameterized queries via Prisma
const payment = await this.prisma.payment.findFirst({
  where: {
    id: paymentId,
    userId: userId,
  },
});

// NEVER do this:
// const result = await prisma.$queryRaw`SELECT * FROM payments WHERE id = ${userInput}`;
```

**XSS Prevention:**

```typescript
// Sanitization middleware
import { sanitize } from 'class-sanitizer';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    if (request.body) {
      sanitize(request.body);
    }
    return next.handle();
  }
}
```

#### 9.1.2 Code Review Requirements

| Criteria | Requirement |
|----------|-------------|
| Minimum reviewers | 1 (2 for payment code) |
| Security-focused review | Required for auth/payment |
| Automated checks | Must pass before merge |
| Payment changes | Senior dev approval |

#### 9.1.3 Vulnerability Management

**Patching Timeline:**

| Severity | SLA | Definition |
|----------|-----|------------|
| Critical | 24 hours | Remote code execution, data breach |
| High | 7 days | Significant security impact |
| Medium | 30 days | Limited security impact |
| Low | 90 days | Minimal security impact |

---

## 10. Requirement 7: Access Control

### 10.1 Restrict Access to Cardholder Data

**Objective:** Limit access to system components to authorized personnel.

#### 10.1.1 Role-Based Access Control (RBAC)

**Platform Roles:**

| Role | Payment Access | Description |
|------|----------------|-------------|
| SUPER_ADMIN | View all transactions | Platform-wide access |
| FESTIVAL_ADMIN | View festival transactions | Single festival |
| ORGANIZER | View own festival data | Festival owner |
| CASHIER | Process payments | Point of sale |
| SECURITY | No payment access | Entry/exit only |
| STAFF | No payment access | General staff |
| USER | Own transactions only | End user |

**Implementation:**

```typescript
// Guards for payment endpoints
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {

  @Get('transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FESTIVAL_ADMIN)
  async getAllTransactions() {
    // Only admins can view all transactions
  }

  @Get('my-transactions')
  @Roles(UserRole.USER)
  async getMyTransactions(@CurrentUser() user: User) {
    // Users can only see their own
    return this.paymentsService.findByUser(user.id);
  }
}
```

#### 10.1.2 Least Privilege Principle

| Access Type | Who | Scope |
|-------------|-----|-------|
| Database (prod) | 2 DBAs | Read/Write |
| Database (read replica) | Developers | Read only |
| Stripe Dashboard | Finance + 1 Dev | Limited |
| AWS Console | DevOps team | Role-based |
| Source Code | All developers | Based on team |
| Production Logs | On-call engineer | Time-limited |

---

## 11. Requirement 8: Authentication

### 11.1 Identify Users and Authenticate Access

**Objective:** Ensure proper identification and authentication.

#### 11.1.1 Authentication Requirements

**Password Policy:**

| Requirement | Value | Implementation |
|-------------|-------|----------------|
| Minimum length | 12 characters | class-validator |
| Complexity | Upper, lower, number, special | Regex validation |
| Password history | Last 4 | Database check |
| Max age | 90 days | Automated reminder |
| Lockout threshold | 5 attempts | Rate limiting |
| Lockout duration | 30 minutes | Automatic unlock |

**Implementation:**

```typescript
// Password validator
export class PasswordValidator {
  private static readonly MIN_LENGTH = 12;
  private static readonly PATTERNS = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  };

  static validate(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Minimum ${this.MIN_LENGTH} characters required`);
    }

    for (const [name, pattern] of Object.entries(this.PATTERNS)) {
      if (!pattern.test(password)) {
        errors.push(`Must contain at least one ${name} character`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

#### 11.1.2 Multi-Factor Authentication (MFA)

**MFA Required For:**

| Access | MFA Required | Method |
|--------|--------------|--------|
| Admin Dashboard | YES | TOTP (Google Auth) |
| Stripe Dashboard | YES | Stripe MFA |
| AWS Console | YES | Hardware key / TOTP |
| Production SSH | YES | SSH key + bastion |
| Regular User Login | Optional | Email OTP |

#### 11.1.3 Session Management

| Setting | Value | Purpose |
|---------|-------|---------|
| Access token expiry | 15 minutes | Short-lived |
| Refresh token expiry | 7 days | Long-lived |
| Idle timeout | 30 minutes | Session termination |
| Concurrent sessions | 3 max | Limit exposure |
| Session binding | IP + User-Agent | Prevent hijacking |

---

## 12. Requirement 9: Physical Security

### 12.1 Physical Access Controls

**Objective:** Restrict physical access to cardholder data.

#### 12.1.1 Cloud Provider Responsibility

We use AWS, which maintains SOC 2 Type II and PCI DSS Level 1 compliance for physical security.

**AWS Responsibilities:**

| Control | AWS Status |
|---------|------------|
| Data center access control | SOC 2 certified |
| Biometric + badge access | Implemented |
| 24/7 video surveillance | Implemented |
| Security guards | Implemented |
| Environmental controls | Implemented |
| Visitor logging | Implemented |

#### 12.1.2 Our Responsibilities

| Location | Control | Implementation |
|----------|---------|----------------|
| Office (if any) | Badge access | Visitor sign-in |
| Developer workstations | Full disk encryption | BitLocker/FileVault |
| Mobile devices | MDM enrollment | Remote wipe capability |
| Removable media | Prohibited for prod data | Policy enforcement |

---

## 13. Requirement 10: Logging & Monitoring

### 13.1 Track and Monitor Access

**Objective:** Track access to network resources and cardholder data.

#### 13.1.1 Audit Log Requirements

**Events to Log:**

| Event Category | Examples | Retention |
|---------------|----------|-----------|
| Authentication | Login, logout, failed attempts | 1 year |
| Authorization | Permission changes, role updates | 1 year |
| Data Access | Payment queries, exports | 1 year |
| Configuration | System config changes | 1 year |
| Security Events | Alerts, blocks, incidents | 3 years |

**Log Format (Structured JSON):**

```json
{
  "timestamp": "2026-01-02T14:30:00.000Z",
  "level": "info",
  "correlationId": "uuid-correlation-id",
  "userId": "uuid-user-id",
  "action": "PAYMENT_INITIATED",
  "resource": "payment",
  "resourceId": "pi_xxx",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "festivalId": "uuid-festival-id",
  "metadata": {
    "amount": 5000,
    "currency": "EUR"
  }
}
```

#### 13.1.2 Monitoring & Alerting

**Alert Conditions:**

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Failed logins > 10/min | Brute force attempt | 5 minutes |
| Error rate > 5% | System issue | 5 minutes |
| Payment failures > 10% | Payment system issue | Immediate |
| Unauthorized access attempt | Security breach | Immediate |
| Config change | Audit trail | 24 hours review |

#### 13.1.3 Log Protection

| Requirement | Implementation |
|-------------|----------------|
| Tamper-proof | CloudWatch Logs (immutable) |
| Access controlled | IAM roles only |
| Time-synchronized | NTP sync (AWS) |
| Backup | Cross-region replication |
| Retention | 1 year minimum |

---

## 14. Requirement 11: Security Testing

### 14.1 Regular Security Testing

**Objective:** Regularly test security systems and processes.

#### 14.1.1 ASV Scanning

**Approved Scanning Vendor (ASV) Schedule:**

| Quarter | Scan Date | Vendor | Status |
|---------|-----------|--------|--------|
| Q1 | March | [TBD] | Scheduled |
| Q2 | June | [TBD] | Scheduled |
| Q3 | September | [TBD] | Scheduled |
| Q4 | December | [TBD] | Scheduled |

**Scan Scope:**
- All public-facing IP addresses
- All web applications
- All API endpoints

#### 14.1.2 Penetration Testing

**Annual Penetration Test:**

| Aspect | Requirement |
|--------|-------------|
| Frequency | Annually + after major changes |
| Scope | External + internal (if applicable) |
| Provider | PCI-certified firm |
| Methodology | OWASP, PTES |
| Focus areas | Payment flow, authentication, API |

#### 14.1.3 Internal Vulnerability Scanning

| Tool | Frequency | Scope |
|------|-----------|-------|
| Trivy | Every build | Container images |
| Snyk | Daily | Dependencies |
| AWS Inspector | Weekly | EC2, ECR |
| SonarQube | Every PR | Source code |
| OWASP ZAP | Weekly | Web applications |

---

## 15. Requirement 12: Security Policies

### 15.1 Maintain Security Policies

**Objective:** Maintain a policy that addresses information security.

#### 15.1.1 Required Policies

| Policy | Location | Review Cycle |
|--------|----------|--------------|
| Information Security Policy | docs/security/policies/ | Annual |
| Acceptable Use Policy | docs/security/policies/ | Annual |
| Access Control Policy | docs/security/policies/ | Annual |
| Incident Response Policy | docs/security/policies/ | Annual |
| Data Classification Policy | docs/security/policies/ | Annual |
| Change Management Policy | docs/security/policies/ | Annual |
| Vendor Management Policy | docs/security/policies/ | Annual |
| Password Policy | docs/security/policies/ | Annual |

#### 15.1.2 Security Awareness Training

| Training | Audience | Frequency |
|----------|----------|-----------|
| General Security Awareness | All staff | Annual |
| PCI-DSS Specific | Payment handlers | Annual |
| Secure Coding | Developers | Annual |
| Incident Response | Security team | Bi-annual |
| Phishing Awareness | All staff | Quarterly |

#### 15.1.3 Risk Assessment

**Annual Risk Assessment Components:**

1. Asset inventory
2. Threat identification
3. Vulnerability assessment
4. Risk scoring (likelihood x impact)
5. Control gap analysis
6. Remediation planning
7. Risk acceptance documentation

---

## 16. Implementation Checklist

### 16.1 Pre-Launch Checklist

#### Network Security (Req 1)
- [ ] Firewall rules configured and documented
- [ ] Network diagram current and accurate
- [ ] WAF rules implemented
- [ ] Segmentation verified

#### Secure Configuration (Req 2)
- [ ] Default credentials changed
- [ ] Unnecessary services disabled
- [ ] Security headers configured
- [ ] TLS properly configured

#### Data Protection (Req 3)
- [ ] Stripe integration verified (no card data stored)
- [ ] Data flow diagram documented
- [ ] Tokenization confirmed working

#### Encryption (Req 4)
- [ ] TLS 1.2+ enforced everywhere
- [ ] Certificates installed and monitored
- [ ] Weak ciphers disabled

#### Anti-Malware (Req 5)
- [ ] Container scanning enabled
- [ ] Dependency scanning active
- [ ] Runtime protection configured

#### Secure Development (Req 6)
- [ ] SSDLC documented
- [ ] Code review process in place
- [ ] Vulnerability management active

#### Access Control (Req 7)
- [ ] RBAC implemented and tested
- [ ] Least privilege enforced
- [ ] Access reviews scheduled

#### Authentication (Req 8)
- [ ] Password policy enforced
- [ ] MFA enabled for admins
- [ ] Session management configured

#### Physical Security (Req 9)
- [ ] Cloud provider compliance verified
- [ ] Workstation encryption enabled

#### Logging (Req 10)
- [ ] Audit logging implemented
- [ ] Log protection configured
- [ ] Alerting set up

#### Testing (Req 11)
- [ ] ASV scans scheduled
- [ ] Penetration test scheduled
- [ ] Internal scanning active

#### Policies (Req 12)
- [ ] All policies documented
- [ ] Training program established
- [ ] Risk assessment completed

---

## 17. Compliance Maintenance

### 17.1 Annual Calendar

| Month | Activity | Owner |
|-------|----------|-------|
| January | Policy review kickoff | Security Lead |
| February | Security training | HR + Security |
| March | Q1 ASV scan | Security Team |
| April | Access review | IT Managers |
| May | Vendor compliance review | Compliance |
| June | Q2 ASV scan | Security Team |
| July | Penetration test | External firm |
| August | Incident response drill | Security Team |
| September | Q3 ASV scan | Security Team |
| October | SAQ A-EP completion | Compliance |
| November | AOC submission | Compliance |
| December | Q4 ASV scan + year-end review | Security Team |

### 17.2 Documentation Requirements

**Maintain evidence for:**
- Firewall configuration and changes
- Access control lists and changes
- Vulnerability scan results
- Penetration test reports
- Training records
- Incident reports
- Policy review records
- Risk assessments

### 17.3 Contacts

| Role | Responsibility |
|------|---------------|
| PCI Compliance Officer | Overall compliance |
| Security Lead | Technical implementation |
| QSA | External validation |
| Stripe Account Manager | Payment provider liaison |
| Acquiring Bank Contact | Merchant compliance |

---

## Appendix A: Stripe Integration Details

### A.1 Payment Flow

```typescript
// Server-side: Create Payment Intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // 50.00 EUR in cents
  currency: 'eur',
  customer: stripeCustomerId,
  metadata: {
    festivalId: festival.id,
    ticketId: ticket.id,
  },
  payment_method_types: ['card'],
});

// Client-side: Redirect to Stripe Checkout
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${baseUrl}/payment/complete`,
  },
});
```

### A.2 Webhook Handling

```typescript
// Verify webhook signature
const signature = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Handle payment events
switch (event.type) {
  case 'payment_intent.succeeded':
    await this.handlePaymentSuccess(event.data.object);
    break;
  case 'payment_intent.payment_failed':
    await this.handlePaymentFailure(event.data.object);
    break;
}
```

---

## Appendix B: Quick Reference Card

### B.1 PCI-DSS SAQ A-EP Summary

| Item | Our Status |
|------|------------|
| Card data stored | NONE |
| Card data processed | NONE (via Stripe) |
| Card data transmitted | NONE |
| SAQ type | A-EP |
| Quarterly ASV scans | REQUIRED |
| Annual penetration test | REQUIRED |
| Annual SAQ completion | REQUIRED |

### B.2 Emergency Contacts

| Situation | Contact |
|-----------|---------|
| Data breach suspected | security@festival.com |
| Stripe issues | Stripe Dashboard / Support |
| Compliance questions | compliance@festival.com |
| After-hours emergency | [On-call rotation] |

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

**Approvals:**

| Role | Name | Date |
|------|------|------|
| Security Lead | [TBD] | [TBD] |
| Compliance Officer | [TBD] | [TBD] |
| CTO | [TBD] | [TBD] |

---

*This document is confidential and intended for internal use only.*
