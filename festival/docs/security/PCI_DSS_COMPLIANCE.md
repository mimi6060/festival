# PCI-DSS Compliance Documentation

## Festival Platform - Payment Card Industry Data Security Standard

**Version:** 1.0
**Last Updated:** 2026-01-02
**Compliance Level:** SAQ A (Service Provider handles card data)

---

## Executive Summary

The Festival Platform processes payments exclusively through Stripe, a PCI-DSS Level 1 certified payment processor. By using Stripe's hosted payment solutions (Stripe Elements, Checkout Sessions), we maintain **SAQ A compliance** as cardholder data never touches our servers.

---

## 1. PCI-DSS Requirements Overview

### 1.1 Compliance Scope

| Requirement | Applicability | Implementation |
|-------------|---------------|----------------|
| Req 1: Firewall | Out of Scope | Card data handled by Stripe |
| Req 2: Default Passwords | Applicable | Enforced via infrastructure |
| Req 3: Protect Stored Data | Out of Scope | No card data stored |
| Req 4: Encrypt Transmission | Applicable | TLS 1.3 enforced |
| Req 5: Antivirus | Out of Scope | Cloud infrastructure |
| Req 6: Secure Systems | Applicable | Security hardening |
| Req 7: Access Control | Applicable | RBAC implemented |
| Req 8: Authentication | Applicable | Strong auth enforced |
| Req 9: Physical Access | Out of Scope | Cloud infrastructure |
| Req 10: Logging | Applicable | Comprehensive logging |
| Req 11: Testing | Applicable | Automated security tests |
| Req 12: Policy | Applicable | Documented policies |

### 1.2 SAQ A Eligibility

We qualify for SAQ A because:
- All payment processing is outsourced to Stripe
- Card data is entered directly into Stripe-hosted forms
- Our systems never receive, process, or store cardholder data
- We only receive payment confirmation tokens

---

## 2. Payment Architecture

### 2.1 Payment Flow

```
[Customer] → [Stripe Elements/Checkout] → [Stripe Servers]
                      ↓
              [Payment Intent ID]
                      ↓
            [Festival Platform API]
                      ↓
              [Order Confirmation]
```

### 2.2 Implementation Details

#### Stripe Integration (payments.service.ts)

```typescript
// Payment intent created server-side
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'eur',
  metadata: {
    userId: dto.userId,
    orderId: dto.orderId,
  },
  automatic_payment_methods: { enabled: true },
});

// Only client_secret and ID returned to frontend
return {
  clientSecret: paymentIntent.client_secret,
  paymentIntentId: paymentIntent.id,
};
```

#### Frontend Integration

