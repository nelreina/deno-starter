import { logger } from "./logger.js";

const log = logger.child("event-handler");

// Input validation functions
const validateStreamId = (streamId) => {
  if (!streamId || typeof streamId !== "string") {
    throw new Error("Invalid streamId: must be a non-empty string");
  }
  if (streamId.length > 255) {
    throw new Error("Invalid streamId: too long (max 255 characters)");
  }
  // Allow alphanumeric, hyphens, underscores, and dots
  if (!/^[a-zA-Z0-9._-]+$/.test(streamId)) {
    throw new Error("Invalid streamId: contains invalid characters");
  }
  return streamId;
};

const validateEvent = (event) => {
  if (!event || typeof event !== "string") {
    throw new Error("Invalid event: must be a non-empty string");
  }
  if (event.length > 100) {
    throw new Error("Invalid event: too long (max 100 characters)");
  }
  // Allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(event)) {
    throw new Error("Invalid event: contains invalid characters");
  }
  return event;
};

const validateAggregateId = (aggregateId) => {
  if (!aggregateId || typeof aggregateId !== "string") {
    throw new Error("Invalid aggregateId: must be a non-empty string");
  }
  if (aggregateId.length > 255) {
    throw new Error("Invalid aggregateId: too long (max 255 characters)");
  }
  // Allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(aggregateId)) {
    throw new Error("Invalid aggregateId: contains invalid characters");
  }
  return aggregateId;
};

const validateData = (data) => {
  if (data === null || data === undefined) {
    return {};
  }
  if (typeof data !== "object") {
    throw new Error("Invalid data: must be an object");
  }
  // Prevent circular references and limit depth
  const stringified = JSON.stringify(data);
  if (stringified.length > 10000) {
    throw new Error("Invalid data: too large (max 10KB)");
  }
  return data;
};

export default (message) => {
  // Validate required message structure
  if (!message || typeof message !== "object") {
    throw new Error("Invalid message: must be an object");
  }

  if (!message.ack || typeof message.ack !== "function") {
    throw new Error("Invalid message: missing ack function");
  }

  // Validate and sanitize input
  const streamId = validateStreamId(message.streamId);
  const event = validateEvent(message.event);
  const aggregateId = validateAggregateId(message.aggregateId);
  const data = validateData(message.data);

  log.info("📩 Event received from stream", {
    streamId,
    event,
    aggregateId,
    data: data || {},
  });

  try {
    // Process the message here
    // Add your business logic

    // For test events, log additional details
    if (event === "test_starters" || event === "manual_test") {
      log.info("Processing test event", {
        eventType: event,
        payload: data,
      });
    }

    // Acknowledge the message
    message.ack(streamId);

    log.debug("✅ Event acknowledged successfully", {
      streamId,
      event,
      aggregateId,
    });
  } catch (error) {
    log.error("❌ Failed to process event", error, {
      streamId,
      event,
      aggregateId,
    });
    // Consider implementing dead letter queue here
    throw error;
  }
};
