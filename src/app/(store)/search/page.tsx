import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/ListingPage";
import { findProducts } from "@/features/catalog/queries";
import { parseListingParams, type RawSearchParams } from "@/features/catalog/listing-params";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { params } = parseListingParams(await searchParams);
  // Search result pages are not indexed (thin/duplicate content), but links are followed.
  return buildMetadata({ title: params.q ? `חיפוש: ${params.q}` : "חיפוש", description: "חיפוש חלקים ואביזרים לאופנועים וקטנועים.", path: "/search", noindex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const { filters, params } = parseListingParams(await searchParams);
  const q = params.q ?? "";
  const result = q ? await findProducts(filters) : { items: [], total: 0, page: 1, pageCount: 0 };
  return (
    <ListingPage
      title={q ? `תוצאות עבור ״${q}״` : "חיפוש"}
      intro={!q ? "הקלידו שם חלק, דגם או מק״ט בתיבת החיפוש למעלה." : undefined}
      breadcrumbs={[{ name: "חיפוש", href: "/search" }]}
      {...result}
      basePath="/search"
      params={params}
      showControls={!!q}
      empty={
        q ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium">לא מצאנו מוצרים עבור ״{q}״.</p>
            <p className="mt-2 text-steel">נסו מילה אחרת, שם דגם (Xmax, Joyride, Downtown) או סוג חלק (דיסק, מצבר, פילטר).</p>
          </div>
        ) : null
      }
    />
  );
}
