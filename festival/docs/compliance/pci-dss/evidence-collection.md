# PCI-DSS Evidence Collection Guide

## Festival Management Platform - Audit Evidence Documentation

**Version:** 1.0
**Date:** 2026-01-02
**Classification:** Confidential

---

## 1. Overview

This document provides a comprehensive guide for collecting, organizing, and maintaining evidence required for PCI-DSS SAQ A-EP compliance. Proper evidence collection is essential for demonstrating compliance during assessments.

---

## 2. Evidence Directory Structure

```
/evidence/
├── asv-scans/
│   ├── 2026-Q1/
│   ├── 2026-Q2/
│   ├── 2026-Q3/
│   └── 2026-Q4/
├── pentest/
│   ├── 2026-annual/
│   └── remediation/
├── policies/
│   ├── information-security-policy.pdf
│   ├── acceptable-use-policy.pdf
│   ├── access-control-policy.pdf
│   ├── incident-response-policy.pdf
│   └── change-management-policy.pdf
├── procedures/
│   ├── user-provisioning.pdf
│   ├── vulnerability-management.pdf
│   └── incident-response.pdf
├── training/
│   ├── completion-records/
│   ├── materials/
│   └── attendance/
├── access/
│   ├── quarterly-reviews/
│   ├── role-matrix/
│   └── termination-records/
├── providers/
│   ├── stripe-aoc.pdf
│   ├── aws-aoc.pdf
│   └── service-agreements/
├── network/
│   ├── diagrams/
│   ├── firewall-rules/
│   └── security-groups/
├── logs/
│   ├── audit-log-samples/
│   └── monitoring-configs/
├── incidents/
│   ├── 2026/
│   └── post-mortems/
└── changes/
    ├── change-requests/
    └── approval-records/
```

---

## 3. Evidence Collection by Requirement

### 3.1 Requirement 1: Network Security

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Network diagram | Current network topology | Manual update | Quarterly |
| Firewall rules | AWS Security Group configs | AWS CLI export | Quarterly |
| WAF configuration | AWS WAF rules | AWS Console export | Quarterly |
| VPC configuration | Subnet, routing tables | Terraform state | Per change |
| Change records | Network change approvals | JIRA/ticketing | Per change |

**Collection Script:**
```bash
#!/bin/bash
# Export AWS Security Group rules
aws ec2 describe-security-groups --output json > evidence/network/security-groups/sg-export-$(date +%Y%m%d).json

# Export VPC configuration
aws ec2 describe-vpcs --output json > evidence/network/vpc-export-$(date +%Y%m%d).json

# Export WAF rules
aws wafv2 list-web-acls --scope REGIONAL --output json > evidence/network/waf-rules-$(date +%Y%m%d).json
```

### 3.2 Requirement 2: Secure Configuration

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Baseline configs | Server hardening standards | CIS benchmark reports | Annually |
| Container images | Dockerfile analysis | Trivy scan reports | Per build |
| Default password audit | No defaults in use | Manual verification | Quarterly |
| Service inventory | Enabled services list | Automated scan | Monthly |

**Evidence Format:**
```yaml
# server-baseline.yaml
system: api-server
date: 2026-01-02
cis_benchmark: ubuntu-20.04-level-1
findings:
  passed: 127
  failed: 3
  not_applicable: 15
remediation:
  - finding: "1.4.1 - Ensure permissions on bootloader config"
    status: remediated
    date: 2026-01-03
```

### 3.3 Requirement 3: Protect Stored Data

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Data inventory | No CHD stored | Schema review | Quarterly |
| Database schema | Table definitions | Prisma export | Per change |
| Tokenization proof | Stripe token usage | Code review | Per release |
| Data retention | Retention policy compliance | Audit script | Monthly |

**Verification Script:**
```sql
-- Verify no cardholder data in database
-- Run quarterly and save results

-- Check for any column that might contain card data
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
  column_name ILIKE '%card%'
  OR column_name ILIKE '%pan%'
  OR column_name ILIKE '%cvv%'
  OR column_name ILIKE '%expir%'
)
AND column_name NOT IN ('cardLast4', 'cardBrand');  -- Allowed masked fields

-- Result should be empty (no cardholder data columns)
```

### 3.4 Requirement 4: Encryption in Transit

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| TLS configuration | Certificate details | SSL Labs scan | Quarterly |
| Certificate inventory | All certificates | Automated discovery | Monthly |
| API encryption | HTTPS enforcement | Config review | Per change |
| Internal encryption | Service-to-service TLS | Config review | Quarterly |

