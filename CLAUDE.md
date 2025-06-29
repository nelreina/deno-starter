# Production-Ready Redis Stream Service - Technical Documentation

A highly available, production-ready Deno microservice implementing event-driven
architecture with Redis streams. Designed for containerized environments with
comprehensive health checks, structured logging, robust error handling, and
security best practices.

## Key Technologies

- **Runtime**: Deno 2.1.4+
- **Framework**: Hono (lightweight web framework)
- **Database**: Redis 7+ with Streams
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes-ready with health probes
- **Logging**: Structured logging with correlation IDs
- **Security**: Input validation, rate limiting, secure defaults

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Client   │───▶│   Deno Service  │───▶│   Redis Server  │
│                 │    │   (Port 8000)   │    │   (Port 6379)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Event Stream   │
                       │   Consumer      │
                       └─────────────────┘
```

## Core Features

### ✅ Production-Ready Features

- **Health Checks**: Liveness, readiness, and detailed health probes
- **Graceful Shutdown**: Proper signal handling with cleanup
- **Error Handling**: Comprehensive error management and recovery
- **Logging**: Structured logging with correlation IDs and dual formats
- **Configuration**: Environment-based configuration with validation
- **Containerization**: Multi-stage Docker builds with security
- **Monitoring**: Health check endpoints and status reporting

### 🔒 Security Features

- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Secure Logging**: Sensitive data masking in logs
- **Container Security**: Non-root user, minimal attack surface
- **Docker Socket Protection**: Timeout and error handling for Docker operations
- **Signal Handler Security**: Proper cleanup to prevent memory leaks

### 🚀 Reliability Features

- **Connection Resilience**: Redis connection retry with exponential backoff
- **Event Stream Reliability**: Graceful error handling without crashes
- **Health Check Timeouts**: Prevents hanging health checks
- **Request Tracing**: Correlation IDs for distributed debugging
- **Graceful Degradation**: Service continues running even with partial failures

## Environment Variables

### Required Variables

- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port (1-65535)
- `SERVICE_NAME`: Service identifier

### Optional Variables

- `REDIS_USER`: Redis username (if auth enabled)
- `REDIS_PW`: Redis password (if auth enabled)
- `REDIS_TLS_ENABLED`: Enable TLS for Redis (true/false)
- `SERVICE_PORT`: HTTP server port (default: 8000)
- `ENVIRONMENT`: Environment name (default: development)
- `SERVICE_VERSION`: Service version (default: 1.0.0)
- `STREAM`: Redis stream name (default: event-stream)
- `LOG_LEVEL`: ERROR, WARN, INFO, DEBUG (default: INFO)
- `LOG_FORMAT`: text, json (default: text)
- `CONNECTION_TIMEOUT`: Redis connection timeout in ms (default: 10000)
- `MAX_RETRY_ATTEMPTS`: Redis connection retry attempts (default: 3)
- `RETRY_DELAYS`: Comma-separated retry delays in ms (default: 5000,15000,30000)
- `TIMEZONE`: Timezone for timestamps (default: UTC)

## API Endpoints

### Health Check Endpoints

- `GET /health/live` - Liveness probe (always returns 200)
- `GET /health/ready` - Readiness probe (503 if dependencies unhealthy)
- `GET /health` - Detailed health status with all checks
- `GET /health-check` - Legacy health check (backward compatibility)

### Event Management

- `POST /trigger-test-event` - Manually trigger test event (rate limited)

### Response Headers

- `X-Correlation-ID`: Request correlation ID for tracing

## Health Check Behavior

### Liveness Probe (`/health/live`)

- **Purpose**: Indicates if the process is running
- **Response**: Always returns 200 OK
- **Use Case**: Kubernetes liveness probe

### Readiness Probe (`/health/ready`)

- **Purpose**: Indicates if service can accept traffic
- **Dependencies**: Redis connection, event stream status
- **Response**: 200 if ready, 503 if not ready
- **Use Case**: Kubernetes readiness probe, load balancer health checks

### Detailed Health (`/health`)

- **Purpose**: Comprehensive health status
- **Includes**: Service info, uptime, dependency status
- **Response**: JSON with detailed health information
- **Use Case**: Monitoring dashboards, debugging

## Security Implementation

### Input Validation

- **Event Data**: Validates stream ID, event type, aggregate ID, and payload
- **Configuration**: Validates all environment variables and config values
- **API Requests**: Validates request structure and content
- **Size Limits**: Prevents oversized payloads (max 10KB for event data)

### Rate Limiting

- **Manual Events**: 1 request per second for `/trigger-test-event`
- **Response**: 429 status with retry-after header
- **Implementation**: Simple in-memory rate limiting

### Secure Logging

- **Sensitive Data Masking**: Automatically masks passwords, secrets, keys
- **Correlation IDs**: Tracks requests across the application
- **Structured Logging**: JSON format for log aggregation systems
- **No PII Exposure**: Validates and sanitizes all logged data

### Container Security

- **Non-Root User**: Runs as `nonroot` user in production
- **Minimal Base Image**: Uses distroless base for minimal attack surface
- **Docker Socket Protection**: Timeout and error handling for container
  detection
- **Signal Handler Cleanup**: Proper cleanup to prevent memory leaks

## Error Handling Strategy

### Graceful Error Handling

- **Event Processing**: Errors don't crash the event stream
- **Health Checks**: Timeout protection prevents hanging
- **Redis Failures**: Service continues running with degraded health
- **Configuration Errors**: Validation prevents invalid configurations

### Error Recovery

- **Redis Reconnection**: Automatic retry with exponential backoff
- **Event Stream Recovery**: Graceful handling of stream connection failures
- **Health Check Recovery**: Automatic recovery when dependencies become healthy
- **Request Recovery**: Proper error responses with correlation IDs

## Logging Configuration

### Text Format (Console/Docker logs)

```
2025-06-28T23:40:13.653Z INFO  [redis-connection] Connection attempt 1/3 {"attempt":1,"maxRetries":3,"correlationId":"req_1234567890_abc123"}
2025-06-28T23:40:13.654Z ERROR [event-handler] Failed to process event {"error":"Connection timeout","correlationId":"req_1234567890_abc123"}
```

### JSON Format (File/Aggregation systems)

```json
{
  "timestamp": "2025-06-28T23:39:56.862Z",
  "level": "INFO",
  "service": "my-service",
  "environment": "production",
  "context": "redis-connection",
  "message": "Connection attempt 1/3",
  "attempt": 1,
  "maxRetries": 3,
  "correlationId": "req_1234567890_abc123"
}
```

## Startup Sequence

The service follows a carefully orchestrated startup sequence:

1. **Configuration Loading**: Validate environment variables
2. **Redis Connection**: Connect with retry logic (exits after 3 failures)
3. **Job Scheduling**: Set up periodic test event publishing
4. **HTTP Server**: Start health check endpoints
5. **Event Stream**: Connect to Redis stream (blocking - keeps service alive)

## Important Implementation Details

1. **Connection Retry Logic**: Service will retry Redis connection 3 times with
   exponential backoff. After 1 minute of failures, it logs warnings. After all
   retries fail, the service exits.

2. **Health Check Behavior**: Service reports "not ready" if Redis is
   unavailable but continues running to allow for Redis recovery.

3. **Graceful Shutdown**: Handles SIGINT/SIGTERM with 30-second timeout,
   properly closing Redis connections and canceling scheduled jobs.

4. **Event Stream Processing**: Uses Redis consumer groups for reliable message
   processing with automatic acknowledgment.

5. **Container Detection**: Automatically resolves container name for Redis
   consumer identification, fallback to service name.

6. **Security**: Runs as non-root user in production containers, uses distroless
   base image for minimal attack surface.

7. **Request Tracing**: Correlation IDs track requests across the application
   for debugging and monitoring.

8. **Input Validation**: Comprehensive validation prevents injection attacks and
   malformed data processing.

## Testing Commands

```bash
# Test health endpoints
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
curl http://localhost:8000/health

