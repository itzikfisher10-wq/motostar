import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { shippingMethods } from "@/lib/db/schema";

export type ShippingOption = {
  code: string;
  name: string;
  description: string | null;
  etaText: string | null;
  priceAgorot: number;
  freeOverAgorot: number | null;
  requiresAddress: boolean;
};

/** Active methods only. Prices are managed in the admin (Settings → Shipping). */
export async function getActiveShippingMethods(): Promise<ShippingOption[]> {
  return db
    .select({
      code: shippingMethods.code,
      name: shippingMethods.name,
      description: shippingMethods.description,
      etaText: shippingMethods.etaText,
      priceAgorot: shippingMethods.priceAgorot,
      freeOverAgorot: shippingMethods.freeOverAgorot,
      requiresAddress: shippingMethods.requiresAddress,
    })
    .from(shippingMethods)
    .where(eq(shippingMethods.isActive, true))
    .orderBy(asc(shippingMethods.sortOrder));
}

/** Server-side shipping price. The client never supplies a shipping amount. */
export function shippingCost(method: Pick<ShippingOption, "priceAgorot" | "freeOverAgorot">, subtotalAgorot: number): number {
  if (method.freeOverAgorot !== null && subtotalAgorot >= method.freeOverAgorot) return 0;
  return method.priceAgorot;
}
