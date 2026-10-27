import Link from "next/link";
import type { CategoryNode } from "@/features/catalog/types";
import { Container } from "@/components/ui/Container";
import { reveal } from "@/components/motion/reveal";

/**
 * Category index as a typographic list: the category names themselves are the
 * design. Sub-categories with stock are listed beside each one.
 */
export function CategoryIndex({ categories }: { categories: CategoryNode[] }) {
  return (
    <section aria-labelledby="category-index-title" className="py-20 lg:py-28">
      <Container>
        <h2 id="category-index-title" className="sr-only">
          קטגוריות
        </h2>
        <ul className="border-t border-ink">
          {categories.map((cat) => {
            const subs = cat.children.filter((c) => c.productCount > 0);
            return (
              <li key={cat.id} className="group grid gap-x-10 gap-y-3 border-b border-line py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-baseline">
                <Link href={`/categories/${cat.slug}`} className="flex items-baseline gap-4">
                  <span {...reveal.wipe} className="font-display text-display-lg transition-colors group-hover:text-signal">{cat.name}</span>
                  <span className="text-sm text-steel tabular">{cat.productCount ? `${cat.productCount} מוצרים` : "בקרוב"}</span>
                </Link>
                {subs.length > 0 && (
                  <ul className="flex flex-wrap gap-x-5 gap-y-0.5 text-[0.95rem] text-steel">
                    {subs.map((s) => (
                      <li key={s.id}>
                        <Link href={`/categories/${s.slug}`} className="inline-block py-1.5 hover:text-ink hover:underline">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
