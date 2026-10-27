import "server-only";
import { findProducts, getCategoryTree } from "@/features/catalog/queries";
import { normalizeForSearch } from "@/lib/text/search-normalize";

export type Suggestions = {
  products: { slug: string; title: string; price: number; image: string | null; available: boolean }[];
  categories: { slug: string; name: string }[];
};

/** Autocomplete: top products by relevance plus matching category names. */
export async function getSuggestions(query: string): Promise<Suggestions> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return { products: [], categories: [] };
  const [{ items }, tree] = await Promise.all([findProducts({ query: q, pageSize: 6 }), getCategoryTree()]);
  const needle = normalizeForSearch(q);
  const flat = tree.flatMap((c) => [c, ...c.children]);
  return {
    products: items.map((p) => ({ slug: p.slug, title: p.title, price: p.priceFrom, image: p.image?.url ?? null, available: p.isAvailable })),
    categories: flat.filter((c) => c.productCount > 0 && normalizeForSearch(c.name).includes(needle)).slice(0, 4).map((c) => ({ slug: c.slug, name: c.name })),
  };
}
