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

# Test manual event trigger
echo ""
echo "Testing manual event trigger:"
curl -s -X POST $BASE_URL/trigger-test-event | jq .
echo ""