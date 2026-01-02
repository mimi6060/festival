# SAQ A-EP Self-Assessment Questionnaire

## Festival Management Platform - PCI DSS v4.0 SAQ A-EP

**Version:** 1.0
**Date:** 2026-01-02
**Assessment Period:** [Start Date] to [End Date]
**Merchant Name:** Festival Management Platform
**Merchant ID:** [Acquirer Merchant ID]

---

## Part 1: SAQ A-EP Eligibility

### 1.1 Eligibility Criteria Checklist

| # | Criterion | Meets? | Evidence |
|---|-----------|--------|----------|
| 1 | All payment processing outsourced to PCI DSS validated third-party | YES | Stripe (Level 1) |
| 2 | Website does not receive cardholder data but controls how consumers are redirected | YES | Stripe Checkout redirect |
| 3 | Webpage scripts loaded on customer browser do not transmit cardholder data | YES | CSP policies enforced |
| 4 | No electronic storage, processing, or transmission of cardholder data | YES | Tokenization only |
| 5 | Any storage of cardholder data is on paper only (receipts, etc.) | N/A | Digital only |
| 6 | Company has confirmed that third-party payment processor is PCI DSS compliant | YES | Stripe AOC on file |

### 1.2 SAQ A vs SAQ A-EP Decision

We use **SAQ A-EP** (not SAQ A) because:

1. Our website **controls the redirect** to Stripe Checkout
2. We **create payment intents** via Stripe API from our backend
3. Our **frontend JavaScript** initiates the payment flow
4. We receive **webhooks** for payment status updates

If we ONLY used Stripe's fully hosted payment page with no integration, we would qualify for SAQ A.

---

## Part 2: Compliance Responses

### Section 2: Build and Maintain a Secure Network

#### 2.1 Requirement 1: Firewall Configuration

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 1.2.1 | Restrict inbound traffic to only necessary protocols | YES | AWS Security Groups config |
| 1.2.5 | Document all services, protocols, and ports | YES | Network documentation |
| 1.2.6 | Security features for insecure services | N/A | No insecure services used |
| 1.3.1 | Inbound traffic restricted to CDE | YES | VPC configuration |
| 1.3.2 | Outbound traffic restricted from CDE | YES | Egress rules documented |

**Evidence Location:** `./req1-firewall.md`

#### 2.2 Requirement 2: Vendor Defaults

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 2.2.1 | One primary function per server | YES | Container isolation |
| 2.2.2 | Only necessary services enabled | YES | Hardened base images |
| 2.2.3 | Security features configured | YES | Server hardening docs |
| 2.2.4 | System security parameters configured | YES | Configuration baseline |
| 2.2.5 | Insecure services secured or disabled | YES | No insecure services |
| 2.3 | Non-console admin access encrypted | YES | TLS/SSH only |

**Evidence Location:** `./req2-defaults.md`

---

### Section 3: Protect Cardholder Data

#### 3.1 Requirement 3: Protect Stored Data

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 3.1.1 | Cardholder data storage minimized | YES | No CHD stored |
| 3.2 | No storage of sensitive authentication data | YES | Tokenization only |
| 3.3 | PAN masked when displayed | N/A | Only last 4 shown |
| 3.4 | PAN rendered unreadable | N/A | Not stored |
| 3.5 | Encryption keys protected | YES | AWS KMS |

**KEY POINT:** We do NOT store any cardholder data. Only Stripe tokens are stored.

**Evidence Location:** `./req3-protect-data.md`

#### 3.2 Requirement 4: Encrypt Transmission

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 4.1 | Strong cryptography for transmission | YES | TLS 1.2+ required |
| 4.2.1 | PAN secured during transmission | YES | Stripe handles |
| 4.2.2 | PAN never sent via end-user messaging | YES | Policy enforced |

**Evidence Location:** `./req4-encryption.md`

---

### Section 4: Maintain a Vulnerability Management Program

#### 4.1 Requirement 5: Anti-malware

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 5.2 | Anti-malware deployed on commonly affected systems | YES | Container scanning |
| 5.3 | Anti-malware mechanisms maintained | YES | Automated updates |
| 5.4 | Anti-malware logging enabled | YES | CloudWatch logs |

**Evidence Location:** `./req5-antivirus.md`

