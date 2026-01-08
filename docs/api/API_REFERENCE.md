# Festival Platform - API Reference

Complete API reference documentation for the Festival Management Platform.

**Version:** 1.0.0
**Base URL:** `https://api.festival-platform.com/api`
**Swagger UI:** `/api/docs`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Festivals](#3-festivals)
4. [Tickets](#4-tickets)
5. [Payments](#5-payments)
6. [Cashless / Wallet](#6-cashless--wallet)
7. [Zones](#7-zones)
8. [Staff](#8-staff)
9. [Program](#9-program)
10. [Support](#10-support)

---

## Common Response Formats

### Success Response

```json
{
  "id": "uuid",
  "field": "value",
  "createdAt": "2025-01-02T12:00:00.000Z",
  "updatedAt": "2025-01-02T12:00:00.000Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Paginated Response

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 1. Authentication

All authentication endpoints are prefixed with `/auth`.

### POST /auth/register

Register a new user account.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678"
}
```

| Field     | Type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| email     | string | Yes      | Valid email address                       |
| password  | string | Yes      | Min 8 chars, uppercase, lowercase, number |
| firstName | string | Yes      | First name                                |
| lastName  | string | Yes      | Last name                                 |
| phone     | string | No       | Phone number (E.164 format)               |

**Response (201):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2025-01-02T12:00:00.000Z"
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Validation error |
| 409 | Email already registered |
| 429 | Too many registration attempts |

---

### POST /auth/login

Authenticate user and receive JWT tokens.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
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

**Note:** Tokens are also set as httpOnly cookies (`access_token`, `refresh_token`).

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Validation error |
| 401 | Invalid credentials, unverified email, or banned user |
| 429 | Account locked (too many failed attempts) |

---

### POST /auth/logout

Logout and invalidate tokens.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | No (uses refresh token) |
| **Roles**         | Public                  |

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Refresh token can also be read from the `refresh_token` cookie.

**Response (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 401 | Invalid or expired refresh token |

---

### GET /auth/me

Get current authenticated user profile.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": true,
  "createdAt": "2025-01-02T12:00:00.000Z",
  "lastLoginAt": "2025-01-02T14:00:00.000Z"
}
```

---

### POST /auth/verify-email

Verify email address with token.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "token": "verify-abc123def456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

---

### POST /auth/forgot-password

Request password reset email.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "If an account exists with this email, a reset link has been sent."
}
```

**Note:** Same response for existing and non-existing emails (prevents enumeration).

---

### POST /auth/reset-password

Reset password with token.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "token": "reset-token-abc123",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successful. Please log in with your new password."
}
```

---

### POST /auth/change-password

Change password for authenticated user.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

---

### GET /auth/google

Initiate Google OAuth login flow.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

Redirects to Google OAuth consent screen.

---

### GET /auth/github

Initiate GitHub OAuth login flow.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

Redirects to GitHub OAuth authorization page.

---

### GET /auth/providers

Get available OAuth providers.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):**

```json
{
  "providers": [
    {
      "name": "google",
      "enabled": true,
      "url": "/api/auth/google"
    },
    {
      "name": "github",
      "enabled": true,
      "url": "/api/auth/github"
    }
  ]
}
```

---

## 2. Users

User management endpoints. Base path: `/users`

### POST /users

Create a new user (Admin only).

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "New",
  "lastName": "User",
  "role": "USER",
  "skipEmailVerification": false
}
```

**Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": false,
  "createdAt": "2025-01-02T12:00:00.000Z"
}
```

---

### GET /users

List all users with pagination and filters.

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| role | enum | - | Filter by role (USER, ADMIN, ORGANIZER, STAFF, SECURITY, CASHIER) |
| status | enum | - | Filter by status (ACTIVE, INACTIVE, BANNED) |
| email | string | - | Filter by email |
| search | string | - | Search in email, firstName, lastName |
| festivalId | uuid | - | Filter by festival association |
| sortBy | enum | createdAt | Sort field |
| sortOrder | enum | desc | Sort order (asc, desc) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### GET /users/search

Search users for autocomplete.

| Property          | Value              |
| ----------------- | ------------------ |
| **Auth Required** | Yes                |
| **Roles**         | ADMIN              |
| **Rate Limit**    | 30 requests/minute |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars) |
| limit | number | No | Max results (1-50, default 10) |

**Response (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
]
```

---

### GET /users/:id

Get user by ID.

| Property          | Value         |
| ----------------- | ------------- |
| **Auth Required** | Yes           |
| **Roles**         | ADMIN or Self |

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": true,
  "phone": "+33612345678",
  "createdAt": "2025-01-02T12:00:00.000Z",
  "lastLoginAt": "2025-01-02T14:00:00.000Z"
}
```

---

### PATCH /users/:id

Update user profile.

| Property          | Value         |
| ----------------- | ------------- |
| **Auth Required** | Yes           |
| **Roles**         | ADMIN or Self |

**Request Body:**

```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phone": "+33612345678"
}
```

**Response (200):** Updated user object.

---

### DELETE /users/:id

Deactivate user (soft delete).

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

**Response (200):**

```json
{
  "message": "User john@example.com has been deactivated"
}
```

**Note:** Cannot deactivate admins or yourself.

---

### PATCH /users/:id/role

Change user role.

| Property          | Value              |
| ----------------- | ------------------ |
| **Auth Required** | Yes                |
| **Roles**         | ADMIN              |
| **Rate Limit**    | 10 requests/minute |

**Request Body:**

```json
{
  "role": "ORGANIZER",
  "reason": "Promoted to event organizer"
}
```

**Response (200):** Updated user object.

**Note:** Cannot change own role or demote another admin.

---

### POST /users/:id/ban

Ban a user.

| Property          | Value              |
| ----------------- | ------------------ |
| **Auth Required** | Yes                |
| **Roles**         | ADMIN              |
| **Rate Limit**    | 10 requests/minute |

**Request Body:**

```json
{
  "reason": "Violation of terms of service"
}
```

**Response (200):**

```json
{
  "message": "User john@example.com has been banned"
}
```

---

### POST /users/:id/unban

Unban a user.

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

**Request Body:**

```json
{
  "reason": "Ban appeal approved"
}
```

**Response (200):**

```json
{
  "message": "User john@example.com has been unbanned"
}
```

---

### GET /users/:id/activity

Get user activity history.

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

**Response (200):**

```json
[
  {
    "type": "LOGIN",
    "description": "User logged in",
    "timestamp": "2025-01-02T14:00:00.000Z",
    "metadata": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  },
  {
    "type": "TICKET_PURCHASE",
    "description": "Purchased 2 tickets",
    "timestamp": "2025-01-02T13:00:00.000Z",
    "metadata": {
      "festivalId": "...",
      "amount": 15000
    }
  }
]
```

---

## 3. Festivals

Festival management endpoints. Base path: `/festivals`

### POST /festivals

Create a new festival.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "name": "Summer Vibes Festival 2025",
  "shortDescription": "The biggest summer music festival",
  "description": "Three days of amazing music, food, and fun...",
  "startDate": "2025-07-15T12:00:00.000Z",
  "endDate": "2025-07-17T23:00:00.000Z",
  "location": {
    "venueName": "Central Park",
    "address": "123 Main Street",
    "city": "Paris",
    "country": "FR",
    "postalCode": "75001",
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "capacity": 50000,
  "imageUrl": "https://example.com/festival.jpg",
  "genres": ["Electronic", "Rock", "Pop"]
}
```

**Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Summer Vibes Festival 2025",
  "slug": "summer-vibes-festival-2025",
  "status": "DRAFT",
  "organizerId": "...",
  "createdAt": "2025-01-02T12:00:00.000Z"
}
```

---

### GET /festivals

List festivals with filters.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| status | enum | PUBLISHED | DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED |
| search | string | - | Search in name, description |
| startDate | date | - | Filter by start date (after) |
| endDate | date | - | Filter by end date (before) |
| genres | string[] | - | Filter by genre |
| city | string | - | Filter by city |

**Response (200):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Vibes Festival 2025",
      "slug": "summer-vibes-festival-2025",
      "shortDescription": "The biggest summer music festival",
      "startDate": "2025-07-15T12:00:00.000Z",
      "endDate": "2025-07-17T23:00:00.000Z",
      "location": {
        "city": "Paris",
        "country": "FR"
      },
      "imageUrl": "https://example.com/festival.jpg",
      "status": "PUBLISHED",
      "ticketCategories": [
        {
          "id": "...",
          "name": "Standard",
          "price": 7500
        }
      ]
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### GET /festivals/:id

Get festival by ID.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):** Full festival object with all details.

---

### GET /festivals/by-slug/:slug

Get festival by URL slug.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):** Full festival object.

---

### PUT /festivals/:id

Update festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Request Body:** Same as POST /festivals (all fields optional).

**Response (200):** Updated festival object.

---

### DELETE /festivals/:id

Delete festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (204):** No content.

---

### GET /festivals/:id/stats

Get festival statistics.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (200):**

```json
{
  "ticketsSold": 15000,
  "totalRevenue": 112500000,
  "cashlessTransactions": 45000,
  "cashlessVolume": 67500000,
  "occupancyRate": 30,
  "staffCount": 250,
  "zoneCounts": {
    "main-stage": 5000,
    "vip-area": 500
  },
  "revenueByCategory": {
    "standard": 75000000,
    "vip": 37500000
  }
}
```

---

### POST /festivals/:id/publish

Publish a draft festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (200):** Updated festival with status "PUBLISHED".

---

### POST /festivals/:id/cancel

Cancel a festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (200):** Updated festival with status "CANCELLED".

**Note:** Initiates refund process for all ticket holders.

---

## 4. Tickets

Ticket management endpoints. Base path: `/api/tickets`

### GET /api/tickets

Get current user's tickets.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Filter by festival |

**Response (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticketNumber": "FEST-2025-ABC123",
    "status": "ACTIVE",
    "category": {
      "id": "...",
      "name": "VIP",
      "type": "VIP"
    },
    "festival": {
      "id": "...",
      "name": "Summer Vibes Festival",
      "startDate": "2025-07-15T12:00:00.000Z"
    },
    "qrCode": "data:image/png;base64,...",
    "purchasedAt": "2025-01-02T12:00:00.000Z"
  }
]
```

---

### GET /api/tickets/:id

Get ticket by ID.

| Property          | Value        |
| ----------------- | ------------ |
| **Auth Required** | Yes          |
| **Roles**         | Ticket owner |

**Response (200):** Full ticket object.

---

### GET /api/tickets/:id/qrcode

Get ticket QR code image.

| Property          | Value        |
| ----------------- | ------------ |
| **Auth Required** | Yes          |
| **Roles**         | Ticket owner |

**Response (200):**

```json
{
  "qrCode": "data:image/png;base64,..."
}
```

---

### POST /api/tickets/purchase

Purchase tickets.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 2
    }
  ],
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response (201):**

```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/...",
  "sessionId": "cs_xxx",
  "tickets": [
    {
      "id": "...",
      "ticketNumber": "FEST-2025-ABC123",
      "status": "PENDING"
    }
  ]
}
```

---

### POST /api/tickets/guest-purchase

Purchase tickets without authentication.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Request Body:**

```json
{
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "categoryId": "...",
      "quantity": 1
    }
  ],
  "guestEmail": "guest@example.com",
  "guestFirstName": "Guest",
  "guestLastName": "User",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

---

### POST /api/tickets/validate

Validate a ticket (QR scan).

| Property          | Value                             |
| ----------------- | --------------------------------- |
| **Auth Required** | Yes                               |
| **Roles**         | STAFF, SECURITY, ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "qrCode": "FEST-2025-ABC123-HMAC...",
  "zoneId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**

```json
{
  "valid": true,
  "ticket": {
    "id": "...",
    "ticketNumber": "FEST-2025-ABC123",
    "status": "ACTIVE",
    "category": {
      "name": "VIP",
      "accessLevel": ["main-stage", "vip-area"]
    },
    "holder": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "zoneAccess": true,
  "message": "Access granted"
}
```

---

### POST /api/tickets/:id/scan

Scan ticket for zone entry.

| Property          | Value                             |
| ----------------- | --------------------------------- |
| **Auth Required** | Yes                               |
| **Roles**         | STAFF, SECURITY, ADMIN, ORGANIZER |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| zoneId | uuid | Zone to enter |

**Response (200):** Scan result with access status.

---

### DELETE /api/tickets/:id

Cancel ticket and request refund.

| Property          | Value        |
| ----------------- | ------------ |
| **Auth Required** | Yes          |
| **Roles**         | Ticket owner |

**Response (200):**

```json
{
  "message": "Ticket cancelled",
  "refundAmount": 7500,
  "refundStatus": "PROCESSING"
}
```

---

## 5. Payments

Payment and billing endpoints. Base path: `/payments`

### POST /payments/checkout

Create a Stripe checkout session.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "items": [
    {
      "name": "VIP Ticket",
      "price": 15000,
      "quantity": 2
    }
  ],
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel",
  "metadata": {
    "festivalId": "...",
    "type": "ticket_purchase"
  }
}
```

**Response (201):**

```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/pay/...",
  "expiresAt": "2025-01-02T13:00:00.000Z"
}
```

---

### GET /payments/checkout/:sessionId

Get checkout session status.

| Property          | Value         |
| ----------------- | ------------- |
| **Auth Required** | Yes           |
| **Roles**         | Session owner |

**Response (200):**

```json
{
  "id": "cs_xxx",
  "status": "complete",
  "paymentStatus": "paid",
  "amountTotal": 30000,
  "currency": "eur",
  "customerEmail": "user@example.com"
}
```

---

### POST /payments/intent

Create a payment intent.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "amount": 5000,
  "currency": "EUR",
  "description": "Cashless top-up",
  "metadata": {
    "type": "cashless_topup"
  }
}
```

**Response (201):**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

---

### GET /payments/:paymentId

Get payment details.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Payment owner or ADMIN |

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "stripePaymentIntentId": "pi_xxx",
  "amount": 15000,
  "currency": "EUR",
  "status": "COMPLETED",
  "provider": "STRIPE",
  "metadata": {
    "festivalId": "...",
    "type": "ticket_purchase"
  },
  "paidAt": "2025-01-02T12:00:00.000Z"
}
```

---

### GET /payments/user/:userId

Get user payment history.

| Property          | Value                        |
| ----------------- | ---------------------------- |
| **Auth Required** | Yes                          |
| **Roles**         | User (own payments) or ADMIN |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Max results |
| offset | number | Skip results |

**Response (200):** Array of payment objects.

---

### POST /payments/refunds

Create a full refund.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Customer request"
}
```

---

### POST /payments/refunds/partial

Create a partial refund.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 5000,
  "reason": "Partial cancellation"
}
```

