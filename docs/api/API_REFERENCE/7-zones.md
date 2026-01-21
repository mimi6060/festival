# 7. Zones

Zone management and access control. Base paths: `/festivals/:festivalId/zones` and `/zones`

## POST /festivals/:festivalId/zones

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

## GET /festivals/:festivalId/zones

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

## GET /festivals/:festivalId/zones/capacity

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

## GET /zones/:id

Get zone details.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

---

## PATCH /zones/:id

Update zone.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

## DELETE /zones/:id

Delete zone.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (204):** No content.

---

## GET /zones/:id/capacity

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

## POST /zones/:id/check

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

## POST /zones/:id/access

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

## GET /zones/:id/access-log

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

## GET /zones/:id/stats

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

## POST /zones/:id/reset-occupancy

Reset zone occupancy to zero (Admin only).

| Property          | Value |
| ----------------- | ----- |
| **Auth Required** | Yes   |
| **Roles**         | ADMIN |

---

## POST /zones/:id/adjust-occupancy

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
