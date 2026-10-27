import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, Panel, SelectField, SubmitButton, TextArea } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, OrderStatusBadge } from "@/components/admin/StatusBadge";
import { addOrderNoteAction, recheckPaymentAction, updateOrderStatusAction } from "@/features/admin/orders/actions";
import { getAdminOrder } from "@/features/admin/orders/queries";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";
import { formatOrderNumber, MANUAL_TRANSITIONS, ORDER_STATUS_LABEL } from "@/features/orders/status";
import { formatPrice } from "@/lib/format/money";

export const metadata: Metadata = { title: "הזמנה" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("orders:read");
  const data = await getAdminOrder((await params).id);
  if (!data) notFound();
  const { order, events, emails } = data;
  const transitions = MANUAL_TRANSITIONS[order.status].filter((s) => (s !== "CANCELLED" && s !== "REFUNDED") || can(user.role, "orders:cancel"));
  const canUpdate = can(user.role, "orders:update");
  const a = order.shippingAddress;

  return (
    <>
      <PageHeader title={`הזמנה ${formatOrderNumber(order.number)}`} back={{ href: "/admin/orders", label: "הזמנות" }} actions={<OrderStatusBadge status={order.status} />}>
        <p className="mt-2 text-sm text-steel">
          נוצרה {dateFmt.format(order.createdAt)}
          {order.paidAt && <> · שולמה {dateFmt.format(order.paidAt)}</>}
        </p>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="פריטים">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-mist">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {i.productId ? (
                      <Link href={`/admin/products/${i.productId}`} className="font-medium underline-offset-4 hover:underline">
                        {i.productTitle}
                      </Link>
                    ) : (
                      <span className="font-medium">{i.productTitle}</span>
                    )}
                    {i.variantTitle && <span className="block text-steel">{i.variantTitle}</span>}
                    {i.sku && (
                      <span className="block text-xs text-steel" dir="ltr">
                        {i.sku}
                      </span>
                    )}
                  </span>
                  <span className="text-sm tabular text-steel">
                    {i.quantity} × {formatPrice(i.unitPriceAgorot)}
                  </span>
                  <span className="w-24 text-end text-sm font-medium tabular">{formatPrice(i.lineTotalAgorot)}</span>
                </li>
              ))}
            </ul>
            <dl className="ms-auto mt-4 max-w-xs space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>סכום ביניים</dt><dd className="tabular">{formatPrice(order.subtotalAgorot)}</dd></div>
              <div className="flex justify-between"><dt>{order.shippingMethodName}</dt><dd className="tabular">{formatPrice(order.shippingAgorot)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>סה״כ</dt><dd className="tabular">{formatPrice(order.totalAgorot)}</dd></div>
            </dl>
          </Panel>

          <Panel title="היסטוריה">
            <ol className="space-y-3 text-sm">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-4">
                  <time className="w-28 shrink-0 text-steel tabular" dateTime={h.createdAt.toISOString()}>
                    {dateFmt.format(h.createdAt)}
                  </time>
                  <span>
                    {h.fromStatus === h.toStatus ? <span className="text-steel">הערה</span> : <strong className="font-medium">{ORDER_STATUS_LABEL[h.toStatus]}</strong>}
                    {h.note && <span className="block text-steel">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {canUpdate && (
              <ActionForm action={addOrderNoteAction.bind(null, order.id)} className="mt-5 space-y-2 border-t border-line pt-4">
                <TextArea label="הערה פנימית" name="note" rows={2} hint="לא מוצגת ללקוח" />
                <SubmitButton variant="outline">הוספת הערה</SubmitButton>
              </ActionForm>
            )}
          </Panel>

          <Panel title="תשלום" description={`ספק: ${order.paymentProvider}`}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-steel">סטטוס תשלום</dt><dd>{order.paymentStatus === "PAID" ? "שולם" : order.paymentStatus === "FAILED" ? "נכשל" : order.paymentStatus === "REFUNDED" ? "זוכה" : "לא שולם"}</dd></div>
              <div><dt className="text-steel">מזהה עסקה</dt><dd dir="ltr" className="truncate text-end">{order.paymentTransactionId ?? "—"}</dd></div>
            </dl>
            {events.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-steel">
                {events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span>{e.kind} · {e.outcome}{!e.signatureValid && " · חתימה לא תקינה"}</span>
                    <span className="tabular">{dateFmt.format(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {canUpdate && order.status === "PENDING_PAYMENT" && (
              <ActionForm action={recheckPaymentAction.bind(null, order.id)} className="mt-4 space-y-2">
                <SubmitButton variant="outline" pendingLabel="בודק…">בדיקת התשלום מול חברת הסליקה</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {canUpdate && (
            <Panel title="עדכון סטטוס">
              {transitions.length === 0 ? (
                <p className="text-sm text-steel">אין שינויי סטטוס זמינים להזמנה במצב הזה.</p>
              ) : (
                <ActionForm action={updateOrderStatusAction.bind(null, order.id)} className="space-y-3">
                  <SelectField label="סטטוס חדש" name="toStatus" defaultValue={transitions[0]}>
                    {transitions.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </SelectField>
                  <TextArea label="הערה (לא חובה)" name="note" rows={2} hint="למשל מספר משלוח. נשלחת ללקוח רק במייל &quot;נשלחה&quot;." />
                  <CheckboxField label="לשלוח ללקוח מייל כשההזמנה נשלחה" name="notifyCustomer" defaultChecked />
                  <SubmitButton>עדכון</SubmitButton>
                </ActionForm>
              )}
            </Panel>
          )}

          <Panel title="לקוח">
            <p className="font-medium">{order.firstName} {order.lastName}</p>
            <p className="mt-1 text-sm"><a href={`mailto:${order.email}`} dir="ltr" className="underline-offset-4 hover:underline">{order.email}</a></p>
            <p className="text-sm"><a href={`tel:${order.phone}`} dir="ltr" className="underline-offset-4 hover:underline">{order.phone}</a></p>
            {order.customerId && <Link href={`/admin/customers/${order.customerId}`} className="mt-2 inline-block text-sm underline underline-offset-4">כרטיס לקוח</Link>}
            {order.customerNote && <p className="mt-3 rounded-md bg-mist p-3 text-sm">{order.customerNote}</p>}
          </Panel>

          <Panel title="משלוח">
            <p className="text-sm font-medium">{order.shippingMethodName}</p>
            {a ? (
              <address className="mt-1 text-sm not-italic">
                {a.street} {a.houseNumber}{a.apartment ? `, דירה ${a.apartment}` : ""}<br />
                {a.city}{a.zip ? ` ${a.zip}` : ""}
                {a.notes && <span className="mt-1 block text-steel">{a.notes}</span>}
              </address>
            ) : (
              <p className="mt-1 text-sm text-steel">איסוף עצמי</p>
            )}
          </Panel>

          {emails.length > 0 && (
            <Panel title="מיילים">
              <ul className="space-y-2 text-sm">
                {emails.map((e) => (
                  <li key={e.id}>
                    <span className="block">{e.subject}</span>
                    <span className="flex gap-2 text-xs text-steel"><span dir="ltr">{e.to}</span><Badge tone={e.status === "SENT" ? "ok" : e.status === "FAILED" ? "bad" : "muted"}>{e.status === "SENT" ? "נשלח" : e.status === "FAILED" ? "נכשל" : "ממתין"}</Badge></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