---

### POST /payments/webhook

Handle Stripe webhook events.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | No (signature verification) |
| **Roles**         | Stripe only                 |

**Headers:**

```
stripe-signature: t=xxx,v1=xxx
```

See [WEBHOOKS.md](./WEBHOOKS.md) for detailed webhook documentation.

---

## 6. Cashless / Wallet

Cashless wallet endpoints. Base path: `/api/wallet`

### GET /api/wallet/account

Get or create cashless account.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "...",
  "balance": 5000,
  "currency": "EUR",
  "isActive": true,
  "nfcTagId": "ABC123DEF456",
  "createdAt": "2025-01-02T12:00:00.000Z"
}
```

---

### GET /api/wallet/balance

Get wallet balance.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Response (200):**

```json
{
  "available": 5000,
  "pending": 0,
  "currency": "EUR"
}
```

---

### POST /api/wallet/topup

Top up wallet balance.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "amount": 5000,
  "festivalId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field      | Type   | Description     | Limits                                 |
| ---------- | ------ | --------------- | -------------------------------------- |
| amount     | number | Amount in cents | Min: 500 (5 EUR), Max: 50000 (500 EUR) |
| festivalId | uuid   | Festival ID     | Required                               |

**Response (200):**

```json
{
  "transaction": {
    "id": "...",
    "type": "TOPUP",
    "amount": 5000,
    "balanceAfter": 10000,
    "createdAt": "2025-01-02T12:00:00.000Z"
  },
  "account": {
    "balance": 10000
  }
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Amount below minimum (500) or above maximum (50000) |
| 400 | Would exceed maximum balance (100000) |

---

### POST /api/wallet/pay

Make a cashless payment.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "amount": 1500,
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "vendorId": "550e8400-e29b-41d4-a716-446655440001",
  "description": "2x Beer"
}
```

**Response (200):**

```json
{
  "transaction": {
    "id": "...",
    "type": "PAYMENT",
    "amount": -1500,
    "balanceAfter": 8500,
    "vendorId": "...",
    "description": "2x Beer"
  },
  "account": {
    "balance": 8500
  }
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Insufficient balance |
| 400 | Invalid amount (must be > 0) |
| 400 | Account is disabled |
| 400 | Festival not ongoing |

---

### GET /api/wallet/transactions

Get transaction history.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Filter by festival |
| limit | number | Max results (default: 50) |
| offset | number | Skip results |

**Response (200):**

```json
[
  {
    "id": "...",
    "type": "PAYMENT",
    "amount": -1500,
    "balanceAfter": 8500,
    "description": "2x Beer",
    "vendor": {
      "name": "Beer Stand #1"
    },
    "createdAt": "2025-01-02T14:00:00.000Z"
  },
  {
    "id": "...",
    "type": "TOPUP",
    "amount": 5000,
    "balanceAfter": 10000,
    "createdAt": "2025-01-02T12:00:00.000Z"
  }
]
```

---

### POST /api/wallet/nfc/link

Link NFC tag/bracelet to account.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "nfcTagId": "ABC123DEF456"
}
```

**Response (200):**

```json
{
  "message": "NFC tag linked successfully",
  "account": {
    "id": "...",
    "nfcTagId": "ABC123DEF456"
  }
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 409 | NFC tag already linked to another account |

---

### POST /api/wallet/refund

Refund a cashless transaction (Staff only).

| Property          | Value                            |
| ----------------- | -------------------------------- |
| **Auth Required** | Yes                              |
| **Roles**         | STAFF, CASHIER, ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Incorrect order"
}
```

**Response (200):**

```json
{
  "refundTransaction": {
    "id": "...",
    "type": "REFUND",
    "amount": 1500,
    "originalTransactionId": "..."
  }
}
```

---

## 7. Zones

Zone management and access control. Base paths: `/festivals/:festivalId/zones` and `/zones`

### POST /festivals/:festivalId/zones

Create a new zone.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "name": "VIP Area",
  "type": "VIP",
  "description": "Exclusive VIP area with premium amenities",
  "capacity": 500,
  "isActive": true,
  "requiresTicketType": ["VIP", "BACKSTAGE"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Zone created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "VIP Area",
    "type": "VIP",
    "capacity": 500,
    "currentOccupancy": 0,
    "isActive": true
  }
}
```

