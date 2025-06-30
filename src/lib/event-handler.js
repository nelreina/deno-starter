import { logger } from "./logger.js";
import { validateAndSanitizeMessage } from "../config/event-validators.js";

const log = logger.child("event-handler");

export default (message) => {
  // Validate and sanitize input
  const { streamId, event, aggregateId,headers, data  } = validateAndSanitizeMessage(message);

  log.info("📩 Event received from stream", {
    streamId,
    event,
    aggregateId,
    data,
    headers,
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