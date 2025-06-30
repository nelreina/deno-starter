/**
 * HTTP middleware functions
 */

import Logger, { logger } from "./logger.js";

export function createCorrelationIdMiddleware() {
  return async (c, next) => {
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
  };
}