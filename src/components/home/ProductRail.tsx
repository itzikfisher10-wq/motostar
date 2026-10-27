import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/types";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";

export function ProductRail({ id, title, intro, products, href, hrefLabel }: { id: string; title: string; intro?: string; products: ProductCardData[]; href: string; hrefLabel: string }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby={id} className="bg-mist py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id={id} className="font-display text-display-md">{title}</h2>
            {intro && <p className="mt-3 max-w-xl text-steel">{intro}</p>}
          </div>
          <Link href={href} className="pb-2 text-sm font-medium underline-offset-4 hover:underline">{hrefLabel}</Link>
        </div>
      </Container>
      <ul className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:gap-6 lg:px-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">
        {products.map((p) => (
          <li key={p.id} className="w-[64vw] shrink-0 snap-start sm:w-[38vw] lg:w-[19rem]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
