import "https://deno.land/x/logging@v2.0.0/mod.ts";
import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import { client as redis } from "./config/redis-client.js";
import eventHandler from "./lib/event-handler.js";
import schedule from "npm:node-schedule";

const PORT = Deno.env.get("SERVICE_PORT") || 8000;
const SERVICE_NAME = Deno.env.get("SERVICE_NAME") || "no-name-provided";
const STREAM = Deno.env.get("STREAM") || "event-stream";

const shutdown = () => {
  console.info("Shutting Down The app!");
  redis.close();
  Deno.exit();
};

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

const app = new Hono();
app.use(logger());
app.get("/health-check", (c) => {
  return c.text("ok");
});
  schedule.scheduleJob("*/10 * * * * *", () => {
    redis.publishToStream(STREAM, "test_starters", "abc123", {
      message: "Message from Deno",
      timestamp: new Date().toISOString(),
    });
  });  await redis.connectToEventStream(STREAM, eventHandler, false);
  Deno.serve({ port: PORT }, app.fetch);
  console.info(`🚀 ${SERVICE_NAME} is running on http://localhost:${PORT}`);
