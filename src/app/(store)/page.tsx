import type { Metadata } from "next";
import { AraiExperience } from "@/components/home/AraiExperience";
import { HelmetHero } from "@/components/home/helmet3d/HelmetHero";
import { closing, deals as dealsCopy, homeHero, manifesto, shelf } from "@/content/home";
import { AraiRail } from "@/components/home/AraiRail";
import { ClosingPlate } from "@/components/home/ClosingPlate";
import { Manifesto } from "@/components/home/Manifesto";
import { ShelfPan, type ShelfItem } from "@/components/home/ShelfPan";
import { ProductRail } from "@/components/home/ProductRail";
import { VehicleBand } from "@/components/home/VehicleBand";
import { WorkshopStrip } from "@/components/home/WorkshopStrip";
import { site } from "@/config/site";
import { findProducts, getCategoryTree, getVehicleTree } from "@/features/catalog/queries";
import { getAraiShowcase } from "@/features/content/arai-showcase";
import { siteUrl } from "@/lib/seo/metadata";

/**
 * Home page. Section order follows the scroll brief (docs/home-brief.md); copy lives in
 * src/content/home.ts. Every count, model and example product comes from the live catalog.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: siteUrl("/") },
  openGraph: { type: "website", url: siteUrl("/"), siteName: site.name, locale: site.locale, title: `חלקי חילוף לאופנועים וקטנועים בחולון | ${site.name}`, description: site.description },
};

export default async function HomePage() {
  const [arai, vehicles, categories, deals, all] = await Promise.all([
    getAraiShowcase(),
    getVehicleTree(),
    getCategoryTree(),
    findProducts({ onSale: true, onlyAvailable: true, pageSize: 12 }),
    findProducts({ pageSize: 1 }),
  ]);
  const totalProducts = all.total;

  // Hero facts come from the live catalog, so they are always true.
  const makes = vehicles.filter((m) => m.models.some((x) => x.productCount > 0)).map((m) => m.name);
  const listFormat = new Intl.ListFormat("he", { style: "long", type: "conjunction" });
  const heroBody = homeHero.body.replace("{count}", String(totalProducts)).replace("{makes}", listFormat.format(makes));

  // The shelf: leaf categories with at least two products, largest first, each with one real product.
  const leaves = categories.flatMap((c) => (c.children.length ? c.children : [c])).filter((c) => c.productCount >= 2);
  leaves.sort((a, b) => b.productCount - a.productCount);
  // Fetched in parallel, then each category takes the first product not already shown, so a
  // product filed under two categories never appears twice on the shelf.
  const candidates = await Promise.all(leaves.slice(0, 8).map((c) => findProducts({ categorySlug: c.slug, pageSize: 8 })));
  const used = new Set<string>();
  const shelfItems: ShelfItem[] = [];
  leaves.slice(0, 8).forEach((c, i) => {
    const example = candidates[i]!.items.find((p) => p.image && !used.has(p.id));
    if (!example?.image) return;
    used.add(example.id);
    shelfItems.push({ slug: c.slug, name: c.name, count: c.productCount, example: { title: example.title, image: { url: example.image.url, alt: example.image.alt } } });
  });

  return (
    <>
      <HelmetHero {...homeHero} body={heroBody} />
      <Manifesto title={manifesto.title} lines={manifesto.lines} />
      <ShelfPan copy={shelf} items={shelfItems} />
      {/* The store's main task: parts that fit the visitor's bike. */}
      <VehicleBand tree={vehicles} />
      <AraiExperience data={arai} />
      <AraiRail products={arai.all} />
      <ProductRail id="deals-title" title={dealsCopy.title} intro={dealsCopy.intro} products={deals.items} href="/deals" hrefLabel={`לכל המבצעים (${deals.total})`} />
      <WorkshopStrip />
      <ClosingPlate copy={closing} />
    </>
  );
}
