import type { Metadata } from "next";
import { AraiExperience } from "@/components/home/AraiExperience";
import { AraiRail } from "@/components/home/AraiRail";
import { CategoryAccordion, type AccordionCategory } from "@/components/home/CategoryAccordion";
import { HelmetHero } from "@/components/home/helmet3d/HelmetHero";
import { ModelsMarquee } from "@/components/home/ModelsMarquee";
import { ProductRail } from "@/components/home/ProductRail";
import { VehicleFinder } from "@/components/home/VehicleFinder";
import { WorkshopStrip } from "@/components/home/WorkshopStrip";
import { CardIcon, ReturnIcon, StoreIcon, WrenchIcon } from "@/components/ui/icons";
import { categoriesBlock, deals as dealsCopy, homeHero, vehicleBand } from "@/content/home";
import { site, whatsappLink } from "@/config/site";
import { findProducts, getCategoryTree, getVehicleTree } from "@/features/catalog/queries";
import { getAraiShowcase } from "@/features/content/arai-showcase";
import { siteUrl } from "@/lib/seo/metadata";

/**
 * Home page. Layout modeled on the store's approved reference design: dark hero with glass
 * facts → "what do you ride?" → Arai → deals → categories → who we are.
 * Sections after the hero are rounded sheets that ride up over the one before ([data-sheet]).
 * Copy lives in src/content/home.ts. Every count, model and product comes from the live catalog;
 * every fact on the glass cards comes from src/config/site.ts.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: siteUrl("/") },
  openGraph: { type: "website", url: siteUrl("/"), siteName: site.name, locale: site.locale, title: `חלקי חילוף לאופנועים וקטנועים בחולון | ${site.name}`, description: site.description },
};

export default async function HomePage() {
  const [arai, vehicles, categories, deals, onSale, all] = await Promise.all([
    getAraiShowcase(),
    getVehicleTree(),
    getCategoryTree(),
    findProducts({ onSale: true, onlyAvailable: true, pageSize: 12 }),
    // Same filter as the /deals page, so the number on the button matches the page it opens.
    findProducts({ onSale: true, pageSize: 1 }),
    findProducts({ pageSize: 1 }),
  ]);

  // Hero facts come from the live catalog, so they are always true.
  const makes = vehicles.filter((m) => m.models.some((x) => x.productCount > 0)).map((m) => m.name);
  const listFormat = new Intl.ListFormat("he", { style: "long", type: "conjunction" });
  const heroBody = homeHero.body.replace("{count}", String(all.total)).replace("{makes}", listFormat.format(makes));

  const trust = [
    { icon: <StoreIcon size={20} />, title: "איסוף עצמי בחולון", note: `${site.address.street}, בתיאום` },
    { icon: <ReturnIcon size={20} />, title: `החזרה תוך ${site.returnsDays} יום`, note: "ממועד קבלת המוצר" },
    { icon: <CardIcon size={20} />, title: "תשלום מאובטח", note: `ב${site.paymentMethods.join(", ")}` },
    { icon: <WrenchIcon size={20} />, title: "ייעוץ ממוסכניקים", note: "בוואטסאפ ובטלפון" },
  ];

  // Categories for the accordion: top level with products, sub-categories with products,
  // and one real product photo per category.
  const tops = categories.filter((c) => c.productCount > 0);
  const photos = await Promise.all(tops.map((c) => findProducts({ categorySlug: c.slug, pageSize: 6 })));
  const used = new Set<string>();
  const accordion: AccordionCategory[] = tops.map((c, i) => {
    const pick = photos[i]!.items.find((p) => p.image && !used.has(p.id));
    if (pick) used.add(pick.id);
    return {
      slug: c.slug,
      name: c.name,
      count: c.productCount,
      children: c.children.filter((ch) => ch.productCount > 0).map((ch) => ({ slug: ch.slug, name: ch.name, count: ch.productCount })),
      image: pick?.image ? { url: pick.image.url, alt: pick.image.alt } : null,
    };
  });
  accordion.sort((a, b) => b.count - a.count);

  const modelNames = vehicles.flatMap((m) => m.models.filter((x) => x.productCount > 0).map((x) => x.name));

  return (
    <>
      <HelmetHero
        badge={homeHero.badge}
        title={homeHero.title}
        phrases={homeHero.phrases}
        body={heroBody}
        primaryCta={homeHero.primaryCta}
        dealsCta={onSale.total ? { label: homeHero.dealsCta.label.replace("{count}", String(onSale.total)), href: homeHero.dealsCta.href } : null}
        araiCta={homeHero.araiCta}
        whatsapp={{ label: homeHero.whatsappCta, href: whatsappLink("היי, הגעתי מהאתר של Moto Star") }}
        trust={trust}
        illustrationNote={homeHero.illustrationNote}
      />
      <VehicleFinder tree={vehicles} copy={vehicleBand} />
      {/* The dark stretch: model names drift with the scroll, then the Arai tour and its parts. */}
      <div data-sheet className="bg-ink pt-6 text-paper lg:pt-10">
        <ModelsMarquee models={modelNames} />
        <AraiExperience data={arai} />
        <AraiRail products={arai.all} />
      </div>
      <ProductRail
        sheet
        id="deals-title"
        eyebrow={dealsCopy.eyebrow}
        title={dealsCopy.title}
        intro={dealsCopy.intro}
        products={deals.items}
        href="/deals"
        hrefLabel={`לכל המבצעים (${onSale.total})`}
      />
      <CategoryAccordion copy={categoriesBlock} categories={accordion} />
      <WorkshopStrip />
    </>
  );
}
