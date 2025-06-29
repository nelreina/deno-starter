import { logger } from "./logger.js";

const log = logger.child("health-check");

// Health check timeout (3 seconds)
const HEALTH_CHECK_TIMEOUT_MS = 3000;

export class HealthCheckService {
  constructor(dependencies = {}) {
    this.startTime = Date.now();
    this.dependencies = dependencies;
    this.version = Deno.env.get("SERVICE_VERSION") || "1.0.0";
    this.serviceName = Deno.env.get("SERVICE_NAME") || "no-name-provided";
  }

  // Liveness check - basic process health
  checkLiveness() {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness check - service ready to accept traffic
  async checkReadiness() {
    const checks = await this.#performChecks();
    const allHealthy = Object.values(checks).every((check) =>
      check.status === "healthy"
    );

    if (allHealthy) {
      return {
        status: "ready",
        timestamp: new Date().toISOString(),
      };
    } else {
      const failedChecks = Object.entries(checks)
        .filter(([_, check]) => check.status !== "healthy")
        .map(([name]) => name);

      return {
        status: "not_ready",
        reason: `Dependencies unhealthy: ${failedChecks.join(", ")}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Detailed health check
  async getDetailedHealth() {
    const checks = await this.#performChecks();
    const overallStatus = this.#calculateOverallStatus(checks);
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: {
        name: this.serviceName,
        version: this.version,
        uptime,
      },
      checks,
    };
  }

  async #performChecks() {
    const checks = {};

    // Check Redis connection with timeout
    if (this.dependencies.redisConnectionManager) {
      try {
        const redisHealth = await this.#withTimeout(
          this.dependencies.redisConnectionManager.checkConnection(),
          HEALTH_CHECK_TIMEOUT_MS,
          "Redis health check timeout",
        );
        checks.redis = redisHealth;
      } catch (error) {
        log.error("Failed to check Redis health", error);
        checks.redis = {
          status: "unhealthy",
          error: error.message,
          timeout: error.message.includes("timeout"),
        };
      }
    }

    // Check event stream consumer with timeout
    if (this.dependencies.eventStreamStatus) {
      try {
        const streamStatus = await this.#withTimeout(
          Promise.resolve(this.dependencies.eventStreamStatus()),
          HEALTH_CHECK_TIMEOUT_MS,
          "Event stream health check timeout",
        );
        checks.eventStream = {
          status: streamStatus.active ? "healthy" : "unhealthy",
          consumerActive: streamStatus.active,
          lastMessage: streamStatus.lastMessage,
        };
      } catch (error) {
        log.error("Failed to check event stream health", error);
        checks.eventStream = {
          status: "unhealthy",
          error: error.message,
          consumerActive: false,
          timeout: error.message.includes("timeout"),
        };
      }
    }

    return checks;
  }

  #calculateOverallStatus(checks) {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.every((status) => status === "healthy")) {
      return "healthy";
    } else if (statuses.some((status) => status === "unhealthy")) {
      return "unhealthy";
    } else {
      return "degraded";
    }
  }

  // Helper method to add timeout to promises
  #withTimeout(promise, timeoutMs, timeoutMessage) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // Register health check routes with Hono app
  registerRoutes(app) {
    // Liveness probe
    app.get("/health/live", (c) => {
      const result = this.checkLiveness();
      return c.text(result.status);
    });

    // Readiness probe
    app.get("/health/ready", async (c) => {
      const result = await this.checkReadiness();

      if (result.status === "ready") {
        return c.json(result);
      } else {
        c.status(503);
        return c.json(result);
      }
    });

    // Detailed health check
    app.get("/health", async (c) => {
      const health = await this.getDetailedHealth();

      if (health.status === "unhealthy") {
        c.status(503);
      }

      return c.json(health);
    });

    // Legacy health check endpoint for backward compatibility
    app.get("/health-check", async (c) => {
      const result = await this.checkReadiness();

      if (result.status === "ready") {
        return c.text("ok");
      } else {
        c.status(503);
        return c.text("not ok");
      }
    });

    log.info("Health check endpoints registered", {
      endpoints: ["/health/live", "/health/ready", "/health", "/health-check"],
      timeout: `${HEALTH_CHECK_TIMEOUT_MS}ms`,
    });
  }
}
