import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/types";
import { ProductCard } from "@/components/product/ProductCard";
import { reveal, revealItem } from "@/components/motion/reveal";

/** Animation 04: the tour hands off to every Arai part in a horizontal rail. */
export function AraiRail({ products }: { products: ProductCardData[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="arai-rail-title" className="bg-ink pb-20 pt-6 text-paper">
      <div className="mx-auto flex max-w-[1400px] items-end justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <h2 id="arai-rail-title" className="font-display text-display-md">
          כל חלפי Arai במלאי
        </h2>
        <Link href="/brands/arai" className="shrink-0 pb-2 text-sm text-fog underline-offset-4 hover:text-paper hover:underline">
          לעמוד Arai ({products.length})
        </Link>
      </div>
      <ul {...reveal.cascade} className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:gap-6 lg:px-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">
        {products.map((p, i) => (
          <li key={p.id} {...revealItem(i)} className="w-[64vw] shrink-0 snap-start sm:w-[38vw] lg:w-[19rem]">
            <ProductCard product={p} tone="dark" />
          </li>
        ))}
      </ul>
    </section>
  );
}
