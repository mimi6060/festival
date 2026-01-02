# Third-Party Subprocessors List

## Festival Management Platform - Data Subprocessors

**Document Type:** Compliance Documentation
**Version:** 1.0
**Last Updated:** 2026-01-02
**Review Frequency:** Quarterly
**Next Review:** April 2026

---

## Overview

This document lists all third-party subprocessors engaged by the Festival Management Platform to process personal data on behalf of our customers. In accordance with GDPR Article 28 and other applicable data protection regulations, we maintain transparency about our data processing chain.

All listed subprocessors have been vetted for security and compliance, have signed Data Processing Agreements (DPAs), and are bound by contractual obligations to protect personal data.

---

## Notification of Changes

Customers will be notified of any changes to this subprocessor list:
- **New subprocessors:** 30 days advance notice via email
- **Removal of subprocessors:** Updated in next quarterly review
- **Material changes:** 14 days advance notice via email

Objections to new subprocessors must be submitted within the notice period to: privacy@festival-platform.com

---

## Subprocessor List

### 1. Stripe, Inc.

| Attribute | Details |
|-----------|---------|
| **Legal Entity** | Stripe, Inc. |
| **Headquarters** | San Francisco, California, USA |
| **EU Entity** | Stripe Payments Europe, Ltd. (Ireland) |
| **Data Processing Locations** | USA, Ireland (EU data processed in EU by default) |
| **Purpose** | Payment processing, fraud detection, and financial services |
| **Data Processed** | - Cardholder name<br>- Payment card details (tokenized)<br>- Billing address<br>- Email address<br>- Transaction amounts<br>- IP address<br>- Device fingerprint |
| **Retention Period** | As required by financial regulations (typically 7-10 years for transaction records) |
| **Transfer Mechanism** | Standard Contractual Clauses (SCCs) + Data Privacy Framework |

#### Compliance Certifications

| Certification | Status | Valid Until |
|--------------|--------|-------------|
| PCI-DSS Level 1 | Active | Annual renewal |
| SOC 1 Type II | Active | Annual renewal |
| SOC 2 Type II | Active | Annual renewal |
| ISO 27001 | Active | Annual renewal |
| ISO 27017 | Active | Annual renewal |
| ISO 27018 | Active | Annual renewal |

#### DPA Status

| Item | Status |
|------|--------|
| DPA Signed | Yes |
| DPA Version | Stripe Data Processing Agreement v2024 |
| SCCs Incorporated | Yes (EU Commission 2021 SCCs) |
| UK Addendum | Yes |
| Audit Rights | Yes (via third-party audit reports) |

#### Additional Notes
- Stripe is certified as a PCI-DSS Level 1 Service Provider, the highest level of certification
- Card data is tokenized; actual card numbers are never stored on Festival Platform servers
- Stripe Radar provides machine learning-based fraud detection
- Regional processing available: EU cardholder data can be processed entirely within the EU

---

### 2. Amazon Web Services (AWS)

| Attribute | Details |
|-----------|---------|
| **Legal Entity** | Amazon Web Services, Inc. |
| **Headquarters** | Seattle, Washington, USA |
| **EU Entity** | Amazon Web Services EMEA SARL (Luxembourg) |
| **Data Processing Locations** | Primary: eu-west-1 (Ireland)<br>DR: eu-central-1 (Frankfurt)<br>CDN: Global edge locations |
| **Purpose** | Cloud infrastructure, compute, storage, databases, content delivery, and security services |
| **Data Processed** | All platform data including:<br>- User accounts and profiles<br>- Festival data<br>- Tickets and transactions<br>- Cashless wallet data<br>- Application logs<br>- Backups |
| **Retention Period** | As configured by Festival Platform (see Data Retention Policy) |
| **Transfer Mechanism** | Standard Contractual Clauses (SCCs) + AWS Data Processing Addendum |

#### AWS Services Used