---

### GET /festivals/:festivalId/zones

Get all zones for a festival.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Main Stage",
      "type": "STAGE",
      "capacity": 10000,
      "currentOccupancy": 5000
    },
    {
      "id": "...",
      "name": "VIP Area",
      "type": "VIP",
      "capacity": 500,
      "currentOccupancy": 250
    }
  ],
  "count": 2
}
```

---

### GET /festivals/:festivalId/zones/capacity

Get capacity status for all zones (dashboard).

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "zoneId": "...",
      "zoneName": "Main Stage",
      "capacity": 10000,
      "currentOccupancy": 5000,
      "occupancyPercentage": 50,
      "status": "GREEN"
    },
    {
      "zoneId": "...",
      "zoneName": "VIP Area",
      "capacity": 500,
      "currentOccupancy": 450,
      "occupancyPercentage": 90,
      "status": "ORANGE"
    }
  ]
}
```

**Status Colors:**

- GREEN: < 60% capacity
- YELLOW: 60-79% capacity
- ORANGE: 80-94% capacity
- RED: >= 95% capacity

---

### GET /zones/:id

Get zone details.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

---

### PATCH /zones/:id

Update zone.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

### DELETE /zones/:id

Delete zone.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (204):** No content.

---

### GET /zones/:id/capacity

