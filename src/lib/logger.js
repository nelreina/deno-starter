const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL =
  LOG_LEVELS[Deno.env.get("LOG_LEVEL")?.toUpperCase() || "INFO"];

const LOG_FORMAT = Deno.env.get("LOG_FORMAT") || "text";

const LEVEL_COLORS = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[90m", // Gray
};

const RESET_COLOR = "\x1b[0m";

class Logger {
  constructor(context = "app", correlationId = null) {
    this.context = context;
    this.correlationId = correlationId;
  }

  #formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const serviceName = Deno.env.get("SERVICE_NAME") || "no-name-provided";
    const environment = Deno.env.get("ENVIRONMENT") || "development";

    // Add correlation ID to metadata if available
    const enrichedMetadata = this.correlationId
      ? { correlationId: this.correlationId, ...metadata }
      : metadata;

    // JSON format for file logging or when explicitly requested
    if (LOG_FORMAT === "json") {
      return JSON.stringify({
        timestamp,
        level,
        service: serviceName,
        environment,
        context: this.context,
        message,
        ...enrichedMetadata,
      });
    }

    // Human-readable format for console (Docker/Kubernetes logs)
    const color = LEVEL_COLORS[level] || "";
    const levelPadded = level.padEnd(5);

    // Build metadata string if there are any metadata fields
    let metaStr = "";
    if (Object.keys(enrichedMetadata).length > 0) {
      // Filter out error objects for cleaner display
      const displayMeta = { ...enrichedMetadata };
      if (displayMeta.error) {
        displayMeta.error = displayMeta.error.message || displayMeta.error;
      }
      metaStr = ` ${JSON.stringify(displayMeta)}`;
    }

    return `${timestamp} ${color}${levelPadded}${RESET_COLOR} [${this.context}] ${message}${metaStr}`;
  }

  #log(level, message, metadata) {
    const levelValue = LOG_LEVELS[level];
    if (levelValue <= LOG_LEVEL) {
      console.log(this.#formatMessage(level, message, metadata));
    }
  }

  error(message, error = null, metadata = {}) {
    const errorData = error
      ? {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }
      : {};
    this.#log("ERROR", message, { ...errorData, ...metadata });
  }

  warn(message, metadata = {}) {
    this.#log("WARN", message, metadata);
  }

  info(message, metadata = {}) {
    this.#log("INFO", message, metadata);
  }

  debug(message, metadata = {}) {
    this.#log("DEBUG", message, metadata);
  }

  child(context) {
    return new Logger(`${this.context}.${context}`, this.correlationId);
  }

  // Create a new logger instance with correlation ID
  withCorrelationId(correlationId) {
    return new Logger(this.context, correlationId);
  }

  // Generate a new correlation ID
  static generateCorrelationId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const logger = new Logger();
export default Logger;
