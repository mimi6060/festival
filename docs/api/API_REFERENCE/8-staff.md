# 8. Staff

Staff management endpoints. Base paths: `/staff` and `/festivals/:festivalId/staff`

## POST /staff

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

## GET /staff/:id

Get staff member details.

| Property          | Value                  |
| ----------------- | ---------------------- |
| **Auth Required** | Yes                    |
| **Roles**         | Any authenticated user |

---

## PUT /staff/:id

Update staff member.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

## DELETE /staff/:id

Delete staff assignment.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

**Response (204):** No content.

---

## POST /staff/:staffId/shifts

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

## GET /staff/:staffId/shifts

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

## PUT /staff/shifts/:shiftId

Update a shift.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

## DELETE /staff/shifts/:shiftId

Delete a shift.

| Property          | Value            |
| ----------------- | ---------------- |
| **Auth Required** | Yes              |
| **Roles**         | ADMIN, ORGANIZER |

---

## POST /staff/shifts/:shiftId/checkin

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

## POST /staff/shifts/:shiftId/checkout

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

## GET /festivals/:festivalId/staff

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

## GET /festivals/:festivalId/staff/stats

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
