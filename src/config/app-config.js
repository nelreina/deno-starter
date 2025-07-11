import { logger } from "../lib/logger.js";

const log = logger.child("config");

export class AppConfig {
  constructor() {
    this.config = this.#loadAndValidateConfig();
  }

  #loadAndValidateConfig() {
    const config = {
      redis: {
        host: this.#getRequiredEnv("REDIS_HOST"),
        port: parseInt(this.#getRequiredEnv("REDIS_PORT"), 10),
        user: this.#getOptionalEnv("REDIS_USER"),
        password: this.#getOptionalEnv("REDIS_PW"),
        tls: {
          enabled: this.#getOptionalEnv("REDIS_TLS_ENABLED") === "true",
        },
        connection: {
          timeout: parseInt(
            this.#getOptionalEnv("CONNECTION_TIMEOUT") || "10000",
            10,
          ),
          maxRetries: parseInt(
            this.#getOptionalEnv("MAX_RETRY_ATTEMPTS") || "3",
            10,
          ),
          retryDelays: this.#parseRetryDelays(
            this.#getOptionalEnv("RETRY_DELAYS") || "5000,15000,30000",
          ),
        },
      },
      service: {
        name: this.#getRequiredEnv("SERVICE_NAME"),
        port: parseInt(this.#getOptionalEnv("SERVICE_PORT") || "8000", 10),
        environment: this.#getOptionalEnv("ENVIRONMENT") || "development",
        version: this.#getOptionalEnv("SERVICE_VERSION") || "1.0.0",
      },
      stream: {
        name: this.#getOptionalEnv("STREAM") || "event-stream",
        consumerName: null, // Will be set after docker info is available
      },
      logging: {
        level: this.#validateLogLevel(
          this.#getOptionalEnv("LOG_LEVEL") || "INFO",
        ),
        format: this.#validateLogFormat(
          this.#getOptionalEnv("LOG_FORMAT") || "text",
        ),
      },
      monitoring: {
        enabled: this.#getOptionalEnv("METRICS_ENABLED") === "true",
        tracingEnabled: this.#getOptionalEnv("TRACE_ENABLED") === "true",
      },
      timezone: this.#getOptionalEnv("TIMEZONE") || "UTC",
    };

    this.#validateConfig(config);

    log.info("Configuration loaded and validated", {
      service: config.service.name,
      environment: config.service.environment,
      redisHost: config.redis.host,
      streamName: config.stream.name,
      // Don't log sensitive information
      redisAuth: config.redis.user ? "enabled" : "disabled",
    });

    return config;
  }

  #getRequiredEnv(key) {
    const value = Deno.env.get(key);
    if (!value) {
      log.error(`Required environment variable missing: ${key}`);
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  #getOptionalEnv(key) {
    return Deno.env.get(key);
  }

  #parseRetryDelays(delaysString) {
    try {
      return delaysString.split(",").map((d) => parseInt(d.trim(), 10));
    } catch (error) {
      log.warn("Failed to parse retry delays, using defaults", {
        error: error.message,
      });
      return [5000, 15000, 30000];
    }
  }

  #validateLogLevel(level) {
    const validLevels = ["ERROR", "WARN", "INFO", "DEBUG"];
    const upperLevel = level.toUpperCase();

    if (!validLevels.includes(upperLevel)) {
      log.warn(`Invalid log level: ${level}, defaulting to INFO`);
      return "INFO";
    }

    return upperLevel;
  }

  #validateLogFormat(format) {
    const validFormats = ["text", "json"];
    const lowerFormat = format.toLowerCase();

    if (!validFormats.includes(lowerFormat)) {
      log.warn(`Invalid log format: ${format}, defaulting to text`);
      return "text";
    }

    return lowerFormat;
  }

  #validateConfig(config) {
    // Validate Redis port
    if (
      isNaN(config.redis.port) || config.redis.port < 1 ||
      config.redis.port > 65535
    ) {
      throw new Error(`Invalid Redis port: ${config.redis.port}`);
    }

    // Validate service port
    if (
      isNaN(config.service.port) || config.service.port < 1 ||
      config.service.port > 65535
    ) {
      throw new Error(`Invalid service port: ${config.service.port}`);
    }

    // Validate connection timeout
    if (config.redis.connection.timeout < 1000) {
      log.warn("Connection timeout is very low, minimum recommended is 1000ms");
    }

    // Validate retry configuration
    if (config.redis.connection.maxRetries < 1) {
      throw new Error("Max retry attempts must be at least 1");
    }

    if (config.redis.connection.retryDelays.length === 0) {
      throw new Error("At least one retry delay must be specified");
    }

    // Validate stream name
    if (config.stream.name) {
      log.debug("Validating stream name", { 
        streamName: config.stream.name,
        isValid: /^[a-zA-Z0-9._:-]+$/.test(config.stream.name)
      });
      
      if (!/^[a-zA-Z0-9._:-]+$/.test(config.stream.name)) {
        throw new Error(`Invalid stream name: "${config.stream.name}" contains invalid characters. Only alphanumeric, dots, underscores, hyphens, and colons are allowed.`);
      }
    }
  }

  // Mask sensitive data for logging
  #maskSensitiveData(data) {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveKeys = ["password", "pw", "secret", "key", "token", "auth"];

    for (const key of Object.keys(masked)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        masked[key] = "***MASKED***";
      } else if (typeof masked[key] === "object") {
        masked[key] = this.#maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  setStreamConsumerName(consumerName) {
    this.config.stream.consumerName = consumerName;
    log.info("Stream consumer name set", { consumerName });
  }

  getRedisClientConfig() {
    const config = {
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
      redisUser: this.config.redis.user,
      redisPw: this.config.redis.password,
      serviceName: this.config.service.name,
      timeZone: this.config.timezone,
      streamConsumerName: this.config.stream.consumerName,
    };

    // Log configuration without sensitive data
    const logConfig = this.#maskSensitiveData(config);
    log.debug("Redis client configuration", logConfig);

    return config;
  }

  getConnectionConfig() {
    return this.config.redis.connection;
  }

  get() {
    return this.config;
  }
}

// Export singleton instance
export const appConfig = new AppConfig();
