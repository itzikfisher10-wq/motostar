import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/config/env";
import { randomToken, safeEqual, sha256 } from "@/lib/security/signing";
import { siteUrl } from "@/lib/seo/metadata";

/**
 * Customers have no accounts. An order page is opened with either:
 *  - `t`: the random token issued at checkout (only its SHA-256 is stored), or
 *  - `e` + `s`: an expiring HMAC signature, used in emails (nothing stored).
 */
export function newOrderAccessToken() {
  const token = randomToken(24);
  return { token, hash: sha256(token) };
}

const LINK_DAYS = 180;

function signature(orderId: string, expires: number) {
  return createHmac("sha256", env().APP_SECRET).update(`order:${orderId}:${expires}`).digest("base64url");
}

/** Absolute, expiring link to an order's status page (for emails). */
export function signedOrderUrl(orderId: string) {
  const expires = Math.floor(Date.now() / 1000) + LINK_DAYS * 86400;
  return siteUrl(`/order/${orderId}?e=${expires}&s=${signature(orderId, expires)}`);
}

export function checkOrderAccess(orderId: string, storedHash: string, q: { t?: string | null; e?: string | null; s?: string | null }): boolean {
  if (q.t && q.t.length <= 100 && safeEqual(storedHash, sha256(q.t))) return true;
  const expires = Number(q.e);
  if (q.s && Number.isInteger(expires) && expires > Date.now() / 1000) return safeEqual(signature(orderId, expires), q.s);
  return false;
}
