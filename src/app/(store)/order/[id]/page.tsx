import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site, whatsappLink } from "@/config/site";
import { getOrderForCustomer } from "@/features/orders/queries";
import { formatOrderNumber, ORDER_STATUS_HELP, ORDER_STATUS_LABEL } from "@/features/orders/status";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "סטטוס הזמנה", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" });

/** Customer order page. Opened with the checkout token (?t=) or a signed email link (?e=&s=). */
export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const order = await getOrderForCustomer(id, { t: q.t, e: q.e, s: q.s });
  if (!order) notFound();

  const label = formatOrderNumber(order.number);
  const fresh = q.from === "checkout";
  const paid = order.paymentStatus === "PAID";
  const a = order.shippingAddress;

  return (
    <Container className="max-w-4xl py-10 lg:py-16">
      <p className="text-sm text-steel">הזמנה {label}</p>
      <h1 className="mt-2 font-display text-display-md">
        {fresh && paid ? `תודה ${order.firstName}, ההזמנה התקבלה` : fresh && order.status === "PAYMENT_FAILED" ? "התשלום לא הושלם" : `הזמנה ${label}`}
      </h1>

      <div className={`mt-6 rounded-[var(--radius-panel)] border p-5 ${paid ? "border-ok/30 bg-[#f1f8f3]" : order.status === "PAYMENT_FAILED" ? "border-signal/30 bg-[#fff3f2]" : "border-line bg-mist"}`} role="status">
        <p className="font-semibold">סטטוס: {ORDER_STATUS_LABEL[order.status]}</p>
        <p className="mt-1 text-steel">{ORDER_STATUS_HELP[order.status]}</p>
        {paid && <p className="mt-1 text-steel">אישור נשלח ל-<span dir="ltr">{order.email}</span>.</p>}
        {order.status === "PENDING_PAYMENT" && <p className="mt-1 text-steel">אם שילמתם זה עתה, רעננו את העמוד בעוד דקה.</p>}
      </div>

      {order.status === "PAYMENT_FAILED" && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/checkout" className={buttonClass("primary", "md")}>
            חזרה לקופה
          </Link>
          <a href={whatsappLink(`שלום, לגבי הזמנה ${label}`)} className={buttonClass("outline", "md")}>
            עזרה בוואטסאפ
          </a>
        </div>
      )}

      <section aria-labelledby="items-title" className="mt-12">
        <h2 id="items-title" className="font-display text-display-sm">פריטים</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-mist">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-contain p-1.5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{i.productTitle}</span>
                {i.variantTitle && <span className="block text-sm text-steel">{i.variantTitle}</span>}
                <span className="block text-sm text-steel tabular">
                  {i.quantity} × {formatPrice(i.unitPriceAgorot)}
                </span>
              </span>
              <span className="font-medium tabular">{formatPrice(i.lineTotalAgorot)}</span>
            </li>
          ))}
        </ul>
        <dl className="ms-auto mt-4 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><dt>סכום ביניים</dt><dd className="tabular">{formatPrice(order.subtotalAgorot)}</dd></div>
          <div className="flex justify-between"><dt>{order.shippingMethodName}</dt><dd className="tabular">{order.shippingAgorot ? formatPrice(order.shippingAgorot) : "ללא עלות"}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>סה״כ</dt><dd className="tabular">{formatPrice(order.totalAgorot)}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="delivery-title" className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 id="delivery-title" className="font-display text-display-sm">משלוח</h2>
          <p className="mt-3">{order.shippingMethodName}</p>
          {a ? (
            <p className="mt-1 text-steel">
              {a.street} {a.houseNumber}
              {a.apartment ? `/${a.apartment}` : ""}, {a.city}
            </p>
          ) : (
            <p className="mt-1 text-steel">
              {site.address.street}, {site.address.city}
            </p>
          )}
        </div>
        <div>
          <h2 className="font-display text-display-sm">היסטוריה</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {order.history.filter((h) => h.fromStatus !== h.toStatus).map((h) => (
              <li key={h.id} className="flex justify-between gap-4">
                <span>{ORDER_STATUS_LABEL[h.toStatus]}</span>
                <time className="text-steel tabular" dateTime={h.createdAt.toISOString()}>
                  {dateFmt.format(h.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <p className="mt-14 text-sm text-steel">
        שאלות על ההזמנה? <a href={`tel:${site.phoneE164}`} className="underline underline-offset-2">{site.phone}</a> או{" "}
        <a href={whatsappLink(`שלום, לגבי הזמנה ${label}`)} className="underline underline-offset-2">וואטסאפ</a>.
      </p>
    </Container>
  );
}
