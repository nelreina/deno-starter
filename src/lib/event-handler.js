import "https://deno.land/x/logging@v2.0.0/mod.ts";

export default (message) => {
  const { streamId, event, aggregateId } = message;
  console.info(`Event ${event} received for aggregate ${aggregateId}`);
  message.ack(streamId);
};