| Service | Purpose | Data Region |
|---------|---------|-------------|
| EC2/EKS | Application hosting | eu-west-1 |
| RDS (PostgreSQL) | Primary database | eu-west-1 |
| ElastiCache (Redis) | Caching and sessions | eu-west-1 |
| S3 | File storage and backups | eu-west-1 |
| CloudFront | CDN for static assets | Global (edge) |
| Route 53 | DNS management | Global |
| KMS | Encryption key management | eu-west-1 |
| CloudWatch | Monitoring and logging | eu-west-1 |
| WAF | Web application firewall | eu-west-1 |
| SES | Transactional email (backup) | eu-west-1 |

#### Compliance Certifications

| Certification | Status | Valid Until |
|--------------|--------|-------------|
| SOC 1 Type II | Active | Annual renewal |
| SOC 2 Type II | Active | Annual renewal |
| SOC 3 | Active | Annual renewal |
| ISO 27001 | Active | Annual renewal |
| ISO 27017 | Active | Annual renewal |
| ISO 27018 | Active | Annual renewal |
| ISO 9001 | Active | Annual renewal |
| CSA STAR Level 2 | Active | Annual renewal |
| PCI-DSS Level 1 | Active | Annual renewal |
| HIPAA Eligible | Active | N/A |
| C5 (Germany) | Active | Annual renewal |
| ENS High (Spain) | Active | Annual renewal |
| CISPE Code of Conduct | Active | N/A |

#### DPA Status

| Item | Status |
|------|--------|
| DPA Signed | Yes |
| DPA Version | AWS Data Processing Addendum (DPA) v2024 |
| SCCs Incorporated | Yes (EU Commission 2021 SCCs) |
| UK Addendum | Yes |
| GDPR Compliance | AWS GDPR DPA |
| Audit Rights | Yes (via third-party audit reports and AWS Artifact) |

#### Additional Notes
- Primary data processing occurs in EU (Ireland) region
- Data encryption at rest (AES-256) and in transit (TLS 1.2+)
- AWS maintains over 143 security standards and compliance certifications
- Customer data is logically isolated in Virtual Private Cloud (VPC)
- AWS Config and CloudTrail provide comprehensive audit logging

---

### 3. Twilio SendGrid

| Attribute | Details |
|-----------|---------|
| **Legal Entity** | Twilio Inc. (SendGrid) |
| **Headquarters** | San Francisco, California, USA |
| **Data Processing Locations** | USA (Primary), with EU regional options available |
| **Purpose** | Transactional and marketing email delivery |
| **Data Processed** | - Recipient email addresses<br>- Recipient names<br>- Email content<br>- Email metadata (opens, clicks)<br>- IP addresses<br>- Bounce/unsubscribe data |
| **Retention Period** | - Email activity: 7 days (default)<br>- Suppression lists: Until removed<br>- Aggregate stats: 3 years |
| **Transfer Mechanism** | Standard Contractual Clauses (SCCs) |

#### Email Types Processed

| Email Category | Purpose | Legal Basis |
|---------------|---------|-------------|
| Account notifications | Registration, password reset | Contract |
| Ticket confirmations | Purchase receipts, QR codes | Contract |
| Festival updates | Event changes, schedule | Contract |
| Marketing (optional) | Promotions, newsletters | Consent |
| Cashless notifications | Top-ups, low balance | Contract |

#### Compliance Certifications

| Certification | Status | Valid Until |
|--------------|--------|-------------|
| SOC 2 Type II | Active | Annual renewal |
| ISO 27001 | Active | Annual renewal |
| HIPAA Eligible | Active | N/A |
| CSA STAR | Active | Annual renewal |
| Privacy Shield (historical) | Deprecated | N/A |

#### DPA Status

| Item | Status |
|------|--------|
| DPA Signed | Yes |
| DPA Version | Twilio Data Protection Addendum v2024 |
| SCCs Incorporated | Yes (EU Commission 2021 SCCs) |
| UK Addendum | Yes |
| Audit Rights | Yes (via third-party audit reports) |

