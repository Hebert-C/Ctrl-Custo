import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  console.log("[migrate] running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] done");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
