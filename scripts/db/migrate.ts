/**
 * Applies pending SQL migrations from /drizzle.
 * Usage: npm run db:migrate
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../../src/lib/db/create";
import { loadScriptEnv } from "../lib/env";

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.info("✓ Migrations applied");
} finally {
  await client.end();
}
