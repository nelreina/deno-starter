const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL =
  LOG_LEVELS[Deno.env.get("LOG_LEVEL")?.toUpperCase() || "INFO"];

class Logger {
  constructor(context = "app") {
    this.context = context;
  }

  #formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const serviceName = Deno.env.get("SERVICE_NAME") || "no-name-provided";
    const environment = Deno.env.get("ENVIRONMENT") || "development";

    return JSON.stringify({
      timestamp,
      level,
      service: serviceName,
      environment,
      context: this.context,
      message,
      ...metadata,
    });
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
    return new Logger(`${this.context}.${context}`);
  }
}

export const logger = new Logger();
export default Logger;
