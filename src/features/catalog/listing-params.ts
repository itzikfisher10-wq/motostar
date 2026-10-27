import { z } from "zod";
import type { ProductFilters, ProductSort } from "./types";

/** URL search params ↔ listing filters. Invalid values are ignored, never trusted. */
const schema = z.object({
  sort: z.enum(["featured", "price-asc", "price-desc", "newest"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  available: z.literal("1").optional().catch(undefined),
  sale: z.literal("1").optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  year: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
});

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseListingParams(raw: RawSearchParams) {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const p = schema.parse(flat);
  const filters: ProductFilters = {
    sort: p.sort as ProductSort | undefined,
    page: p.page,
    onlyAvailable: p.available === "1",
    onSale: p.sale === "1",
    minPrice: p.min !== undefined ? p.min * 100 : undefined,
    maxPrice: p.max !== undefined ? p.max * 100 : undefined,
    year: p.year,
    query: p.q || undefined,
  };
  /** Any parameter other than page/q/year makes this a filtered (non-canonical) view. */
  const isFiltered = !!(p.sort || p.available || p.sale || p.min !== undefined || p.max !== undefined);
  return { filters, params: p, isFiltered };
}

export const SORT_LABELS: Record<ProductSort, string> = {
  featured: "מומלץ",
  "price-asc": "מחיר: מהנמוך לגבוה",
  "price-desc": "מחיר: מהגבוה לנמוך",
  newest: "חדש באתר",
};
