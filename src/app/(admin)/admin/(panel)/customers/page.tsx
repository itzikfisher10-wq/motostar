import type { Metadata } from "next";
import Link from "next/link";
import { inputCls } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/listing/Pagination";
import { listCustomers } from "@/features/admin/customers/queries";
import { requireUser } from "@/features/auth/guard";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "לקוחות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeZone: "Asia/Jerusalem" });

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("customers:read");
  const q = await searchParams;
  const page = Number(q.page) || 1;
  const { rows, total, pageCount } = await listCustomers({ q: q.q?.slice(0, 100), page });

  return (
    <>
      <PageHeader title="לקוחות" />
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-[16rem] flex-1">
          <span className="text-sm font-medium">חיפוש</span>
          <input name="q" defaultValue={q.q} placeholder="שם, אימייל או טלפון" className={inputCls} />
        </label>
        <button type="submit" className="h-10 rounded-[var(--radius-control)] bg-ink px-4 text-sm font-semibold text-paper">
          חיפוש
        </button>
      </form>
      <p className="mb-2 text-sm text-steel">{total} לקוחות</p>
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-panel)] border border-line bg-paper p-8 text-center text-steel">{q.q ? "לא נמצאו לקוחות." : "לקוחות נוספים כאן אוטומטית כשמתבצעת הזמנה."}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-steel">
              <tr>
                {["לקוח", "טלפון", "הזמנות", "סכום ששולם", "דיוור", "מאז"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-mist">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">{c.firstName} {c.lastName}</Link>
                    <span className="block text-xs text-steel" dir="ltr">{c.email}</span>
                  </td>
                  <td className="px-4 py-2.5" dir="ltr">{c.phone}</td>
                  <td className="px-4 py-2.5 tabular">{c.orderCount}</td>
                  <td className="px-4 py-2.5 tabular">{formatPrice(c.paidTotal)}</td>
                  <td className="px-4 py-2.5">{c.marketingConsent ? "מאשר/ת" : "—"}</td>
                  <td className="px-4 py-2.5 text-steel tabular">{dateFmt.format(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} basePath="/admin/customers" params={{ q: q.q }} />
    </>
  );
}
