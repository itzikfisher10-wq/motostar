import { ListingPage } from "@/components/listing/ListingPage";
import { findProducts } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "כל המוצרים",
  description: "כל חלקי החילוף, האביזרים וציוד הרכיבה של Moto Star: חלקים מקוריים וחליפיים לאופנועים וקטנועים.",
  path: "/products",
});

export default async function AllProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { filters, params } = parseListingParams(await searchParams);
  const result = await findProducts(filters);
  return <ListingPage title="כל המוצרים" breadcrumbs={[{ name: "כל המוצרים", href: "/products" }]} {...result} basePath="/products" params={params} />;
}