```typescript
// Card data captured by Stripe Elements
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${baseUrl}/payment/confirm`,
  },
});
// Card data never touches our servers
```

---

## 3. Security Controls

### 3.1 Network Security (Req 1, 4)

| Control | Implementation |
|---------|----------------|
| TLS Version | TLS 1.3 enforced |
| Certificate | AWS ACM managed |
| HSTS | Enabled with preload |
| Cipher Suites | Modern only (AES-256-GCM) |

**Configuration (nginx):**
```nginx
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
```

### 3.2 Access Control (Req 7, 8)

#### Role-Based Access Control

```typescript
// RBAC roles defined
enum UserRole {
  USER = 'USER',
  STAFF = 'STAFF',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Payment access restricted
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Get('payments/admin/:id')
async getPaymentAdmin(@Param('id') id: string) { ... }
```

#### Authentication Requirements

| Control | Requirement | Implementation |
|---------|-------------|----------------|
| Password Length | Min 12 chars | OWASP validator |
| Password Complexity | Upper, lower, number, special | Enforced |
| MFA | Required for admin | TOTP/WebAuthn |
| Session Timeout | 15 min idle | JWT + refresh |
| Failed Logins | 5 attempts lockout | Rate limiting |

### 3.3 Logging & Monitoring (Req 10)

#### Audit Trail

```typescript
// All payment events logged
interface PaymentAuditLog {
  timestamp: Date;
  eventType: 'PAYMENT_INITIATED' | 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'REFUND_INITIATED';
  userId: string;
  paymentId: string;
  amount: number;
  ipAddress: string;
  userAgent: string;
  // No card data logged
}
```

#### Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Payment Events | 7 years | Encrypted S3 |
| Access Logs | 1 year | CloudWatch |
| Error Logs | 90 days | CloudWatch |
| Audit Logs | 7 years | Encrypted S3 |

### 3.4 Vulnerability Management (Req 6, 11)

#### Security Testing

| Test Type | Frequency | Tool |
|-----------|-----------|------|
| SAST | Every commit | CodeQL |
| DAST | Weekly | OWASP ZAP |
| Dependency Scan | Daily | Snyk |
| Penetration Test | Annual | Third party |

#### Patch Management

- Critical patches: 24 hours
- High patches: 7 days
- Medium patches: 30 days
- Low patches: 90 days

---

## 4. Data Handling

### 4.1 Cardholder Data Matrix

| Data Element | Stored | Encrypted | Location |
|--------------|--------|-----------|----------|
| PAN | No | N/A | Stripe only |
| CVV | No | N/A | Never stored |
| Expiry | No | N/A | Stripe only |
| Cardholder Name | No | N/A | Stripe only |
| Last 4 Digits | Yes | Yes | Display only |
| Payment Token | Yes | Yes | Database |

### 4.2 Data We Store

```typescript
// Payment record (no card data)
interface PaymentRecord {
  id: string;              // Internal ID
  stripePaymentId: string; // pi_xxxx reference
  amount: number;          // Amount in cents
  currency: string;        // Currency code
  status: PaymentStatus;   // Status enum
  userId: string;          // User reference
  metadata: object;        // Order details
  createdAt: Date;
  updatedAt: Date;
  // NO card numbers, CVV, or sensitive data
}
```

### 4.3 Encryption

| Data Type | At Rest | In Transit |
|-----------|---------|------------|
| Payment Tokens | AES-256-GCM | TLS 1.3 |
| User Data | AES-256-GCM | TLS 1.3 |
| Audit Logs | AES-256-GCM | TLS 1.3 |
| Backups | AES-256-GCM | TLS 1.3 |

---

## 5. Third-Party Service Providers

### 5.1 Stripe (Payment Processor)

- **PCI-DSS Level:** 1 (highest)
- **Certification:** Annual audit by QSA
- **Services:** Payment processing, card storage
- **Data Sharing:** Payment tokens only

**Stripe's PCI AOC:** Available at https://stripe.com/docs/security/compliance

### 5.2 AWS (Infrastructure)

- **Certifications:** PCI-DSS, SOC 2, ISO 27001
- **Services:** Compute, storage, networking
- **Compliance:** Shared responsibility model

### 5.3 Service Provider Agreement

All service providers must:
1. Maintain PCI-DSS compliance
2. Provide annual AOC (Attestation of Compliance)
3. Notify of security incidents within 24 hours
4. Allow security assessments

---

## 6. Incident Response

### 6.1 Payment Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Payment data breach | Immediate |
| High | Payment system outage | 1 hour |
| Medium | Failed transactions spike | 4 hours |
| Low | Minor payment errors | 24 hours |

### 6.2 Breach Response Procedure

1. **Contain:** Isolate affected systems
2. **Assess:** Determine scope and impact
3. **Notify:** Alert Stripe and card brands (within 24h)
4. **Remediate:** Fix vulnerability
5. **Report:** File incident report
6. **Review:** Update security controls

### 6.3 Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| Security Team | security@festival-platform.com | 24/7 |
| Stripe Support | dashboard.stripe.com | 24/7 |
| Card Brand Contact | Via Stripe | Business hours |

---

## 7. Employee Security

### 7.1 Security Training

| Training | Frequency | Audience |
|----------|-----------|----------|
| PCI-DSS Awareness | Annual | All staff |
| Secure Coding | Quarterly | Developers |
| Incident Response | Semi-annual | Tech team |
| Social Engineering | Annual | All staff |

### 7.2 Access Provisioning

1. Access granted on need-to-know basis
2. Unique user ID for each employee
3. Access reviewed quarterly
4. Immediate revocation on termination

---

## 8. Compliance Validation

### 8.1 Self-Assessment Questionnaire (SAQ A)

**Due:** Annually
**Responsible:** Security Team
**Validation:** Internal + Stripe dashboard

### 8.2 Quarterly Tasks

- [ ] Review access controls
- [ ] Update security patches
- [ ] Review audit logs
- [ ] Test incident response
- [ ] Validate Stripe integration

### 8.3 Annual Tasks

- [ ] Complete SAQ A
- [ ] Conduct vulnerability scan
- [ ] Review security policies
- [ ] Update employee training
- [ ] Obtain service provider AOCs

---

## 9. Documentation & Evidence

### 9.1 Required Documentation

| Document | Location | Update Frequency |
|----------|----------|------------------|
| This PCI policy | docs/security/ | Annual |
| Network diagram | docs/architecture/ | On change |
| Data flow diagram | docs/architecture/ | On change |
| Incident log | Security dashboard | Real-time |
| Training records | HR system | On completion |

### 9.2 Evidence Retention

- SAQ submissions: 3 years
- Vulnerability scans: 1 year
- Access logs: 1 year
- Training records: 3 years
- Incident reports: 7 years

---

## 10. Appendices

### A. Glossary

| Term | Definition |
|------|------------|
| PAN | Primary Account Number (card number) |
| CVV | Card Verification Value |
| SAQ | Self-Assessment Questionnaire |
| AOC | Attestation of Compliance |
| QSA | Qualified Security Assessor |

### B. References

- [PCI DSS v4.0 Standard](https://www.pcisecuritystandards.org/document_library/)
- [Stripe PCI Compliance](https://stripe.com/docs/security/guide)
- [SAQ A Instructions](https://www.pcisecuritystandards.org/document_library/)

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

---

**Document Owner:** Security Team
**Review Schedule:** Annual
**Next Review:** 2027-01-02
