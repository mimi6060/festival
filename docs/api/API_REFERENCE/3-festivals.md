# 3. Festivals

Festival management endpoints. Base path: `/festivals`

## POST /festivals

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

## GET /festivals

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

## GET /festivals/:id

Get festival by ID.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):** Full festival object with all details.

---

## GET /festivals/by-slug/:slug

Get festival by URL slug.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

**Response (200):** Full festival object.

---

## PUT /festivals/:id

Update festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Request Body:** Same as POST /festivals (all fields optional).

**Response (200):** Updated festival object.

---

## DELETE /festivals/:id

Delete festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (204):** No content.

---

## GET /festivals/:id/stats

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

## POST /festivals/:id/publish

Publish a draft festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (200):** Updated festival with status "PUBLISHED".

---

## POST /festivals/:id/cancel

Cancel a festival.

| Property          | Value                       |
| ----------------- | --------------------------- |
| **Auth Required** | Yes                         |
| **Roles**         | ADMIN or Festival Organizer |

**Response (200):** Updated festival with status "CANCELLED".

**Note:** Initiates refund process for all ticket holders.

---
