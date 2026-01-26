# Fiscal Monitor API Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication

### Admin API
All admin endpoints require the `X-Admin-Key` header:
```
X-Admin-Key: your-secret-admin-key
```

### Portal API
All portal endpoints require the `X-Token` header:
```
X-Token: your-64-char-hex-token
```

### Ingest API
No authentication required (open endpoint).

## Endpoints

### Health Check

#### GET /health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T10:00:00.000Z"
}
```

---

## Ingest API

### POST /fiscal/snapshot
Accept POS snapshot data. Always returns 204 regardless of success/failure to never block POS systems.

**Request Body:**
```json
{
  "eventType": "SHIFT_OPENED",
  "eventTime": "2024-01-09T10:00:00Z",
  "shopInn": "1234567890",
  "shopNumber": 1,
  "shopName": "Main Store",
  "posNumber": 1,
  "posIp": "192.168.1.100",
  "shiftNumber": 42,
  "fiscal": {
    "factoryId": "FM001234",
    "terminalId": "TERM001",
    "appletVersion": "2.5.1",
    "currentTime": "2024-01-09T10:00:00Z",
    "receiptSeq": "0001",
    "receiptCount": 150,
    "receiptMaxCount": 1000,
    "unsentCount": 0,
    "zCount": 5,
    "zMax": 100,
    "zRemaining": 95
  },
  "alerts": [
    {
      "type": "RECEIPT_COUNT_HIGH",
      "severity": "WARN",
      "value": 150,
      "message": "Receipt count is high"
    }
  ]
}
```

**Required Fields:**
- `shopInn` (string)

**Optional Fields:**
- All other fields are optional

**Response:**
- Status: `204 No Content` (always)

**Severity Levels:**
- `CRITICAL` - Immediate action required
- `DANGER` - Action needed soon
- `WARN` - Monitor closely
- `INFO` - Informational only

---

## Admin API

### GET /admin/overview
Get system-wide statistics.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Response:**
```json
{
  "totalInns": 10,
  "registeredInns": 8,
  "unregisteredInns": 2,
  "totalStates": 25,
  "criticalCount": 2,
  "dangerCount": 5,
  "warnCount": 10,
  "infoCount": 8
}
```

---

### GET /admin/inns
List all unique INNs with registration status.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Response:**
```json
{
  "inns": [
    {
      "shop_inn": "1234567890",
      "shop_name": "Main Store",
      "is_registered": true,
      "registration_title": "Test Company LLC",
      "registration_active": true,
      "pos_count": 3
    }
  ]
}
```

---

### GET /admin/state
Get all POS states, optionally filtered by INN.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Query Parameters:**
- `shopInn` (optional) - Filter by specific INN

**Response:**
```json
{
  "states": [
    {
      "state_key": "1234567890:1:1",
      "shop_inn": "1234567890",
      "shop_number": 1,
      "shop_name": "Main Store",
      "pos_number": 1,
      "pos_ip": "192.168.1.100",
      "snapshot": { /* full snapshot object */ },
      "severity": "WARN",
      "is_registered": true,
      "updated_at": "2024-01-09T10:00:00.000Z"
    }
  ]
}
```

---

### GET /admin/registrations
List all registrations.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Response:**
```json
{
  "registrations": [
    {
      "shop_inn": "1234567890",
      "title": "Test Company LLC",
      "is_active": true,
      "token_count": 2,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/registrations
Create or update a registration.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Request Body:**
```json
{
  "shopInn": "1234567890",
  "title": "Test Company LLC",
  "isActive": true
}
```

**Response:**
```json
{
  "registration": {
    "shop_inn": "1234567890",
    "title": "Test Company LLC",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-09T10:00:00.000Z"
  }
}
```

---

### GET /admin/tokens
List all access tokens, optionally filtered by INN.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Query Parameters:**
- `shopInn` (optional) - Filter by specific INN

**Response:**
```json
{
  "tokens": [
    {
      "token": "a1b2c3d4e5f6...",
      "shop_inn": "1234567890",
      "label": "Production Token",
      "registration_title": "Test Company LLC",
      "last_used_at": "2024-01-09T10:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/tokens
Issue a new access token for a registered INN.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Request Body:**
```json
{
  "shopInn": "1234567890",
  "label": "Production Token"
}
```

**Response:**
```json
{
  "token": {
    "token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "shop_inn": "1234567890",
    "label": "Production Token",
    "last_used_at": null,
    "created_at": "2024-01-09T10:00:00.000Z"
  }
}
```

**Note:** Save the token immediately - it won't be shown again.

---

## Portal API

### GET /portal/summary
Get summary statistics for the authenticated client.

**Headers:**
```
X-Token: your-access-token
```

**Response:**
```json
{
  "shopInn": "1234567890",
  "totalPos": 5,
  "criticalCount": 1,
  "dangerCount": 2,
  "warnCount": 1,
  "infoCount": 1,
  "staleCount": 0,
  "lastUpdate": "2024-01-09T10:00:00.000Z",
  "staleMinutes": 15
}
```

---

### GET /portal/state
Get detailed state for all POS of the authenticated client.

**Headers:**
```
X-Token: your-access-token
```

**Response:**
```json
{
  "states": [
    {
      "state_key": "1234567890:1:1",
      "shop_inn": "1234567890",
      "shop_number": 1,
      "shop_name": "Main Store",
      "pos_number": 1,
      "pos_ip": "192.168.1.100",
      "snapshot": { /* full snapshot object */ },
      "severity": "WARN",
      "is_registered": true,
      "updated_at": "2024-01-09T10:00:00.000Z",
      "isStale": false
    }
  ],
  "staleMinutes": 15
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Admin key required"
}
```

### 403 Forbidden
```json
{
  "error": "Registration inactive"
}
```

### 404 Not Found
```json
{
  "error": "Not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Recommended to add in production:
- Ingest API: 100 requests/minute per IP
- Admin API: 1000 requests/hour per key
- Portal API: 100 requests/minute per token
