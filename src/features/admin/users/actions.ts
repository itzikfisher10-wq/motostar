"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { checkbox, fail, fieldErrorsOf, success, type ActionState } from "@/features/admin/forms";
import { requireUser } from "@/features/auth/guard";
import { destroyAllSessions } from "@/features/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/security/password";

const role = z.enum(["OWNER", "ADMIN", "STAFF"]);
const password = z.string().min(PASSWORD_MIN_LENGTH, `סיסמה של ${PASSWORD_MIN_LENGTH} תווים לפחות`).max(200);

const createSchema = z.object({ email: z.email("אימייל לא תקין").trim().toLowerCase().max(200), name: z.string().trim().min(2).max(80), role, password });

export async function createUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser("users:manage");
  const parsed = createSchema.safeParse({ email: fd.get("email"), name: fd.get("name"), role: fd.get("role"), password: fd.get("password") });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;
  const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
  if (exists) return fail("כבר קיים משתמש עם האימייל הזה.", { email: "קיים" });
  const [row] = await db.insert(users).values({ email: d.email, name: d.name, role: d.role, passwordHash: await hashPassword(d.password) }).returning({ id: users.id });
  await logAudit(actor.id, "create", "user", row!.id, { email: d.email, role: d.role });
  return success(`המשתמש ${d.email} נוצר. מסרו לו את הסיסמה בערוץ מאובטח, ובקשו להחליף אותה.`);
}

const updateSchema = z.object({ role, isActive: checkbox, password: z.union([password, z.literal("")]) });

/** Change role / active state / password. Guards: you cannot demote or disable yourself, and the last active owner stays an owner. */
export async function updateUserAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser("users:manage");
  const parsed = updateSchema.safeParse({ role: fd.get("role"), isActive: fd.get("isActive"), password: fd.get("password") ?? "" });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return fail("המשתמש לא נמצא.");

  if (target.id === actor.id && (d.role !== "OWNER" || !d.isActive)) return fail("אי אפשר להוריד הרשאות או להשבית את החשבון שלך.");
  if (target.role === "OWNER" && (d.role !== "OWNER" || !d.isActive)) {
    const [others] = await db.select({ n: count() }).from(users).where(and(eq(users.role, "OWNER"), eq(users.isActive, true), ne(users.id, target.id)));
    if (!others?.n) return fail("חייב להישאר לפחות בעלים פעיל אחד.");
  }

  await db
    .update(users)
    .set({ role: d.role, isActive: d.isActive, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) })
    .where(eq(users.id, userId));
  // Role, status or password changes sign the user out everywhere.
  if (target.id !== actor.id) await destroyAllSessions(userId);
  await logAudit(actor.id, "update", "user", userId, { role: d.role, isActive: d.isActive, passwordChanged: !!d.password });
  return success("נשמר.");
}
