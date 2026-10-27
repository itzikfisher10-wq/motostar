"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartLine } from "@/features/cart/types";
import { formatPrice } from "@/lib/format/money";
import { TrashIcon } from "@/components/ui/icons";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

/** One cart line. Shared by the cart drawer and the /cart page. */
export function CartLineItem({ line, pending, onChange, size = "sm" }: { line: CartLine; pending: boolean; onChange: (quantity: number) => void; size?: "sm" | "lg" }) {
  const thumb = size === "lg" ? "h-28 w-28" : "h-24 w-24";
  return (
    <li className="flex gap-4 py-5">
      <Link href={`/products/${line.productSlug}`} className={`relative ${thumb} shrink-0 overflow-hidden rounded-md bg-mist`}>
        {line.image && <Image src={line.image.url} alt={line.image.alt} fill sizes={size === "lg" ? "112px" : "96px"} className="object-contain p-2" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/products/${line.productSlug}`} className={`${size === "lg" ? "text-base" : "text-sm"} font-medium leading-snug underline-offset-4 hover:underline`}>
          {line.productTitle}
        </Link>
        {line.variantTitle && <p className="text-xs text-steel">{line.variantTitle}</p>}
        {line.sku && size === "lg" && <p className="text-xs text-steel" dir="ltr">מק״ט {line.sku}</p>}
        {!line.available && <p className="text-xs font-medium text-signal">{line.maxQuantity === 0 ? "אזל במלאי, לא ייכלל בהזמנה" : `זמינות מוגבלת: עד ${line.maxQuantity} יחידות`}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityStepper size="sm" label={`כמות עבור ${line.productTitle}`} value={line.quantity} max={Math.max(line.maxQuantity, 1)} onChange={onChange} disabled={pending || line.maxQuantity === 0} />
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold tabular">{formatPrice(line.lineTotal)}</span>
            <button type="button" onClick={() => onChange(0)} className="flex h-9 w-9 items-center justify-center rounded-full text-steel hover:bg-mist hover:text-ink" aria-label={`הסרת ${line.productTitle} מהסל`} disabled={pending}>
              <TrashIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
