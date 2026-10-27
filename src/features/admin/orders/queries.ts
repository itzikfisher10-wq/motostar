import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, emailOutbox, orderStatusHistory, orders, paymentEvents, users } from "@/lib/db/schema";
import type { OrderStatus } from "@/features/orders/status";

export const ORDERS_PAGE_SIZE = 30;

export async function listAdminOrders(f: { q?: string; status?: OrderStatus; page?: number }) {
  const where: SQL[] = [];
  if (f.status) where.push(eq(orders.status, f.status));
  if (f.q) {
    const q = f.q.trim();
    const num = q.replace(/^ms-?/i, "");
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(orders.email, like), ilike(orders.phone, like), ilike(sql`${orders.firstName} || ' ' || ${orders.lastName}`, like), ...(/^\d+$/.test(num) ? [eq(orders.number, Number(num))] : []))!);
  }
  const cond = where.length ? and(...where) : undefined;
  const page = Math.max(1, f.page ?? 1);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        firstName: orders.firstName,
        lastName: orders.lastName,
        email: orders.email,
        totalAgorot: orders.totalAgorot,
        shippingMethodName: orders.shippingMethodName,
        createdAt: orders.createdAt,
        itemCount: sql<number>`(select coalesce(sum(quantity), 0)::int from order_items oi where oi.order_id = ${orders.id})`,
      })
      .from(orders)
      .where(cond)
      .orderBy(desc(orders.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset((page - 1) * ORDERS_PAGE_SIZE),
    db.select({ n: count() }).from(orders).where(cond),
  ]);
  return { rows, total: total?.n ?? 0, page, pageCount: Math.max(1, Math.ceil((total?.n ?? 0) / ORDERS_PAGE_SIZE)) };
}

export async function getAdminOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: true, history: { orderBy: [asc(orderStatusHistory.createdAt)] } } });
  if (!order) return null;
  const [events, emails, audit] = await Promise.all([
    db.select({ id: paymentEvents.id, kind: paymentEvents.kind, outcome: paymentEvents.outcome, signatureValid: paymentEvents.signatureValid, createdAt: paymentEvents.createdAt }).from(paymentEvents).where(eq(paymentEvents.orderId, id)).orderBy(asc(paymentEvents.createdAt)),
    db.select({ id: emailOutbox.id, to: emailOutbox.to, subject: emailOutbox.subject, status: emailOutbox.status, createdAt: emailOutbox.createdAt }).from(emailOutbox).where(eq(emailOutbox.relatedOrderId, id)).orderBy(asc(emailOutbox.createdAt)),
    db.select({ action: auditLog.action, data: auditLog.data, createdAt: auditLog.createdAt, user: users.name }).from(auditLog).leftJoin(users, eq(users.id, auditLog.userId)).where(and(eq(auditLog.entity, "order"), eq(auditLog.entityId, id))).orderBy(asc(auditLog.createdAt)),
  ]);
  return { order, events, emails, audit };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/** Figures for the admin overview. Revenue counts verified payments only. */
export async function getDashboardStats() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [[toHandle], [revenue], recent] = await Promise.all([
    db.select({ n: count() }).from(orders).where(inArray(orders.status, ["PAID", "PROCESSING"])),
    db
      .select({ total: sql<number>`coalesce(sum(${orders.totalAgorot}), 0)::int`, n: count() })
      .from(orders)
      .where(and(eq(orders.paymentStatus, "PAID"), gte(orders.paidAt, since))),
    db
      .select({ id: orders.id, number: orders.number, status: orders.status, firstName: orders.firstName, lastName: orders.lastName, totalAgorot: orders.totalAgorot, createdAt: orders.createdAt })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(8),
  ]);
  return { toHandle: toHandle?.n ?? 0, revenue30d: revenue?.total ?? 0, paidOrders30d: revenue?.n ?? 0, recent };
}
