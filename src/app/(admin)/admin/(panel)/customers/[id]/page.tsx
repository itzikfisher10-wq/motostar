import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { getCustomer } from "@/features/admin/customers/queries";
import { requireUser } from "@/features/auth/guard";
import { formatOrderNumber } from "@/features/orders/status";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "לקוח" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeZone: "Asia/Jerusalem" });

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("customers:read");
  const data = await getCustomer((await params).id);
  if (!data) notFound();
  const { customer: c, orders } = data;
  const lastAddress = orders.find((o) => o.shippingAddress)?.shippingAddress;

  return (
    <>
      <PageHeader title={`${c.firstName} ${c.lastName}`} back={{ href: "/admin/customers", label: "לקוחות" }} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`הזמנות (${orders.length})`}>
          {orders.length === 0 ? (
            <p className="text-sm text-steel">אין הזמנות.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-4 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline" dir="ltr">{formatOrderNumber(o.number)}</Link>
                  <span className="text-steel tabular">{dateFmt.format(o.createdAt)}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="ms-auto tabular">{formatPrice(o.totalAgorot)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="פרטי קשר">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-steel">אימייל</dt><dd><a href={`mailto:${c.email}`} dir="ltr" className="underline-offset-4 hover:underline">{c.email}</a></dd></div>
            <div><dt className="text-steel">טלפון</dt><dd><a href={`tel:${c.phone}`} dir="ltr" className="underline-offset-4 hover:underline">{c.phone}</a></dd></div>
            <div><dt className="text-steel">דיוור שיווקי</dt><dd>{c.marketingConsent ? "אישר/ה קבלת עדכונים" : "לא אישר/ה"}</dd></div>
            {lastAddress && <div><dt className="text-steel">כתובת אחרונה</dt><dd>{lastAddress.street} {lastAddress.houseNumber}, {lastAddress.city}</dd></div>}
            <div><dt className="text-steel">לקוח מאז</dt><dd className="tabular">{dateFmt.format(c.createdAt)}</dd></div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
