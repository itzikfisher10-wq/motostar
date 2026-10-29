import type { ProductCardData } from "@/features/catalog/types";
import { ProductRail } from "./ProductRail";

/** The Arai tour hands off to every Arai part in a rail (dark, continuing the tour's stage). */
export function AraiRail({ products }: { products: ProductCardData[] }) {
  return (
    <ProductRail
      id="arai-rail-title"
      eyebrow="Arai"
      title="כל חלפי Arai במלאי"
      products={products}
      href="/brands/arai"
      hrefLabel={`לעמוד Arai (${products.length})`}
      tone="dark"
    />
  );
}
