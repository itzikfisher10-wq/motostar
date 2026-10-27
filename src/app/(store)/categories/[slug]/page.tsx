import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing/ListingPage";
import { findProducts, getCategoryBySlug } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(decodeURIComponent(slug));
  if (!cat) return {};
  const { isFiltered, params: p } = parseListingParams(await searchParams);
  const title = cat.seoTitle ?? (cat.parent ? `${cat.node.name} | ${cat.parent.name}` : cat.node.name);
  const description = cat.seoDescription ?? cat.node.description ?? `${cat.node.name} לאופנועים וקטנועים: ${cat.node.productCount} מוצרים במלאי של Moto Star בחולון, עם משלוח לכל הארץ.`;
  return buildMetadata({
    title: p.page && p.page > 1 ? `${title} (עמוד ${p.page})` : title,
    description,
    path: `/categories/${cat.node.slug}${p.page && p.page > 1 ? `?page=${p.page}` : ""}`,
    noindex: isFiltered || cat.node.productCount === 0,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(decodeURIComponent(slug));
  if (!cat) notFound();
  const { filters, params: p } = parseListingParams(await searchParams);
  const result = await findProducts({ ...filters, categorySlug: cat.node.slug });
  const subs = cat.node.children.filter((c) => c.productCount > 0);

  return (
    <ListingPage
      title={cat.node.name}
      intro={cat.node.description}
      breadcrumbs={cat.breadcrumbs}
      aside={
        subs.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="תת-קטגוריות">
            {subs.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:border-ink">
                  {c.name} <span className="text-steel tabular">{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      }
      {...result}
      basePath={`/categories/${cat.node.slug}`}
      params={p}
      empty={
        <div className="py-16 text-center">
          <p className="text-lg font-medium">אין כרגע מוצרים בקטגוריה הזו.</p>
          <p className="mt-2 text-steel">מחפשים משהו מסוים? כתבו לנו ונבדוק אם אפשר להשיג.</p>
        </div>
      }
    />
  );
}
