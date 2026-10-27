/**
 * Rebuilds a throw-away database: drop + create → migrations → real catalog import → seed.
 * Used by the integration suite (vitest globalSetup) and the e2e suite (prepare-db.ts).
 * Refuses any database whose name does not end in _test or _e2e.
 */
import { execFileSync } from "node:child_process";
import postgres from "postgres";

export async function resetDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const dbName = target.pathname.slice(1);
  if (!/_e2e$|_test$/.test(dbName)) throw new Error(`Refusing to reset "${dbName}": name must end with _test or _e2e`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const root = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await root.unsafe(`drop database if exists "${dbName}" with (force)`);
    await root.unsafe(`create database "${dbName}"`);
  } finally {
    await root.end();
  }

  const env = { ...process.env, DATABASE_URL: url };
  for (const [script, ...args] of [["scripts/db/migrate.ts"], ["scripts/import-products/run.ts", "--no-report"], ["scripts/db/seed.ts"]]) {
    execFileSync("npx", ["tsx", script!, ...args], { env, stdio: "pipe" });
  }
}
