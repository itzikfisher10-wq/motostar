"use server";

import { z } from "zod";
import { buildCartView, getOrCreateCartId, readCartId, setLineQuantity, type CartMutation } from "./service";

const lineInput = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(0).max(99),
});

export async function addToCartAction(input: { variantId: string; quantity: number }): Promise<CartMutation> {
  const parsed = lineInput.safeParse(input);
  if (!parsed.success || parsed.data.quantity < 1) return { ok: false, error: "בקשה לא תקינה.", cart: await buildCartView(await readCartId()) };
  const cartId = await getOrCreateCartId();
  return setLineQuantity(cartId, parsed.data.variantId, parsed.data.quantity, "add");
}

export async function updateCartLineAction(input: { variantId: string; quantity: number }): Promise<CartMutation> {
  const parsed = lineInput.safeParse(input);
  const cartId = await readCartId();
  if (!parsed.success || !cartId) return { ok: false, error: "בקשה לא תקינה.", cart: await buildCartView(cartId) };
  return setLineQuantity(cartId, parsed.data.variantId, parsed.data.quantity, "set");
}
