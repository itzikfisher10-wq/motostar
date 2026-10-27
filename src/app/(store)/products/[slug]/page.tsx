import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductRail } from "@/components/home/ProductRail";
import { FitmentList } from "@/components/product/FitmentList";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getProductBySlug, getRelatedProducts, resolveRenamedSlug } from "@/features/catalog/queries";
import { productJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { sanitizeRichText, stripTags } from "@/lib/security/sanitize";
import { formatPrice } from "@/lib/format/money";
import { isPartNumber } from "@/lib/text/part-number";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return []; // rendered on first request, then cached (ISR)
}

type Props = { params: Promise<{ slug: string }> };

const ORIGIN = { ORIGINAL: "חלק מקורי", AFTERMARKET: "חלק חליפי", UNSPECIFIED: null } as const;

async function load(slugParam: string) {
  const slug = decodeURIComponent(slugParam);
  const product = await getProductBySlug(slug);
  if (product) return product;
  const renamed = await resolveRenamedSlug(slug);
  if (renamed) permanentRedirect(`/products/${encodeURIComponent(renamed)}`);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(decodeURIComponent((await params).slug));
  if (!product) return {};
  const minPrice = Math.min(...product.variants.map((v) => v.priceAgorot));
  const description =
    product.seoDescription ??
    [product.shortDescription, stripTags(product.descriptionHtml)].filter(Boolean).join(". ").slice(0, 300) + ` מחיר: ${formatPrice(minPrice)}.`;
  return buildMetadata({ title: product.seoTitle ?? product.title, description, path: `/products/${product.slug}`, image: product.images[0] ?? null });
}

export default async function ProductPage({ params }: Props) {
  const product = await load((await params).slug);
  const related = await getRelatedProducts(product.id);
  const descriptionHtml = sanitizeRichText(product.descriptionHtml);
  const origin = ORIGIN[product.origin];
  const isHelmetPart = product.fitments.length === 0 && product.specs.some((s) => s.label === "מתאים לקסדה");

  return (
    <>
      <Container className="pb-20 pt-8">
        <Breadcrumbs items={product.breadcrumbs} />
        <header className="mt-6 max-w-4xl">
          {(product.brand || origin) && (
            <p className="flex gap-3 text-sm text-steel">
              {product.brand && <span>{product.brand.name}</span>}
              {origin && <span>{origin}</span>}
            </p>
          )}
          <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight sm:text-[2.25rem]">{product.title}</h1>
          {product.shortDescription && <p className="mt-3 text-lg text-steel">{product.shortDescription}</p>}
        </header>

        <div className="mt-8">
          <ProductPurchase product={product} />
        </div>

        <div className="mt-20 grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-14">
            {descriptionHtml && (
              <section aria-labelledby="desc-title">
                <h2 id="desc-title" className="font-display text-display-sm">תיאור</h2>
                <div className="prose-product mt-4 max-w-[68ch] text-[1.02rem]" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
              </section>
            )}
            {/* Helmet parts fit helmet models (shown in the spec table), not vehicles. */}
            {!isHelmetPart && (
              <section aria-labelledby="fit-title">
                <h2 id="fit-title" className="font-display text-display-sm">התאמה לכלי</h2>
                <div className="mt-4">
                  <FitmentList fitments={product.fitments} />
                </div>
              </section>
            )}
          </div>
          {product.specs.length > 0 && (
            <section aria-labelledby="spec-title">
              <h2 id="spec-title" className="font-display text-display-sm">מפרט</h2>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {product.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-6 py-3 text-sm">
                    <dt className="text-steel">{s.label}</dt>
                    <dd className="text-end font-medium"><bdi>{s.value}</bdi></dd>
                  </div>
                ))}
                {product.variants.length === 1 && isPartNumber(product.variants[0]!.sku) && !product.specs.some((s) => s.label.startsWith("מק")) && (
                  <div className="flex justify-between gap-6 py-3 text-sm">
                    <dt className="text-steel">מק״ט</dt>
                    <dd className="text-end font-medium"><bdi>{product.variants[0]!.sku}</bdi></dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </Container>
      <ProductRail id="related-title" title="אולי תצטרכו גם" products={related} href={product.primaryCategory ? `/categories/${product.primaryCategory.slug}` : "/products"} hrefLabel={product.primaryCategory ? `עוד ב${product.primaryCategory.name}` : "לכל המוצרים"} />
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <JsonLd data={productJsonLd(product)} />
    </>
  );
}
