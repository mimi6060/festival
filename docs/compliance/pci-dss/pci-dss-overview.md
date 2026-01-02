# PCI-DSS Compliance Overview

## Festival Management Platform - Payment Security Documentation

**Version:** 1.0
**Date:** 2026-01-02
**Classification:** Confidential
**Compliance Level:** SAQ A-EP

---

## 1. Executive Summary

Festival Management Platform is designed to process payments for festival ticketing, cashless top-ups, and vendor transactions while maintaining full PCI-DSS compliance. This document outlines our compliance approach, scope, and implementation strategy.

### Key Compliance Points

- **PCI-DSS Version:** 4.0
- **SAQ Type:** A-EP (E-commerce merchants with partial outsourcing)
- **Payment Processor:** Stripe
- **Card Data Storage:** None (tokenization via Stripe)
- **Annual Assessment Date:** [To be scheduled]

---

## 2. Business Context

### 2.1 Payment Scenarios

| Scenario | Description | Volume Estimate |
|----------|-------------|-----------------|
| Ticket Purchase | Online ticket sales for festivals | 10,000 - 500,000/event |
| Cashless Top-up | Digital wallet recharge | 50,000 - 2,000,000/event |
| Vendor Payments | Food, drinks, merchandise | 100,000 - 5,000,000/event |
| Refunds | Ticket cancellation, cashless refund | 1% - 5% of transactions |

### 2.2 Payment Methods Supported

- Credit Cards (Visa, Mastercard, Amex)
- Debit Cards
- Apple Pay / Google Pay
- Bancontact, iDEAL, SEPA Direct Debit (region-specific)

---

## 3. PCI-DSS Scope

### 3.1 Cardholder Data Environment (CDE)

**Our CDE is MINIMIZED through Stripe integration:**

| Data Type | Stored by Us? | Processed by Us? | Transmitted by Us? |
|-----------|---------------|------------------|-------------------|
| PAN (Card Number) | NO | NO | NO |
| CVV/CVC | NO | NO | NO |
| Cardholder Name | NO | NO | NO |
| Expiration Date | NO | NO | NO |
| Stripe Customer ID | YES | YES | YES |
| Stripe Payment Intent ID | YES | YES | YES |
| Transaction Amount | YES | YES | YES |
| Last 4 digits (masked) | YES | YES | YES |

### 3.2 Scope Justification

We qualify for SAQ A-EP because:

1. **All payment pages are hosted by Stripe** (Stripe Checkout / Stripe Elements)
2. **No cardholder data enters our servers**
3. **Payment processing is entirely outsourced to Stripe**
4. **We only store tokenized references** (Stripe IDs)

### 3.3 Systems in Scope

| System | Scope Status | Justification |
|--------|--------------|---------------|
| Web Application (Next.js) | IN SCOPE | Redirects to Stripe, receives webhooks |
| Mobile App (React Native) | IN SCOPE | Initiates payment flow |
| API Server (NestJS) | IN SCOPE | Payment orchestration, webhook handling |
| Database (PostgreSQL) | REDUCED SCOPE | Stores tokens only, no card data |
| Redis Cache | OUT OF SCOPE | No payment data cached |
| Stripe Platform | PROVIDER | PCI-DSS Level 1 certified |

---

## 4. Compliance Requirements Summary

### 4.1 SAQ A-EP Requirements

| Requirement | Applicable | Our Implementation |
|-------------|-----------|-------------------|
| Req 1: Firewall Configuration | YES | AWS Security Groups, WAF |
| Req 2: Vendor Defaults | YES | All defaults changed |
| Req 3: Protect Stored Data | REDUCED | No card data stored |
| Req 4: Encrypt Transmission | YES | TLS 1.2+ everywhere |
| Req 5: Anti-malware | LIMITED | Server-side scanning |
| Req 6: Secure Systems | YES | Secure SDLC, patching |
| Req 7: Access Control | YES | RBAC, least privilege |
| Req 8: Authentication | YES | MFA, strong passwords |
| Req 9: Physical Security | REDUCED | Cloud infrastructure |
| Req 10: Logging | YES | Comprehensive audit logs |
| Req 11: Security Testing | YES | Quarterly ASV scans |
| Req 12: Security Policies | YES | Complete policy set |

---

## 5. Security Architecture

### 5.1 Payment Flow Overview

```
[Customer Browser]
        |
        | (1) Initiates payment
        v
[Festival Web/Mobile App]
        |
        | (2) Creates Payment Intent via API
        v
[Festival API Server]
        |
        | (3) Calls Stripe API
        v
[Stripe Platform]
        |
        | (4) Returns client_secret
        v
[Festival API Server]
        |
        | (5) Returns payment session
        v
[Festival Web/Mobile App]
        |
        | (6) Redirects to Stripe Checkout
        v
[Stripe Checkout Page] <-- Card data entered HERE only
        |
        | (7) Processes payment
        v
[Stripe Platform]
        |
        | (8) Sends webhook
        v
[Festival API Server]
        |
        | (9) Updates order status
        v
[Database (tokens only)]
```

### 5.2 Network Security

- All traffic encrypted with TLS 1.2 or higher
- AWS WAF protecting public endpoints
- DDoS protection via AWS Shield
- VPC isolation for backend services
- Security Groups restricting access

