import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/lib/db/client";
import { emailOutbox } from "@/lib/db/schema";

/**
 * Emails go through the email_outbox table: write first, deliver second.
 * If delivery fails the row stays PENDING and is retried by /api/cron/email
 * (or from the admin order page). Nothing is lost when the provider is down.
 *
 * Providers: "log" (development: stored only) or "resend" (https://resend.com).
 * To use another provider, add a branch in `deliver()`.
 */
export type EmailMessage = { to: string; subject: string; html: string; text: string; relatedOrderId?: string };

export async function queueEmail(msg: EmailMessage): Promise<string> {
  const [row] = await db
    .insert(emailOutbox)
    .values({ to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, relatedOrderId: msg.relatedOrderId ?? null })
    .returning({ id: emailOutbox.id });
  return row!.id;
}

const MAX_ATTEMPTS = 5;

/** Delivers pending emails. Safe to call concurrently; each row is claimed with a conditional update. */
export async function deliverPending(limit = 20): Promise<{ sent: number; failed: number }> {
  const pending = await db
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.status, "PENDING"), lt(emailOutbox.attempts, MAX_ATTEMPTS)))
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const row of pending) {
    const claimed = await db
      .update(emailOutbox)
      .set({ attempts: row.attempts + 1 })
      .where(and(eq(emailOutbox.id, row.id), eq(emailOutbox.attempts, row.attempts), eq(emailOutbox.status, "PENDING")))
      .returning({ id: emailOutbox.id });
    if (!claimed.length) continue;
    try {
      await deliver(row);
      await db.update(emailOutbox).set({ status: "SENT", sentAt: new Date(), lastError: null }).where(eq(emailOutbox.id, row.id));
      sent++;
    } catch (err) {
      failed++;
      await db
        .update(emailOutbox)
        .set({ lastError: (err as Error).message.slice(0, 500), status: row.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "PENDING" })
        .where(eq(emailOutbox.id, row.id));
    }
  }
  return { sent, failed };
}

async function deliver(row: { to: string; subject: string; html: string; text: string }) {
  const e = env();
  if (e.EMAIL_PROVIDER === "log") return; // stored in the outbox only
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM, to: [row.to], subject: row.subject, html: row.html, text: row.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
