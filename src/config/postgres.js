import postgres from "npm:postgres";

const DB_USER = Deno.env.get("DB_USER") || "postgres";
const DB_HOST = Deno.env.get("DB_HOST") || "localhost";
const DB_NAME = Deno.env.get("DB_NAME") || "test";
const DB_PASSWORD = Deno.env.get("DB_PASSWORD");
const DB_PORT = Deno.env.get("DB_PORT") || 5432;

class Postgres {
  constructor() {
    this.client = postgres({
      user: DB_USER,
      hostname: DB_HOST,
      database: DB_NAME,
      password: DB_PASSWORD,
      port: DB_PORT,
    });
  }
  connect() {
    //  await this.client.connect();
    console.log("Connected to the database");
  }
  // close the connection
  async close() {
    return await this.client.end();
  }

}

export default Postgres;
export const db = new Postgres();
