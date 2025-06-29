# Production-Ready Redis Stream Service

A highly available, production-ready Deno microservice implementing event-driven
architecture with Redis streams. Designed for containerized environments with
comprehensive health checks, structured logging, robust error handling, and
security best practices.

## 🚀 Quick Start

### Prerequisites

- Deno 2.1.4+
- Redis server
- Docker (optional)

### Local Development

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd deno-starter
   cp .env.example .env
   # Edit .env with your Redis configuration
   ```

2. **Start with Docker Compose** (includes Redis)
   ```bash
   docker-compose up
   ```

3. **Or run locally** (requires Redis running separately)
   ```bash
   deno task dev
   ```

4. **Verify service is running**
   ```bash
   curl http://localhost:8000/health
   ./test-health-checks.sh
   ```

## 📊 Service Status

Once running, the service provides:

- ✅ **Health Checks**: `/health/live`, `/health/ready`, `/health`
- 📨 **Event Processing**: Consumes and publishes Redis stream events
- ⏰ **Scheduled Events**: Publishes test events every 10 seconds
- 🔧 **Manual Testing**: `POST /trigger-test-event`

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Server   │    │  Redis Streams  │    │   Scheduler     │
│                 │    │                 │    │                 │
│ Health Checks   │◄──►│ Event Producer  │◄──►│ Test Events     │
│ Manual Triggers │    │ Event Consumer  │    │ (10s interval)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Redis Connection│
                    │    Manager      │
                    │                 │
                    │ • Retry Logic   │
                    │ • Health Track  │
                    │ • Graceful Exit │
                    └─────────────────┘
```

### Key Features

- **🔄 Connection Resilience**: Exponential backoff retry (5s → 15s → 30s)
- **📋 Health Monitoring**: Kubernetes-compatible liveness/readiness probes
- **📝 Structured Logging**: Text (console) or JSON (aggregation) formats
- **🛡️ Graceful Shutdown**: Proper resource cleanup on termination
- **⚙️ Configuration**: Validation and environment-based setup
- **🐳 Container Ready**: Non-root execution, minimal attack surface

## 🌐 API Endpoints

| Endpoint              | Method | Purpose              | Response         |
| --------------------- | ------ | -------------------- | ---------------- |
| `/health/live`        | GET    | Liveness probe       | `200 OK`         |
| `/health/ready`       | GET    | Readiness probe      | `200/503 + JSON` |
| `/health`             | GET    | Detailed status      | `200/503 + JSON` |
| `/health-check`       | GET    | Legacy endpoint      | `200 "ok"`       |
| `/trigger-test-event` | POST   | Manual event trigger | `200 + JSON`     |

### Health Check Response Example

```json
{
  "status": "healthy",
  "timestamp": "2025-06-28T23:40:13.653Z",
  "service": {
    "name": "redis-stream-service",
    "version": "1.0.0",
    "uptime": 3600
  },
  "checks": {
    "redis": {
      "status": "healthy",
      "latency": 2,
      "lastCheck": "2025-06-28T23:40:13.653Z"
    },
    "eventStream": {
      "status": "healthy",
      "consumerActive": true,
      "lastMessage": "2025-06-28T23:40:10.123Z"
    }
  }
}
```
