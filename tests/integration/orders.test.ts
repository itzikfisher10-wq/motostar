import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { placeOrder } from "@/features/checkout/place-order";
import { applyVerifiedPayment } from "@/features/orders/payment";
import { db } from "@/lib/db/client";
import { cartItems, carts, emailOutbox, orders, productVariants, products, shippingMethods } from "@/lib/db/schema";
import { MockPaymentProvider } from "@/lib/payments/mock";

/**
 * Order + payment engine against a real PostgreSQL database with the real catalog
 * (tests/support/global-setup.ts). Money paths: server pricing, idempotency,
 * verified payment, amount mismatch, duplicate notifications, stock.
 */
const provider = new MockPaymentProvider(process.env.APP_SECRET!);

let variant: { id: string; price: number };

async function cartWith(variantId: string, quantity: number) {
  const [cart] = await db.insert(carts).values({}).returning({ id: carts.id });
  await db.insert(cartItems).values({ cartId: cart!.id, variantId, quantity });
  return cart!.id;
}

const customer = (overrides: Partial<Parameters<typeof placeOrder>[1]> = {}) => ({
  idempotencyKey: randomUUID(),
  firstName: "ישראל",
  lastName: "בדיקה",
  email: "integration@test.local",
  phone: "0501234567",
  shippingMethodCode: "pickup",
  marketingConsent: false,
  termsAccepted: true as const,
  ...overrides,
});

const paid = (orderId: string, amountAgorot: number, tx: string = randomUUID()) => ({ status: "PAID" as const, orderId, amountAgorot, currency: "ILS", transactionId: tx, requestId: null, raw: {} });

beforeEach(async () => {
  const [row] = await db
    .select({ id: productVariants.id, price: productVariants.priceAgorot })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(products.slug, "מצבר-btx5l-bs"), eq(products.status, "ACTIVE")));
  variant = row!;
  await db.update(productVariants).set({ inventoryTracked: false, stockQuantity: null, isAvailable: true }).where(eq(productVariants.id, variant.id));
});

afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
});

describe("placing an order", () => {
  it("prices everything on the server and starts unpaid", async () => {
    const cartId = await cartWith(variant.id, 2);
    const r = await placeOrder(cartId, customer(), "mock");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [o] = await db.select().from(orders).where(eq(orders.id, r.orderId));
    expect(o!.subtotalAgorot).toBe(variant.price * 2);
    expect(o!.totalAgorot).toBe(variant.price * 2); // pickup is free
    expect(o!.status).toBe("PENDING_PAYMENT");
    expect(o!.paymentStatus).toBe("UNPAID");
  });

  it("returns the same order when the same checkout is submitted twice", async () => {
    const cartId = await cartWith(variant.id, 1);
    const input = customer();
    const a = await placeOrder(cartId, input, "mock");
    const b = await placeOrder(cartId, input, "mock");
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.orderId).toBe(a.orderId);
      expect(b.reused).toBe(true);
    }
  });

  it("refuses a shipping method that is not active", async () => {
    await db.update(shippingMethods).set({ isActive: false }).where(eq(shippingMethods.code, "express"));
    const r = await placeOrder(await cartWith(variant.id, 1), customer({ shippingMethodCode: "express" }), "mock");
    expect(r.ok).toBe(false);
  });

  it("refuses more than the tracked stock", async () => {
    await db.update(productVariants).set({ inventoryTracked: true, stockQuantity: 1 }).where(eq(productVariants.id, variant.id));
    const r = await placeOrder(await cartWith(variant.id, 2), customer(), "mock");
    expect(r.ok).toBe(false);
  });
});

