#!/bin/bash

echo "Testing health check endpoints and event publishing..."
echo "===================================================="

# Base URL
BASE_URL="http://localhost:8000"

# Test liveness probe
echo -n "Testing /health/live: "
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/live
echo ""

# Test readiness probe
echo "Testing /health/ready:"
curl -s $BASE_URL/health/ready | jq .
echo ""

# Test detailed health check
echo "Testing /health:"
curl -s $BASE_URL/health | jq .
echo ""

# Test legacy health check
echo -n "Testing /health-check: "
curl -s $BASE_URL/health-check
echo ""

# Test correlation ID functionality
echo ""
echo "Testing correlation ID functionality:"
CORRELATION_ID="test-corr-$(date +%s)"
echo "Using correlation ID: $CORRELATION_ID"
RESPONSE=$(curl -s -H "X-Correlation-ID: $CORRELATION_ID" $BASE_URL/health)
echo "Response correlation ID: $(echo $RESPONSE | jq -r '.timestamp')"
echo ""

# Test manual event trigger
echo "Testing manual event trigger:"
curl -s -X POST $BASE_URL/trigger-test-event | jq .
echo ""

# Test rate limiting
echo "Testing rate limiting (should fail on second request):"
echo "First request:"
curl -s -X POST $BASE_URL/trigger-test-event | jq .
echo ""
echo "Second request (should be rate limited):"
curl -s -X POST $BASE_URL/trigger-test-event | jq .
echo ""

# Test with custom correlation ID
echo "Testing manual event trigger with custom correlation ID:"
curl -s -H "X-Correlation-ID: custom-test-123" -X POST $BASE_URL/trigger-test-event | jq .
echo ""

echo "All tests completed!"
