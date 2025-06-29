import { logger } from "./logger.js";

const log = logger.child("event-handler");

export default (message) => {
  const { streamId, event, aggregateId, data } = message;

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
