import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { client as redis } from "./config/redis-client.js";
import { appConfig } from "./config/app-config.js";
import eventHandler from "./lib/event-handler.js";
import schedule from "node-schedule";
import { logger } from "./lib/logger.js";
import { RedisConnectionManager } from "./lib/redis-connection-manager.js";
import { HealthCheckService } from "./lib/health-check-service.js";

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
const shutdown = async (signal) => {
  if (isShuttingDown) {
    log.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;
  const shutdownStart = Date.now();

  log.info(`Shutdown initiated by ${signal}`, { signal });

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

// Register signal handlers
Deno.addSignalListener("SIGINT", () => shutdown("SIGINT"));
Deno.addSignalListener("SIGTERM", () => shutdown("SIGTERM"));

// Create Hono app
const app = new Hono();

// Middleware
app.use(honoLogger());

// Register health check routes
healthCheckService.registerRoutes(app);

// Create a wrapped event handler that updates status
const wrappedEventHandler = (message) => {
  eventStreamStatus.lastMessage = new Date().toISOString();
  return eventHandler(message);
};

// Main application startup
async function startApplication() {
  log.info("Starting application", {
    service: config.service.name,
    version: config.service.version,
    environment: config.service.environment,
  });

  try {
    // Connect to Redis with retry logic
    await redisConnectionManager.connect();

    // Connect to event stream
    log.info("Connecting to event stream", { stream: config.stream.name });
    await redis.connectToEventStream(
      config.stream.name,
      wrappedEventHandler,
      false,
    );
    eventStreamStatus.active = true;
    log.info("Event stream connected successfully");

    // Schedule periodic test events
    globalThis.scheduledJob = schedule.scheduleJob("*/10 * * * * *", () => {
      if (!isShuttingDown) {
        redis.publishToStream(config.stream.name, "test_starters", "abc123", {
          message: "Message from Deno",
          timestamp: new Date().toISOString(),
        });
      }
    });
    log.info("Scheduled job created for test events");

    // Start HTTP server
    Deno.serve({ port: config.service.port }, app.fetch);
    log.info(`🚀 ${config.service.name} is running`, {
      port: config.service.port,
      url: `http://localhost:${config.service.port}`,
      healthCheck: `http://localhost:${config.service.port}/health`,
    });

    // Keep the process alive
    await new Promise(() => {});
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
