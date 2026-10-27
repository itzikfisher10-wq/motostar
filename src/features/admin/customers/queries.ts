import "server-only";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, orders } from "@/lib/db/schema";

export const CUSTOMERS_PAGE_SIZE = 40;

/** Customers are created at checkout (one per email). Spend counts verified payments only. */
export async function listCustomers(f: { q?: string; page?: number }) {
  const like = f.q ? `%${f.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const cond = like ? or(ilike(customers.email, like), ilike(customers.phone, like), ilike(sql`${customers.firstName} || ' ' || ${customers.lastName}`, like)) : undefined;
  const page = Math.max(1, f.page ?? 1);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        marketingConsent: customers.marketingConsent,
        createdAt: customers.createdAt,
        orderCount: sql<number>`(select count(*)::int from ${orders} o where o.customer_id = ${customers.id})`,
        paidTotal: sql<number>`(select coalesce(sum(o.total_agorot), 0)::int from ${orders} o where o.customer_id = ${customers.id} and o.payment_status = 'PAID')`,
      })
      .from(customers)
      .where(cond)
      .orderBy(desc(customers.createdAt))
      .limit(CUSTOMERS_PAGE_SIZE)
      .offset((page - 1) * CUSTOMERS_PAGE_SIZE),
    db.select({ n: count() }).from(customers).where(cond),
  ]);
  return { rows, total: total?.n ?? 0, page, pageCount: Math.max(1, Math.ceil((total?.n ?? 0) / CUSTOMERS_PAGE_SIZE)) };
}

export async function getCustomer(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!customer) return null;
  const history = await db
    .select({ id: orders.id, number: orders.number, status: orders.status, totalAgorot: orders.totalAgorot, createdAt: orders.createdAt, shippingAddress: orders.shippingAddress })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt));
  return { customer, orders: history };
}
