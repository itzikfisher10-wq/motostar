"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { checkbox, fail, fieldErrorsOf, optionalShekels, optionalText, shekels, success, type ActionState } from "@/features/admin/forms";
import { revalidateStorefront } from "@/lib/cache/revalidate";
import { requireUser } from "@/features/auth/guard";
import { db } from "@/lib/db/client";
import { shippingMethods } from "@/lib/db/schema";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  description: optionalText(200),
  etaText: optionalText(60),
  price: shekels("מחיר משלוח"),
  freeOver: optionalShekels("סף משלוח חינם"),
  sortOrder: z.coerce.number().int().min(0).max(100),
  isActive: checkbox,
});

/** Prices are what the checkout charges, so changes apply to the next quote immediately. */
export async function updateShippingMethodAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("settings:write");
  const parsed = schema.safeParse({
    name: fd.get("name"),
    description: fd.get("description") ?? "",
    etaText: fd.get("etaText") ?? "",
    price: fd.get("price"),
    freeOver: fd.get("freeOver") ?? "",
    sortOrder: fd.get("sortOrder") || "0",
    isActive: fd.get("isActive"),
  });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;
  const [row] = await db
    .update(shippingMethods)
    .set({ name: d.name, description: d.description ?? null, etaText: d.etaText ?? null, priceAgorot: d.price, freeOverAgorot: d.freeOver, sortOrder: d.sortOrder, isActive: d.isActive })
    .where(eq(shippingMethods.id, id))
    .returning({ code: shippingMethods.code });
  if (!row) return fail("שיטת המשלוח לא נמצאה.");
  await logAudit(user.id, "update", "shipping_method", id, { code: row.code, price: d.price, freeOver: d.freeOver, isActive: d.isActive });
  revalidateStorefront();
  return success("נשמר.");
}
