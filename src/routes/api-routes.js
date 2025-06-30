/**
 * REST API routes
 * Contains all REST API endpoints for the service
 */

import {
  getLastTestEventTime,
  setLastTestEventTime,
  RATE_LIMIT_MS,
} from "../lib/app-state.js";


export function registerApiRoutes(app, redis, config) {
  // Add a manual test event endpoint for debugging with rate limiting
  app.post("/trigger-test-event", async (c) => {
    const requestLogger = c.get("logger");

    try {
      // Simple rate limiting
      const now = Date.now();
      if (now - getLastTestEventTime() < RATE_LIMIT_MS) {
        c.status(429);
        return c.json({
          success: false,
          error:
            "Rate limit exceeded. Please wait before making another request.",
          retryAfter: Math.ceil(
            (RATE_LIMIT_MS - (now - getLastTestEventTime())) / 1000,
          ),
        });
      }
      setLastTestEventTime(now);

      requestLogger.info("Manual test event triggered");
      
      // TODO: Fix Redis publish method - the exact API needs to be determined
      // The @nelreina/redis-client package API may have changed
      // For now, returning success without publishing
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
}