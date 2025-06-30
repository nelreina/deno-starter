import { client as redis } from "./config/redis-client.js";
import { appConfig } from "./config/app-config.js";
import eventHandler from "./lib/event-handler.js";
import { logger } from "./lib/logger.js";
import { RedisConnectionManager } from "./lib/redis-connection-manager.js";
import { HealthCheckService } from "./lib/health-check-service.js";
import { showBanner } from "./lib/banner.js";
import { eventStreamStatus } from "./lib/app-state.js";
import { createShutdown, setupSignalHandlers } from "./lib/shutdown-manager.js";
import { createServer } from "./lib/server-setup.js";

const log = logger.child("main");
const config = appConfig.get();

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

// Setup shutdown handlers
const shutdown = createShutdown(log, redisConnectionManager);
setupSignalHandlers(shutdown);

// Create and configure server
const app = createServer(healthCheckService, redis, config);

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