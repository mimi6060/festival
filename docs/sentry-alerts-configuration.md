# Sentry Alerts Configuration Guide

This document describes how to configure Sentry alerts for the Festival API.

## Prerequisites

1. A Sentry account with a project created for `festival-api`
2. Environment variables configured:
   - `SENTRY_DSN`: Your Sentry Data Source Name
   - `SENTRY_ENVIRONMENT`: `development`, `staging`, or `production`
   - `SENTRY_AUTH_TOKEN`: For source maps upload

## Recommended Alert Rules

### 1. High Error Rate Alert

**Purpose**: Notify when error rate exceeds normal thresholds.

**Configuration in Sentry UI**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: Number of events is more than 100 in 1 hour
   - **Filter**: `level:error`
   - **Environment**: `production`
   - **Action**: Send email/Slack notification

### 2. New Issue Alert

**Purpose**: Get notified immediately when a new error type occurs.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: A new issue is created
   - **Filter**: `is:unresolved level:error`
   - **Environment**: `production`
   - **Action**: Send Slack notification

### 3. Payment Failure Alert (Critical)

**Purpose**: Immediate notification for payment-related errors.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: Number of events is more than 5 in 5 minutes
   - **Filter**: `tags[category]:payment level:error`
   - **Environment**: `production`
   - **Action**: Send PagerDuty/SMS notification

### 4. Cashless System Alert

**Purpose**: Monitor cashless transaction failures.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: Number of events is more than 10 in 10 minutes
   - **Filter**: `tags[category]:cashless level:error`
   - **Environment**: `production`
   - **Action**: Send Slack notification

### 5. Authentication Anomaly Alert

**Purpose**: Detect potential security issues with authentication.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: Number of events is more than 50 in 15 minutes
   - **Filter**: `tags[category]:auth level:warning`
   - **Environment**: `production`
   - **Action**: Send Slack notification to #security channel

### 6. Performance Regression Alert

**Purpose**: Detect when API response times degrade.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Performance" as the alert type
3. Configure:
   - **Transaction**: `*` (all transactions)
   - **When**: P95 > 2000ms for 5 minutes
   - **Environment**: `production`
   - **Action**: Send Slack notification

### 7. Critical 5xx Error Spike

**Purpose**: Detect server-side error spikes.

**Configuration**:
1. Go to Alerts > Create Alert Rule
2. Select "Issues" as the alert type
3. Configure:
   - **When**: Number of events is more than 20 in 5 minutes
   - **Filter**: `tags[http.status_code]:5*`
   - **Environment**: `production`
   - **Action**: Send PagerDuty alert

## Alert Channels Setup

### Slack Integration

1. Go to Settings > Integrations > Slack
2. Connect your Slack workspace
3. Create dedicated channels:
   - `#festival-errors`: General error notifications
   - `#festival-payments`: Payment-related alerts
   - `#festival-security`: Authentication/security alerts

### PagerDuty Integration (Critical Alerts)

1. Go to Settings > Integrations > PagerDuty
2. Connect your PagerDuty account
3. Configure escalation policies for:
   - Payment failures: Immediate escalation
   - High error rates: 15-minute escalation

### Email Notifications

1. Go to Settings > Notifications
2. Configure email digest settings:
   - **Frequency**: Real-time for critical, hourly for others
   - **Recipients**: Development team

## Custom Tags for Filtering

The Festival API adds the following custom tags to Sentry events:

| Tag | Description | Values |
|-----|-------------|--------|
| `correlation_id` | Request correlation ID | UUID |
| `http.status_code` | HTTP response status | 4xx, 5xx |
| `http.method` | HTTP method | GET, POST, PUT, etc. |
| `http.url` | Request URL | /api/... |
| `user_role` | User role | admin, organizer, staff, attendee |
| `festival_id` | Festival identifier | UUID |

## Breadcrumb Categories

The API uses the following breadcrumb categories:

- `payment`: Payment processing events
- `cashless`: Cashless/NFC operations
- `auth`: Authentication events
- `ticket`: Ticket operations
- `festival`: Festival management
- `http`: HTTP request/response

## Sample Queries

### Find all payment errors in the last 24 hours
```
tags[category]:payment level:error lastSeen:-24h
```

### Find errors for a specific user
```
user.id:USER_UUID level:error
```

### Find errors by correlation ID
```
tags[correlation_id]:UUID
```

### Find all 500 errors
```
tags[http.status_code]:500
```

## Dashboard Recommendations

Create a Sentry dashboard with these widgets:

1. **Error Rate Over Time**: Line chart of errors per hour
2. **Top Error Types**: Table of most frequent errors
3. **Errors by Category**: Pie chart (payment, cashless, auth, etc.)
4. **P95 Response Time**: Line chart of API latency
5. **Errors by Environment**: Bar chart comparing dev/staging/prod
6. **Affected Users**: Count of unique users with errors

## Maintenance

### Weekly Review Checklist

- [ ] Review and resolve new issues
- [ ] Check alert thresholds are still appropriate
- [ ] Review ignored errors list
- [ ] Update release annotations

### Monthly Review

- [ ] Analyze error trends
- [ ] Adjust sample rates if needed
- [ ] Review and prune old releases
- [ ] Update documentation if needed
