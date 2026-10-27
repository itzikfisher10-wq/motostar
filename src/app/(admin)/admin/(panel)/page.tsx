import type { Metadata } from "next";
import Link from "next/link";
import { count, eq, and, sql } from "drizzle-orm";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { getDashboardStats } from "@/features/admin/orders/queries";
import { requireUser } from "@/features/auth/guard";
import { formatOrderNumber } from "@/features/orders/status";
import { db } from "@/lib/db/client";
import { productVariants, products, shippingMethods } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format/money";
import { getPaymentProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "סקירה" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });

export default async function AdminDashboard() {
  await requireUser("orders:read");
  const [stats, [review], [outOfStock], [activeDelivery]] = await Promise.all([
    getDashboardStats(),
    db.select({ n: count() }).from(products).where(eq(products.needsReview, true)),
    db
      .select({ n: count() })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(products.status, "ACTIVE"), sql`(not ${productVariants.isAvailable} or (${productVariants.inventoryTracked} and coalesce(${productVariants.stockQuantity}, 0) <= 0))`)),
    db.select({ n: count() }).from(shippingMethods).where(and(eq(shippingMethods.isActive, true), eq(shippingMethods.requiresAddress, true))),
  ]);
  const provider = getPaymentProvider();

  const setup = [
    !provider.live && { text: "ספק סליקה אמיתי עדיין לא חובר. הקופה פועלת במצב בדיקה ולא גובה כסף.", href: null },
    !activeDelivery?.n && { text: "אין משלוח עד הבית פעיל. הגדירו מחירים והפעילו שיטת משלוח.", href: "/admin/shipping" },
  ].filter(Boolean) as { text: string; href: string | null }[];

  const tiles = [
    { label: "הזמנות לטיפול", value: String(stats.toHandle), href: "/admin/orders?status=PAID" },
    { label: "הכנסות ב-30 יום", value: formatPrice(stats.revenue30d), sub: `${stats.paidOrders30d} הזמנות ששולמו` },
    { label: "מוצרים לבדיקה ידנית", value: String(review?.n ?? 0), href: "/admin/products?review=1" },
    { label: "וריאציות שאזלו", value: String(outOfStock?.n ?? 0), href: "/admin/products?status=ACTIVE" },
  ];

  return (
    <>
      <PageHeader title="סקירה" />
      {setup.length > 0 && (
        <ul className="mb-6 space-y-2">
          {setup.map((s) => (
            <li key={s.text} className="rounded-[var(--radius-control)] border border-warn/30 bg-[#fdf6ea] px-4 py-3 text-sm text-warn">
              {s.text}{" "}
              {s.href && (
                <Link href={s.href} className="font-medium underline underline-offset-2">
                  להגדרה
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-paper p-5">
            <dt className="text-sm text-steel">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular">{t.href ? <Link href={t.href} className="hover:underline underline-offset-4">{t.value}</Link> : t.value}</dd>
            {t.sub && <dd className="mt-0.5 text-xs text-steel">{t.sub}</dd>}
          </div>
        ))}
      </dl>

      <section aria-labelledby="recent" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="recent" className="font-semibold">הזמנות אחרונות</h2>
          <Link href="/admin/orders" className="text-sm underline underline-offset-4">
            לכל ההזמנות
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className="mt-4 text-steel">עוד אין הזמנות. כשתתקבל הזמנה היא תופיע כאן.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-paper">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-steel">
                <tr className="text-start">
                  <th className="px-4 py-2.5 text-start font-medium">הזמנה</th>
                  <th className="px-4 py-2.5 text-start font-medium">לקוח</th>
                  <th className="px-4 py-2.5 text-start font-medium">סטטוס</th>
                  <th className="px-4 py-2.5 text-start font-medium">סכום</th>
                  <th className="px-4 py-2.5 text-start font-medium">נוצרה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-mist">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline" dir="ltr">
                        {formatOrderNumber(o.number)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{o.firstName} {o.lastName}</td>
                    <td className="px-4 py-2.5"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-2.5 tabular">{formatPrice(o.totalAgorot)}</td>
                    <td className="px-4 py-2.5 text-steel tabular">{dateFmt.format(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
