import "https://deno.land/x/logging@v2.0.0/mod.ts";

import { db } from "../config/postgres.js";

export const getEvents = async () => {
  try {
    const result = await db.client`SELECT * FROM event;`;
    console.log(result.length);
    return result;
  } catch (error) {
    console.error("❗️ Error: ", error.message);
    return [];
  }
};
