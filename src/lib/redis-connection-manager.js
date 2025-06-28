import { logger } from "./logger.js";

const log = logger.child("redis-connection");

export class RedisConnectionManager {
  constructor(redisClient, config = {}) {
    this.client = redisClient;
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelays: config.retryDelays || [5000, 15000, 30000],
      connectionTimeout: config.connectionTimeout || 10000,
      ...config,
    };

    this.isConnected = false;
    this.connectionAttempts = 0;
    this.lastConnectionError = null;
    this.startTime = Date.now();
    this.lastHealthCheck = null;
  }

  async connect() {
    log.info("Starting Redis connection process", {
      maxRetries: this.config.maxRetries,
      retryDelays: this.config.retryDelays,
    });

    while (this.connectionAttempts < this.config.maxRetries) {
      try {
        this.connectionAttempts++;
        log.info(
          `Connection attempt ${this.connectionAttempts}/${this.config.maxRetries}`,
        );

        // Test connection with a simple ping
        const start = Date.now();
        await this.client.ping();
        const latency = Date.now() - start;

        this.isConnected = true;
        this.lastHealthCheck = new Date().toISOString();
        this.lastConnectionError = null;

        log.info("Successfully connected to Redis", {
          attempts: this.connectionAttempts,
          latency: `${latency}ms`,
        });

        return true;
      } catch (error) {
        this.lastConnectionError = error;
        this.isConnected = false;

        log.error(
          `Redis connection attempt ${this.connectionAttempts} failed`,
          error,
          {
            attempt: this.connectionAttempts,
            maxRetries: this.config.maxRetries,
          },
        );

        // Check if we've been trying for more than 1 minute
        const elapsedTime = Date.now() - this.startTime;
        if (elapsedTime > 60000 && this.connectionAttempts === 1) {
          log.warn("Redis connection failed after 1 minute", {
            elapsedTime: `${Math.round(elapsedTime / 1000)}s`,
          });
        }

        if (this.connectionAttempts < this.config.maxRetries) {
          const delay = this.config.retryDelays[this.connectionAttempts - 1] ||
            30000;
          log.info(`Retrying connection in ${delay}ms`);
          await this.#sleep(delay);
        }
      }
    }

    // All retry attempts failed
    log.error(
      "All Redis connection attempts failed, exiting application",
      null,
      {
        attempts: this.connectionAttempts,
        totalTime: `${Math.round((Date.now() - this.startTime) / 1000)}s`,
      },
    );

    Deno.exit(1);
  }

  async checkConnection() {
    if (!this.isConnected) {
      return {
        status: "unhealthy",
        error: this.lastConnectionError?.message || "Not connected",
        attempts: this.connectionAttempts,
        lastCheck: this.lastHealthCheck,
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      this.lastHealthCheck = new Date().toISOString();

      return {
        status: "healthy",
        latency,
        lastCheck: this.lastHealthCheck,
      };
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionError = error;

      log.error("Health check failed", error);

      return {
        status: "unhealthy",
        error: error.message,
        lastCheck: this.lastHealthCheck,
      };
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      lastError: this.lastConnectionError?.message,
      uptime: this.isConnected ? Date.now() - this.startTime : 0,
    };
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await this.client.close();
        this.isConnected = false;
        log.info("Redis connection closed");
      }
    } catch (error) {
      log.error("Error closing Redis connection", error);
    }
  }

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
