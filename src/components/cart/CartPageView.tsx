"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format/money";
import { buttonClass } from "@/components/ui/Button";
import { CartLineItem } from "./CartLineItem";
import { useCart } from "./CartProvider";

/** Full-page cart (/cart). Same data and actions as the drawer. */
export function CartPageView() {
  const { cart, ready, pending, update, notice } = useCart();

  if (!ready) return <p className="py-20 text-center text-steel">טוען את הסל…</p>;

  if (cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium">הסל ריק.</p>
        <p className="mt-2 text-steel">בחרו את האופנוע שלכם כדי לראות חלקים שמתאימים לו.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/vehicles" className={buttonClass("dark", "md")}>
            לבחירת האופנוע
          </Link>
          <Link href="/products" className={buttonClass("outline", "md")}>
            לכל המוצרים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <div>
        {notice && <p className="mb-4 rounded-[var(--radius-control)] bg-mist px-4 py-2.5 text-sm">{notice}</p>}
        <ul className="divide-y divide-line border-y border-line" aria-busy={pending}>
          {cart.lines.map((line) => (
            <CartLineItem key={line.variantId} line={line} size="lg" pending={pending} onChange={(q) => update(line.variantId, q)} />
          ))}
        </ul>
      </div>
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[var(--radius-panel)] bg-mist p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-steel">סכום ביניים ({cart.itemCount} פריטים)</span>
            <span className="text-2xl font-semibold tabular">{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-steel">המחירים כוללים מע״מ. דמי המשלוח יחושבו בשלב הבא.</p>
          {cart.hasUnavailable && <p className="mt-3 text-sm text-signal">חלק מהמוצרים אינם זמינים בכמות שנבחרה ולא ייכללו בהזמנה.</p>}
          <Link href="/checkout" className={buttonClass("primary", "lg", "mt-5 w-full")}>
            מעבר לתשלום
          </Link>
          <Link href="/products" className="mt-2 flex h-11 items-center justify-center text-sm font-medium underline-offset-4 hover:underline">
            המשך קנייה
          </Link>
        </div>
      </aside>
    </div>
  );
}
