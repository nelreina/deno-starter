import PocketBase from "npm:pocketbase";

const POCKETBASE = Deno.env.get("POCKETBASE");
const POCKETBASE_ADMIN_TOKEN = Deno.env.get("POCKETBASE_ADMIN_TOKEN");
const POCKETBASE_ADMIN = Deno.env.get("POCKETBASE_ADMIN");

console.log("LOG:  ~ POCKETBASE URL:", POCKETBASE);

export const pbAdmin = new PocketBase(POCKETBASE);

export const connectToPocketbase = () => {
  try {
    pbAdmin.authStore.save(POCKETBASE_ADMIN_TOKEN, null);
    console.info(
      "✅ PocketBase admin authenticated for admin user: " + POCKETBASE_ADMIN
    );
    // schedule.scheduleJob(RESET_SCHEDULE, resetCalculations);
  } catch (error) {
    console.error(
      "❗️ PocketBase admin authentication failed:  " + error.message
    );
    throw new Error("PocketBase admin authentication failed");
  }
};



