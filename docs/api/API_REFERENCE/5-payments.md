# 5. Payments

Payment and billing endpoints. Base path: `/payments`

## POST /payments/checkout

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

## GET /payments/checkout/:sessionId

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

## POST /payments/intent

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

## GET /payments/:paymentId

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

## GET /payments/user/:userId

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

## POST /payments/refunds

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

## POST /payments/refunds/partial

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

## POST /payments/webhook

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
