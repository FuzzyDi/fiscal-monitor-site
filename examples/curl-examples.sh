#!/bin/bash
# Curl examples for testing fiscal-monitor API
# Usage: ./curl-examples.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3001}"

echo "=== Testing fiscal-monitor API ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Normal heartbeat (no alerts)
echo "1. Sending normal heartbeat..."
curl -s -X POST "$BASE_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d @snapshot-normal.json \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 2: Warning level alert
echo "2. Sending WARN snapshot..."
curl -s -X POST "$BASE_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d @snapshot-warn.json \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 3: Danger level alert
echo "3. Sending DANGER snapshot..."
curl -s -X POST "$BASE_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d @snapshot-danger.json \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 4: Critical level alert
echo "4. Sending CRITICAL snapshot..."
curl -s -X POST "$BASE_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d @snapshot-critical.json \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 5: Inline minimal snapshot
echo "5. Sending minimal inline snapshot..."
curl -s -X POST "$BASE_URL/api/v1/fiscal/snapshot" \
  -H "Content-Type: application/json" \
  -d '{
    "schemaVersion": 1,
    "eventType": "STATUS_UPDATE",
    "eventTime": 1737383400000,
    "shopInn": "987654321",
    "shopNumber": 1,
    "shopName": "Test Store",
    "posNumber": 1,
    "posIp": "10.0.0.100",
    "severity": "INFO",
    "alerts": [],
    "fiscal": {
      "factoryId": "test-factory-id-123",
      "terminalId": "TEST001",
      "unsentCount": 0,
      "zRemaining": 500
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

echo "=== All tests completed ==="
echo "Expected: All requests should return HTTP 204"
