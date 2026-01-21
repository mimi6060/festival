# 10. Support

Support and FAQ endpoints. Base paths: `/faq`, `/support/tickets`

## GET /faq

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

## GET /faq/search

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

## POST /support/tickets

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

## GET /support/tickets

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

## GET /support/tickets/:id

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

## POST /support/tickets/:id/messages

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

## GET /support/tickets/:id/messages

Get all messages for a ticket.

| Property          | Value                 |
| ----------------- | --------------------- |
| **Auth Required** | Yes                   |
| **Roles**         | Ticket owner or Staff |

---

## PATCH /support/tickets/:id (Staff Only)

Update support ticket.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

## PATCH /support/tickets/:id/status (Staff Only)

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

## PATCH /support/tickets/:id/assign (Staff Only)

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

## GET /support/tickets/admin/all (Staff Only)

Get all tickets (admin view).

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

## GET /support/tickets/admin/sla-breaches (Staff Only)

Get tickets that have breached SLA.

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Auth Required** | Yes                     |
| **Roles**         | ADMIN, ORGANIZER, STAFF |

---

## GET /support/tickets/admin/statistics (Staff Only)

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
