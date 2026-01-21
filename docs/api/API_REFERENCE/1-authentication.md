# 1. Authentication

All authentication endpoints are prefixed with `/auth`.

## POST /auth/register

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

## POST /auth/login

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

## POST /auth/logout

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

## POST /auth/refresh

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

## GET /auth/me

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

## POST /auth/verify-email

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

## POST /auth/forgot-password

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

## POST /auth/reset-password

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

## POST /auth/change-password

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

## GET /auth/google

Initiate Google OAuth login flow.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

Redirects to Google OAuth consent screen.

---

## GET /auth/github

Initiate GitHub OAuth login flow.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

Redirects to GitHub OAuth authorization page.

---

## GET /auth/providers

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
