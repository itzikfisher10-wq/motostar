import type { Metadata } from "next";
import { AraiExperience } from "@/components/home/AraiExperience";
import { HelmetHero } from "@/components/home/helmet3d/HelmetHero";
import { homeHero } from "@/content/home";
import { AraiRail } from "@/components/home/AraiRail";
import { CategoryIndex } from "@/components/home/CategoryIndex";
import { ProductRail } from "@/components/home/ProductRail";
import { VehicleBand } from "@/components/home/VehicleBand";
import { WorkshopStrip } from "@/components/home/WorkshopStrip";
import { site } from "@/config/site";
import { findProducts, getCategoryTree, getVehicleTree } from "@/features/catalog/queries";
import { getAraiShowcase } from "@/features/content/arai-showcase";
import { siteUrl } from "@/lib/seo/metadata";

/** Home page. Edit section order here; section copy lives in each component / src/content. */
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: siteUrl("/") },
  openGraph: { type: "website", url: siteUrl("/"), siteName: site.name, locale: site.locale, title: `${site.name} | חלקי חילוף, אביזרים וציוד רכיבה`, description: site.description },
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

  return (
    <>
      <HelmetHero {...homeHero} body={heroBody} />
      <AraiExperience data={arai} />
      <AraiRail products={arai.all} />
      <VehicleBand tree={vehicles} />
      <CategoryIndex categories={categories} />
      <ProductRail id="deals-title" title="מבצעים שרצים עכשיו" intro="מחיר מבצע מול המחיר הרגיל, כפי שמופיע בקטלוג." products={deals.items} href="/deals" hrefLabel={`לכל המבצעים (${deals.total})`} />
      <WorkshopStrip />
    </>
  );
}
