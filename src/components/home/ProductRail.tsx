import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/types";
import { ProductCard } from "@/components/product/ProductCard";
import { buttonClass } from "@/components/ui/Button";
import { reveal, revealItem } from "@/components/motion/reveal";
import { ScrollRail } from "./ScrollRail";

type Props = {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  products: ProductCardData[];
  href: string;
  hrefLabel: string;
  /** Render as a rounded sheet overlapping the section above (home page). */
  sheet?: boolean;
  tone?: "light" | "dark";
};

export function ProductRail({ id, eyebrow, title, intro, products, href, hrefLabel, sheet = false, tone = "light" }: Props) {
  if (!products.length) return null;
  const dark = tone === "dark";
  return (
    <section {...(sheet ? { "data-sheet": "", "data-lazy-paint": "" } : {})} aria-labelledby={id} className={`${dark ? "bg-ink text-paper" : "bg-mist"} pb-14 pt-16 lg:pb-20 lg:pt-24`}>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div {...reveal.focus}>
          {eyebrow && <p className={`text-sm font-black tracking-wide ${dark ? "text-signal-bright" : "text-signal-deep"}`}>{eyebrow}</p>}
          <h2 id={id} className="mt-1.5 font-display text-display-md">
            {title}
          </h2>
          {intro && <p className={`mt-3 max-w-xl ${dark ? "text-fog" : "text-steel"}`}>{intro}</p>}
        </div>
        <Link href={href} className={buttonClass(dark ? "glass" : "glassLight", "md")}>
          {hrefLabel}
        </Link>
      </div>
      <div className="mt-8">
        <ScrollRail label={title} tone={tone}>
          {products.map((p, i) => (
            <li key={p.id} {...revealItem(i)} className="w-[68vw] shrink-0 snap-start sm:w-[40vw] md:w-[30vw] lg:w-[17.5rem]">
              <ProductCard product={p} tone={tone} />
            </li>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
