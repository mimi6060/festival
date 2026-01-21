# Common Response Formats

## Success Response

```json
{
  "id": "uuid",
  "field": "value",
  "createdAt": "2025-01-02T12:00:00.000Z",
  "updatedAt": "2025-01-02T12:00:00.000Z"
}
```

## Error Response

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "path": "/api/endpoint"
}
```

## Paginated Response

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---
