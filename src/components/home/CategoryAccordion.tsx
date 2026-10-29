import Image from "next/image";
import Link from "next/link";
import { CategoryAccordionRow } from "./CategoryAccordionRow";
import { reveal, revealItem } from "@/components/motion/reveal";

export type AccordionCategory = {
  slug: string;
  name: string;
  count: number;
  children: { slug: string; name: string; count: number }[];
  image: { url: string; alt: string } | null;
};

type Copy = { eyebrow: string; title: string; intro: string; open: string; all: string };

/**
 * "What are you looking for today?": the top categories side by side. Desktop: hovering, focusing
 * or clicking a panel opens it and it takes most of the row, showing its sub-categories as chips.
 * Phones: each category is a card with its chips (nothing hidden behind a gesture).
 * Counts are live product counts. Empty sub-categories are left out.
 */
export function CategoryAccordion({ copy, categories }: { copy: Copy; categories: AccordionCategory[] }) {
  if (!categories.length) return null;

  return (
    <section data-sheet data-lazy-paint aria-labelledby="category-accordion-title" className="bg-paper pb-16 pt-16 lg:pb-24 lg:pt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div {...reveal.focus} className="max-w-2xl">
          <p className="text-sm font-black tracking-wide text-signal-deep">{copy.eyebrow}</p>
          <h2 id="category-accordion-title" className="mt-1.5 font-display text-display-md">
            {copy.title}
          </h2>
          <p className="mt-3 text-steel">{copy.intro}</p>
        </div>

        <CategoryAccordionRow categories={categories} copy={copy} />

        {/* Phones and tablets: one card per category, chips always visible. */}
        <ul {...reveal.cascade} className="mt-8 grid gap-3 sm:grid-cols-2 lg:hidden">
          {categories.map((c, i) => (
            <li key={c.slug} {...revealItem(i)} className="relative overflow-hidden rounded-[1.5rem] bg-mist p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black leading-tight">
                    <Link href={`/categories/${c.slug}`} className="hover:text-signal">{c.name}</Link>
                  </h3>
                  <p className="mt-1 text-sm text-steel">{c.count} מוצרים</p>
                </div>
                {c.image && (
                  <div aria-hidden="true" className="relative h-20 w-20 shrink-0 rounded-2xl bg-paper shadow-[0_10px_24px_-14px_rgb(0_0_0/0.4)]">
                    <Image src={c.image.url} alt="" fill sizes="5rem" className="object-contain p-2" />
                  </div>
                )}
              </div>
              <ul className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
                {c.children.map((ch) => (
                  <li key={ch.slug} className="shrink-0">
                    <Link href={`/categories/${ch.slug}`} className="glass-light inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold active:scale-[0.97]">
                      {ch.name}
                      <span className="tabular text-xs text-steel">{ch.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
