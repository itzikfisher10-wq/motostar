import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { inputCls } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, ProductStatusBadge } from "@/components/admin/StatusBadge";
import { buttonClass } from "@/components/ui/Button";
import { Pagination } from "@/components/listing/Pagination";
import { listAdminProducts } from "@/features/admin/products/queries";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "מוצרים" };

const STATUSES = { ACTIVE: "פעיל", DRAFT: "טיוטה", ARCHIVED: "בארכיון" } as const;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("catalog:read");
  const q = await searchParams;
  const status = q.status && q.status in STATUSES ? (q.status as keyof typeof STATUSES) : undefined;
  const review = q.review === "1";
  const page = Number(q.page) || 1;
  const { rows, total, pageCount } = await listAdminProducts({ q: q.q?.slice(0, 100), status, review, page });

  return (
    <>
      <PageHeader
        title="מוצרים"
        actions={
          can(user.role, "catalog:write") && (
            <Link href="/admin/products/new" className={buttonClass("dark", "md")}>
              מוצר חדש
            </Link>
          )
        }
      />
      {q.deleted && <p role="status" className="mb-4 text-sm text-ok">המוצר נמחק.</p>}
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-[16rem] flex-1">
          <span className="text-sm font-medium">חיפוש</span>
          <input name="q" defaultValue={q.q} placeholder="שם, כתובת, מק״ט או ברקוד" className={inputCls} />
        </label>
        <label>
          <span className="text-sm font-medium">סטטוס</span>
          <select name="status" defaultValue={status ?? ""} className={inputCls}>
            <option value="">הכול</option>
            {Object.entries(STATUSES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="review" value="1" defaultChecked={review} className="h-4 w-4 accent-ink" />
          לבדיקה ידנית בלבד
        </label>
        <button type="submit" className="h-10 rounded-[var(--radius-control)] bg-ink px-4 text-sm font-semibold text-paper">
          סינון
        </button>
      </form>
      <p className="mb-2 text-sm text-steel">{total} מוצרים</p>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-panel)] border border-line bg-paper p-8 text-center text-steel">לא נמצאו מוצרים שמתאימים לסינון.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-steel">
              <tr>
                <th className="w-16 px-4 py-2.5"><span className="sr-only">תמונה</span></th>
                {["מוצר", "סטטוס", "מחיר", "וריאציות", "זמינות"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-mist">
                  <td className="px-4 py-2">
                    <span className="relative block h-12 w-12 overflow-hidden rounded-md bg-mist">{p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                    <span className="mt-0.5 flex gap-1.5">
                      {p.needsReview && <Badge tone="bad">לבדיקה</Badge>}
                      {p.onSale && <Badge tone="info">מבצע</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-2"><ProductStatusBadge status={p.status} /></td>
                  <td className="whitespace-nowrap px-4 py-2 tabular">{p.priceMin === p.priceMax ? formatPrice(p.priceMin) : `${formatPrice(p.priceMin)} – ${formatPrice(p.priceMax)}`}</td>
                  <td className="px-4 py-2 tabular">{p.variantCount}</td>
                  <td className="px-4 py-2">{p.availableCount === 0 ? <Badge tone="bad">אזל</Badge> : p.availableCount < p.variantCount ? <Badge tone="warn">{p.availableCount} מתוך {p.variantCount}</Badge> : <Badge tone="ok">זמין</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} basePath="/admin/products" params={{ q: q.q, status, review: review ? "1" : undefined }} />
    </>
  );
}
