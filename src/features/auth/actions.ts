"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { DUMMY_HASH, verifyPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { createSession, destroySession } from "./session";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), next: formData.get("next") || undefined });
  const generic = { error: "אימייל או סיסמה שגויים." };
  if (!parsed.success) return generic;

  const ip = await clientIp();
  // Guessing limits: per IP, per account from one IP (tight), and per account overall (loose,
  // so a stranger cannot keep the owner locked out by failing logins from elsewhere).
  const [byIp, byAccountIp, byAccount] = await Promise.all([
    rateLimit(`login:ip:${ip}`, { limit: 20, windowSeconds: 900 }),
    rateLimit(`login:acct-ip:${parsed.data.email}:${ip}`, { limit: 8, windowSeconds: 900 }),
    rateLimit(`login:acct:${parsed.data.email}`, { limit: 100, windowSeconds: 900 }),
  ]);
  if (!byIp.ok || !byAccountIp.ok || !byAccount.ok) return { error: "יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות." };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  // Always run one hash verification so response time does not reveal whether the email exists.
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) return generic;

  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit(user.id, "login", "user", user.id);

  const next = parsed.data.next;
  redirect(next && /^\/admin(\/[\w\-/]*)?$/.test(next) && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