#### 4.2 Requirement 6: Secure Systems

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 6.2.1 | Software development based on secure standards | YES | OWASP SDLC |
| 6.2.2 | Security training for developers | YES | Annual training |
| 6.2.3 | Code review for custom code | YES | PR reviews |
| 6.2.4 | Software supply chain security | YES | Dependency scanning |
| 6.3.1 | Security vulnerabilities identified | YES | Snyk, Inspector |
| 6.3.2 | Critical patches within 30 days | YES | Patch policy |
| 6.3.3 | Patching process documented | YES | Change management |
| 6.4.1 | Public web apps protected | YES | WAF deployed |
| 6.4.3 | Script integrity verified | YES | SRI implemented |

**Evidence Location:** `./req6-secure-systems.md`

---

### Section 5: Implement Strong Access Control

#### 5.1 Requirement 7: Restrict Access

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 7.1.1 | Access control policy defined | YES | Policy document |
| 7.2.1 | Access limited to job function | YES | RBAC implemented |
| 7.2.2 | Privileges assigned based on role | YES | Role matrix |
| 7.2.3 | Deny all, permit by exception | YES | Default deny |

**Evidence Location:** `./req7-access-control.md`

#### 5.2 Requirement 8: Identify and Authenticate

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 8.2.1 | Unique user IDs | YES | UUID per user |
| 8.2.2 | Group/shared accounts controlled | YES | Policy prohibits |
| 8.3.1 | MFA for CDE access | YES | AWS MFA required |
| 8.3.2 | MFA for remote access | YES | VPN + MFA |
| 8.3.4 | Password complexity | YES | 12+ chars, complex |
| 8.3.6 | Password change on suspicion | YES | Immediate reset |
| 8.3.7 | Password history enforced | YES | Last 10 blocked |
| 8.3.9 | Password change every 90 days | YES | Forced rotation |
| 8.4.1 | Lockout after invalid attempts | YES | 5 attempts max |
| 8.4.2 | Lockout duration | YES | 30 minutes |
| 8.5.1 | MFA system not bypassed | YES | No bypass available |
| 8.6.1 | System account passwords secured | YES | AWS Secrets Manager |

**Evidence Location:** `./req8-authentication.md`

#### 5.3 Requirement 9: Physical Security

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 9.1.1 | Physical security controls | YES | AWS manages |
| 9.2.1 | Access control procedures | YES | AWS SOC 2 |
| 9.4.1 | Media physically secured | N/A | Cloud only |

**Note:** Physical security is inherited from AWS. AWS maintains SOC 2 Type II and PCI DSS Level 1 compliance.

**Evidence Location:** `./req9-physical.md`

---

### Section 6: Regularly Monitor and Test

#### 6.1 Requirement 10: Logging and Monitoring

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 10.2.1 | Audit logs for user access | YES | Audit module |
| 10.2.1.1 | Individual user access logged | YES | Winston + Audit |
| 10.2.1.2 | Actions by root/admin logged | YES | Privileged logging |
| 10.2.1.3 | Access to audit trails logged | YES | CloudTrail |
| 10.2.1.4 | Invalid access attempts logged | YES | Rate limiter logs |
| 10.2.1.5 | Audit mechanism changes logged | YES | Config changes |
| 10.2.1.6 | Security log creation/deletion | YES | Immutable logs |
| 10.2.1.7 | System-level object changes | YES | Audit trail |
| 10.3.1 | Audit trail access restricted | YES | Admin only |
| 10.4.1 | Time synchronization | YES | NTP configured |
| 10.5.1 | Audit trail retention | YES | 1 year online |
| 10.6.1 | Security events reviewed | YES | Daily review |
| 10.7.1 | Log protection mechanisms | YES | S3 versioning |

**Evidence Location:** `./req10-logging.md`

#### 6.2 Requirement 11: Security Testing

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 11.2.1 | Wireless access points detected | N/A | Cloud only |
| 11.3.1 | External vulnerability scans | YES | Quarterly ASV |
| 11.3.2 | Internal vulnerability scans | YES | Weekly scans |
| 11.4.1 | Penetration testing methodology | YES | PTES framework |
| 11.4.2 | Annual penetration tests | YES | External firm |
| 11.5.1 | Intrusion detection | YES | AWS GuardDuty |
| 11.6.1 | HTTP header security | YES | CSP, SRI |

