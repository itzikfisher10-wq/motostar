import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing/ListingPage";
import { findProducts, getBrandBySlug } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const brand = await getBrandBySlug((await params).slug);
  if (!brand) return {};
  const { isFiltered } = parseListingParams(await searchParams);
  return buildMetadata({
    title: brand.seoTitle ?? (brand.slug === "arai" ? "חלפים מקוריים לקסדות Arai" : brand.name),
    description: brand.seoDescription ?? brand.description ?? `מוצרי ${brand.name} ב-Moto Star.`,
    path: `/brands/${brand.slug}`,
    noindex: isFiltered,
  });
}

export default async function BrandPage({ params, searchParams }: Props) {
  const brand = await getBrandBySlug((await params).slug);
  if (!brand) notFound();
  const { filters, params: p } = parseListingParams(await searchParams);
  const result = await findProducts({ ...filters, brandSlug: brand.slug });
  if (result.total === 0 && !Object.values(p).some(Boolean)) notFound();
  return (
    <ListingPage
      title={brand.slug === "arai" ? "חלפים מקוריים ל-Arai" : brand.name}
      intro={brand.description}
      breadcrumbs={[{ name: "מותגים", href: "/brands" }, { name: brand.name, href: `/brands/${brand.slug}` }]}
      {...result}
      basePath={`/brands/${brand.slug}`}
      params={p}
    />
  );
}
