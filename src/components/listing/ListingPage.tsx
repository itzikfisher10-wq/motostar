import { Suspense } from "react";
import type { BreadcrumbItem, ProductCardData } from "@/features/catalog/types";
import { itemListJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/product/ProductCard";
import { ListingControls } from "./ListingControls";
import { Pagination } from "./Pagination";

type Props = {
  title: string;
  intro?: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  aside?: React.ReactNode;
  items: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | number | undefined>;
  empty?: React.ReactNode;
  showControls?: boolean;
};

/** Shared layout for every product listing (categories, brands, deals, vehicles, search). */
export function ListingPage({ title, intro, breadcrumbs, aside, items, total, page, pageCount, basePath, params, empty, showControls = true }: Props) {
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={breadcrumbs} />
      <header className="mt-8 max-w-3xl">
        <h1 className="font-display text-display-lg">{title}</h1>
        {intro && <div className="mt-4 text-lg leading-relaxed text-steel">{intro}</div>}
      </header>
      {aside && <div className="mt-8">{aside}</div>}
      <div className="mt-10">
        {showControls && (
          <Suspense fallback={<div className="h-[3.75rem] border-y border-line" />}>
            <ListingControls total={total} />
          </Suspense>
        )}
        <div className="mt-8">
          {items.length ? (
            <>
              <h2 className="sr-only">המוצרים</h2>
              <ProductGrid products={items} priorityCount={4} />
            </>
          ) : (empty ?? <p className="py-16 text-center text-steel">לא נמצאו מוצרים התואמים לסינון. נסו להסיר את אחד הסינונים.</p>)}
        </div>
        <Pagination page={page} pageCount={pageCount} basePath={basePath} params={params} />
      </div>
      {items.length > 0 && <JsonLd data={itemListJsonLd(title, items)} />}
    </Container>
  );
}
