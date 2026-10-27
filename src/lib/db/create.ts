import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Creates a Drizzle instance. Used by the app (lib/db/client.ts) and by CLI scripts.
 * Application code should import `db` from "@/lib/db/client" instead.
 */
export function createDb(url: string, opts: { max?: number } = {}) {
  const client = postgres(url, { max: opts.max ?? 5, idle_timeout: 20, prepare: false, onnotice: () => {} });
  return { client, db: drizzle(client, { schema }) };
}