#### Additional Notes
- Dedicated IP addresses used for Festival Platform emails
- DKIM, SPF, and DMARC configured for email authentication
- Bounce and unsubscribe handling automated
- Email content encrypted in transit (TLS)
- EU regional sending available upon request for GDPR-sensitive communications

---

### 4. Google Firebase (Firebase Cloud Messaging)

| Attribute | Details |
|-----------|---------|
| **Legal Entity** | Google LLC |
| **Headquarters** | Mountain View, California, USA |
| **EU Entity** | Google Ireland Limited |
| **Data Processing Locations** | USA (FCM servers), with data processing agreements covering EU transfers |
| **Purpose** | Push notification delivery to mobile applications |
| **Data Processed** | - Device tokens (Firebase Instance IDs)<br>- Notification content<br>- App instance identifiers<br>- Message metadata<br>- Delivery status |
| **Retention Period** | - Instance IDs: Until app uninstall or token refresh<br>- Message logs: 30 days<br>- Analytics: As configured |
| **Transfer Mechanism** | Standard Contractual Clauses (SCCs) + Google Cloud DPA |

#### Firebase Services Used

| Service | Purpose | Data Involved |
|---------|---------|---------------|
| Cloud Messaging (FCM) | Push notifications | Device tokens, message content |
| Crashlytics | Crash reporting | Device info, crash logs |

#### Notification Types

| Type | Purpose | Trigger |
|------|---------|---------|
| Ticket alerts | Purchase confirmation | Payment success |
| Entry validation | QR scan confirmation | Ticket scan |
| Cashless alerts | Balance updates, low balance | Transaction |
| Festival updates | Schedule changes, emergencies | Manual/automated |

#### Compliance Certifications

| Certification | Status | Valid Until |
|--------------|--------|-------------|
| SOC 1 Type II | Active | Annual renewal |
| SOC 2 Type II | Active | Annual renewal |
| SOC 3 | Active | Annual renewal |
| ISO 27001 | Active | Annual renewal |
| ISO 27017 | Active | Annual renewal |
| ISO 27018 | Active | Annual renewal |
| FedRAMP | Active | Annual renewal |
| PCI-DSS | Active | Annual renewal |

#### DPA Status

| Item | Status |
|------|--------|
| DPA Signed | Yes |
| DPA Version | Google Cloud Data Processing Addendum v2024 |
| SCCs Incorporated | Yes (EU Commission 2021 SCCs) |
| UK Addendum | Yes |
| Audit Rights | Yes (via third-party audit reports) |

#### Additional Notes
- Firebase Cloud Messaging is used solely for notification delivery
- No user personal data (name, email) is sent to Firebase; only device tokens
- Notification content is transient and not permanently stored by Google
- Users can disable notifications via device settings or app preferences
- Optional: Self-hosted notification service available for customers with strict data residency requirements

---

### 5. Sentry (Functional Software, Inc.)

| Attribute | Details |
|-----------|---------|
| **Legal Entity** | Functional Software, Inc. (dba Sentry) |
| **Headquarters** | San Francisco, California, USA |
| **Data Processing Locations** | USA (default), EU region available |
| **Purpose** | Application error monitoring, performance monitoring, and debugging |
| **Data Processed** | - Error stack traces<br>- Application logs<br>- User identifiers (anonymized)<br>- Device/browser information<br>- IP addresses (can be scrubbed)<br>- Request URLs and headers<br>- Performance metrics |
| **Retention Period** | - Error events: 90 days (configurable)<br>- Performance data: 90 days |
| **Transfer Mechanism** | Standard Contractual Clauses (SCCs) |

#### Data Minimization Measures

| Measure | Implementation |
|---------|----------------|
| PII Scrubbing | Enabled - automatic detection and removal |
| IP Address Scrubbing | Enabled - IPs anonymized |
| User ID Hashing | User IDs are hashed before transmission |
| Sensitive Data Filtering | Custom rules to filter payment data |
| Breadcrumb Filtering | Console logs sanitized |

