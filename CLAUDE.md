# Production-Ready Redis Stream Service

## Summary

This is a production-ready Deno-based microservice that implements event-driven
architecture using Redis streams. The service features comprehensive health
checks, structured logging, connection retry logic, graceful shutdown, and is
designed for high availability in containerized environments
(Docker/Kubernetes).

## Key Technologies

- **Runtime**: Deno 2.1.4+
- **Web Framework**: Hono v4.6.14
- **Event Streaming**: Redis client (@nelreina/redis-client v0.6.0)
- **Scheduling**: node-schedule v2.1.1
- **Containerization**: Docker with production-ready multi-stage builds
- **Language**: JavaScript (ES modules)

## Project Structure

```
/
├── src/
│   ├── main.js                     # Entry point with startup orchestration
│   ├── config/
│   │   ├── app-config.js          # Configuration validation and management
│   │   ├── redis-client.js        # Redis client initialization
│   │   └── docker-info.js         # Docker container name resolution
│   └── lib/
│       ├── event-handler.js       # Event stream message processing
│       ├── logger.js              # Structured logging (text/JSON formats)
│       ├── health-check-service.js # Comprehensive health checks
│       └── redis-connection-manager.js # Connection retry logic
├── deno.json                      # Deno configuration and tasks
├── deno.lock                      # Dependency lock file
├── Dockerfile                     # Production multi-stage build (distroless)
├── Dockerfile.dev                 # Development Docker setup
├── docker-compose.yml             # Local development stack
├── .env.example                   # Environment variable documentation
├── REQUIREMENTS.md                # Detailed requirements specification
└── test-health-checks.sh          # Health check testing script
```

## Core Features

### Production-Ready Features

1. **Redis Connection Management**: Exponential backoff retry logic (3 attempts:
   5s, 15s, 30s)
2. **Comprehensive Health Checks**: Kubernetes-compatible liveness/readiness
   probes
3. **Structured Logging**: Configurable text (console) or JSON
   (file/aggregation) formats
4. **Graceful Shutdown**: 30-second timeout with proper resource cleanup
5. **Configuration Validation**: Environment variable validation on startup
6. **High Availability**: Service starts without Redis, reports health
   accurately

### Application Features

1. **Redis Event Streaming**: Bidirectional Redis stream communication
2. **HTTP Server**: Hono-based web server with multiple health endpoints
3. **Scheduled Events**: Publishes test events to Redis every 10 seconds
4. **Manual Testing**: POST endpoint for triggering test events
5. **Container-aware**: Automatically detects container name for Redis consumer
6. **Security**: Non-root user execution, minimal attack surface

## Development Commands

### Local Development

```bash
# Run with file watching and auto-reload
deno task dev

# Build standalone executable
deno task build

# Run with Docker Compose (includes Redis)
docker-compose up
```

### Testing & Quality

```bash
# Type checking
deno check src/main.js

# Code formatting
deno fmt

# Linting
deno lint

# Test health check endpoints and manual triggers
./test-health-checks.sh
```

## Health Check Endpoints

The service provides industry-standard health check endpoints:

- **GET /health/live** - Liveness probe (process running)
- **GET /health/ready** - Readiness probe (dependencies healthy)
- **GET /health** - Detailed health status with component breakdown
- **GET /health-check** - Legacy endpoint for backward compatibility
- **POST /trigger-test-event** - Manual event publishing for testing

## Environment Variables

### Required

- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port
- `SERVICE_NAME`: Service identifier

### Optional Configuration

- `REDIS_USER`: Redis username (if auth enabled)
- `REDIS_PW`: Redis password (if auth enabled)
- `SERVICE_PORT`: HTTP server port (default: 8000)
- `STREAM`: Redis stream name (default: "event-stream")
- `LOG_LEVEL`: ERROR, WARN, INFO, DEBUG (default: INFO)
- `LOG_FORMAT`: text, json (default: text)
- `ENVIRONMENT`: development, staging, production (default: development)
- `SERVICE_VERSION`: Version identifier (default: 1.0.0)
- `TIMEZONE`: Timezone setting (default: UTC)

### Redis Connection Tuning

- `CONNECTION_TIMEOUT`: Connection timeout in ms (default: 10000)
- `MAX_RETRY_ATTEMPTS`: Maximum connection retries (default: 3)
- `RETRY_DELAYS`: Comma-separated delays in ms (default: 5000,15000,30000)

### Optional Features

- `REDIS_TLS_ENABLED`: Enable TLS for Redis (default: false)
- `METRICS_ENABLED`: Enable metrics collection (default: false)
- `TRACE_ENABLED`: Enable tracing (default: false)

## Docker Usage

### Development with Docker Compose

```bash
# Start Redis and application
docker-compose up

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t redis-stream-service .

# Run with environment file
docker run -p 8000:8000 --env-file .env redis-stream-service

# Or with individual variables
docker run -p 8000:8000 \
  -e REDIS_HOST=redis-server \
  -e REDIS_PORT=6379 \
  -e SERVICE_NAME=my-service \
  redis-stream-service
```

## Kubernetes Deployment

The service is designed for Kubernetes with:

```yaml
# Health check configuration
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10

# Resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "2000m"
```

## Logging Configuration

### Text Format (Console/Docker logs)

```
2025-06-28T23:40:13.653Z INFO  [redis-connection] Connection attempt 1/3 {"attempt":1,"maxRetries":3}
2025-06-28T23:40:13.654Z ERROR [event-handler] Failed to process event {"error":"Connection timeout"}
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
  "maxRetries": 3
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

## Testing Commands

```bash
# Test health endpoints
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
curl http://localhost:8000/health

# Trigger manual test event
curl -X POST http://localhost:8000/trigger-test-event

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
