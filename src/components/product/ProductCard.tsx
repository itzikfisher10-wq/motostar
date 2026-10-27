import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/types";
import { discountPercent } from "@/lib/format/money";
import { Price } from "@/components/ui/Price";
import { ProductImage } from "./ProductImage";
import { reveal } from "@/components/motion/reveal";

const ORIGIN_LABEL = { ORIGINAL: "מקורי", AFTERMARKET: "חליפי", UNSPECIFIED: null } as const;

/**
 * Product card. Hover (pointer devices only): the photo lifts slightly and, when the
 * product has a second photo, cross-fades to it. No motion with reduced-motion.
 */
export function ProductCard({ product, priority = false, headingLevel = 3, tone = "light" }: { product: ProductCardData; priority?: boolean; headingLevel?: 2 | 3; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const off = discountPercent(product.priceFrom, product.compareAt);
  const Heading = `h${headingLevel}` as const;
  const origin = ORIGIN_LABEL[product.origin];
  return (
    <article className="group relative flex flex-col">
      <div className={`relative aspect-square overflow-hidden rounded-[var(--radius-panel)] ${dark ? "bg-[radial-gradient(closest-side,#33363b,#141516)]" : "bg-mist"}`}>
        <div {...reveal.drift} className="absolute inset-0">
        <div className="absolute inset-[8%] transition-transform duration-500 ease-[var(--ease-out-quart)] [@media(hover:hover)]:group-hover:scale-[1.04]">
          <ProductImage
            image={product.image}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            priority={priority}
            className={product.hoverImage ? "transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-0" : ""}
          />
          {product.hoverImage && (
            <ProductImage
              image={product.hoverImage}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
              className="opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
            />
          )}
        </div>
        </div>
        {/* Light sweep on hover: the "change of lighting" from the brief, kept subtle. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${dark ? "bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.12)_50%,transparent_65%)]" : "bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.55)_50%,transparent_65%)]"} opacity-0 translate-x-[30%] transition-[opacity,translate] duration-700 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:-translate-x-[30%]`}
        />
        <div className="absolute top-3 start-3 flex flex-col items-start gap-1.5">
          {off && <span className="rounded-sm bg-signal px-2 py-0.5 text-xs font-semibold text-paper tabular">‎-{off}%</span>}
          {!product.isAvailable && <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>אזל במלאי</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        {(product.brandName || origin) && (
          <p className={`flex gap-2 text-xs ${dark ? "text-fog" : "text-steel"}`}>
            {product.brandName && <span>{product.brandName}</span>}
            {origin && <span>{origin}</span>}
          </p>
        )}
        <Heading className="text-[0.95rem] font-medium leading-snug line-clamp-2">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-signal focus-visible:after:rounded-[var(--radius-panel)]">
            {product.title}
          </Link>
        </Heading>
        <Price price={product.priceFrom} compareAt={product.compareAt} from={product.priceFrom !== product.priceTo} size="sm" tone={tone} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul {...reveal.grid} className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
