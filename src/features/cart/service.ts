import "server-only";
import { and, asc, eq, isNotNull, min, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { cartItems, carts, productImages, productVariants, products, shippingMethods } from "@/lib/db/schema";
import { sign, unsign } from "@/lib/security/signing";
import { isVariantAvailable, maxPurchasable } from "@/features/catalog/availability";
import { EMPTY_CART, type CartLine, type CartView } from "./types";

const COOKIE = "ms_cart";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days: the cart survives between visits.

export async function readCartId(): Promise<string | null> {
  const id = unsign((await cookies()).get(COOKIE)?.value);
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

export async function getOrCreateCartId(): Promise<string> {
  const existing = await readCartId();
  if (existing) {
    const found = await db.select({ id: carts.id }).from(carts).where(eq(carts.id, existing)).limit(1);
    if (found.length) return existing;
  }
  const [row] = await db.insert(carts).values({}).returning({ id: carts.id });
  (await cookies()).set(COOKIE, sign(row!.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return row!.id;
}

export async function clearCartCookie() {
  (await cookies()).delete(COOKIE);
}

/**
 * Builds the cart from the database. Prices and availability always come from
 * the current catalog, never from the client.
 */
export async function buildCartView(cartId: string | null): Promise<CartView> {
  const freeShippingOver = await getFreeShippingThreshold();
  if (!cartId) return { ...EMPTY_CART, freeShippingOver };

  const rows = await db
    .select({
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      productSlug: products.slug,
      productTitle: products.title,
      productStatus: products.status,
      variantTitle: productVariants.title,
      sku: productVariants.sku,
      priceAgorot: productVariants.priceAgorot,
      compareAtAgorot: productVariants.compareAtAgorot,
      isAvailable: productVariants.isAvailable,
      inventoryTracked: productVariants.inventoryTracked,
      stockQuantity: productVariants.stockQuantity,
      variantImageId: productVariants.imageId,
      productId: products.id,
      variantCount: sql<number>`(select count(*)::int from ${productVariants} v2 where v2.product_id = ${products.id})`,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.addedAt));

  if (!rows.length) return { ...EMPTY_CART, freeShippingOver };

  const images = await db
    .select({ id: productImages.id, productId: productImages.productId, url: productImages.url, alt: productImages.alt, width: productImages.width, height: productImages.height, position: productImages.position })
    .from(productImages)
    .where(sql`${productImages.productId} in ${[...new Set(rows.map((r) => r.productId))]}`)
    .orderBy(asc(productImages.position));

  const lines: CartLine[] = rows.map((r) => {
    const sellable = r.productStatus === "ACTIVE" && isVariantAvailable(r);
    const max = r.productStatus === "ACTIVE" ? maxPurchasable(r) : 0;
    const img = images.find((i) => i.id === r.variantImageId) ?? images.find((i) => i.productId === r.productId) ?? null;
    const quantity = r.quantity;
    return {
      variantId: r.variantId,
      productSlug: r.productSlug,
      productTitle: r.productTitle,
      variantTitle: r.variantCount > 1 ? r.variantTitle : null,
      sku: r.sku,
      image: img ? { url: img.url, alt: img.alt || r.productTitle, width: img.width, height: img.height } : null,
      unitPrice: r.priceAgorot,
      compareAt: r.compareAtAgorot,
      quantity,
      maxQuantity: max,
      lineTotal: r.priceAgorot * quantity,
      available: sellable && quantity <= max,
    };
  });

  const purchasable = lines.filter((l) => l.available);
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: purchasable.reduce((n, l) => n + l.lineTotal, 0),
    hasUnavailable: lines.some((l) => !l.available),
    freeShippingOver,
  };
}

async function getFreeShippingThreshold(): Promise<number | null> {
  const [row] = await db
    .select({ v: min(shippingMethods.freeOverAgorot) })
    .from(shippingMethods)
    .where(and(eq(shippingMethods.isActive, true), eq(shippingMethods.requiresAddress, true), isNotNull(shippingMethods.freeOverAgorot)));
  return row?.v ?? null;
}

export type CartMutation = { ok: true; cart: CartView } | { ok: false; error: string; cart: CartView };

export async function setLineQuantity(cartId: string, variantId: string, quantity: number, mode: "set" | "add"): Promise<CartMutation> {
  const [variant] = await db
    .select({
      id: productVariants.id,
      isAvailable: productVariants.isAvailable,
      inventoryTracked: productVariants.inventoryTracked,
      stockQuantity: productVariants.stockQuantity,
      status: products.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  const fail = async (error: string): Promise<CartMutation> => ({ ok: false, error, cart: await buildCartView(cartId) });
  if (!variant || variant.status !== "ACTIVE") return fail("המוצר אינו זמין יותר.");

  const [current] = await db.select({ q: cartItems.quantity }).from(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
  const target = mode === "add" ? (current?.q ?? 0) + quantity : quantity;

  if (target <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
    return { ok: true, cart: await buildCartView(cartId) };
  }
  const max = maxPurchasable(variant);
  if (max === 0) return fail("המוצר אזל מהמלאי.");
  if (target > max) {
    await upsertLine(cartId, variantId, max);
    return { ok: false, error: `אפשר להזמין עד ${max} יחידות מהמוצר הזה.`, cart: await buildCartView(cartId) };
  }
  await upsertLine(cartId, variantId, target);
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  return { ok: true, cart: await buildCartView(cartId) };
}

async function upsertLine(cartId: string, variantId: string, quantity: number) {
  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity } });
}

export async function emptyCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}
