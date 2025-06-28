# Deno Starter - Project Overview

## Summary

This is a Deno-based microservice starter that implements an event-driven
architecture using Redis streams. The service connects to Redis for both
publishing and consuming events, includes a basic HTTP health check endpoint,
and can be deployed using Docker.

## Key Technologies

- **Runtime**: Deno 2.1.4
- **Web Framework**: Hono v4.6.14
- **Event Streaming**: Redis client (@nelreina/redis-client v0.4.1)
- **Scheduling**: node-schedule v2.1.1
- **Containerization**: Docker with both production and development Dockerfiles
- **Language**: JavaScript (ES modules)

## Project Structure

```
/
├── src/
│   ├── main.js              # Entry point - HTTP server and Redis event stream connection
│   ├── config/
│   │   ├── redis-client.js  # Redis client configuration
│   │   └── docker-info.js   # Docker container name resolution
│   └── lib/
│       └── event-handler.js # Event stream message handler
├── deno.json                # Deno configuration and tasks
├── deno.lock                # Dependency lock file
├── Dockerfile               # Production multi-stage build
├── Dockerfile.dev           # Development Docker setup
└── logs/                    # Application logs directory
```

## Core Features

1. **Redis Event Streaming**: Connects to Redis streams for event-driven
   communication
2. **HTTP Server**: Hono-based web server with health check endpoint
3. **Scheduled Events**: Publishes test events to Redis every 10 seconds
4. **Docker Support**: Both production (multi-stage) and development containers
5. **Graceful Shutdown**: Handles SIGINT and SIGTERM signals
6. **Container-aware**: Automatically detects running container name for Redis
   consumer

## Development Commands

### Local Development

```bash
# Run with file watching and auto-reload
deno task dev

# Build standalone executable
deno task build
```

### Testing & Linting

```bash
# Type checking
deno check src/main.js

# Formatting
deno fmt

# Linting
deno lint

# Run tests (when available)
deno test

# Test health check endpoints
./test-health-checks.sh
```

## Environment Variables

### Required

- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port
- `REDIS_USER`: Redis username (if auth enabled)
- `REDIS_PW`: Redis password (if auth enabled)
- `SERVICE_NAME`: Name of this service (default: "no-name-provided")

### Optional

- `SERVICE_PORT`: HTTP server port (default: 8000)
- `STREAM`: Redis stream name (default: "event-stream")
- `TIMEZONE`: Timezone for the service (default in Docker: "America/Curacao")
- `HOSTNAME`: Container hostname for automatic name detection

## Docker Usage

### Development

```bash
docker build -f Dockerfile.dev -t deno-starter-dev .
docker run -p 8000:8000 --env-file .env deno-starter-dev
```

### Production

```bash
docker build -t deno-starter .
docker run -p 8000:8000 --env-file .env deno-starter
```

## Important Implementation Details

1. **Redis Event Consumer**: The service connects to Redis streams with
   auto-cancellation disabled (connectToEventStream with false parameter)

2. **Container Name Resolution**: Attempts to automatically detect the Docker
   container name by checking the hostname against running containers. Falls
   back to lowercase SERVICE_NAME if detection fails.

3. **Event Publishing**: A scheduled job publishes test events every 10 seconds
   to the configured stream with:
   - Event type: "test_starters"
   - Aggregate ID: "abc123"
   - Payload: { message, timestamp }

4. **Event Handler**: Simple acknowledgment handler that logs received events
   and acknowledges them back to Redis

5. **Health Check**: GET endpoint at `/health-check` returns "ok"

## Notes for Development

- The service uses Deno's built-in permissions system - runs with `-A` (all
  permissions) in development
- Logs are written to the `logs/` directory with ISO timestamp filenames
- The production Docker image uses a multi-stage build to create a minimal
  Debian-based container with only the compiled executable
- Consider adding proper error handling for Redis connection failures
- Consider implementing proper logging instead of console.log statements
- Add tests for the event handler and Redis integration
