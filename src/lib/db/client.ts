import "server-only";
import { env } from "@/config/env";
import { createDb, type Database } from "./create";
import * as schema from "./schema";

declare global {
  // Reuse one pool across hot reloads in development.
  var __motostarDb: ReturnType<typeof createDb> | undefined;
}

const instance = globalThis.__motostarDb ?? createDb(env().DATABASE_URL, { max: env().NODE_ENV === "production" ? 10 : 5 });
if (env().NODE_ENV !== "production") globalThis.__motostarDb = instance;

export const db: Database = instance.db;
export type { Database };
export { schema };