Get zone capacity status.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "zoneId": "...",
    "capacity": 500,
    "currentOccupancy": 250,
    "occupancyPercentage": 50,
    "status": "GREEN",
    "available": 250
  }
}
```

---

### POST /zones/:id/check

Check access for a ticket (QR scan).

| Property          | Value                             |
| ----------------- | --------------------------------- |
| **Auth Required** | Yes                               |
| **Roles**         | ADMIN, ORGANIZER, STAFF, SECURITY |

**Request Body:**

```json
{
  "ticketId": "550e8400-e29b-41d4-a716-446655440000"
}
```

or

```json
{
  "qrCode": "FEST-2025-ABC123-HMAC..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessGranted": true,
    "ticket": {
      "id": "...",
      "ticketNumber": "FEST-2025-ABC123",
      "category": "VIP"
    },
    "zone": {
      "name": "VIP Area",
      "currentOccupancy": 250,
      "capacity": 500
    },
    "message": "Access granted"
  }
}
```

---

### POST /zones/:id/access

Log zone entry/exit.

| Property          | Value                             |
| ----------------- | --------------------------------- |
| **Auth Required** | Yes                               |
| **Roles**         | ADMIN, ORGANIZER, STAFF, SECURITY |

**Request Body:**

```json
{
  "ticketId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "ENTRY"
}
```

| Field  | Type | Values      |
| ------ | ---- | ----------- |
| action | enum | ENTRY, EXIT |

**Response (201):**

```json
{
  "success": true,
  "message": "ENTRY logged successfully",
  "data": {
    "accessLog": {
      "id": "...",
      "action": "ENTRY",
      "timestamp": "2025-01-02T14:00:00.000Z"
    },
    "zone": {
      "currentOccupancy": 251,
      "capacity": 500,
      "occupancyPercentage": 50.2
    },
    "alert": null
  }
}
```

**Alerts:**

- `WARNING`: Zone at 80%+ capacity
- `CRITICAL`: Zone at 95%+ capacity

---

### GET /zones/:id/access-log

Get zone access log history.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 50) |
| startDate | ISO date | Filter from date |
| endDate | ISO date | Filter to date |
| action | enum | ENTRY or EXIT |

---

### GET /zones/:id/stats

Get zone access statistics.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalEntries": 5000,
    "totalExits": 4500,
    "uniqueVisitors": 3200,
    "peakOccupancy": 450,
    "peakTime": "2025-07-15T21:00:00.000Z",
    "averageStayMinutes": 45,
    "hourlyDistribution": {
      "14": 150,
      "15": 250,
      "16": 400,
      "17": 350
    }
  }
}
```

