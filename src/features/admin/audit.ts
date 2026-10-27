import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

/**
 * Records who changed what in the admin. `data` must never contain secrets
 * (passwords, tokens) or full customer records — store ids and changed field names.
 */
export async function logAudit(userId: string | null, action: string, entity: string, entityId: string | null, data?: Record<string, unknown>) {
  await db.insert(auditLog).values({ userId, action, entity, entityId, data: data ?? null });
}
