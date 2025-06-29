# Production-Ready Redis Stream Service

A highly available, production-ready Deno microservice implementing event-driven
architecture with Redis streams. Designed for containerized environments with
comprehensive health checks, structured logging, and robust error handling.

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

## ⚙️ Configuration

### Required Environment Variables

```bash
REDIS_HOST=localhost        # Redis server hostname
REDIS_PORT=6379            # Redis server port  
SERVICE_NAME=my-service    # Service identifier
```

### Optional Configuration

```bash
# Service Configuration
SERVICE_PORT=8000          # HTTP server port
STREAM=event-stream        # Redis stream name
ENVIRONMENT=production     # Environment identifier
SERVICE_VERSION=1.0.0      # Version identifier

# Logging
LOG_LEVEL=INFO            # ERROR, WARN, INFO, DEBUG
LOG_FORMAT=text           # text (console) or json (aggregation)

# Redis Authentication (if required)
REDIS_USER=username       # Redis username
REDIS_PW=password         # Redis password
REDIS_TLS_ENABLED=false   # Enable TLS

# Connection Tuning
CONNECTION_TIMEOUT=10000   # Connection timeout (ms)
MAX_RETRY_ATTEMPTS=3      # Max connection retries
RETRY_DELAYS=5000,15000,30000  # Retry delays (ms)

# Optional Features
METRICS_ENABLED=false     # Enable metrics collection
TRACE_ENABLED=false       # Enable tracing
TIMEZONE=UTC             # Timezone setting
```

## 🐳 Docker Deployment

### Development

```bash
# Using Docker Compose (includes Redis)
docker-compose up

# Manual development build
docker build -f Dockerfile.dev -t deno-redis-dev .
docker run -p 8000:8000 --env-file .env deno-redis-dev
```

### Production

```bash
# Build production image
docker build -t redis-stream-service .

# Run with environment variables
docker run -d \
  -p 8000:8000 \
  -e REDIS_HOST=redis-server \
  -e REDIS_PORT=6379 \
  -e SERVICE_NAME=my-service \
  -e LOG_FORMAT=json \
  --name redis-service \
  redis-stream-service

# Health check
curl http://localhost:8000/health
```

## ☸️ Kubernetes Deployment

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-stream-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-stream-service
  template:
    metadata:
      labels:
        app: redis-stream-service
    spec:
      containers:
        - name: app
          image: redis-stream-service:latest
          ports:
            - containerPort: 8000
          env:
            - name: REDIS_HOST
              value: "redis-service"
            - name: REDIS_PORT
              value: "6379"
            - name: SERVICE_NAME
              value: "redis-stream-service"
            - name: LOG_FORMAT
              value: "json"

            # Health checks
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5

          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3

          # Resource limits
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "2000m"
```

### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-stream-service
spec:
  selector:
    app: redis-stream-service
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

## 📊 Monitoring & Observability

### Logging Formats

**Text Format** (Human-readable for console/Docker logs):

```
2025-06-28T23:40:13.653Z INFO  [redis-connection] Successfully connected to Redis {"attempts":1,"latency":"5ms"}
2025-06-28T23:40:13.654Z ERROR [event-handler] Failed to process event {"error":"Connection timeout"}
```

**JSON Format** (Structured for log aggregation):

```json
{
  "timestamp": "2025-06-28T23:39:56.862Z",
  "level": "INFO",
  "service": "redis-stream-service",
  "environment": "production",
  "context": "redis-connection",
  "message": "Successfully connected to Redis",
  "attempts": 1,
  "latency": "5ms"
}
```

### Metrics Collection

Set `METRICS_ENABLED=true` for Prometheus-compatible metrics:

- Request rates and latencies
- Redis connection health
- Event processing rates
- Error rates by type

## 🔧 Development & Testing

### Code Quality

```bash
# Type checking
deno check src/main.js

# Code formatting
deno fmt

# Linting
deno lint

# Run all quality checks
deno fmt && deno lint && deno check src/main.js
```

### Testing

```bash
# Comprehensive health check testing
./test-health-checks.sh

# Manual event testing
curl -X POST http://localhost:8000/trigger-test-event

# Check service logs for event processing
docker-compose logs -f app
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=DEBUG deno task dev

# JSON logging for structured analysis
LOG_FORMAT=json deno task dev

# Check Redis connectivity
redis-cli -h localhost -p 6379 ping
```

## 🚨 Troubleshooting

### Common Issues

**Service won't start**

- Check Redis connectivity: `redis-cli -h <REDIS_HOST> -p <REDIS_PORT> ping`
- Verify environment variables: `cat .env`
- Check service logs for configuration errors

**Health checks failing**

- Verify Redis is accessible from the service
- Check `/health` endpoint for detailed status
- Ensure all required environment variables are set

**Events not processing**

- Check Redis stream exists: `redis-cli XINFO STREAM event-stream`
- Verify consumer group: `redis-cli XINFO CONSUMERS event-stream mygroup`
- Test manual event: `curl -X POST http://localhost:8000/trigger-test-event`

**High memory usage**

- Monitor with: `docker stats` or Kubernetes metrics
- Check for event processing bottlenecks
- Verify proper event acknowledgment

### Log Monitoring

```bash
# Follow application logs
docker-compose logs -f app

# Filter by log level
docker-compose logs app | grep ERROR

# Check health check logs
curl -s http://localhost:8000/health | jq .
```

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Detailed technical documentation
- **[REQUIREMENTS.md](./REQUIREMENTS.md)**: Complete requirements specification
- **[.env.example](./.env.example)**: Configuration reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Ensure all quality checks pass:
   `deno fmt && deno lint && deno check src/main.js`
5. Submit a pull request

### Development Guidelines

- Follow Deno best practices
- Maintain test coverage
- Update documentation for new features
- Use structured logging throughout
- Ensure Docker compatibility

## 📄 License

[Add your license information here]

---

**Production Ready** ✅ | **High Availability** ✅ | **Container Native** ✅ |
**Kubernetes Ready** ✅