---

### POST /zones/:id/reset-occupancy

Reset zone occupancy to zero (Admin only).

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

---

### POST /zones/:id/adjust-occupancy

Manually adjust zone occupancy.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| adjustment | number | Positive or negative adjustment |

---

## 8. Staff

Staff management endpoints. Base paths: `/staff` and `/festivals/:festivalId/staff`

### POST /staff

Create a staff member assignment.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "festivalId": "550e8400-e29b-41d4-a716-446655440001",
  "role": "SECURITY",
  "department": "Access Control",
  "zoneId": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

### GET /staff/:id

Get staff member details.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

---

### PUT /staff/:id

Update staff member.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

### DELETE /staff/:id

Delete staff assignment.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (204):** No content.

---

### POST /staff/:staffId/shifts

Create a shift.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Request Body:**

```json
{
  "startTime": "2025-07-15T08:00:00.000Z",
  "endTime": "2025-07-15T16:00:00.000Z",
  "zoneId": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Main entrance duty"
}
```

---

### GET /staff/:staffId/shifts

Get shifts for a staff member.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter from date |
| endDate | date | Filter to date |

---

### PUT /staff/shifts/:shiftId

Update a shift.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

### DELETE /staff/shifts/:shiftId

Delete a shift.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

### POST /staff/shifts/:shiftId/checkin

