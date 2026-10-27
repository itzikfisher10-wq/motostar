"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/format/money";
import { buttonClass } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { CartLineItem } from "./CartLineItem";
import { useCart } from "./CartProvider";

/** Slide-in cart. Opens without leaving the page; Esc / backdrop / close button dismiss it. */
export function CartDrawer() {
  const { cart, open, setOpen, update, pending, notice } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, setOpen]);

  if (!open) return null;

  const remainingForFree = cart.freeShippingOver !== null ? Math.max(0, cart.freeShippingOver - cart.subtotal) : null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="absolute inset-y-0 left-0 flex w-full max-w-[440px] flex-col bg-paper shadow-[0_0_60px_rgba(0,0,0,0.25)] animate-drawer-in"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="cart-title" className="font-display text-display-sm">
            הסל שלך
            {cart.itemCount > 0 && <span className="ms-2 font-sans text-base font-normal text-steel tabular">({cart.itemCount})</span>}
          </h2>
          <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="-me-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist" aria-label="סגירת הסל">
            <CloseIcon />
          </button>
        </header>

        {notice && <p className="border-b border-line bg-mist px-5 py-2.5 text-sm">{notice}</p>}

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-lg font-medium">הסל ריק.</p>
            <p className="text-steel">בחרו את האופנוע שלכם כדי לראות חלקים שמתאימים לו.</p>
            <Link href="/vehicles" className={buttonClass("dark", "md")}>
              לבחירת האופנוע
            </Link>
          </div>
        ) : (
          <>
            {remainingForFree !== null && (
              <div className="border-b border-line px-5 py-3 text-sm">
                {remainingForFree > 0 ? (
                  <p>
                    עוד <strong className="tabular">{formatPrice(remainingForFree)}</strong> למשלוח חינם
                  </p>
                ) : (
                  <p className="text-ok font-medium">ההזמנה זכאית למשלוח חינם</p>
                )}
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${Math.min(100, (cart.subtotal / cart.freeShippingOver!) * 100)}%` }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5" aria-busy={pending}>
              {cart.lines.map((line) => (
                <CartLineItem key={line.variantId} line={line} pending={pending} onChange={(q) => update(line.variantId, q)} />
              ))}
            </ul>
            <footer className="border-t border-line px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-steel">סכום ביניים</span>
                <span className="text-xl font-semibold tabular">{formatPrice(cart.subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-steel">המחירים כוללים מע״מ. דמי המשלוח יחושבו בשלב הבא.</p>
              <Link href="/checkout" className={buttonClass("primary", "lg", "mt-4 w-full")} aria-disabled={cart.subtotal === 0}>
                מעבר לתשלום
              </Link>
              <Link href="/cart" className="mt-2 flex h-11 w-full items-center justify-center text-sm font-medium underline-offset-4 hover:underline">
                לצפייה בסל המלא
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="mt-2 h-11 w-full text-sm font-medium underline-offset-4 hover:underline">
                המשך קנייה
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