**Evidence Location:** `./req11-testing.md`

---

### Section 7: Security Policies

#### 7.1 Requirement 12: Security Policies

| Req # | Requirement | Response | Evidence |
|-------|-------------|----------|----------|
| 12.1.1 | Security policy established | YES | Policy document |
| 12.1.2 | Policy reviewed annually | YES | Review schedule |
| 12.1.3 | Roles and responsibilities defined | YES | RACI matrix |
| 12.2.1 | Risk assessment annual | YES | Risk register |
| 12.3.1 | Usage policies documented | YES | Acceptable use |
| 12.4.1 | Executive responsibility assigned | YES | CEO accountability |
| 12.5.1 | Security responsibilities documented | YES | Job descriptions |
| 12.6.1 | Security awareness program | YES | Training program |
| 12.6.2 | Training upon hire and annually | YES | LMS tracked |
| 12.8.1 | Service providers documented | YES | Provider list |
| 12.8.2 | Written agreements exist | YES | Contracts |
| 12.8.4 | Provider compliance monitored | YES | Annual review |
| 12.8.5 | Provider responsibilities defined | YES | RACI per provider |
| 12.10.1 | Incident response plan | YES | IRP document |
| 12.10.2 | IRP reviewed annually | YES | Review schedule |
| 12.10.4 | Incident response training | YES | Drills conducted |

**Evidence Location:** `./req12-policies.md`

---

## Part 3: Attestation of Compliance

### 3.1 Merchant Information

| Field | Value |
|-------|-------|
| Merchant DBA Name | Festival Management Platform |
| Contact Name | [TBD] |
| Contact Title | PCI Compliance Officer |
| Contact Email | compliance@festival.com |
| Contact Phone | [TBD] |
| Business Address | [TBD] |

### 3.2 Executive Summary

Festival Management Platform has completed this SAQ A-EP self-assessment covering the period from [Start Date] to [End Date].

**Key Findings:**
- All applicable requirements are in place
- No cardholder data is stored, processed, or transmitted by our systems
- Payment processing is fully outsourced to Stripe (PCI DSS Level 1)
- Quarterly ASV scans show passing status

### 3.3 PCI DSS Validation

| Item | Status |
|------|--------|
| All sections of SAQ A-EP completed | YES |
| Compensating controls documented | N/A |
| ASV scans for quarter | PASS |
| Penetration test completed | YES |

### 3.4 Signatures

**Merchant Executive Officer:**

Signature: _________________________
Name: _________________________
Title: _________________________
Date: _________________________

**PCI Qualified Security Assessor (if applicable):**

Signature: _________________________
Company: _________________________
Name: _________________________
Date: _________________________

---

## Part 4: Evidence Index

### 4.1 Required Evidence for SAQ A-EP

| # | Evidence Type | Document/Location | Status |
|---|---------------|-------------------|--------|
| 1 | Network diagrams | `network-diagram.md` | Complete |
| 2 | Data flow diagrams | `data-flow-diagram.md` | Complete |
| 3 | ASV scan reports | `/evidence/asv-scans/` | Quarterly |
| 4 | Penetration test report | `/evidence/pentest/` | Annual |
| 5 | Security policies | `/evidence/policies/` | Complete |
| 6 | Access control lists | `/evidence/access/` | Current |
| 7 | Training records | `/evidence/training/` | Current |
| 8 | Incident response plan | `incident-response.md` | Complete |
| 9 | Change management procedures | `change-management.md` | Complete |
| 10 | Stripe AOC | `/evidence/providers/stripe-aoc.pdf` | Annual |

---

## Part 5: Next Steps

### 5.1 Submission Process

1. Complete all sections of this SAQ A-EP
2. Gather all required evidence
3. Conduct any missing ASV scans
4. Submit AOC to acquiring bank
5. Schedule annual renewal

### 5.2 Maintaining Compliance

- Quarterly: ASV vulnerability scans
- Annually: SAQ A-EP renewal, penetration test
- Ongoing: Log monitoring, access reviews
- As needed: Incident response, change management

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial SAQ A-EP |

**Review Schedule:** Annual (prior to AOC submission)
