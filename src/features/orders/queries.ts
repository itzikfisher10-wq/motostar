import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderStatusHistory, orders } from "@/lib/db/schema";
import { checkOrderAccess } from "./access";

export type OrderAccessQuery = { t?: string | null; e?: string | null; s?: string | null };

/**
 * Loads an order for its customer-facing status page. Returns null when the id is
 * malformed, the order does not exist, or the link's token/signature is not valid —
 * the caller shows the same 404 in every case so order ids cannot be probed.
 */
export async function getOrderForCustomer(orderId: string, access: OrderAccessQuery) {
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, history: { orderBy: [asc(orderStatusHistory.createdAt)] } },
  });
  if (!order || !checkOrderAccess(order.id, order.accessTokenHash, access)) return null;
  return order;
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>;
