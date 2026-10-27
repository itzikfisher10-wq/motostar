import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { randomToken, sha256 } from "@/lib/security/signing";
import type { Role } from "./permissions";

/**
 * Admin sessions. The cookie holds a random token; the database stores only its
 * SHA-256, so a database leak does not leak usable sessions.
 * Cookie: httpOnly, Secure (production), SameSite=Strict, path=/ (admin pages and actions).
 */
export const SESSION_COOKIE = "ms_admin";
const SESSION_HOURS = 12;

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, userAgent });
  // Opportunistic cleanup of expired sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

/** Current admin user, or null. Memoized per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date()), eq(users.isActive, true)))
    .limit(1);
  return row ?? null;
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  store.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere (used when a password changes or a user is deactivated). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