# Trigger manual test event
curl -X POST http://localhost:8000/trigger-test-event

# Test correlation ID functionality
curl -H "X-Correlation-ID: test-123" http://localhost:8000/health

# Test rate limiting
curl -X POST http://localhost:8000/trigger-test-event
curl -X POST http://localhost:8000/trigger-test-event  # Should be rate limited

# Run comprehensive test script
./test-health-checks.sh
```

## Development Notes

- Use `LOG_FORMAT=json` for structured logging in production
- Set `LOG_LEVEL=DEBUG` for detailed troubleshooting
- The service requires Redis to be available for full functionality
- Event stream connection is blocking and keeps the service alive
- Container builds use multi-stage process for minimal production images
- All code follows Deno best practices with proper ES module imports
- Correlation IDs help track requests across distributed systems
- Input validation prevents security vulnerabilities
- Rate limiting protects against abuse and DoS attacks

## Security Checklist

- ✅ Input validation for all user inputs
- ✅ Rate limiting on API endpoints
- ✅ Sensitive data masking in logs
- ✅ Non-root container execution
- ✅ Minimal attack surface (distroless base)
- ✅ Signal handler cleanup
- ✅ Docker socket protection
- ✅ Health check timeouts
- ✅ Graceful error handling
- ✅ Request correlation for tracing
