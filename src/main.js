import "https://deno.land/x/logging@v2.0.0/mod.ts";
import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import { connectToPocketbase } from "./config/pocketbase.js";
import { connectToEventStream } from "./config/redis-client.js";
import eventHandler from "./lib/event-handler.js";
import schedule from "npm:node-schedule";

const PORT = Deno.env.get("SERVICE_PORT") || 8000;
const SERVICE_NAME = Deno.env.get("SERVICE_NAME") || "no-name-provided";
const STREAM = Deno.env.get("STREAM") || "event-stream";

Deno.addSignalListener("SIGTERM", () => {
  db.close();
  console.info("Shutting Down The app!");
  Deno.exit();
});

const app = new Hono();
app.use(logger());
app.get("/health-check", (c) => {
  return c.text("ok");
});
if (await connectToPocketbase()) {
  schedule.scheduleJob("*/5 * * * * *", () => {
    console.info("The answer to life, the universe, and everything!");
  });
  await connectToEventStream(STREAM, eventHandler, false);
  Deno.serve({ port: PORT }, app.fetch);
  console.info(`🚀 ${SERVICE_NAME} is running on http://localhost:${PORT}`);
} else {
  console.error("❗️ Can't start service without connecting to PocketBase");
}
