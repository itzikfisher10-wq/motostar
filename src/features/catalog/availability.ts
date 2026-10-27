import { sql } from "drizzle-orm";
import { productVariants } from "@/lib/db/schema";

/** Max units of an untracked item a customer can put in the cart at once. */
export const UNTRACKED_MAX_QUANTITY = 10;

type VariantStock = { isAvailable: boolean; inventoryTracked: boolean; stockQuantity: number | null };

/** The single definition of "can be bought right now". Keep the SQL version below in sync. */
export function isVariantAvailable(v: VariantStock): boolean {
  if (!v.isAvailable) return false;
  if (!v.inventoryTracked) return true;
  return (v.stockQuantity ?? 0) > 0;
}

export function maxPurchasable(v: VariantStock): number {
  if (!isVariantAvailable(v)) return 0;
  return v.inventoryTracked ? Math.min(v.stockQuantity ?? 0, 99) : UNTRACKED_MAX_QUANTITY;
}

export const variantAvailableSql = sql<boolean>`(${productVariants.isAvailable} and (not ${productVariants.inventoryTracked} or coalesce(${productVariants.stockQuantity}, 0) > 0))`;
