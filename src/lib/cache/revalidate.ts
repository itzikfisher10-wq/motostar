import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Refreshes the cached storefront pages (home, listings, product pages, sitemap).
 * Called after admin changes and when a verified payment changes tracked stock.
 * The store is small, so invalidating the whole storefront is simpler and safer
 * than tracking which pages show which product.
 * Outside a Next.js request (CLI scripts, unit tests) there is no cache to clear.
 */
export function revalidateStorefront() {
  try {
    revalidatePath("/", "layout");
  } catch {
    /* not running inside Next.js */
  }
}
