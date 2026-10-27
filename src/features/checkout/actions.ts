"use server";

import { buildCartView, readCartId } from "@/features/cart/service";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { siteUrl } from "@/lib/seo/metadata";
import { getOrderForPayment, placeOrder, rotateOrderAccessToken, setPaymentRequest } from "./place-order";
import { checkoutSchema, type CheckoutInput } from "./schema";
import { getActiveShippingMethods, shippingCost } from "./shipping";

export type Quote = { subtotal: number; shipping: number; total: number; itemCount: number; hasUnavailable: boolean };

/** Server-computed totals for the selected shipping method. */
export async function quoteAction(shippingMethodCode: string): Promise<Quote | null> {
  const cart = await buildCartView(await readCartId());
  const method = (await getActiveShippingMethods()).find((m) => m.code === shippingMethodCode);
  const shipping = method ? shippingCost(method, cart.subtotal) : 0;
  return { subtotal: cart.subtotal, shipping, total: cart.subtotal + shipping, itemCount: cart.itemCount, hasUnavailable: cart.hasUnavailable };
}

export type PlaceOrderState =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderState> {
  const limited = await rateLimit(`checkout:${await clientIp()}`, { limit: 12, windowSeconds: 600 });
  if (!limited.ok) return { ok: false, error: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד מספר דקות." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "יש לתקן את השדות המסומנים.", fieldErrors };
  }

  const cartId = await readCartId();
  if (!cartId) return { ok: false, error: "הסל ריק." };

  const provider = getPaymentProvider();
  const result = await placeOrder(cartId, parsed.data, provider.name);
  if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.field ? { [result.field]: result.error } : undefined };

  const order = await getOrderForPayment(result.orderId);
  if (!order) return { ok: false, error: "שגיאה ביצירת ההזמנה. נסו שוב." };
  if (order.status !== "PENDING_PAYMENT") {
    const token = result.accessToken ?? (await rotateOrderAccessToken(order.id));
    return { ok: true, redirectUrl: `/order/${order.id}?t=${encodeURIComponent(token)}` };
  }
  // Re-submitted checkout while a payment page already exists: send the customer back to that
  // same page. Never open a second payment request for one order (it could be paid twice).
  if (result.reused && order.paymentRedirectUrl) return { ok: true, redirectUrl: order.paymentRedirectUrl };

  const token = result.accessToken ?? (await rotateOrderAccessToken(order.id));
  const returnUrl = (status: string) => siteUrl(`/checkout/return?order=${order.id}&t=${encodeURIComponent(token)}&status=${status}`);
  try {
    const session = await provider.createPayment({
      orderId: order.id,
      orderNumber: order.number,
      amountAgorot: order.totalAgorot,
      currency: "ILS",
      customer: { name: `${order.firstName} ${order.lastName}`, email: order.email, phone: order.phone },
      items: order.items.map((i) => ({ name: i.variantTitle ? `${i.productTitle} (${i.variantTitle})` : i.productTitle, quantity: i.quantity, unitPriceAgorot: i.unitPriceAgorot })),
      shipping: { name: order.shippingMethodName, amountAgorot: order.shippingAgorot },
      urls: { success: returnUrl("success"), failure: returnUrl("failure"), cancel: siteUrl("/checkout"), callback: siteUrl(`/api/payments/${provider.name}/webhook`) },
    });
    await setPaymentRequest(order.id, session.requestId, session.redirectUrl);
    return { ok: true, redirectUrl: session.redirectUrl };
  } catch (err) {
    console.error("payment_session_failed", { orderId: order.id, message: (err as Error).message });
    return { ok: false, error: "לא הצלחנו לפתוח את דף התשלום. נסו שוב, או התקשרו אלינו להשלמת ההזמנה." };
  }
}