**SSL Labs Evidence:**
```json
{
  "host": "app.festival.com",
  "scan_date": "2026-01-02",
  "grade": "A+",
  "protocol_support": {
    "TLS_1_3": true,
    "TLS_1_2": true,
    "TLS_1_1": false,
    "TLS_1_0": false,
    "SSL_3_0": false
  },
  "certificate": {
    "issuer": "Let's Encrypt",
    "expiry": "2026-04-02",
    "key_size": 2048,
    "signature": "SHA256withRSA"
  }
}
```

### 3.5 Requirement 5: Anti-Malware

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Container scanning | Trivy/Snyk reports | CI/CD pipeline | Per build |
| Dependency scanning | npm audit reports | CI/CD pipeline | Daily |
| Malware definitions | Update logs | Automated | Daily |
| Scan results | Clean scan confirmation | CloudWatch logs | Daily |

### 3.6 Requirement 6: Secure Development

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| SDLC documentation | Development procedures | Wiki export | Annually |
| Code review records | PR approval history | GitHub API | Per release |
| Security testing | SAST/DAST results | CI/CD reports | Per build |
| Developer training | Training completion | LMS export | Annually |
| Patch records | Dependency updates | Dependabot history | Per patch |

**PR Review Evidence:**
```json
{
  "pr_number": 1234,
  "title": "feat: add payment webhook handler",
  "author": "developer@festival.com",
  "reviewers": ["security@festival.com", "lead@festival.com"],
  "security_review": true,
  "approvals": 2,
  "checks_passed": [
    "eslint",
    "type-check",
    "unit-tests",
    "security-scan",
    "sonarqube"
  ],
  "merged_by": "lead@festival.com",
  "merged_at": "2026-01-02T14:30:00Z"
}
```

### 3.7 Requirement 7: Access Control

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Role matrix | Roles and permissions | Config export | Quarterly |
| Access reviews | Quarterly review records | Spreadsheet | Quarterly |
| Provisioning requests | Access request tickets | JIRA export | Per request |
| Termination records | Access revocation proof | HR + IT records | Per termination |

**Role Matrix Template:**
```markdown
| Role | Database | Admin Dashboard | AWS Console | Stripe Dashboard | Logs |
|------|----------|-----------------|-------------|------------------|------|
| Developer | Read (dev) | No | Limited | No | Read |
| DevOps | Read | No | Full | No | Full |
| Security | Read | Read | Read | Read | Full |
| Support | No | Read | No | Refunds only | Limited |
| Admin | Full | Full | Full | Full | Full |
```

### 3.8 Requirement 8: Authentication

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Password policy | Configuration settings | Config export | Quarterly |
| MFA enrollment | User MFA status | AWS IAM report | Monthly |
| Account lockout | Failed login analysis | Log analysis | Monthly |
| Session management | Token expiry configs | Config review | Quarterly |

**Authentication Config Evidence:**
```json
{
  "password_policy": {
    "min_length": 12,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special": true,
    "history_count": 10,
    "max_age_days": 90,
    "lockout_threshold": 5,
    "lockout_duration_minutes": 30
  },
  "mfa": {
    "required_for": ["admin", "developer", "devops", "security"],
    "methods": ["totp", "hardware_key"],
    "enrollment_rate": "100%"
  },
  "session": {
    "access_token_expiry": "15m",
    "refresh_token_expiry": "7d",
    "idle_timeout": "30m"
  }
}
```

### 3.9 Requirement 9: Physical Security

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| AWS SOC 2 report | Data center security | AWS Artifact | Annually |
| AWS PCI AOC | AWS PCI compliance | AWS Artifact | Annually |
| Office security | Physical access controls | Site audit | Annually |
| Visitor logs | Office visitor records | Physical log | Ongoing |

### 3.10 Requirement 10: Logging and Monitoring

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Log configuration | Winston/CloudWatch setup | Config export | Quarterly |
| Log samples | Sample audit events | CloudWatch export | Monthly |
| Alert rules | Monitoring thresholds | CloudWatch export | Quarterly |
| Review records | Daily log review evidence | Checklist | Daily |
| NTP configuration | Time sync settings | System config | Quarterly |

