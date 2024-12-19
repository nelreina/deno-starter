import "https://deno.land/x/logging@v2.0.0/mod.ts";
import PocketBase from "pocketbase";

const POCKETBASE = Deno.env.get("POCKETBASE_URL");
const POCKETBASE_ADMIN_TOKEN = Deno.env.get("POCKETBASE_ADMIN_TOKEN");
const POCKETBASE_ADMIN = Deno.env.get("POCKETBASE_ADMIN");

console.info("• POCKETBASE URL:", POCKETBASE);

export const pbAdmin = new PocketBase(POCKETBASE);

const checkAuth = async () => {
  try {
    // This is a workaround to check if the admin is authenticated
    await pbAdmin.collection("_superusers").getList(1, 1);
    return true;
  } catch (_error) {
    return false;
  }
};

export const connectToPocketbase = async () => {
  let isAuthenticated = false;
  pbAdmin.authStore.save(POCKETBASE_ADMIN_TOKEN);
  isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    console.info(
      "✅ PocketBase admin authenticated for admin user: " + POCKETBASE_ADMIN,
    );
  } else {
    console.error(
      "❗️ PocketBase admin authentication failed:  ",
    );
  }
  return isAuthenticated;
};
