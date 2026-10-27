"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { fail, success, type ActionState } from "@/features/admin/forms";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";
import { signedOrderUrl } from "@/features/orders/access";
import { reconcileOrderPayment } from "@/features/orders/payment";
import { MANUAL_TRANSITIONS, ORDER_STATUS_LABEL, type OrderStatus } from "@/features/orders/status";
import { db } from "@/lib/db/client";
import { orderItems, orderStatusHistory, orders, productVariants } from "@/lib/db/schema";
import { deliverPending, queueEmail } from "@/lib/email";
import { orderShippedEmail } from "@/lib/email/templates";
import { getPaymentProvider } from "@/lib/payments";

const statusSchema = z.object({
  toStatus: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().trim().max(500).optional(),
  notifyCustomer: z.preprocess((v) => v === "on", z.boolean()),
});

/**
 * Manual status change. Only transitions listed in MANUAL_TRANSITIONS are allowed;
 * payment states are never set by hand. Cancelling or refunding a paid order returns
 * committed stock. Refunds themselves are issued in the payment provider's dashboard.
 */
export async function updateOrderStatusAction(orderId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("orders:update");
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return fail("הזמנה לא נמצאה.");
  const parsed = statusSchema.safeParse({ toStatus: fd.get("toStatus"), note: fd.get("note") || undefined, notifyCustomer: fd.get("notifyCustomer") });
  if (!parsed.success) return fail("בחרו סטטוס.");
  const { toStatus, note, notifyCustomer } = parsed.data;
  if ((toStatus === "CANCELLED" || toStatus === "REFUNDED") && !can(user.role, "orders:cancel")) return fail("ביטול וזיכוי הזמנה דורשים הרשאת מנהל.");

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return { error: "הזמנה לא נמצאה." } as const;
    if (!MANUAL_TRANSITIONS[order.status as OrderStatus].includes(toStatus)) {
      return { error: `אי אפשר לעבור מ"${ORDER_STATUS_LABEL[order.status]}" ל"${ORDER_STATUS_LABEL[toStatus]}".` } as const;
    }
    let restocked = false;
    if ((toStatus === "CANCELLED" || toStatus === "REFUNDED") && order.stockCommitted) {
      const items = await tx.select({ variantId: orderItems.variantId, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        if (!item.variantId) continue;
        await tx
          .update(productVariants)
          .set({ stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}` })
          .where(and(eq(productVariants.id, item.variantId), eq(productVariants.inventoryTracked, true)));
      }
      restocked = true;
    }
    await tx
      .update(orders)
      .set({ status: toStatus, ...(restocked ? { stockCommitted: false } : {}), ...(toStatus === "REFUNDED" ? { paymentStatus: "REFUNDED" as const } : {}) })
      .where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: order.status, toStatus, note: [note, restocked ? "המלאי הוחזר" : null].filter(Boolean).join(". ") || null, actorUserId: user.id });
    return { order, restocked } as const;
  });
  if ("error" in result) return fail(result.error!);

  if (toStatus === "SHIPPED" && notifyCustomer) {
    const o = result.order;
    await queueEmail({ ...orderShippedEmail({ number: o.number, firstName: o.firstName, email: o.email, statusUrl: signedOrderUrl(o.id) }, note), relatedOrderId: o.id });
    await deliverPending().catch(() => undefined);
  }
  await logAudit(user.id, "status", "order", orderId, { from: result.order.status, to: toStatus, notified: toStatus === "SHIPPED" && notifyCustomer });
  revalidatePath(`/admin/orders/${orderId}`);
  return success(`הסטטוס עודכן ל"${ORDER_STATUS_LABEL[toStatus]}".${toStatus === "REFUNDED" ? " את ההחזר הכספי עצמו יש לבצע במערכת הסליקה." : ""}`);
}

/** Internal note on the order timeline (not shown to the customer). */
export async function addOrderNoteAction(orderId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("orders:update");
  const note = z.string().trim().min(1, "ההערה ריקה").max(1000).safeParse(fd.get("note") ?? "");
  if (!note.success) return fail(note.error.issues[0]!.message);
  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId));
  if (!order) return fail("הזמנה לא נמצאה.");
  await db.insert(orderStatusHistory).values({ orderId, fromStatus: order.status, toStatus: order.status, note: note.data, actorUserId: user.id });
  revalidatePath(`/admin/orders/${orderId}`);
  return success("ההערה נוספה.");
}

/** Asks the payment provider for the real status of a pending order (e.g. a webhook was missed). */
export async function recheckPaymentAction(orderId: string): Promise<ActionState> {
  const user = await requireUser("orders:update");
  const provider = getPaymentProvider();
  const outcome = await reconcileOrderPayment(provider, orderId).catch(() => "ERROR" as const);
  await logAudit(user.id, "recheck_payment", "order", orderId, { outcome });
  revalidatePath(`/admin/orders/${orderId}`);
  const messages: Record<string, string> = {
    MARKED_PAID: "התשלום אומת וההזמנה סומנה כשולמה.",
    ALREADY_PAID: "ההזמנה כבר שולמה.",
    MARKED_FAILED: "חברת הסליקה מדווחת שהתשלום נכשל.",
    PENDING: "התשלום עדיין לא הושלם אצל חברת הסליקה.",
    AMOUNT_MISMATCH: "סכום התשלום אינו תואם להזמנה. ההזמנה לא סומנה כשולמה — יש לבדוק ידנית.",
    ORDER_NOT_FOUND: "לא נמצאה בקשת תשלום להזמנה הזו אצל ספק הסליקה הנוכחי.",
    ERROR: "לא הצלחנו לפנות לחברת הסליקה. נסו שוב מאוחר יותר.",
  };
  return { ok: outcome === "MARKED_PAID" || outcome === "ALREADY_PAID", message: messages[outcome] ?? outcome };
}
