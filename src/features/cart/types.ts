import type { ImageData } from "@/features/catalog/types";

export type CartLine = {
  variantId: string;
  productSlug: string;
  productTitle: string;
  /** Null for single-variant products. */
  variantTitle: string | null;
  sku: string | null;
  image: ImageData | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  available: boolean;
};

export type CartView = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  hasUnavailable: boolean;
  /** Lowest "free shipping over" threshold among active shipping methods, if any. */
  freeShippingOver: number | null;
};

export const EMPTY_CART: CartView = { lines: [], itemCount: 0, subtotal: 0, hasUnavailable: false, freeShippingOver: null };
