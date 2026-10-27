import type { MetadataRoute } from "next";
import { getCategoryTree, getSitemapEntries } from "@/features/catalog/queries";
import { siteUrl } from "@/lib/seo/metadata";

export const revalidate = 3600;

/** Dynamic XML sitemap: static pages, active categories with products, brands and every active product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, categories, brands }, tree] = await Promise.all([getSitemapEntries(), getCategoryTree()]);
  // Empty categories are noindex, so they stay out of the sitemap.
  const withProducts = new Set(tree.flatMap((c) => [c, ...c.children]).filter((c) => c.productCount > 0).map((c) => c.slug));
  const staticPages = ["/", "/categories", "/products", "/deals", "/vehicles", "/brands", "/about", "/contact", "/info/shipping", "/info/buying-guide", "/info/terms", "/info/privacy", "/info/accessibility"];
  return [
    ...staticPages.map((p) => ({ url: siteUrl(p), changeFrequency: p === "/" ? ("daily" as const) : ("weekly" as const), priority: p === "/" ? 1 : 0.5 })),
    ...categories.filter((c) => withProducts.has(c.slug)).map((c) => ({ url: siteUrl(`/categories/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...brands.map((b) => ({ url: siteUrl(`/brands/${b.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: siteUrl(`/products/${encodeURIComponent(p.slug)}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
