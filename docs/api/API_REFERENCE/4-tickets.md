# 4. Tickets

Ticket management endpoints. Base path: `/api/tickets`

## GET /api/tickets

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

## GET /api/tickets/:id

Get ticket by ID.

| Property          | Value        |
| ----------------- | ------------ |
| **Auth Required** | Yes          |
| **Roles**         | Ticket owner |

**Response (200):** Full ticket object.

---

## GET /api/tickets/:id/qrcode

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

## POST /api/tickets/purchase

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

## POST /api/tickets/guest-purchase

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

## POST /api/tickets/validate

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

## POST /api/tickets/:id/scan

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

## DELETE /api/tickets/:id

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
