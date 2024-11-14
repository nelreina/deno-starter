import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import { db } from "./config/postgres.js";
import { getEvents } from "./lib/queries.js";
import "https://deno.land/x/logging@v2.0.0/mod.ts";

const PORT = Deno.env.get("SERVICE_PORT") || 8000;
const SERVICE_NAME = Deno.env.get("SERVICE_NAME") || "no-name-provided";

Deno.addSignalListener("SIGTERM", () => {
  db.close();
  console.log("Shutting Down The app!");
  Deno.exit();
});

// import schedule from "npm:node-schedule";
// schedule.scheduleJob("*/5 * * * * *", () => {
//   console.log("The answer to life, the universe, and everything!");
// });
// Set time out to break the app to check health checks

try {
  const app = new Hono();
  app.use(logger());
  app.get("/health-check", (c) => {
    return c.text("ok");
  });

  app.get("/hello/:name", (c) => {
    const name = c.req.param("name");
    return c.json({ message: `Hello, ${name}!` });
  });

  app.get("/events", async (c) => {
    const result = await getEvents();
    return c.json(result);
  });

  Deno.serve({ port: PORT }, app.fetch);
  console.log(`🚀 ${SERVICE_NAME} is running on http://localhost:${PORT}`);

} catch (error) {
  console.error("❗️ Error: ", error.message);
}
