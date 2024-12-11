import "https://deno.land/x/logging@v2.0.0/mod.ts";

import { createClient } from "npm:redis";
import { newEventStreamService as EventStream } from "npm:@nelreina/redis-stream-consumer";

let url;
const REDIS_HOST = Deno.env.get("REDIS_HOST");
const REDIS_PORT = Deno.env.get("REDIS_PORT") || 6379;
const REDIS_USER = Deno.env.get("REDIS_USER");
const REDIS_PW = Deno.env.get("REDIS_PW");
const SERVICE = Deno.env.get("SERVICE_NAME") || "no-name-provided";

if (REDIS_HOST) {
  url = "redis://";
  if (REDIS_USER && REDIS_PW) {
    url += `${REDIS_USER}:${REDIS_PW}@`;
  }
  url += `${REDIS_HOST}:${REDIS_PORT}`;
}

export const client = createClient({ url, name: SERVICE });
export const pubsub = client.duplicate();

client.on("connect", () => {
  console.log(`✅ Connected to redis: ${url}`);
});

client.on("error", (error) => {
  console.error(`❌ Error connecting to redis: ${url}`);
  console.error(error);
});

export const subscribe2RedisChannel = async (channel, callback) => {
  if (!pubsub.isOpen) await pubsub.connect();
  await pubsub.subscribe(channel, (payload) => {
    try {
      callback(JSON.parse(payload));
      // console.log("parsed")
    } catch (error) {
      callback(payload);
      console.error(error.message);
    }
  });
  logger.info(`✅ Subscribed to redis channel: ${channel}`);
};

export const publish2RedisChannel = async (channel, payload) => {
  if (!pubsub.isOpen) await pubsub.connect();
  let message;
  try {
    message = JSON.stringify(payload);
  } catch (error) {
    message = payload;
    console.error(error.message);
  }

  return await pubsub.publish(channel, message);
};

export const setHashValue = async (key, object) => {
  if (!client.isOpen) await client.connect();
  const values = Object.entries(object).reduce((acc, [key, value]) => {
    acc.push(key);
    acc.push(value);
    return acc;
  }, []);
  return await client.hSet(key, values);
};

export const getAllSetHashValues = async (key) => {
  if (!client.isOpen) await client.connect();
  const keys = await client.sMembers(key);
  const values = [];
  for (const key of keys) {
    const data = { event: key, ...(await client.hGetAll(key)) };
    values.push(data);
  }
  return values;
  // return await client.hGetAll(key);
};

export const connectToEventStream = async (
  stream,
  handler = (str) => console.log(str),
  events = false
) => {
  if (!client.isOpen) await client.connect();
  const message = await EventStream(client, stream, SERVICE, events, handler);
  console.log(message);
  // return eventStream;
};
export const addToStream = async (streamName, event, aggregateId, payload) => {
  const streamData = {
    streamKeyName: streamName,
    aggregateId,
    payload,
    event,
    serviceName: SERVICE,
  };
  if (!client.isOpen) await client.connect();
  await addToEventLog(client, streamData);
};

const getLocalTimeStamp = () => {
  const options = {
    timeZone: "America/Curacao",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  };

  const date = new Date();
  const timestamp = date
    .toLocaleString("sv-SE", options)
    .replace(" ", "T")
    .replace(",", "")
    .replace(/(\d{2}:\d{2}:\d{2})/, "$1.");
  return timestamp;
};

const addToEventLog = async (
  conn,
  { streamKeyName, event, aggregateId, payload, serviceName = "" }
) => {
  if (!streamKeyName || (streamKeyName && streamKeyName.length === 0)) {
    throw Error(
      "ERROR: Not a valid Event Stream Data!,  'streamKeyName' are required!"
    );
  }
  const timestamp = getLocalTimeStamp();

  if (!event || !aggregateId || !timestamp) {
    throw Error(
      "ERROR: Not a valid Event Stream Data!,  'event', 'aggregateId' and 'timestamp' are required!"
    );
  }
  // console.info(JSON.stringify({ log: "addToStream", event, aggregateId }));
  const streamData = {
    event,
    aggregateId,
    timestamp,
    payload: JSON.stringify(payload || {}),
    serviceName,
  };
  await conn.xAdd(streamKeyName, "*", streamData);
};

