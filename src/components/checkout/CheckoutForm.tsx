"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import { placeOrderAction, quoteAction, type Quote } from "@/features/checkout/actions";
import type { ShippingOption } from "@/features/checkout/shipping";
import type { CartView } from "@/features/cart/types";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/format/money";
import { Button } from "@/components/ui/Button";

type Props = { cart: CartView; methods: ShippingOption[]; testMode: boolean };

const listFormat = new Intl.ListFormat("he", { style: "long", type: "disjunction" });

const inputCls = "mt-1.5 h-12 w-full rounded-[var(--radius-control)] border border-line bg-paper px-3.5 text-[1rem] outline-none transition-colors focus:border-ink aria-[invalid=true]:border-signal";

/** One-page checkout: contact → delivery → summary → secure payment page. */
export function CheckoutForm({ cart, methods, testMode }: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState(methods[0]?.code ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Stays true after a successful submit, so the button cannot be pressed again while the browser navigates.
  const [leaving, setLeaving] = useState(false);
  const selected = methods.find((m) => m.code === method);

  useEffect(() => {
    if (!method) return;
    let alive = true;
    void quoteAction(method).then((q) => alive && setQuote(q));
    return () => {
      alive = false;
    };
  }, [method]);

  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const input = {
      idempotencyKey,
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      shippingMethodCode: method,
      address: selected?.requiresAddress ? { city: get("city"), street: get("street"), houseNumber: get("houseNumber"), apartment: get("apartment") || undefined, zip: get("zip") || undefined, notes: get("notes") || undefined } : undefined,
      customerNote: get("customerNote") || undefined,
      marketingConsent: fd.get("marketingConsent") === "on",
      termsAccepted: (fd.get("termsAccepted") === "on") as true,
    };
    setFormError(null);
    start(async () => {
      const res = await placeOrderAction(input);
      if (res.ok) {
        setLeaving(true);
        window.location.assign(res.redirectUrl);
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error);
      const first = Object.keys(res.fieldErrors ?? {})[0];
      if (first) document.querySelector<HTMLElement>(`[name="${first.replace("address.", "")}"]`)?.focus();
    });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
    >
      <div className="space-y-12">
        {testMode && (
          <p className="rounded-[var(--radius-control)] border-2 border-dashed border-warn bg-[#fff8ec] px-4 py-3 text-sm font-medium text-warn" role="note">
            מצב בדיקה: ספק סליקה אמיתי עדיין לא חובר. ההזמנה תיווצר, אבל לא יבוצע חיוב.
          </p>
        )}
        <fieldset>
          <legend className="font-display text-display-sm">פרטי התקשרות</legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field name="firstName" label="שם פרטי" autoComplete="given-name" errors={errors} />
            <Field name="lastName" label="שם משפחה" autoComplete="family-name" errors={errors} />
            <Field name="email" label="אימייל" type="email" autoComplete="email" inputMode="email" dir="ltr" errors={errors} hint="אישור ההזמנה יישלח לכתובת הזו" />
            <Field name="phone" label="טלפון נייד" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" errors={errors} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-display-sm">משלוח</legend>
          {methods.length === 0 ? (
            <p className="mt-4 text-signal">אין כרגע שיטות משלוח פעילות. התקשרו אלינו להשלמת ההזמנה.</p>
          ) : (
            <div className="mt-5 space-y-3" role="radiogroup" aria-label="שיטת משלוח">
              {methods.map((m) => {
                const cost = quote && m.code === method ? quote.shipping : m.freeOverAgorot !== null && cart.subtotal >= m.freeOverAgorot ? 0 : m.priceAgorot;
                return (
                  <label key={m.code} className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-panel)] border p-4 transition-colors ${method === m.code ? "border-ink bg-mist" : "border-line hover:border-steel"}`}>
                    <input type="radio" name="shippingMethodCode" value={m.code} checked={method === m.code} onChange={() => setMethod(m.code)} className="mt-1 h-4 w-4 accent-ink" />
                    <span className="flex-1">
                      <span className="flex justify-between gap-3 font-medium">
                        <span>{m.name}</span>
                        <span className="tabular">{cost === 0 ? "ללא עלות" : formatPrice(cost)}</span>
                      </span>
                      {(m.etaText || m.description) && <span className="mt-1 block text-sm text-steel">{[m.etaText, m.description].filter(Boolean).join(". ")}</span>}
                      {m.freeOverAgorot !== null && cost > 0 && <span className="mt-1 block text-sm text-steel">חינם בהזמנה מעל {formatPrice(m.freeOverAgorot)}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {selected?.requiresAddress && (
            <div className="mt-6 grid gap-4 sm:grid-cols-6">
              <Field name="city" label="עיר" autoComplete="address-level2" errors={errors} errorKey="address.city" className="sm:col-span-3" />
              <Field name="street" label="רחוב" autoComplete="address-line1" errors={errors} errorKey="address.street" className="sm:col-span-3" />
              <Field name="houseNumber" label="מספר בית" errors={errors} errorKey="address.houseNumber" className="sm:col-span-2" inputMode="numeric" />
              <Field name="apartment" label="דירה (לא חובה)" errors={errors} errorKey="address.apartment" className="sm:col-span-2" required={false} />
              <Field name="zip" label="מיקוד (לא חובה)" errors={errors} errorKey="address.zip" className="sm:col-span-2" inputMode="numeric" dir="ltr" required={false} autoComplete="postal-code" />
              <Field name="notes" label="הערות לשליח (לא חובה)" errors={errors} errorKey="address.notes" className="sm:col-span-6" required={false} />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-display text-display-sm">תשלום</legend>
          <p className="mt-4 leading-relaxed text-steel">
            אחרי אישור ההזמנה תועברו לדף תשלום מאובטח של חברת הסליקה. אמצעי תשלום: {listFormat.format(site.paymentMethods)}. פרטי הכרטיס לא נשמרים אצלנו.
          </p>
          <label className="mt-6 block">
            <span className="text-sm font-medium">הערה להזמנה (לא חובה)</span>
            <textarea name="customerNote" rows={3} maxLength={500} className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-paper p-3 outline-none focus:border-ink" />
          </label>
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[var(--radius-panel)] bg-mist p-6">
          <h2 className="font-display text-display-sm">סיכום הזמנה</h2>
          <ul className="mt-5 divide-y divide-line">
            {cart.lines.filter((l) => l.available).map((l) => (
              <li key={l.variantId} className="flex gap-3 py-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-paper">
                  {l.image && <Image src={l.image.url} alt="" fill sizes="64px" className="object-contain p-1.5" />}
                  <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.7rem] font-semibold text-paper tabular">{l.quantity}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-2">{l.productTitle}</span>
                  {l.variantTitle && <span className="block text-steel">{l.variantTitle}</span>}
                </span>
                <span className="text-sm font-medium tabular">{formatPrice(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {cart.hasUnavailable && <p className="mt-3 text-sm text-signal">מוצרים שאזלו לא ייכללו בהזמנה. <Link href="/cart" className="underline">עדכון הסל</Link></p>}
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>סכום ביניים</dt><dd className="tabular">{formatPrice(quote?.subtotal ?? cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>משלוח</dt><dd className="tabular">{quote ? (quote.shipping === 0 ? "ללא עלות" : formatPrice(quote.shipping)) : "…"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>סה״כ לתשלום</dt><dd className="tabular">{formatPrice(quote?.total ?? cart.subtotal)}</dd></div>
          </dl>
          <p className="mt-1 text-xs text-steel">המחירים כוללים מע״מ.</p>

          <label className="mt-6 flex items-start gap-3 text-sm">
            <input type="checkbox" name="termsAccepted" className="mt-0.5 h-4 w-4 accent-ink" aria-invalid={!!errors.termsAccepted} aria-describedby={errors.termsAccepted ? "terms-error" : undefined} />
            <span>קראתי ואני מסכים/ה ל<Link href="/info/terms" target="_blank" className="underline underline-offset-2">תנאי השימוש</Link> ול<Link href="/info/shipping" target="_blank" className="underline underline-offset-2">מדיניות המשלוחים וההחזרות</Link></span>
          </label>
          {errors.termsAccepted && <p id="terms-error" className="mt-1 text-sm text-signal">{errors.termsAccepted}</p>}
          <label className="mt-3 flex items-start gap-3 text-sm text-steel">
            <input type="checkbox" name="marketingConsent" className="mt-0.5 h-4 w-4 accent-ink" />
            <span>אשמח לקבל עדכונים על מבצעים ומוצרים חדשים (אפשר להסיר בכל עת)</span>
          </label>

          {formError && <p role="alert" className="mt-5 rounded-[var(--radius-control)] bg-paper px-4 py-3 text-sm text-signal">{formError}</p>}
          <Button type="submit" variant="primary" size="lg" className="mt-6 w-full" disabled={pending || leaving || methods.length === 0 || cart.subtotal === 0}>
            {pending ? "יוצרים את ההזמנה…" : leaving ? "עוברים לדף התשלום…" : "המשך לתשלום מאובטח"}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function Field({ name, label, errors, errorKey, hint, className = "", required = true, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; errors: Record<string, string>; errorKey?: string; hint?: string }) {
  const id = useId();
  const error = errors[errorKey ?? name];
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} name={name} required={required} aria-required={required} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} className={inputCls} {...input} />
      {error ? <p id={`${id}-err`} className="mt-1 text-sm text-signal">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-steel">{hint}</p> : null}
    </div>
  );
}
