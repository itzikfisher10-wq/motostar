import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

/**
 * Fixed-window rate limiter stored in Postgres, so limits hold across serverless
 * instances. One atomic upsert per check.
 */
export async function rateLimit(key: string, opts: { limit: number; windowSeconds: number }): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const now = Date.now();
  const windowMs = opts.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  const count = row?.count ?? 1;
  // Opportunistic cleanup of old windows (~1% of calls).
  if (Math.random() < 0.01) await db.execute(sql`delete from ${rateLimits} where ${rateLimits.windowStart} < now() - interval '1 day'`);
  return { ok: count <= opts.limit, remaining: Math.max(0, opts.limit - count), retryAfter: Math.ceil((windowStart.getTime() + windowMs - now) / 1000) };
}
