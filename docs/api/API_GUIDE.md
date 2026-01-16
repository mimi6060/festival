# Festival Platform API - Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Base URLs](#base-urls)
3. [Authentication](#authentication)
4. [Request/Response Format](#requestresponse-format)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Pagination](#pagination)
8. [API Endpoints](#api-endpoints)
9. [Code Examples](#code-examples)
10. [SDKs](#sdks)

---

## Overview

The Festival Platform API is a RESTful API that provides programmatic access to festival management features including ticketing, payments, cashless wallets, and more.

### Key Features

- **Multi-tenant Architecture**: All operations are scoped to specific festivals
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Real-time Updates**: WebSocket support for live notifications
- **GDPR Compliant**: Built with privacy by design
- **PCI-DSS Ready**: Secure payment handling via Stripe

### API Version

Current version: **v1.0.0**

The API follows semantic versioning. Breaking changes will be communicated in advance and will result in a new major version.

---

## Base URLs

| Environment       | URL                                             |
| ----------------- | ----------------------------------------------- |
| Production        | `https://api.festival-platform.com/api`         |
| Staging           | `https://staging-api.festival-platform.com/api` |
| Local Development | `http://localhost:3333/api`                     |

### Interactive Documentation

- **Swagger UI**: `/api/docs`
- **OpenAPI JSON**: `/api/docs-json`
- **OpenAPI YAML**: `/api/docs-yaml`

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. There are two types of tokens:

### Access Token

- Short-lived (15 minutes)
- Used for API requests
- Passed in the `Authorization` header

### Refresh Token

- Long-lived (7 days)
- Used to obtain new access tokens
- Stored securely (HttpOnly cookie recommended)

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   Body: { email, password }
   Response: { user, tokens: { accessToken, refreshToken, expiresIn } }

2. Making API Requests
   GET /api/festivals
   Headers: { Authorization: "Bearer <accessToken>" }

3. Token Refresh (when access token expires)
   POST /api/auth/refresh
   Body: { refreshToken }
   Response: { accessToken, refreshToken, expiresIn }

4. Logout
   POST /api/auth/logout
   Headers: { Authorization: "Bearer <accessToken>" }
```

### Example: Login Request

```bash
curl -X POST https://api.festival-platform.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

Response:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ATTENDEE",
    "emailVerified": true
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### Using the Access Token

```bash
curl -X GET https://api.festival-platform.com/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Security Best Practices

1. **Never expose tokens in URLs** - Always use headers
2. **Store tokens securely** - Use HttpOnly cookies or secure storage
3. **Implement token rotation** - Refresh tokens before expiry
4. **Handle 401 errors gracefully** - Redirect to login when needed

---

## Request/Response Format

### Content Type

All requests must include:

```
Content-Type: application/json
Accept: application/json
```

### Request Body

```json
{
  "fieldName": "value",
  "nestedObject": {
    "field": "value"
  },
  "arrayField": ["item1", "item2"]
}
```

### Success Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Summer Festival",
  "status": "PUBLISHED",
  "createdAt": "2025-01-02T12:00:00.000Z",
  "updatedAt": "2025-01-02T12:00:00.000Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "path": "/api/festivals"
}
```

### Date Format

All dates are in ISO 8601 format with timezone:

```
2025-07-15T14:00:00.000Z
```

### Currency

Monetary values are in **cents** (smallest currency unit):

```json
{
  "amount": 5000, // 50.00 EUR
  "currency": "EUR"
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and protect against abuse.

### Rate Limits

| Endpoint Type     | Limit         | Window     |
| ----------------- | ------------- | ---------- |
| Anonymous         | 100 requests  | 1 minute   |
| Authenticated     | 1000 requests | 1 minute   |
| Payment endpoints | 10 requests   | 1 minute   |
| Login attempts    | 5 requests    | 15 minutes |

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704201400
```

### Handling Rate Limits

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "timestamp": "2025-01-02T12:00:00.000Z"
}
```

**Best Practice**: Implement exponential backoff when retrying after rate limit errors.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning               | Description                          |
| ---- | --------------------- | ------------------------------------ |
| 200  | OK                    | Request successful                   |
| 201  | Created               | Resource created successfully        |
| 204  | No Content            | Request successful, no response body |
| 400  | Bad Request           | Invalid request data                 |
| 401  | Unauthorized          | Authentication required or failed    |
| 403  | Forbidden             | Insufficient permissions             |
| 404  | Not Found             | Resource not found                   |
| 409  | Conflict              | Resource already exists              |
| 422  | Unprocessable Entity  | Validation failed                    |
| 429  | Too Many Requests     | Rate limit exceeded                  |
| 500  | Internal Server Error | Server error                         |
| 503  | Service Unavailable   | Service temporarily unavailable      |

### Error Codes

| Code                       | Description                 | Resolution              |
| -------------------------- | --------------------------- | ----------------------- |
| `AUTH_INVALID_CREDENTIALS` | Email or password incorrect | Check credentials       |
| `AUTH_EMAIL_NOT_VERIFIED`  | Email not verified          | Verify email first      |
| `AUTH_ACCOUNT_LOCKED`      | Too many failed attempts    | Wait or contact support |
| `AUTH_TOKEN_EXPIRED`       | JWT token expired           | Refresh token           |
| `AUTH_TOKEN_INVALID`       | Invalid JWT token           | Re-authenticate         |
| `RESOURCE_NOT_FOUND`       | Resource doesn't exist      | Check ID/slug           |
| `RESOURCE_ALREADY_EXISTS`  | Duplicate resource          | Use unique values       |
| `VALIDATION_FAILED`        | Input validation failed     | Check error details     |
| `PERMISSION_DENIED`        | Insufficient permissions    | Check user role         |
| `RATE_LIMIT_EXCEEDED`      | Too many requests           | Wait and retry          |
| `PAYMENT_FAILED`           | Payment processing failed   | Check payment details   |
| `QUOTA_EXCEEDED`           | Ticket quota reached        | No more availability    |

### Validation Error Details

```json
{
  "statusCode": 400,
  "message": ["email must be a valid email", "password must be at least 8 characters"],
  "error": "Bad Request",
  "errors": {
    "email": ["must be a valid email address"],
    "password": ["must be at least 8 characters", "must contain a number"]
  },
  "timestamp": "2025-01-02T12:00:00.000Z",
  "path": "/api/auth/register"
}
```

---

## Pagination

List endpoints support cursor-based pagination.

### Query Parameters

| Parameter   | Type   | Default | Description               |
| ----------- | ------ | ------- | ------------------------- |
| `page`      | number | 1       | Page number               |
| `limit`     | number | 20      | Items per page (max: 100) |
| `sortBy`    | string | varies  | Field to sort by          |
| `sortOrder` | string | asc     | Sort order: asc, desc     |

### Example Request

```bash
curl "https://api.festival-platform.com/api/festivals?page=2&limit=10&sortBy=startDate&sortOrder=asc"
```

### Paginated Response

```json
{
  "data": [
    { "id": "...", "name": "Festival 1" },
    { "id": "...", "name": "Festival 2" }
  ],
  "meta": {
    "total": 50,
    "page": 2,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

---

## API Endpoints

### Authentication

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| POST   | `/auth/register`        | Register new user         |
| POST   | `/auth/login`           | Login with credentials    |
| POST   | `/auth/logout`          | Logout current session    |
| POST   | `/auth/refresh`         | Refresh access token      |
| GET    | `/auth/me`              | Get current user profile  |
| POST   | `/auth/verify-email`    | Verify email address      |
| POST   | `/auth/forgot-password` | Request password reset    |
| POST   | `/auth/reset-password`  | Reset password with token |
| POST   | `/auth/change-password` | Change current password   |

### Users

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| GET    | `/users`           | List users (admin) |
| GET    | `/users/:id`       | Get user by ID     |
| PUT    | `/users/:id`       | Update user        |
| DELETE | `/users/:id`       | Delete user        |
| POST   | `/users/:id/ban`   | Ban user (admin)   |
| POST   | `/users/:id/unban` | Unban user (admin) |

### Festivals

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| GET    | `/festivals`               | List festivals          |
| POST   | `/festivals`               | Create festival         |
| GET    | `/festivals/:id`           | Get festival by ID      |
| GET    | `/festivals/by-slug/:slug` | Get festival by slug    |
| PUT    | `/festivals/:id`           | Update festival         |
| DELETE | `/festivals/:id`           | Delete festival         |
| GET    | `/festivals/:id/stats`     | Get festival statistics |
| POST   | `/festivals/:id/publish`   | Publish festival        |
| POST   | `/festivals/:id/cancel`    | Cancel festival         |

### Tickets

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| GET    | `/tickets/categories`   | List ticket categories |
| POST   | `/tickets/categories`   | Create ticket category |
| POST   | `/tickets/purchase`     | Purchase tickets       |
| GET    | `/tickets/me`           | Get my tickets         |
| GET    | `/tickets/:id`          | Get ticket details     |
| GET    | `/tickets/:id/qr`       | Get ticket QR code     |
| POST   | `/tickets/:id/validate` | Validate ticket (scan) |
| POST   | `/tickets/:id/cancel`   | Cancel/refund ticket   |

### Payments

| Method | Endpoint                   | Description            |
| ------ | -------------------------- | ---------------------- |
| POST   | `/payments/create-session` | Create Stripe session  |
| GET    | `/payments/:id`            | Get payment details    |
| GET    | `/payments/me`             | Get my payments        |
| POST   | `/payments/:id/refund`     | Request refund         |
| POST   | `/webhooks/stripe`         | Stripe webhook handler |

### Cashless

| Method | Endpoint                 | Description              |
| ------ | ------------------------ | ------------------------ |
| GET    | `/cashless/account`      | Get my cashless account  |
| POST   | `/cashless/topup`        | Top up balance           |
| POST   | `/cashless/pay`          | Make cashless payment    |
| GET    | `/cashless/transactions` | Get transactions         |
| POST   | `/cashless/transfer`     | Transfer to another user |
| POST   | `/cashless/link-nfc`     | Link NFC tag/bracelet    |

### Zones & Access Control

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| GET    | `/zones`           | List zones            |
| POST   | `/zones`           | Create zone           |
| GET    | `/zones/:id`       | Get zone details      |
| PUT    | `/zones/:id`       | Update zone           |
| POST   | `/zones/:id/scan`  | Scan entry/exit       |
| GET    | `/zones/:id/count` | Get current occupancy |

### Staff

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| GET    | `/staff`          | List staff members |
| POST   | `/staff`          | Add staff member   |
| GET    | `/staff/shifts`   | Get shift schedule |
| POST   | `/staff/shifts`   | Create shift       |
| POST   | `/staff/checkin`  | Staff check-in     |
| POST   | `/staff/checkout` | Staff check-out    |

### Program (Artists & Performances)

| Method | Endpoint                 | Description          |
| ------ | ------------------------ | -------------------- |
| GET    | `/program/artists`       | List artists         |
| GET    | `/program/stages`        | List stages          |
| GET    | `/program/schedule`      | Get full schedule    |
| GET    | `/program/schedule/:day` | Get schedule for day |
| POST   | `/program/favorites`     | Add to favorites     |
| GET    | `/program/favorites`     | Get my favorites     |

### Notifications

| Method | Endpoint                         | Description          |
| ------ | -------------------------------- | -------------------- |
| GET    | `/notifications`                 | Get my notifications |
| PUT    | `/notifications/:id/read`        | Mark as read         |
| POST   | `/notifications/settings`        | Update preferences   |
| POST   | `/notifications/register-device` | Register push token  |

### Support

| Method | Endpoint                     | Description           |
| ------ | ---------------------------- | --------------------- |
| GET    | `/support/faq`               | Get FAQ               |
| POST   | `/support/tickets`           | Create support ticket |
| GET    | `/support/tickets`           | Get my tickets        |
| POST   | `/support/tickets/:id/reply` | Reply to ticket       |
| POST   | `/support/lost-items`        | Report lost item      |

---

## Code Examples

### JavaScript/TypeScript (fetch)

```typescript
const API_BASE = 'https://api.festival-platform.com/api';

// Login
async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Authenticated request
async function getFestivals(accessToken: string) {
  const response = await fetch(`${API_BASE}/festivals`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Token expired, refresh it
    throw new Error('Token expired');
  }

  return response.json();
}

// Purchase tickets
async function purchaseTickets(
  accessToken: string,
  festivalId: string,
  categoryId: string,
  quantity: number
) {
  const response = await fetch(`${API_BASE}/tickets/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      festivalId,
      categoryId,
      quantity,
    }),
  });

  return response.json();
}
```

### Python (requests)

```python
import requests

API_BASE = 'https://api.festival-platform.com/api'

class FestivalClient:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None

    def login(self, email: str, password: str):
        response = requests.post(
            f'{API_BASE}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data['tokens']['accessToken']
        self.refresh_token = data['tokens']['refreshToken']
        return data['user']

    def _get_headers(self):
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def get_festivals(self, page=1, limit=20):
        response = requests.get(
            f'{API_BASE}/festivals',
            headers=self._get_headers(),
            params={'page': page, 'limit': limit}
        )
        response.raise_for_status()
        return response.json()

    def get_festival(self, festival_id: str):
        response = requests.get(
            f'{API_BASE}/festivals/{festival_id}',
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
client = FestivalClient()
client.login('user@example.com', 'password')
festivals = client.get_festivals()
```

### cURL Examples

```bash
# Register a new user
curl -X POST https://api.festival-platform.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "User"
  }'

# Login
curl -X POST https://api.festival-platform.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get festivals (with auth)
curl -X GET "https://api.festival-platform.com/api/festivals?status=PUBLISHED" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create a festival
curl -X POST https://api.festival-platform.com/api/festivals \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Festival 2025",
    "shortDescription": "An amazing festival",
    "startDate": "2025-08-01T12:00:00.000Z",
    "endDate": "2025-08-03T23:00:00.000Z",
    "location": {
      "venueName": "Central Park",
      "address": "123 Main St",
      "city": "Paris",
      "country": "FR",
      "postalCode": "75001"
    }
  }'

# Purchase tickets
curl -X POST https://api.festival-platform.com/api/tickets/purchase \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "festivalId": "550e8400-e29b-41d4-a716-446655440000",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "quantity": 2
  }'

# Top up cashless account
curl -X POST https://api.festival-platform.com/api/cashless/topup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "EUR"
  }'
```

---

## SDKs

### Official SDKs

Coming soon:

- JavaScript/TypeScript SDK
- Python SDK
- React Native SDK

### Community SDKs

If you've built an SDK, let us know and we'll list it here!

---

## Support

- **Documentation**: https://docs.festival-platform.com
- **API Status**: https://status.festival-platform.com
- **Email**: api-support@festival-platform.com
- **GitHub Issues**: https://github.com/festival-platform/api/issues

---

## Changelog

### v1.0.0 (2025-01-02)

- Initial API release
- Authentication with JWT
- Festival management
- Ticket sales and validation
- Cashless payments
- Staff management
- WebSocket notifications
