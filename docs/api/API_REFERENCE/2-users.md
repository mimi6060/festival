# 2. Users

User management endpoints. Base path: `/users`

## POST /users

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

## GET /users

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

## GET /users/search

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

## GET /users/:id

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

## PATCH /users/:id

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

## DELETE /users/:id

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

## PATCH /users/:id/role

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

## POST /users/:id/ban

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

## POST /users/:id/unban

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

## GET /users/:id/activity

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
