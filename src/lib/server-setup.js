/**
 * HTTP server configuration and setup
 * Creates and configures the Hono application with middleware and routes
 */

import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { createCorrelationIdMiddleware } from "./middleware.js";
import { registerApiRoutes } from "../routes/api-routes.js";

export function createServer(healthCheckService, redis, config) {
  // Create Hono app
  const app = new Hono();

  // Correlation ID middleware
  app.use(createCorrelationIdMiddleware());

  // Middleware
  app.use(honoLogger());

  // Register health check routes
  healthCheckService.registerRoutes(app);

  // Register API routes
  registerApiRoutes(app, redis, config);

  return app;
}