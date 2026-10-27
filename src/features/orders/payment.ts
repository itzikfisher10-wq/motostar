import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/lib/db/client";
import { cartItems, orderItems, orderStatusHistory, orders, paymentEvents, productVariants } from "@/lib/db/schema";
import { deliverPending, queueEmail } from "@/lib/email";
import { orderConfirmationEmail, storeNewOrderEmail, type OrderEmailData } from "@/lib/email/templates";
import type { PaymentProvider, VerifiedPayment } from "@/lib/payments/types";
import { siteUrl } from "@/lib/seo/metadata";
import { revalidateStorefront } from "@/lib/cache/revalidate";
import { signedOrderUrl } from "./access";

export type PaymentOutcome =
  | "MARKED_PAID"
  | "ALREADY_PAID"
  | "MARKED_FAILED"
  | "PENDING"
  | "AMOUNT_MISMATCH"
  | "NEEDS_REVIEW"
  | "ORDER_NOT_FOUND"
  | "DUPLICATE_EVENT"
  | "INVALID_SIGNATURE";

/** Removes anything that looks like card data before a payload is stored. */
function redact(payload: unknown): unknown {
  return JSON.parse(
    JSON.stringify(payload ?? null, (key, value) =>
      /card|cvv|cvc|pan|expiry|token|four_digits|holder_id|identification/i.test(key) ? "[redacted]" : value,
    ),
  );
}

/**
 * Applies an authoritative payment result to an order. Idempotent and safe under
 * concurrent webhooks / return-page checks:
 *  - each provider notification is recorded once (unique provider+eventKey);
 *  - the order row is locked while its status changes;
 *  - an order is marked PAID only if the verified amount and currency match exactly;
 *  - a transaction id can belong to one order only (unique index).
 */
export async function applyVerifiedPayment(provider: PaymentProvider, verified: VerifiedPayment, eventKey: string, kind: "webhook" | "return" | "admin_check"): Promise<PaymentOutcome> {
  const orderId = verified.orderId;
  const record = async (outcome: PaymentOutcome, signatureValid = true) => {
    await db
      .insert(paymentEvents)
      .values({ provider: provider.name, eventKey: `${eventKey}:${outcome}`, orderId: orderId && /^[0-9a-f-]{36}$/.test(orderId) ? orderId : null, kind, signatureValid, outcome, payload: redact(verified.raw) as object })
      .onConflictDoNothing();
  };

  if (!orderId || !/^[0-9a-f-]{36}$/.test(orderId)) {
    await record("ORDER_NOT_FOUND");
    return "ORDER_NOT_FOUND";
  }
  if (verified.status === "PENDING") return "PENDING";

  // A notification that already changed an order (or raised a review note) is not processed again.
  const [seen] = await db
    .select({ id: paymentEvents.id })
    .from(paymentEvents)
    .where(and(eq(paymentEvents.provider, provider.name), inArray(paymentEvents.eventKey, [`${eventKey}:MARKED_PAID`, `${eventKey}:NEEDS_REVIEW`, `${eventKey}:MARKED_FAILED`])))
    .limit(1);
  if (seen) return "DUPLICATE_EVENT";

  let paidNow = false;
  let stockChanged = false;
  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return "ORDER_NOT_FOUND" as const;
    const otherRequest = !!(order.paymentRequestId && verified.requestId && order.paymentRequestId !== verified.requestId);
    const note = (text: string) => tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: order.status, note: text });
    const txLabel = verified.transactionId ? ` (עסקה ${verified.transactionId})` : "";

    if (verified.status === "FAILED") {
      // A failure of an older payment page must not fail the order's current payment attempt.
      if (otherRequest) return "PENDING" as const;
      if (order.status !== "PENDING_PAYMENT") return order.status === "PAID" ? ("ALREADY_PAID" as const) : ("MARKED_FAILED" as const);
      await tx.update(orders).set({ status: "PAYMENT_FAILED", paymentStatus: "FAILED" }).where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: "PAYMENT_FAILED", note: `התשלום נכשל (${provider.name})` });
      return "MARKED_FAILED" as const;
    }

    // status === PAID (verified with the provider; the provider confirmed this order id)
    if (order.paymentStatus === "PAID") {
      if (verified.transactionId && order.paymentTransactionId && verified.transactionId !== order.paymentTransactionId) {
        await note(`⚠ התקבל תשלום נוסף להזמנה ששולמה כבר${txLabel}. ייתכן חיוב כפול — יש לבדוק ולזכות את הלקוח במערכת הסליקה.`);
        return "NEEDS_REVIEW" as const;
      }
      return "ALREADY_PAID" as const;
    }
    // Only an order that is waiting for payment can become paid. A cancelled or refunded order
    // is never "resurrected" by a late or replayed notification; the team is told instead.
    if (order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_FAILED") {
      await note(`⚠ התקבל אישור תשלום${txLabel} להזמנה בסטטוס "${order.status}". ההזמנה לא שונתה — יש לבדוק ולזכות במידת הצורך.`);
      return "NEEDS_REVIEW" as const;
    }
    if (verified.amountAgorot !== order.totalAgorot || (verified.currency ?? "ILS").toUpperCase() !== order.currency) {
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: `⚠ סכום התשלום (${verified.amountAgorot ?? "?"} אג׳ ${verified.currency ?? ""}) אינו תואם לסכום ההזמנה (${order.totalAgorot} אג׳). ההזמנה לא סומנה כשולמה — נדרשת בדיקה ידנית.`,
      });
      return "AMOUNT_MISMATCH" as const;
    }

    // Commit stock for tracked variants. Never goes negative; shortfalls are flagged for the team.
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const shortfalls: string[] = [];
    for (const item of items) {
      if (!item.variantId) continue;
      const updated = await tx
        .update(productVariants)
        .set({ stockQuantity: sql`${productVariants.stockQuantity} - ${item.quantity}` })
        .where(and(eq(productVariants.id, item.variantId), eq(productVariants.inventoryTracked, true), gte(productVariants.stockQuantity, item.quantity)))
        .returning({ id: productVariants.id });
      if (updated.length) stockChanged = true;
      else {
        const [v] = await tx.select({ tracked: productVariants.inventoryTracked }).from(productVariants).where(eq(productVariants.id, item.variantId));
        if (v?.tracked) shortfalls.push(item.productTitle);
      }
    }

    await tx
      .update(orders)
      .set({ status: "PAID", paymentStatus: "PAID", paidAt: new Date(), paymentTransactionId: verified.transactionId, paymentRequestId: verified.requestId ?? order.paymentRequestId, stockCommitted: true })
      .where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "PAID",
      note: `התשלום אומת מול ${provider.name}${verified.transactionId ? ` (עסקה ${verified.transactionId})` : ""}${shortfalls.length ? `. ⚠ חוסר במלאי: ${shortfalls.join(", ")}` : ""}`,
    });
    if (order.cartId) await tx.delete(cartItems).where(eq(cartItems.cartId, order.cartId));
    paidNow = true;
    return "MARKED_PAID" as const;
  });

  await record(outcome);
  // Sold-out state must show on product pages right away, not after the cache expires.
  if (stockChanged) revalidateStorefront();
  if (paidNow) await sendPaidEmails(orderId);
  return outcome;
}

