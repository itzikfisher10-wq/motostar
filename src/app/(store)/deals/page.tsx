import { ListingPage } from "@/components/listing/ListingPage";
import { findProducts } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "מבצעים",
  description: "חלקים ואביזרים לאופנועים וקטנועים במחיר מבצע: חלפים מקוריים לקסדות Arai, שמני Motul, חלקי Yamaha XMAX ועוד.",
  path: "/deals",
});

export default async function DealsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { filters, params } = parseListingParams(await searchParams);
  const result = await findProducts({ ...filters, onSale: true });
  return (
    <ListingPage
      title="מבצעים"
      intro="מוצרים שהמחיר שלהם כרגע נמוך מהמחיר הרגיל. ההנחה מחושבת מול המחיר הרגיל בקטלוג."
      breadcrumbs={[{ name: "מבצעים", href: "/deals" }]}
      {...result}
      basePath="/deals"
      params={params}
    />
  );
}
