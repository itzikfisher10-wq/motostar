"use client";

import { BagIcon } from "@/components/ui/icons";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { cart, setOpen } = useCart();
  const count = cart.itemCount;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-graphite"
      aria-label={count ? `סל הקניות, ${count} פריטים` : "סל הקניות, ריק"}
    >
      <BagIcon />
      {count > 0 && (
        <span className="absolute top-1 end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[0.7rem] font-semibold text-paper tabular" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
