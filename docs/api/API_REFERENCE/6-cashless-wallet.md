# 6. Cashless / Wallet

Cashless wallet endpoints. Base path: `/api/wallet`

## GET /api/wallet/account

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

## GET /api/wallet/balance

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

## POST /api/wallet/topup

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

## POST /api/wallet/pay

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

## GET /api/wallet/transactions

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

## POST /api/wallet/nfc/link

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

## POST /api/wallet/refund

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