**Audit Log Sample:**
```json
{
  "timestamp": "2026-01-02T10:30:45.123Z",
  "correlationId": "req-uuid-12345",
  "level": "info",
  "action": "PAYMENT_CREATED",
  "userId": "user-uuid-67890",
  "userEmail": "masked@example.com",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "resource": "payment",
  "resourceId": "pay-uuid-abcde",
  "festivalId": "fest-uuid-xyz",
  "metadata": {
    "amount": 15000,
    "currency": "EUR",
    "stripeSessionId": "cs_live_..."
  },
  "result": "success"
}
```

### 3.11 Requirement 11: Security Testing

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| ASV scan reports | External vulnerability scan | ASV portal | Quarterly |
| Internal scans | AWS Inspector reports | AWS Console | Weekly |
| Penetration test | External pentest report | Vendor delivery | Annually |
| Remediation records | Vulnerability fix tracking | JIRA export | Per finding |
| IDS/IPS logs | GuardDuty findings | AWS Console | Ongoing |

**ASV Scan Evidence Format:**
```markdown
## ASV Scan Report - Q1 2026

**Scan Provider:** Qualys
**Scan Date:** 2026-01-15
**Scope:** All public-facing IPs and domains
**Result:** PASS

### Summary
- Total hosts scanned: 5
- Critical vulnerabilities: 0
- High vulnerabilities: 0
- Medium vulnerabilities: 2 (false positives - documented)
- Low vulnerabilities: 3

### Attestation
Scan conducted by [ASV Name], PCI ASV #[Number]
Certificate attached: asv-certificate-q1-2026.pdf
```

### 3.12 Requirement 12: Security Policies

| Evidence | Description | Collection Method | Frequency |
|----------|-------------|-------------------|-----------|
| Policy documents | All security policies | Document repository | Annually |
| Policy acknowledgments | Employee sign-offs | HR records | Annually |
| Training records | Security awareness | LMS export | Annually |
| Risk assessments | Annual risk review | Risk register | Annually |
| Incident records | Incident reports | Incident tracker | Per incident |

---

## 4. Evidence Collection Calendar

### 4.1 Daily Evidence

| Task | Evidence Generated | Owner |
|------|-------------------|-------|
| Log review | Review checklist | SOC Team |
| Alert monitoring | Alert response records | SOC Team |
| Backup verification | Backup success logs | DevOps |

### 4.2 Weekly Evidence

| Task | Evidence Generated | Owner |
|------|-------------------|-------|
| Vulnerability scan | AWS Inspector report | Security |
| Dependency update | Dependabot report | Development |
| Access anomaly review | Access report | Security |

### 4.3 Monthly Evidence

| Task | Evidence Generated | Owner |
|------|-------------------|-------|
| Certificate review | Certificate inventory | DevOps |
| MFA compliance | IAM report | Security |
| Patch compliance | Patch status report | DevOps |

### 4.4 Quarterly Evidence

| Task | Evidence Generated | Owner |
|------|-------------------|-------|
| ASV scan | ASV report + attestation | Security |
| Access review | Access review records | Managers |
| Policy review | Policy update records | Compliance |
| Network review | Network diagram update | DevOps |

### 4.5 Annual Evidence

| Task | Evidence Generated | Owner |
|------|-------------------|-------|
| Penetration test | Pentest report | External vendor |
| Risk assessment | Risk register | Security |
| Policy approval | Signed policies | Executive |
| Training | Completion certificates | HR |
| Vendor review | Vendor compliance matrix | Compliance |

---

## 5. Evidence Retention

### 5.1 Retention Requirements

| Evidence Type | Minimum Retention | Storage Location |
|---------------|------------------|------------------|
| ASV scans | 3 years | S3 (encrypted) |
| Penetration tests | 3 years | S3 (encrypted) |
| Access reviews | 3 years | S3 (encrypted) |
| Audit logs | 1 year online, 3 years archive | CloudWatch + S3 |
| Training records | 3 years | HR system |
| Incident reports | 3 years | S3 (encrypted) |
| Change records | 3 years | JIRA + S3 |
| Policies | Current + 3 prior versions | Document repository |

### 5.2 Evidence Naming Convention

```
{category}/{year}/{requirement}-{type}-{date}.{ext}

Examples:
asv-scans/2026/Q1/asv-scan-20260115.pdf
pentest/2026/annual-pentest-report-20260701.pdf
access/2026/Q1/access-review-20260331.xlsx
training/2026/security-awareness-completion-20260228.csv
```

---

## 6. Evidence Collection Automation

### 6.1 Automated Collection Script