async function sendPaidEmails(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!order) return;
  const a = order.shippingAddress;
  const data: OrderEmailData = {
    number: order.number,
    firstName: order.firstName,
    lastName: order.lastName,
    email: order.email,
    phone: order.phone,
    items: order.items.map((i) => ({ productTitle: i.productTitle, variantTitle: i.variantTitle, quantity: i.quantity, lineTotalAgorot: i.lineTotalAgorot })),
    subtotalAgorot: order.subtotalAgorot,
    shippingAgorot: order.shippingAgorot,
    totalAgorot: order.totalAgorot,
    shippingMethodName: order.shippingMethodName,
    address: a ? `${a.street} ${a.houseNumber}${a.apartment ? `/${a.apartment}` : ""}, ${a.city}` : null,
    statusUrl: signedOrderUrl(order.id),
  };
  await queueEmail({ ...orderConfirmationEmail(data), relatedOrderId: order.id });
  const storeTo = env().STORE_NOTIFICATION_EMAIL;
  if (storeTo) await queueEmail({ ...storeNewOrderEmail(data, storeTo, siteUrl(`/admin/orders/${order.id}`)), relatedOrderId: order.id });
  await deliverPending().catch(() => undefined);
}

/**
 * Pulls the authoritative status from the provider for a pending order (used by the
 * return page when the customer arrives before the webhook). Safe: the outcome comes
 * from a server-to-server call, never from the redirect's query string.
 */
export async function reconcileOrderPayment(provider: PaymentProvider, orderId: string): Promise<PaymentOutcome> {
  const [order] = await db.select({ status: orders.status, requestId: orders.paymentRequestId, provider: orders.paymentProvider }).from(orders).where(eq(orders.id, orderId));
  if (!order || !order.requestId || order.provider !== provider.name) return "ORDER_NOT_FOUND";
  if (order.status !== "PENDING_PAYMENT") return order.status === "PAID" ? "ALREADY_PAID" : "PENDING";
  const verified = await provider.verifyPayment(order.requestId);
  if (verified.orderId && verified.orderId !== orderId) return "ORDER_NOT_FOUND";
  return applyVerifiedPayment(provider, { ...verified, orderId }, `reconcile:${order.requestId}:${verified.status}`, "return");
}
