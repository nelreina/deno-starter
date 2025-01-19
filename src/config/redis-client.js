import "https://deno.land/x/logging@v2.0.0/mod.ts";
import { RedisClient } from "@nelreina/redis-client";
import { getRunningContainerName } from "./docker-info.js";
const SERVICE_NAME = Deno.env.get("SERVICE_NAME");
export const client = new RedisClient({
  redisHost: Deno.env.get("REDIS_HOST"),
  redisPort: Deno.env.get("REDIS_PORT"),
  redisUser: Deno.env.get("REDIS_USER"),
  redisPw: Deno.env.get("REDIS_PW"),
  serviceName: SERVICE_NAME,
  timeZone: Deno.env.get("TIMEZONE"),
  streamConsumerName: await getRunningContainerName() || SERVICE_NAME.toLocaleLowerCase(),
});
