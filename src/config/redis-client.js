import { createClient } from "npm:redis";

let url;
const REDIS_HOST = Deno.env.get("REDIS_HOST");
const REDIS_PORT = Deno.env.get("REDIS_PORT") || 6379;
const REDIS_USER = Deno.env.get("REDIS_USER");
const REDIS_PW = Deno.env.get("REDIS_PW");
const SERVICE = Deno.env.get("SERVICE");

if (REDIS_HOST) {
  url = "redis://";
  if (REDIS_USER && REDIS_PW) {
    url += `${REDIS_USER}:${REDIS_PW}@`;
  }
  url += `${REDIS_HOST}:${REDIS_PORT}`;
}

export const client = createClient({ url, name: SERVICE });
export const pubsub = client.duplicate();

export const subscribe2RedisChannel = async (channel, callback) => {
  if (!pubsub.isOpen) await pubsub.connect();
  await pubsub.subscribe(channel, (payload) => {
    try {
      callback(JSON.parse(payload));
      // console.log("parsed")
    } catch (error) {
      callback(payload);
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
  }

  return await pubsub.publish(channel, message);
};

export const getAllSetHashValues = async (key) => {
  if (!client.isOpen) await client.connect();
  const keys = await client.sMembers(key);
  const values = [];
  for (const key of keys) {
    const data = { event: key, ...await client.hGetAll(key) };
    values.push(data);
  }
  return values;
  // return await client.hGetAll(key);
}

