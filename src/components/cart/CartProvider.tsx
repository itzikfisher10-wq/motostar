"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addToCartAction, updateCartLineAction } from "@/features/cart/actions";
import { EMPTY_CART, type CartView } from "@/features/cart/types";

type CartContextValue = {
  cart: CartView;
  ready: boolean;
  pending: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  notice: string | null;
  add: (variantId: string, quantity: number) => Promise<boolean>;
  update: (variantId: string, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((message: string | null) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    if (message) noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) setCart((await res.json()) as CartView);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    (variantId: string, quantity: number) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const result = await addToCartAction({ variantId, quantity });
          setCart(result.cart);
          say(result.ok ? "המוצר נוסף לסל." : result.error);
          setOpen(true);
          resolve(result.ok);
        });
      }),
    [say],
  );

  const update = useCallback(
    (variantId: string, quantity: number) =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          const result = await updateCartLineAction({ variantId, quantity });
          setCart(result.cart);
          say(result.ok ? (quantity === 0 ? "המוצר הוסר מהסל." : null) : result.error);
          resolve();
        });
      }),
    [say],
  );

  const value = useMemo(() => ({ cart, ready, pending, open, setOpen, notice, add, update, refresh }), [cart, ready, pending, open, notice, add, update, refresh]);
  return (
    <CartContext.Provider value={value}>
      {children}
      <p role="status" aria-live="polite" className="sr-only">
        {notice}
      </p>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
