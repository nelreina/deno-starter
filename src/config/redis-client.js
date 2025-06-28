import { RedisClient } from "@nelreina/redis-client";
import { getRunningContainerName } from "./docker-info.js";
import { appConfig } from "./app-config.js";
import { logger } from "../lib/logger.js";

const log = logger.child("redis-client");

// Get container name for consumer identification
const containerName = await getRunningContainerName();
const consumerName = containerName ||
  appConfig.get().service.name.toLowerCase();

// Set consumer name in config
appConfig.setStreamConsumerName(consumerName);

// Create Redis client with configuration
export const client = new RedisClient(appConfig.getRedisClientConfig());

log.info("Redis client initialized", {
  host: appConfig.get().redis.host,
  port: appConfig.get().redis.port,
  consumerName: consumerName,
});
