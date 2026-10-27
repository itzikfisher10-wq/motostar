import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cartItems, customers, orderItems, orderStatusHistory, orders, productImages, productVariants, products } from "@/lib/db/schema";
import { isVariantAvailable, maxPurchasable } from "@/features/catalog/availability";
import { newOrderAccessToken } from "@/features/orders/access";
import type { CheckoutData } from "./schema";
import { getActiveShippingMethods, shippingCost } from "./shipping";

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; accessToken: string | null; totalAgorot: number; reused: boolean }
  | { ok: false; error: string; field?: string };

/**
 * Creates an order from the cart. Everything that affects money is computed here,
 * from the database, inside one transaction:
 *  - prices, availability and quantity limits are re-checked;
 *  - shipping is priced on the server;
 *  - the idempotency key makes double-submits return the same order.
 * The order starts as PENDING_PAYMENT. It becomes PAID only via verified payment
 * confirmation (features/orders/payment.ts). Stock is committed at that point.
 */
export async function placeOrder(cartId: string, data: CheckoutData, paymentProvider: string): Promise<PlaceOrderResult> {
  const existing = await db.select({ id: orders.id, number: orders.number, total: orders.totalAgorot, cartId: orders.cartId }).from(orders).where(eq(orders.idempotencyKey, data.idempotencyKey)).limit(1);
  if (existing[0]) {
    if (existing[0].cartId !== cartId) return { ok: false, error: "בקשה לא תקינה. רעננו את העמוד ונסו שוב." };
    // A repeated submit (double click, back button). The token is NOT rotated here: the payment page
    // that may already be open carries the original token in its return URL. See checkout/actions.ts.
    return { ok: true, orderId: existing[0].id, orderNumber: existing[0].number, accessToken: null, totalAgorot: existing[0].total, reused: true };
  }

  try {
    return await createOrder(cartId, data, paymentProvider);
  } catch (err) {
    // Two identical submits racing each other: the second hits the idempotency unique index.
    // (Drizzle wraps the driver error; the Postgres code is on `cause`.)
    const pg = ((err as { cause?: unknown }).cause ?? err) as { code?: string; constraint_name?: string };
    if (pg.code === "23505" && pg.constraint_name === "orders_idempotency_uq") {
      return placeOrder(cartId, data, paymentProvider);
    }
    throw err;
  }
}

/** Issues a new order-page token (only its hash is stored). Invalidates the previous `?t=` link. */
export async function rotateOrderAccessToken(orderId: string): Promise<string> {
  const { token, hash } = newOrderAccessToken();
  await db.update(orders).set({ accessTokenHash: hash }).where(eq(orders.id, orderId));
  return token;
}

async function createOrder(cartId: string, data: CheckoutData, paymentProvider: string): Promise<PlaceOrderResult> {

  const methods = await getActiveShippingMethods();
  const method = methods.find((m) => m.code === data.shippingMethodCode);
  if (!method) return { ok: false, error: "שיטת המשלוח שנבחרה אינה זמינה.", field: "shippingMethodCode" };
  if (method.requiresAddress && !data.address) return { ok: false, error: "יש למלא כתובת למשלוח.", field: "address" };

  return db.transaction(async (tx) => {
    const lines = await tx
      .select({
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        productId: products.id,
        productTitle: products.title,
        productStatus: products.status,
        variantTitle: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.priceAgorot,
        isAvailable: productVariants.isAvailable,
        inventoryTracked: productVariants.inventoryTracked,
        stockQuantity: productVariants.stockQuantity,
        imageId: productVariants.imageId,
        variantCount: sql<number>`(select count(*)::int from ${productVariants} v2 where v2.product_id = ${products.id})`,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, cartId))
      .orderBy(asc(cartItems.addedAt))
      .for("update", { of: [productVariants] });

    if (!lines.length) return { ok: false as const, error: "הסל ריק." };
    const problems = lines.filter((l) => l.productStatus !== "ACTIVE" || !isVariantAvailable(l) || l.quantity > maxPurchasable(l));
    if (problems.length) {
      return { ok: false as const, error: `חלק מהמוצרים בסל אינם זמינים בכמות שנבחרה: ${problems.map((p) => p.productTitle).join(", ")}. עדכנו את הסל ונסו שוב.` };
    }

    const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    const shipping = shippingCost(method, subtotal);
    const total = subtotal + shipping;

    const [customer] = await tx
      .insert(customers)
      .values({ email: data.email, firstName: data.firstName, lastName: data.lastName, phone: data.phone, marketingConsent: data.marketingConsent })
      .onConflictDoUpdate({
        target: customers.email,
        set: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, ...(data.marketingConsent ? { marketingConsent: true } : {}) },
      })
      .returning({ id: customers.id });

    const { token, hash } = newOrderAccessToken();
    const [order] = await tx
      .insert(orders)
      .values({
        customerId: customer!.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        shippingAddress: method.requiresAddress && data.address ? { ...data.address, zip: data.address.zip || undefined } : null,
        shippingMethodCode: method.code,
        shippingMethodName: method.name,
        shippingAgorot: shipping,
        subtotalAgorot: subtotal,
        totalAgorot: total,
        customerNote: data.customerNote || null,
        paymentProvider,
        idempotencyKey: data.idempotencyKey,
        accessTokenHash: hash,
        cartId,
      })
      .returning({ id: orders.id, number: orders.number });

    const imageIds = lines.map((l) => l.imageId).filter(Boolean) as string[];
    const images = await tx
      .select({ id: productImages.id, productId: productImages.productId, url: productImages.url, position: productImages.position })
      .from(productImages)
      .where(imageIds.length ? sql`${productImages.id} in ${imageIds} or ${productImages.productId} in ${lines.map((l) => l.productId)}` : inArray(productImages.productId, lines.map((l) => l.productId)))
      .orderBy(asc(productImages.position));

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order!.id,
        productId: l.productId,
        variantId: l.variantId,
        productTitle: l.productTitle,
        variantTitle: l.variantCount > 1 ? l.variantTitle : null,
        sku: l.sku,
        imageUrl: (images.find((i) => i.id === l.imageId) ?? images.find((i) => i.productId === l.productId))?.url ?? null,
        unitPriceAgorot: l.price,
        quantity: l.quantity,
        lineTotalAgorot: l.price * l.quantity,
      })),
    );
    await tx.insert(orderStatusHistory).values({ orderId: order!.id, fromStatus: null, toStatus: "PENDING_PAYMENT", note: "ההזמנה נוצרה, ממתינה לתשלום" });

    return { ok: true as const, orderId: order!.id, orderNumber: order!.number, accessToken: token, totalAgorot: total, reused: false };
  });
}

/** Lines needed by the payment provider (item names on the hosted page / invoice). */
export async function getOrderForPayment(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  return order ?? null;
}

export async function setPaymentRequest(orderId: string, requestId: string, redirectUrl: string) {
  await db.update(orders).set({ paymentRequestId: requestId, paymentRedirectUrl: redirectUrl }).where(and(eq(orders.id, orderId), eq(orders.status, "PENDING_PAYMENT")));
}