---

## 6. Key Controls

### 6.1 Technical Controls

| Control | Implementation | Frequency |
|---------|---------------|-----------|
| Vulnerability Scanning | AWS Inspector, Snyk | Weekly |
| ASV Scanning | Qualys | Quarterly |
| Penetration Testing | External firm | Annually |
| Code Security Review | SonarQube, CodeQL | Per commit |
| Dependency Scanning | Dependabot, Snyk | Daily |

### 6.2 Administrative Controls

| Control | Implementation | Frequency |
|---------|---------------|-----------|
| Security Training | Online modules | Annually |
| Access Reviews | Manager approval | Quarterly |
| Policy Reviews | Security team | Annually |
| Incident Response Drills | Tabletop exercises | Bi-annually |

### 6.3 Physical Controls

| Control | Implementation | Provider |
|---------|---------------|----------|
| Data Center Security | SOC 2 Type II | AWS |
| Access Control | Biometric + badges | AWS |
| Video Surveillance | 24/7 monitoring | AWS |
| Environmental Controls | Fire, flood, power | AWS |

---

## 7. Third-Party Providers

### 7.1 Service Providers

| Provider | Service | PCI-DSS Status | AOC Available |
|----------|---------|----------------|---------------|
| Stripe | Payment Processing | Level 1 | Yes |
| AWS | Cloud Infrastructure | Level 1 | Yes |
| Sentry | Error Monitoring | SOC 2 | Yes |
| SendGrid | Email Service | SOC 2 | Yes |

### 7.2 Provider Management

- Annual review of provider compliance status
- Contractual requirements for PCI compliance
- Incident notification requirements
- Data handling agreements

---

## 8. Documentation Index

### 8.1 Primary Documents

| Document | Location | Purpose |
|----------|----------|---------|
| SAQ A-EP | [saq-a-ep.md](./saq-a-ep.md) | Self-assessment questionnaire |
| Scope Reduction | [scope-reduction.md](./scope-reduction.md) | Scope minimization strategy |
| Evidence Collection | [evidence-collection.md](./evidence-collection.md) | Audit evidence guide |

### 8.2 Requirement Documents

| Document | Location |
|----------|----------|
| Req 1: Firewalls | [req1-firewall.md](./req1-firewall.md) |
| Req 2: Defaults | [req2-defaults.md](./req2-defaults.md) |
| Req 3: Data Protection | [req3-protect-data.md](./req3-protect-data.md) |
| Req 4: Encryption | [req4-encryption.md](./req4-encryption.md) |
| Req 5: Anti-malware | [req5-antivirus.md](./req5-antivirus.md) |
| Req 6: Secure Systems | [req6-secure-systems.md](./req6-secure-systems.md) |
| Req 7: Access Control | [req7-access-control.md](./req7-access-control.md) |
| Req 8: Authentication | [req8-authentication.md](./req8-authentication.md) |
| Req 9: Physical Security | [req9-physical.md](./req9-physical.md) |
| Req 10: Logging | [req10-logging.md](./req10-logging.md) |
| Req 11: Testing | [req11-testing.md](./req11-testing.md) |
| Req 12: Policies | [req12-policies.md](./req12-policies.md) |

### 8.3 Architecture Documents

| Document | Location |
|----------|----------|
| Payment Flow | [payment-flow.md](./payment-flow.md) |
| Data Flow Diagram | [data-flow-diagram.md](./data-flow-diagram.md) |
| Network Diagram | [network-diagram.md](./network-diagram.md) |

### 8.4 Technical Controls

| Document | Location |
|----------|----------|
| Stripe Integration | [stripe-integration.md](./stripe-integration.md) |
| Tokenization | [tokenization.md](./tokenization.md) |
| Key Management | [key-management.md](./key-management.md) |

### 8.5 Procedures

| Document | Location |
|----------|----------|
| Incident Response | [incident-response.md](./incident-response.md) |
| Change Management | [change-management.md](./change-management.md) |
| Vulnerability Management | [vulnerability-management.md](./vulnerability-management.md) |

---

## 9. Compliance Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| PCI Compliance Officer | [TBD] | compliance@festival.com | [TBD] |
| Security Lead | [TBD] | security@festival.com | [TBD] |
| QSA Contact | [TBD] | [TBD] | [TBD] |
| Stripe Account Manager | [TBD] | [TBD] | [TBD] |

---

## 10. Annual Compliance Calendar

| Month | Activity | Responsible |
|-------|----------|-------------|
| January | Annual policy review | Security Lead |
| February | Security awareness training | HR + Security |
| March | Q1 ASV scan | Security Team |
| April | Access review | IT + Managers |
| May | Vendor compliance review | Compliance Officer |
| June | Q2 ASV scan | Security Team |
| July | Penetration test | External QSA |
| August | Incident response drill | Security Team |
| September | Q3 ASV scan | Security Team |
| October | SAQ A-EP completion | Compliance Officer |
| November | AOC submission to acquirer | Compliance Officer |
| December | Q4 ASV scan | Security Team |

---

## 11. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

---

**Approved by:** [Name, Title]
**Date:** [Date]
**Next Review:** [Date + 1 year]
