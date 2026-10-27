import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { productSlugHistory, products } from "@/lib/db/schema";

/**
 * Old product slug → current slug (old Shopify handles + admin renames), answered by
 * src/proxy.ts with a single 301 before the page renders. Kept in memory per server
 * instance and refreshed every 10 seconds (one small indexed query), so normal product
 * requests don't wait for the database and an admin rename is picked up almost at once.
 * The proxy runs in its own module context, so invalidateSlugRedirects() only speeds up
 * the app side; the short TTL is what bounds staleness for the proxy.
 */
const TTL_MS = 10_000;
let cache: { map: Map<string, string>; loadedAt: number } | null = null;
let loading: Promise<Map<string, string>> | null = null;

async function load(): Promise<Map<string, string>> {
  const rows = await db.select({ oldSlug: productSlugHistory.oldSlug, slug: products.slug, status: products.status }).from(productSlugHistory).innerJoin(products, eq(products.id, productSlugHistory.productId));
  const map = new Map(rows.filter((r) => r.status === "ACTIVE" && r.oldSlug !== r.slug).map((r) => [r.oldSlug, r.slug]));
  cache = { map, loadedAt: Date.now() };
  return map;
}

export async function findSlugRedirect(oldSlug: string): Promise<string | null> {
  if (!cache || Date.now() - cache.loadedAt > TTL_MS) {
    loading ??= load().finally(() => (loading = null));
    try {
      await loading;
    } catch {
      return null; // database unavailable: let the page handle the request
    }
  }
  return cache?.map.get(oldSlug) ?? null;
}

/** Call after changing a product slug so this instance sees it immediately. */
export function invalidateSlugRedirects() {
  cache = null;
}
