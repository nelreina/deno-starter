import "https://deno.land/x/logging@v2.0.0/mod.ts";
import {RedisClient} from "@nelreina/redis-client";


export const client = new RedisClient({
  redisHost: Deno.env.get("REDIS_HOST"),
  redisPort: Deno.env.get("REDIS_PORT"),
  redisUser: Deno.env.get("REDIS_USER"),
  redisPw: Deno.env.get("REDIS_PW"),
  serviceName: Deno.env.get("SERVICE_NAME"),
  timeZone : Deno.env.get("TIME_ZONE"),

});
