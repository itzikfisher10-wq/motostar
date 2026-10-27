import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing/ListingPage";
import { findModel, findProducts } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ make: string; model: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { make, model } = await params;
  const found = await findModel(make, model);
  if (!found) return {};
  const { isFiltered, params: p } = parseListingParams(await searchParams);
  const name = `${found.make.name} ${found.model.name}`;
  return buildMetadata({
    title: `חלקים ל-${name}`,
    description: `${found.model.productCount} חלקי חילוף ואביזרים ל-${name}: דיסקים, פילטרים, קיטים לטיפול, משענות ועוד, עם תאימות כפי שצוינה על ידי המוכר.`,
    path: `/vehicles/${found.make.slug}/${found.model.slug}`,
    noindex: isFiltered || !!p.year || found.model.productCount === 0,
  });
}

export default async function ModelPage({ params, searchParams }: Props) {
  const { make, model } = await params;
  const found = await findModel(make, model);
  if (!found) notFound();
  const { filters, params: p } = parseListingParams(await searchParams);
  const result = await findProducts({ ...filters, modelId: found.model.id });
  const name = `${found.make.name} ${found.model.name}`;
  return (
    <ListingPage
      title={`חלקים ל-${name}${p.year ? ` (${p.year})` : ""}`}
      intro={
        <p className="text-base">
          התאמה לפי מה שצוין בתיאור המוצר על ידי המוכר. כשהמוכר ציין טווח שנים, המוצר מוצג רק לשנים האלה. לפני הזמנה של חלק יקר כדאי לאמת מק״ט מול הכלי, ואפשר לשלוח לנו את פרטי הכלי בוואטסאפ.
        </p>
      }
      breadcrumbs={[{ name: "האופנוע שלי", href: "/vehicles" }, { name: found.make.name, href: `/vehicles/${found.make.slug}` }, { name: found.model.name, href: `/vehicles/${found.make.slug}/${found.model.slug}` }]}
      {...result}
      basePath={`/vehicles/${found.make.slug}/${found.model.slug}`}
      params={p}
      empty={<p className="py-16 text-center text-steel">אין כרגע חלקים עם התאמה מוצהרת לדגם הזה{p.year ? ` לשנת ${p.year}` : ""}.</p>}
    />
  );
}