#### Compliance Certifications

| Certification | Status | Valid Until |
|--------------|--------|-------------|
| SOC 2 Type II | Active | Annual renewal |
| GDPR Compliant | Active | N/A |
| Privacy Shield (historical) | Deprecated | N/A |
| CCPA Compliant | Active | N/A |

#### DPA Status

| Item | Status |
|------|--------|
| DPA Signed | Yes |
| DPA Version | Sentry Data Processing Addendum v2024 |
| SCCs Incorporated | Yes (EU Commission 2021 SCCs) |
| UK Addendum | Yes |
| Audit Rights | Yes (via third-party audit reports) |

#### Additional Notes
- Sentry SDK configured with aggressive PII scrubbing
- No payment card data or passwords are ever sent to Sentry
- Error reports contain minimal user identifiers for debugging
- EU data residency option available (sentry.io EU region)
- Self-hosted Sentry option available for customers requiring on-premises error monitoring

---

## Summary Table

| Subprocessor | Location | Purpose | Key Certifications | DPA Status |
|--------------|----------|---------|-------------------|------------|
| **Stripe** | USA/Ireland | Payments | PCI-DSS L1, SOC 2, ISO 27001 | Signed |
| **AWS** | Ireland/USA | Infrastructure | SOC 2, ISO 27001, PCI-DSS, C5 | Signed |
| **SendGrid** | USA | Email delivery | SOC 2, ISO 27001 | Signed |
| **Firebase** | USA | Push notifications | SOC 2, ISO 27001, ISO 27018 | Signed |
| **Sentry** | USA | Error monitoring | SOC 2, GDPR Compliant | Signed |

---

## Data Flow Diagram

```
                                    Festival Platform Data Flow

    [User Device]
         |
         | HTTPS (TLS 1.3)
         v
    [CloudFront CDN] -----> [WAF] -----> [Load Balancer]
                                              |
                                              v
                                    [Application Servers]
                                    (AWS EC2/EKS - Ireland)
                                              |
                    +------------+------------+------------+------------+
                    |            |            |            |            |
                    v            v            v            v            v
               [PostgreSQL]  [Redis]     [S3]        [KMS]       [CloudWatch]
               (AWS RDS)    (ElastiCache) (Storage)   (Keys)      (Logs)
                    |
                    |
    +---------------+---------------+---------------+---------------+
    |               |               |               |               |
    v               v               v               v               v
 [Stripe]      [SendGrid]      [Firebase]      [Sentry]        [Backup]
 Payment       Email           Push            Error           (S3 encrypted)
 Processing    Delivery        Notifications   Monitoring
```

---

## Requesting Subprocessor Information

For additional information about our subprocessors, including:
- Copies of DPAs
- Security assessments
- Compliance certificates
- Data flow documentation

Contact: privacy@festival-platform.com

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Compliance Team | Initial document |

---

## Related Documents

| Document | Purpose | Location |
|----------|---------|----------|
| Privacy Policy | User-facing privacy notice | docs/legal/PRIVACY_POLICY.md |
| Data Retention Policy | Retention schedules | docs/compliance/data-retention.md |
| GDPR Audit | Compliance assessment | docs/security/GDPR_AUDIT.md |
| Security Policy | Security controls | docs/security/SECURITY_POLICY.md |
| Vendor Management | Third-party assessment process | docs/compliance/vendor-management.md |

---

## Regulatory References

- **GDPR Article 28:** Processor obligations and subprocessor requirements
- **GDPR Article 44-49:** International data transfers
- **UK GDPR:** UK-specific data protection requirements
- **CCPA:** California Consumer Privacy Act requirements
- **PCI-DSS:** Payment Card Industry Data Security Standard

---

*This document is maintained by the Compliance Team and reviewed quarterly. For questions or concerns, contact privacy@festival-platform.com.*
