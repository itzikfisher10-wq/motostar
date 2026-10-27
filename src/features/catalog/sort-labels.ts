import type { ProductSort } from "./types";

/** Labels for the sort control. Kept free of zod so it can be imported by client components. */
export const SORT_LABELS: Record<ProductSort, string> = {
  featured: "מומלץ",
  "price-asc": "מחיר: מהנמוך לגבוה",
  "price-desc": "מחיר: מהגבוה לנמוך",
  newest: "חדש באתר",
};
