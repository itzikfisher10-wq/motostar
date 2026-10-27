import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { inputCls } from "@/components/admin/form";
import { Pagination } from "@/components/listing/Pagination";
import { listAdminOrders } from "@/features/admin/orders/queries";
import { requireUser } from "@/features/auth/guard";
import { formatOrderNumber, ORDER_STATUS_LABEL, type OrderStatus } from "@/features/orders/status";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "הזמנות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("orders:read");
  const q = await searchParams;
  const status = STATUSES.includes(q.status as OrderStatus) ? (q.status as OrderStatus) : undefined;
  const page = Number(q.page) || 1;
  const { rows, total, pageCount } = await listAdminOrders({ q: q.q?.slice(0, 100), status, page });

  return (
    <>
      <PageHeader title="הזמנות" />
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-[16rem] flex-1">
          <span className="text-sm font-medium">חיפוש</span>
          <input name="q" defaultValue={q.q} placeholder="מספר הזמנה, שם, אימייל או טלפון" className={inputCls} />
        </label>
        <label>
          <span className="text-sm font-medium">סטטוס</span>
          <select name="status" defaultValue={status ?? ""} className={inputCls}>
            <option value="">הכול</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-[var(--radius-control)] bg-ink px-4 text-sm font-semibold text-paper">
          סינון
        </button>
      </form>
      <p className="mb-2 text-sm text-steel">{total} הזמנות</p>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-panel)] border border-line bg-paper p-8 text-center text-steel">לא נמצאו הזמנות{q.q || status ? " שמתאימות לסינון" : ""}.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-steel">
              <tr>
                {["הזמנה", "נוצרה", "לקוח", "פריטים", "משלוח", "סטטוס", "סכום"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-mist">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline" dir="ltr">
                      {formatOrderNumber(o.number)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-steel tabular">{dateFmt.format(o.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {o.firstName} {o.lastName}
                    <span className="block text-xs text-steel" dir="ltr">
                      {o.email}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular">{o.itemCount}</td>
                  <td className="px-4 py-2.5">{o.shippingMethodName}</td>
                  <td className="px-4 py-2.5">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-2.5 font-medium tabular">{formatPrice(o.totalAgorot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} basePath="/admin/orders" params={{ q: q.q, status }} />
    </>
  );
}