Check in for a shift.

| Property          | Value               |
| ----------------- | ------------------- |
| **Auth Required** | Yes                 |
| **Roles**         | Staff member (self) |

**Request Body:**

```json
{
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  }
}
```

**Response (200):**

```json
{
  "message": "Checked in successfully",
  "shift": {
    "id": "...",
    "checkinTime": "2025-07-15T07:55:00.000Z",
    "status": "IN_PROGRESS"
  }
}
```

---

### POST /staff/shifts/:shiftId/checkout

Check out from a shift.

| Property          | Value               |
| ----------------- | ------------------- |
| **Auth Required** | Yes                 |
| **Roles**         | Staff member (self) |

**Response (200):**

```json
{
  "message": "Checked out successfully",
  "shift": {
    "id": "...",
    "checkoutTime": "2025-07-15T16:05:00.000Z",
    "status": "COMPLETED",
    "hoursWorked": 8.17
  }
}
```

---

### GET /festivals/:festivalId/staff

Get all staff members for a festival.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| department | string | Filter by department |
| role | string | Filter by role |
| isActive | boolean | Filter by active status |
| page | number | Page number |
| limit | number | Items per page |

---

### GET /festivals/:festivalId/staff/stats

Get staff statistics for a festival.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (200):**

```json
{
  "totalStaff": 250,
  "activeShifts": 45,
  "checkedIn": 42,
  "byDepartment": {
    "Security": 80,
    "Food & Beverage": 60,
    "Technical": 40
  },
  "byRole": {
    "SECURITY": 80,
    "CASHIER": 50,
    "STAFF": 120
  }
}
```

