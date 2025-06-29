import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { client as redis } from "./config/redis-client.js";
import { appConfig } from "./config/app-config.js";
import eventHandler from "./lib/event-handler.js";
import Logger, { logger } from "./lib/logger.js";
import { RedisConnectionManager } from "./lib/redis-connection-manager.js";
import { HealthCheckService } from "./lib/health-check-service.js";
import { showBanner } from "./lib/banner.js";

const log = logger.child("main");
const config = appConfig.get();

// Track event stream status
const eventStreamStatus = {
  active: false,
  lastMessage: null,
};

// Initialize Redis connection manager
const redisConnectionManager = new RedisConnectionManager(
  redis,
  config.redis.connection,
);

// Initialize health check service
const healthCheckService = new HealthCheckService({
  redisConnectionManager,
  eventStreamStatus: () => eventStreamStatus,
});

// Graceful shutdown handler
let isShuttingDown = false;
let shutdownTimer = null;
let signalListeners = [];

const shutdown = async (signal) => {
  if (isShuttingDown) {
    log.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;
  const shutdownStart = Date.now();

  log.info(`Shutdown initiated by ${signal}`, { signal });

  // Remove signal listeners to prevent memory leaks
  signalListeners.forEach(({ signal: sig, listener }) => {
    try {
      Deno.removeSignalListener(sig, listener);
      log.debug(`Removed signal listener for ${sig}`);
    } catch (error) {
      log.warn(`Failed to remove signal listener for ${sig}`, error);
    }
  });

  // Set a maximum shutdown time of 30 seconds
  shutdownTimer = setTimeout(() => {
    log.error("Graceful shutdown timeout exceeded, forcing exit");
    Deno.exit(1);
  }, 30000);

  try {
    // Stop accepting new requests
    log.info("Stopping HTTP server");

    // Cancel scheduled jobs
    if (globalThis.scheduledJob) {
      globalThis.scheduledJob.cancel();
      log.info("Scheduled jobs cancelled");
    }

    // Close Redis connections
    log.info("Closing Redis connections");
    await redisConnectionManager.disconnect();

    const shutdownDuration = Date.now() - shutdownStart;
    log.info("Graceful shutdown completed", {
      duration: `${shutdownDuration}ms`,
      signal,
    });

    clearTimeout(shutdownTimer);
    Deno.exit(0);
  } catch (error) {
    log.error("Error during shutdown", error);
    clearTimeout(shutdownTimer);
    Deno.exit(1);
  }
};

// Create signal listener functions and store references
const sigintListener = () => shutdown("SIGINT");
const sigtermListener = () => shutdown("SIGTERM");

// Store signal listeners for cleanup
signalListeners = [
  { signal: "SIGINT", listener: sigintListener },
  { signal: "SIGTERM", listener: sigtermListener },
];

// Register signal handlers
Deno.addSignalListener("SIGINT", sigintListener);
Deno.addSignalListener("SIGTERM", sigtermListener);

// Create Hono app
const app = new Hono();

// Correlation ID middleware
app.use(async (c, next) => {
  // Get correlation ID from header or generate new one
  const correlationId = c.req.header("X-Correlation-ID") ||
    c.req.header("x-correlation-id") ||
    Logger.generateCorrelationId();

  // Add correlation ID to response headers
  c.header("X-Correlation-ID", correlationId);

  // Create request-scoped logger
  const requestLogger = logger.withCorrelationId(correlationId);

  // Add logger to context for use in handlers
  c.set("logger", requestLogger);

  const startTime = Date.now();
  requestLogger.debug("Request started", {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header("User-Agent"),
  });

  try {
    await next();

    const duration = Date.now() - startTime;
    requestLogger.debug("Request completed", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    requestLogger.error("Request failed", error, {
      method: c.req.method,
      path: c.req.path,
      duration: `${duration}ms`,
    });
    throw error;
  }
});

// Middleware
app.use(honoLogger());

// Register health check routes
healthCheckService.registerRoutes(app);

// Add a manual test event endpoint for debugging with rate limiting
let lastTestEventTime = 0;
const RATE_LIMIT_MS = 1000; // 1 second between requests

app.post("/trigger-test-event", async (c) => {
  const requestLogger = c.get("logger");

  try {
    // Simple rate limiting
    const now = Date.now();
    if (now - lastTestEventTime < RATE_LIMIT_MS) {
      c.status(429);
      return c.json({
        success: false,
        error:
          "Rate limit exceeded. Please wait before making another request.",
        retryAfter: Math.ceil(
          (RATE_LIMIT_MS - (now - lastTestEventTime)) / 1000,
        ),
      });
    }
    lastTestEventTime = now;

    requestLogger.info("Manual test event triggered");
    await redis.publishToStream(
      config.stream.name,
      "manual_test",
      "manual123",
      {
        message: "Manual test event from endpoint",
        timestamp: new Date().toISOString(),
        triggeredBy: "manual",
      },
    );
    return c.json({
      success: true,
      message: "Test event published",
      stream: config.stream.name,
    });
  } catch (error) {
    requestLogger.error("Failed to publish manual test event", error);
    c.status(500);
    return c.json({
      success: false,
      error: error.message,
    });
  }
});

// Create a wrapped event handler that updates status and handles errors gracefully
const wrappedEventHandler = (message) => {
  eventStreamStatus.lastMessage = new Date().toISOString();
  try {
    return eventHandler(message);
  } catch (error) {
    log.error("Event handler failed, but continuing stream processing", error, {
      streamId: message.streamId,
      event: message.event,
      aggregateId: message.aggregateId,
    });
    // Don't re-throw to prevent stream from crashing
    // Consider implementing dead letter queue here
  }
};

// Main application startup
async function startApplication() {
  // Display service banner first
  showBanner(
    config.service.name,
    config.service.version,
    config.service.environment
  );

  log.info("Starting application", {
    service: config.service.name,
    version: config.service.version,
    environment: config.service.environment,
  });

  try {
    // Connect to Redis with retry logic
    await redisConnectionManager.connect();

    // Start HTTP server
    Deno.serve({ port: config.service.port }, app.fetch);
    log.info(`🚀 ${config.service.name} is running`, {
      port: config.service.port,
      url: `http://localhost:${config.service.port}`,
      healthCheck: `http://localhost:${config.service.port}/health`,
    });

    // Connect to event stream with proper error handling
    log.info("Connecting to event stream", { stream: config.stream.name });
    eventStreamStatus.active = true;

    try {
      await redis.connectToEventStream(
        config.stream.name,
        wrappedEventHandler,
        false,
      );
    } catch (error) {
      log.error("Failed to connect to event stream", error);
      eventStreamStatus.active = false;
      // Don't exit the application, allow it to continue with health checks
      // The health check will report the stream as unhealthy
    }

    // Keep the process alive
    // await new Promise(() => {});
  } catch (error) {
    log.error("Failed to start application", error);
    Deno.exit(1);
  }
}

// Start the application
startApplication().catch((error) => {
  log.error("Unhandled error in main application", error);
  Deno.exit(1);
});
