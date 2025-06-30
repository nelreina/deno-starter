/**
 * Event validation functions
 * Provides input validation for Redis stream events
 */

/**
 * Validates a stream ID
 * @param {any} streamId - The stream ID to validate
 * @returns {string} The validated stream ID
 * @throws {Error} If validation fails
 */
export const validateStreamId = (streamId) => {
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

/**
 * Validates an event name
 * @param {any} event - The event name to validate
 * @returns {string} The validated event name
 * @throws {Error} If validation fails
 */
export const validateEvent = (event) => {
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

/**
 * Validates an aggregate ID
 * @param {any} aggregateId - The aggregate ID to validate
 * @returns {string} The validated aggregate ID
 * @throws {Error} If validation fails
 */
export const validateAggregateId = (aggregateId) => {
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

/**
 * Validates event data payload
 * @param {any} data - The data payload to validate
 * @returns {object} The validated data object
 * @throws {Error} If validation fails
 */
export const validateData = (data) => {
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

/**
 * Validates headers object
 * @param {any} headers - The headers to validate
 * @returns {Record<string, string>} The validated headers object
 * @throws {Error} If validation fails
 */
export const validateHeaders = (headers) => {
  if (headers === null || headers === undefined) {
    return {};
  }
  if (typeof headers !== "object") {
    throw new Error("Invalid headers: must be an object");
  }
  
  // Ensure all header values are strings
  const validatedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key !== "string") {
      throw new Error(`Invalid header key: ${key} must be a string`);
    }
    if (value !== null && value !== undefined && typeof value !== "string") {
      throw new Error(`Invalid header value for key '${key}': must be a string`);
    }
    if (value !== null && value !== undefined) {
      validatedHeaders[key] = value;
    }
  }
  
  return validatedHeaders;
};

/**
 * Validates a complete message object
 * @param {any} message - The message to validate
 * @throws {Error} If validation fails
 */
export const validateMessage = (message) => {
  if (!message || typeof message !== "object") {
    throw new Error("Invalid message: must be an object");
  }
  
  if (!message.ack || typeof message.ack !== "function") {
    throw new Error("Invalid message: missing ack function");
  }
  
  return true;
};

/**
 * Validates and sanitizes a complete event message
 * @param {any} message - The message to validate and sanitize
 * @returns {object} Object containing validated and sanitized fields
 * @throws {Error} If validation fails
 */
export const validateAndSanitizeMessage = (message) => {
  // First validate the message structure
  validateMessage(message);
  
  // Then validate and sanitize individual fields
  const streamId = validateStreamId(message.streamId);
  const event = validateEvent(message.event);
  const aggregateId = validateAggregateId(message.aggregateId);
  const data = validateData(message.data);
  const headers = validateHeaders(message.headers);
  
  return {
    streamId,
    event,
    aggregateId,
    data: data || {},
    headers: headers || {},
  };
};