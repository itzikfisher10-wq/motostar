import { site } from "@/config/site";
import { formatOrderNumber } from "@/features/orders/status";
import { formatPrice } from "@/lib/format/money";

/** Plain, table-based RTL HTML that renders in every mail client. All dynamic text is escaped. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type OrderEmailData = {
  number: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  items: { productTitle: string; variantTitle: string | null; quantity: number; lineTotalAgorot: number }[];
  subtotalAgorot: number;
  shippingAgorot: number;
  totalAgorot: number;
  shippingMethodName: string;
  address: string | null;
  statusUrl: string;
};

export const orderLabel = formatOrderNumber;

function layout(title: string, inner: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden" dir="rtl">
<tr><td style="background:#000;color:#fff;padding:20px 28px;font-size:22px;font-weight:bold;letter-spacing:1px" dir="ltr" align="right">MOTO <span style="color:#e10600">★</span> STAR</td></tr>
<tr><td style="padding:28px">${inner}</td></tr>
<tr><td style="padding:18px 28px;background:#f4f4f2;color:#62676f;font-size:12px;line-height:1.6">${esc(site.name)} · ${esc(site.address.street)}, ${esc(site.address.city)} · ${esc(site.phone)} · ${esc(site.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(d: OrderEmailData) {
  const rows = d.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e3e3e0">${esc(i.productTitle)}${i.variantTitle ? `<br><span style="color:#62676f;font-size:13px">${esc(i.variantTitle)}</span>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #e3e3e0;text-align:center">${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #e3e3e0;text-align:left" dir="ltr">${esc(formatPrice(i.lineTotalAgorot))}</td></tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:16px">
<tr><th align="right" style="padding-bottom:6px;color:#62676f;font-weight:normal">מוצר</th><th style="padding-bottom:6px;color:#62676f;font-weight:normal">כמות</th><th align="left" style="padding-bottom:6px;color:#62676f;font-weight:normal">סה״כ</th></tr>${rows}
<tr><td colspan="2" style="padding-top:12px">סכום ביניים</td><td style="padding-top:12px;text-align:left" dir="ltr">${esc(formatPrice(d.subtotalAgorot))}</td></tr>
<tr><td colspan="2">משלוח (${esc(d.shippingMethodName)})</td><td style="text-align:left" dir="ltr">${d.shippingAgorot ? esc(formatPrice(d.shippingAgorot)) : "ללא עלות"}</td></tr>
<tr><td colspan="2" style="padding-top:8px;font-weight:bold;font-size:16px">סה״כ שולם</td><td style="padding-top:8px;text-align:left;font-weight:bold;font-size:16px" dir="ltr">${esc(formatPrice(d.totalAgorot))}</td></tr></table>`;
}

export function orderConfirmationEmail(d: OrderEmailData) {
  const subject = `ההזמנה ${orderLabel(d.number)} התקבלה ושולמה`;
  const html = layout(
    subject,
    `<h1 style="font-size:22px;margin:0 0 8px">תודה, ${esc(d.firstName)}!</h1>
<p style="margin:0 0 4px;line-height:1.6">התשלום על ההזמנה <strong>${orderLabel(d.number)}</strong> התקבל. נעדכן כשההזמנה תצא אליך.</p>
${itemsTable(d)}
<p style="margin:20px 0 4px;line-height:1.6"><strong>${esc(d.shippingMethodName)}</strong>${d.address ? `<br>${esc(d.address)}` : ""}</p>
<p style="margin:24px 0 0"><a href="${esc(d.statusUrl)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px">צפייה בסטטוס ההזמנה</a></p>
<p style="margin:20px 0 0;color:#62676f;font-size:13px;line-height:1.6">שאלה על ההזמנה? השיבו למייל הזה או כתבו לנו בוואטסאפ ${esc(site.phone)}.</p>`,
  );
  const text = `תודה ${d.firstName}! התשלום על ההזמנה ${orderLabel(d.number)} התקבל.\n\n${d.items.map((i) => `${i.productTitle}${i.variantTitle ? ` (${i.variantTitle})` : ""} × ${i.quantity}: ${formatPrice(i.lineTotalAgorot)}`).join("\n")}\n\nמשלוח: ${d.shippingMethodName} ${d.shippingAgorot ? formatPrice(d.shippingAgorot) : ""}\nסה״כ: ${formatPrice(d.totalAgorot)}\n\nסטטוס: ${d.statusUrl}\n\n${site.name} ${site.phone}`;
  return { to: d.email, subject, html, text };
}

export function storeNewOrderEmail(d: OrderEmailData, to: string, adminUrl: string) {
  const subject = `הזמנה חדשה ${orderLabel(d.number)}: ${formatPrice(d.totalAgorot)}`;
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px">הזמנה חדשה שולמה</h1>
<p style="margin:0;line-height:1.7">${esc(d.firstName)} ${esc(d.lastName)} · <span dir="ltr">${esc(d.phone)}</span> · ${esc(d.email)}<br>${esc(d.shippingMethodName)}${d.address ? `: ${esc(d.address)}` : ""}</p>
${itemsTable(d)}
<p style="margin:24px 0 0"><a href="${esc(adminUrl)}" style="display:inline-block;background:#e10600;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px">פתיחה בממשק הניהול</a></p>`,
  );
  const text = `הזמנה חדשה ${orderLabel(d.number)}\n${d.firstName} ${d.lastName} ${d.phone} ${d.email}\n${d.items.map((i) => `${i.productTitle} × ${i.quantity}`).join("\n")}\nסה״כ ${formatPrice(d.totalAgorot)}\n${adminUrl}`;
  return { to, subject, html, text };
}

export function orderShippedEmail(d: Pick<OrderEmailData, "number" | "firstName" | "email" | "statusUrl">, note?: string | null) {
  const subject = `ההזמנה ${orderLabel(d.number)} יצאה אליך`;
  const html = layout(subject, `<h1 style="font-size:22px;margin:0 0 8px">ההזמנה בדרך, ${esc(d.firstName)}</h1><p style="line-height:1.6">ההזמנה <strong>${orderLabel(d.number)}</strong> נשלחה.${note ? `<br>${esc(note)}` : ""}</p><p><a href="${esc(d.statusUrl)}" style="color:#000">צפייה בסטטוס ההזמנה</a></p>`);
  return { to: d.email, subject, html, text: `ההזמנה ${orderLabel(d.number)} נשלחה. ${note ?? ""}\n${d.statusUrl}` };
}