describe("payment confirmation", () => {
  async function newOrder(quantity = 1) {
    const cartId = await cartWith(variant.id, quantity);
    const r = await placeOrder(cartId, customer(), "mock");
    if (!r.ok) throw new Error(r.error);
    return { ...r, cartId };
  }

  it("marks the order paid, empties the cart and queues both emails", async () => {
    const o = await newOrder();
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot), `evt-${o.orderId}`, "webhook")).toBe("MARKED_PAID");
    const [row] = await db.select().from(orders).where(eq(orders.id, o.orderId));
    expect(row!.status).toBe("PAID");
    expect(await db.select().from(cartItems).where(eq(cartItems.cartId, o.cartId))).toHaveLength(0);
    const mails = await db.select().from(emailOutbox).where(eq(emailOutbox.relatedOrderId, o.orderId));
    expect(mails.length).toBeGreaterThanOrEqual(1);
  });

  it("never marks paid when the amount differs", async () => {
    const o = await newOrder();
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot - 1), `evt-mm-${o.orderId}`, "webhook")).toBe("AMOUNT_MISMATCH");
    const [row] = await db.select().from(orders).where(eq(orders.id, o.orderId));
    expect(row!.paymentStatus).toBe("UNPAID");
  });

  it("processes a repeated notification once (no double stock decrement)", async () => {
    await db.update(productVariants).set({ inventoryTracked: true, stockQuantity: 5 }).where(eq(productVariants.id, variant.id));
    const o = await newOrder(2);
    const tx = randomUUID();
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, tx), "dup-1", "webhook")).toBe("MARKED_PAID");
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, tx), "dup-1", "webhook")).toBe("DUPLICATE_EVENT");
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, tx), "dup-1b", "return")).toBe("ALREADY_PAID");
    const [v] = await db.select({ stock: productVariants.stockQuantity }).from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v!.stock).toBe(3);
  });

  it("a failed payment does not touch stock and is not paid", async () => {
    await db.update(productVariants).set({ inventoryTracked: true, stockQuantity: 4 }).where(eq(productVariants.id, variant.id));
    const o = await newOrder(1);
    expect(await applyVerifiedPayment(provider, { ...paid(o.orderId, o.totalAgorot), status: "FAILED" }, "fail-1", "webhook")).toBe("MARKED_FAILED");
    const [v] = await db.select({ stock: productVariants.stockQuantity }).from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v!.stock).toBe(4);
  });

  it("never turns a refunded or cancelled order back into a paid one (replayed/late notification)", async () => {
    await db.update(productVariants).set({ inventoryTracked: true, stockQuantity: 6 }).where(eq(productVariants.id, variant.id));
    const o = await newOrder(1);
    const tx = randomUUID();
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, tx), "r-1", "webhook")).toBe("MARKED_PAID");
    await db.update(orders).set({ status: "REFUNDED", paymentStatus: "REFUNDED" }).where(eq(orders.id, o.orderId));
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, tx), "r-2", "webhook")).toBe("NEEDS_REVIEW");
    const [row] = await db.select().from(orders).where(eq(orders.id, o.orderId));
    expect(row!.status).toBe("REFUNDED");
    const [v] = await db.select({ stock: productVariants.stockQuantity }).from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v!.stock).toBe(5); // taken once, never twice

    const c = await newOrder(1);
    await db.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, c.orderId));
    expect(await applyVerifiedPayment(provider, paid(c.orderId, c.totalAgorot), "c-1", "webhook")).toBe("NEEDS_REVIEW");
    expect((await db.select({ s: orders.status }).from(orders).where(eq(orders.id, c.orderId)))[0]!.s).toBe("CANCELLED");
  });

  it("flags a second, different charge on an already-paid order for refund", async () => {
    const o = await newOrder();
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, "tx-a-" + o.orderId), "d-1", "webhook")).toBe("MARKED_PAID");
    expect(await applyVerifiedPayment(provider, paid(o.orderId, o.totalAgorot, "tx-b-" + o.orderId), "d-2", "webhook")).toBe("NEEDS_REVIEW");
  });

  it("accepts a verified payment made on an earlier payment page of the same order", async () => {
    const o = await newOrder();
    await db.update(orders).set({ paymentRequestId: "req-current" }).where(eq(orders.id, o.orderId));
    const r = await applyVerifiedPayment(provider, { ...paid(o.orderId, o.totalAgorot), requestId: "req-older" }, "old-1", "webhook");
    expect(r).toBe("MARKED_PAID");
    // …but a failure of an older page does not fail the current attempt.
    const p2 = await newOrder();
    await db.update(orders).set({ paymentRequestId: "req-current-2" }).where(eq(orders.id, p2.orderId));
    expect(await applyVerifiedPayment(provider, { ...paid(p2.orderId, p2.totalAgorot), status: "FAILED", requestId: "req-old-2" }, "old-2", "webhook")).toBe("PENDING");
  });

  it("re-submitting checkout reuses the order without invalidating its link token", async () => {
    const cartId = await cartWith(variant.id, 1);
    const input = customer();
    const first = await placeOrder(cartId, input, "mock");
    const [before] = await db.select({ h: orders.accessTokenHash }).from(orders).where(eq(orders.id, first.ok ? first.orderId : ""));
    const again = await placeOrder(cartId, input, "mock");
    expect(again.ok && again.reused && again.accessToken === null).toBe(true);
    const [after] = await db.select({ h: orders.accessTokenHash }).from(orders).where(eq(orders.id, first.ok ? first.orderId : ""));
    expect(after!.h).toBe(before!.h);
  });

  it("ignores notifications for unknown orders", async () => {
    expect(await applyVerifiedPayment(provider, paid("not-a-uuid", 100), "bad-1", "webhook")).toBe("ORDER_NOT_FOUND");
  });
});

describe("mock provider signatures", () => {
  it("accepts its own signature and rejects a forged one", async () => {
    const body = JSON.stringify({ request_id: "mock_x", order_id: "o", status: "PAID" });
    const good = await provider.parseWebhook(body, new Headers({ "x-mock-signature": provider.sign(body) }));
    const bad = await provider.parseWebhook(body, new Headers({ "x-mock-signature": provider.sign(body + " ") }));
    expect(good.signatureValid).toBe(true);
    expect(bad.signatureValid).toBe(false);
  });
});
