import { logger } from "./logger.js";

const log = logger.child("event-handler");

export default (message) => {
  const { streamId, event, aggregateId, data } = message;

  log.info("Event received", {
    streamId,
    event,
    aggregateId,
    dataKeys: data ? Object.keys(data) : [],
  });

  try {
    // Process the message here
    // Add your business logic

    // Acknowledge the message
    message.ack(streamId);

    log.debug("Event acknowledged", { streamId, event, aggregateId });
  } catch (error) {
    log.error("Failed to process event", error, {
      streamId,
      event,
      aggregateId,
    });
    // Consider implementing dead letter queue here
    throw error;
  }
};
