import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getCategoryTree } from "@/features/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "כל הקטגוריות",
  description: "חלקי חילוף, תוספות ואביזרים, ציוד לרוכב, שמנים וצמיגים לאופנועים וקטנועים. כל הקטגוריות של Moto Star.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const tree = await getCategoryTree();
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: "קטגוריות", href: "/categories" }]} />
      <h1 className="mt-8 font-display text-display-lg">כל הקטגוריות</h1>
      <div className="mt-12 grid gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {tree.map((cat) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.slug}`}>
            <h2 id={`cat-${cat.slug}`} className="border-b border-ink pb-3">
              <Link href={`/categories/${cat.slug}`} className="flex items-baseline justify-between gap-3 hover:text-signal">
                <span className="font-display text-display-sm">{cat.name}</span>
                <span className="text-sm text-steel tabular">{cat.productCount}</span>
              </Link>
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {cat.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/categories/${c.slug}`} className="flex h-12 items-center justify-between hover:underline underline-offset-4">
                    <span className={c.productCount ? "" : "text-steel"}>{c.name}</span>
                    <span className="text-sm text-steel tabular">{c.productCount || "בקרוב"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
