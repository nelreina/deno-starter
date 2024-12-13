import {eventLogRepository} from "../db/repository/event-logs.js";

export default (message) => {
    const { streamId, event, aggregateId } = message;
    console.log(`Event ${event} received for aggregate ${aggregateId}`);
    eventLogRepository.create(message);
    message.ack(streamId)
}
