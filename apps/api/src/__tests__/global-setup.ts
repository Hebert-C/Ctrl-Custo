import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  // Carrega .env.test antes de qualquer módulo — globalSetup roda antes das env vars do Vitest
  config({ path: path.resolve(__dirname, "../../.env.test"), override: true });
  config({ path: path.resolve(__dirname, "../../.env") });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[test] DATABASE_URL não definido.\n" +
        "Copie apps/api/.env.test.example para apps/api/.env.test e configure o banco de testes."
    );
  }

  // Imports dinâmicos APÓS as env vars estarem definidas
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { default: postgres } = await import("postgres");

  const migrationsFolder = path.resolve(__dirname, "../../drizzle");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("[test] aplicando migrations no banco de testes...");
  await migrate(db, { migrationsFolder });
  console.log("[test] migrations concluídas");

  await client.end();
}
