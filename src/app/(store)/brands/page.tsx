import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getBrandsWithProducts } from "@/features/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;
export const metadata = buildMetadata({ title: "מותגים", description: "מותגים שנמכרים ב-Moto Star: חלפים מקוריים לקסדות Arai ושמני Motul.", path: "/brands" });

/** Only brands that actually have products are listed. */
export default async function BrandsPage() {
  const brands = await getBrandsWithProducts();
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: "מותגים", href: "/brands" }]} />
      <h1 className="mt-8 font-display text-display-lg">מותגים</h1>
      <ul className="mt-10 border-t border-ink">
        {brands.map((b) => (
          <li key={b.slug} className="border-b border-line">
            <Link href={`/brands/${b.slug}`} className="group flex flex-wrap items-baseline justify-between gap-4 py-8">
              <span className="font-display text-display-lg group-hover:text-signal">{b.name}</span>
              <span className="max-w-xl text-steel">{b.description}</span>
              <span className="text-sm text-steel tabular">{b.count} מוצרים</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
