import PocketBase from "npm:pocketbase";

const POCKETBASE = Deno.env.get("POCKETBASE_URL");
const POCKETBASE_ADMIN = Deno.env.get("POCKETBASE_ADMIN");
const POCKETBASE_ADMIN_PASSWORD = Deno.env.get("POCKETBASE_ADMIN_PASSWORD");

console.log("LOG:  ~ POCKETBASE URL:", POCKETBASE);

export const pbAdmin = new PocketBase(POCKETBASE);

export const connectToPB = async () => {
  try {
    await pbAdmin.admins.authWithPassword(
      POCKETBASE_ADMIN,
      POCKETBASE_ADMIN_PASSWORD
    );
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