```bash
#!/bin/bash
# PCI Evidence Collection Script
# Run monthly or as needed

EVIDENCE_DIR="/evidence"
DATE=$(date +%Y%m%d)
YEAR=$(date +%Y)
QUARTER="Q$((( $(date +%-m) - 1) / 3 + 1))"

# AWS Security Groups
aws ec2 describe-security-groups \
  --output json > "$EVIDENCE_DIR/network/$YEAR/security-groups-$DATE.json"

# IAM Users and MFA
aws iam generate-credential-report
aws iam get-credential-report \
  --output json > "$EVIDENCE_DIR/access/$YEAR/iam-report-$DATE.json"

# CloudTrail Events (last 30 days)
aws cloudtrail lookup-events \
  --start-time $(date -d '-30 days' +%Y-%m-%dT%H:%M:%SZ) \
  --output json > "$EVIDENCE_DIR/logs/$YEAR/cloudtrail-$DATE.json"

# GuardDuty Findings
aws guardduty list-findings \
  --detector-id $GUARDDUTY_DETECTOR_ID \
  --output json > "$EVIDENCE_DIR/security/$YEAR/guardduty-$DATE.json"

# AWS Inspector Findings
aws inspector2 list-findings \
  --output json > "$EVIDENCE_DIR/scans/$YEAR/inspector-$DATE.json"

echo "Evidence collection complete: $DATE"
```

### 6.2 GitHub Actions for Evidence

```yaml
# .github/workflows/evidence-collection.yml
name: Monthly Evidence Collection

on:
  schedule:
    - cron: '0 0 1 * *'  # First of each month
  workflow_dispatch:

jobs:
  collect-evidence:
    runs-on: ubuntu-latest
    steps:
      - name: Export PR Review History
        run: |
          gh pr list --state merged --limit 100 --json number,title,author,reviewers,mergedAt \
            > evidence/code-review-$(date +%Y%m).json
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Export Security Scan Results
        run: |
          # Export Snyk results
          snyk test --json > evidence/snyk-$(date +%Y%m).json || true

      - name: Upload to S3
        run: |
          aws s3 sync evidence/ s3://festival-pci-evidence/$(date +%Y)/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 7. Evidence Review Checklist

### 7.1 Pre-Assessment Checklist

- [ ] All ASV scans for the period are passing
- [ ] Penetration test report is complete with remediation
- [ ] Access reviews are documented for all quarters
- [ ] Training completion is 100%
- [ ] All policies are current (reviewed within 1 year)
- [ ] Network diagrams are up to date
- [ ] Vendor compliance matrix is current
- [ ] Incident response plan is tested
- [ ] All evidence is properly organized and named
- [ ] Evidence retention meets requirements

### 7.2 Evidence Verification

For each piece of evidence, verify:

- [ ] Date is within assessment period
- [ ] Document is complete (no missing pages)
- [ ] Approvals/signatures are present where required
- [ ] Sensitive data is appropriately redacted
- [ ] File is readable and not corrupted
- [ ] Naming convention is followed

---

## 8. Assessor Communication

### 8.1 Evidence Request Response

When assessors request evidence:

1. **Acknowledge receipt** within 1 business day
2. **Provide timeline** for complex requests
3. **Deliver evidence** in requested format
4. **Document delivery** (what, when, to whom)
5. **Follow up** to confirm receipt

### 8.2 Evidence Package Template

```markdown
# Evidence Package

**Request ID:** [From assessor]
**Requested By:** [Assessor name]
**Request Date:** [Date]
**Delivery Date:** [Date]

## Contents

| # | Evidence Type | Filename | Description |
|---|---------------|----------|-------------|
| 1 | ASV Scan | asv-q1-2026.pdf | Q1 2026 external scan |
| 2 | Access Review | access-q1-2026.xlsx | Q1 access review |
| ... | ... | ... | ... |

## Notes

[Any clarifications or context for the evidence]

## Delivered By

Name: [Your name]
Role: [Your role]
Email: [Your email]
Date: [Date]
```

---

## 9. Continuous Improvement

### 9.1 Post-Assessment Review

After each assessment:

1. Document any evidence gaps identified
2. Update collection procedures
3. Improve automation where possible
4. Train team on lessons learned
5. Update this guide as needed

### 9.2 Evidence Quality Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Evidence completeness | 100% | [Track] |
| On-time delivery | 100% | [Track] |
| Assessor rework requests | 0 | [Track] |
| Automated vs manual collection | >80% automated | [Track] |

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

**Next Review:** Annually or after each assessment