---

## 9. Program

Festival program endpoints. Base path: `/api/program`

### GET /api/program

Get full festival program.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| festivalId | uuid | Yes | Festival ID |

**Response (200):**

```json
{
  "festival": {
    "id": "...",
    "name": "Summer Vibes Festival",
    "startDate": "2025-07-15",
    "endDate": "2025-07-17"
  },
  "days": [
    {
      "date": "2025-07-15",
      "stages": [
        {
          "id": "...",
          "name": "Main Stage",
          "performances": [
            {
              "id": "...",
              "startTime": "2025-07-15T14:00:00.000Z",
              "endTime": "2025-07-15T15:30:00.000Z",
              "artist": {
                "id": "...",
                "name": "Artist Name",
                "genre": "Electronic",
                "imageUrl": "..."
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

### GET /api/program/day/:day

Get program for a specific day.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| day | date | Date in YYYY-MM-DD format |

---

### GET /api/program/artists

Get all artists for a festival.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Festival ID |

**Response (200):**

```json
[
  {
    "id": "...",
    "name": "Artist Name",
    "bio": "Artist biography...",
    "genre": "Electronic",
    "imageUrl": "https://...",
    "socialLinks": {
      "instagram": "https://instagram.com/artist",
      "spotify": "https://open.spotify.com/artist/..."
    }
  }
]
```

---

### GET /api/program/artists/:id

Get artist by ID.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

---

### GET /api/program/artists/:id/performances

Get performances for an artist.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Filter by festival |

---

### GET /api/program/stages

Get all stages for a festival.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):**

```json
[
  {
    "id": "...",
    "name": "Main Stage",
    "description": "The main stage for headliners",
    "capacity": 10000,
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  }
]
```

---

### GET /api/program/favorites

Get user's favorite artists.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Festival ID |

---

### POST /api/program/favorites/:artistId

Toggle artist as favorite.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| festivalId | uuid | Festival ID |

**Response (200):**

```json
{
  "isFavorite": true,
  "artist": {
    "id": "...",
    "name": "Artist Name"
  }
}
```

---

## 10. Support

Support and FAQ endpoints. Base paths: `/faq`, `/support/tickets`

### GET /faq

Get public FAQ.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):**

```json
[
  {
    "id": "...",
    "name": "Tickets & Access",
    "order": 1,
    "items": [
      {
        "id": "...",
        "question": "How do I get my ticket?",
        "answer": "After purchase, you'll receive an email with your QR code...",
        "order": 1
      }
    ]
  }
]
```

---

### GET /faq/search

Search FAQ items.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search term |

---

### POST /support/tickets

Create a support ticket.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Request Body:**

```json
{
  "subject": "Issue with my ticket",
  "category": "TICKETING",
  "priority": "MEDIUM",
  "message": "I purchased a ticket but haven't received the confirmation...",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field    | Type | Values                                                        |
| -------- | ---- | ------------------------------------------------------------- |
| category | enum | GENERAL, TICKETING, PAYMENT, CASHLESS, ACCESS, CAMPING, OTHER |
| priority | enum | LOW, MEDIUM, HIGH, URGENT                                     |

**Response (201):**

```json
{
  "id": "...",
  "ticketNumber": "SUP-2025-001234",
  "subject": "Issue with my ticket",
  "status": "OPEN",
  "priority": "MEDIUM",
  "createdAt": "2025-01-02T12:00:00.000Z"
}
```

---

### GET /support/tickets

Get user's support tickets.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | enum | Filter by status |
| priority | enum | Filter by priority |
| page | number | Page number |
| limit | number | Items per page |

---

### GET /support/tickets/:id

Get support ticket by ID.

| Property          | Value                 |
| ----------------- | --------------------- |
| **Auth Required** | Yes                   |
| **Roles**         | Ticket owner or Staff |

**Response (200):**

```json
{
  "id": "...",
  "ticketNumber": "SUP-2025-001234",
  "subject": "Issue with my ticket",
  "status": "IN_PROGRESS",
  "priority": "MEDIUM",
  "category": "TICKETING",
  "messages": [
    {
      "id": "...",
      "content": "I purchased a ticket but...",
      "isStaffReply": false,
      "createdAt": "2025-01-02T12:00:00.000Z"
    },
    {
      "id": "...",
      "content": "Thank you for contacting us...",
      "isStaffReply": true,
      "createdAt": "2025-01-02T12:30:00.000Z"
    }
  ],
  "assignedTo": {
    "id": "...",
    "firstName": "Support",
    "lastName": "Agent"
  },
  "createdAt": "2025-01-02T12:00:00.000Z"
}
```

---

### POST /support/tickets/:id/messages

Add message to a ticket.

| Property          | Value                 |
| ----------------- | --------------------- |
| **Auth Required** | Yes                   |
| **Roles**         | Ticket owner or Staff |

**Request Body:**

```json
{
  "content": "Here is additional information..."
}
```

---

### GET /support/tickets/:id/messages

Get all messages for a ticket.

| Property          | Value                 |
| ----------------- | --------------------- |
| **Auth Required** | Yes                   |
| **Roles**         | Ticket owner or Staff |

---

### PATCH /support/tickets/:id (Staff Only)

Update support ticket.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

### PATCH /support/tickets/:id/status (Staff Only)

Change ticket status.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

**Request Body:**

```json
{
  "status": "RESOLVED",
  "resolution": "Ticket resent to customer email"
}
```

| Status Values    |
| ---------------- |
| OPEN             |
| IN_PROGRESS      |
| WAITING_CUSTOMER |
| RESOLVED         |
| CLOSED           |

---

### PATCH /support/tickets/:id/assign (Staff Only)

Assign ticket to staff member.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

**Request Body:**

```json
{
  "staffId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### GET /support/tickets/admin/all (Staff Only)

Get all tickets (admin view).

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

### GET /support/tickets/admin/sla-breaches (Staff Only)

Get tickets that have breached SLA.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

### GET /support/tickets/admin/statistics (Staff Only)

Get ticket statistics.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (200):**

```json
{
  "totalTickets": 500,
  "openTickets": 45,
  "resolvedToday": 12,
  "averageResolutionTimeHours": 4.5,
  "byCategory": {
    "TICKETING": 150,
    "PAYMENT": 100,
    "CASHLESS": 80
  },
  "byPriority": {
    "LOW": 100,
    "MEDIUM": 250,
    "HIGH": 100,
    "URGENT": 50
  }
}
```

---

## Additional Resources

- **Swagger UI:** Access interactive API documentation at `/api/docs`
- **Webhooks:** See [WEBHOOKS.md](./WEBHOOKS.md) for webhook integration
- **Postman Collection:** Import `festival-api.postman_collection.json` for testing
- **API Guide:** See [API_GUIDE.md](./API_GUIDE.md) for integration examples

---

## Error Codes Reference

| HTTP Code | Error                 | Description                              |
| --------- | --------------------- | ---------------------------------------- |
| 400       | Bad Request           | Invalid request data or validation error |
| 401       | Unauthorized          | Authentication required or invalid token |
| 403       | Forbidden             | Insufficient permissions for this action |
| 404       | Not Found             | Resource does not exist                  |
| 409       | Conflict              | Resource already exists (duplicate)      |
| 422       | Unprocessable Entity  | Semantic validation failed               |
| 429       | Too Many Requests     | Rate limit exceeded                      |
| 500       | Internal Server Error | Server error (contact support)           |

---

## Rate Limits

| Endpoint Type                    | Limit         | Window     |
| -------------------------------- | ------------- | ---------- |
| Public endpoints                 | 100 requests  | 1 minute   |
| Authenticated endpoints          | 1000 requests | 1 minute   |
| Login/Register                   | 5 requests    | 15 minutes |
| Payment endpoints                | 10 requests   | 1 minute   |
| Admin actions (ban, role change) | 10 requests   | 1 minute   |
| Search endpoints                 | 30 requests   | 1 minute   |

---

_Last updated: 2026-01-08_
