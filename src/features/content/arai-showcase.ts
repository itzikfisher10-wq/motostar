import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands, products } from "@/lib/db/schema";
import { araiHero, araiTour, type AraiHeroMedia } from "@/content/arai";
import { findProducts, loadCards } from "@/features/catalog/queries";
import { getContent } from "@/features/content/blocks";
import type { ProductCardData } from "@/features/catalog/types";

export type ShowcaseStop = {
  key: string;
  label: string;
  title: string;
  body: string;
  products: ProductCardData[];
};

export type AraiShowcase = {
  hero: typeof araiHero & { product: ProductCardData | null; media: AraiHeroMedia };
  stops: ShowcaseStop[];
  all: ProductCardData[];
};

export async function getAraiShowcase(): Promise<AraiShowcase> {
  const slugs = [...new Set([...araiTour.flatMap((s) => s.productSlugs), ...(araiHero.media.type === "product" ? [araiHero.media.productSlug] : [])])];
  const rows = await db.select({ id: products.id, slug: products.slug }).from(products).where(and(inArray(products.slug, slugs), eq(products.status, "ACTIVE")));
  const cards = await loadCards(rows.map((r) => r.id));
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  const stops = araiTour
    .map((s) => ({ key: s.key, label: s.label, title: s.title, body: s.body, products: s.productSlugs.map((slug) => bySlug.get(slug)).filter((p): p is ProductCardData => !!p && !!p.image) }))
    .filter((s) => s.products.length > 0);

  const araiBrand = await db.query.brands.findFirst({ where: eq(brands.slug, "arai"), columns: { id: true } });
  const all = araiBrand ? (await findProducts({ brandSlug: "arai", pageSize: 24 })).items : [];

  const copy = await getContent("araiHero");
  return {
    hero: { ...araiHero, ...copy, product: araiHero.media.type === "product" ? bySlug.get(araiHero.media.productSlug) ?? null : null },
    stops,
    all,
  };
}
