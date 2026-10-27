import "server-only";
import { headers } from "next/headers";

/**
 * Client IP for rate limiting. Uses the LAST x-forwarded-for entry: that is the one added
 * by our own proxy (Vercel sets a single value; nginx's $proxy_add_x_forwarded_for appends
 * the real address), while earlier entries can be forged by the client.
 * Assumes exactly one trusted proxy in front of the app — see docs/deployment.md.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const hops = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return hops[hops.length - 1] || h.get("x-real-ip") || "unknown";
}

/**
 * Same-origin check for state-changing route handlers (Server Actions do this
 * automatically). Blocks cross-site form posts / fetches.
 */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
