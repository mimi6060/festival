# 9. Program

Festival program endpoints. Base path: `/api/program`

## GET /api/program

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

## GET /api/program/day/:day

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

## GET /api/program/artists

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

## GET /api/program/artists/:id

Get artist by ID.

| Property          | Value  |
| ----------------- | ------ |
| **Auth Required** | No     |
| **Roles**         | Public |

---

## GET /api/program/artists/:id/performances

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

## GET /api/program/stages

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

## GET /api/program/favorites

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

## POST /api/program/favorites/:artistId

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
