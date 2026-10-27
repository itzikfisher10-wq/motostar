"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { site, whatsappLink } from "@/config/site";
import type { ProductDetailData } from "@/features/catalog/types";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { CheckIcon, WhatsappIcon } from "@/components/ui/icons";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { isPartNumber } from "@/lib/text/part-number";

/**
 * Gallery + buy box. Selected variant is mirrored to ?variant=<id> so a colour
 * can be shared or linked (and matches the Offer URLs in structured data).
 */
export function ProductPurchase({ product }: { product: ProductDetailData }) {
  const { add, pending } = useCart();

  // The server renders the default variant (so the buy box is in the HTML); after hydration
  // a ?variant= in the URL takes over. An explicit choice on the page wins over both.
  const urlVariant = useUrlVariant();
  const defaultVariant = product.variants.find((v) => v.isAvailable) ?? product.variants[0]!;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const variant = product.variants.find((v) => v.id === (chosenId ?? urlVariant)) ?? defaultVariant;
  const [quantity, setQuantity] = useState(1);

  const imageIndexForVariant = (id: string) => {
    const v = product.variants.find((x) => x.id === id);
    const i = v?.imageId ? product.images.findIndex((im) => im.id === v.imageId) : -1;
    return i >= 0 ? i : 0;
  };
  // A thumbnail click overrides the image; choosing a variant goes back to that variant's image.
  const [pickedImage, setPickedImage] = useState<number | null>(null);
  const imageIndex = pickedImage ?? imageIndexForVariant(variant.id);
  const setImageIndex = setPickedImage;
  const image = product.images[imageIndex] ?? null;

  const hasOptions = product.options.length > 0 && product.variants.length > 1;
  const choose = (id: string) => {
    setChosenId(id);
    setQuantity(1);
    setPickedImage(null);
    // Mirror the choice in the URL (shareable link, matches the Offer URLs in structured data).
    const url = new URL(window.location.href);
    url.searchParams.set("variant", id);
    window.history.replaceState(window.history.state, "", url);
  };
  const variantId = variant.id;

  const maxQ = Math.max(1, variant.maxQuantity);
  const askText = useMemo(() => `היי, אשמח לבדוק התאמה של "${product.title}"${hasOptions ? ` (${variant.title})` : ""} לאופנוע שלי`, [product.title, hasOptions, variant.title]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-panel)] bg-mist">
          {image ? (
            <Image key={image.id} src={image.url} alt={image.alt} fill priority sizes="(min-width: 1024px) 56vw, 100vw" className="object-contain p-[7%] motion-safe:animate-fade-in" />
          ) : (
            <div className="flex h-full items-center justify-center text-steel">אין תמונה</div>
          )}
        </div>
        {product.images.length > 1 && (
          <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto" aria-label="תמונות המוצר">
            {product.images.map((im, i) => (
              <li key={im.id}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`תמונה ${i + 1} מתוך ${product.images.length}`}
                  aria-current={i === imageIndex}
                  className={`relative h-20 w-20 overflow-hidden rounded-md bg-mist outline-offset-2 ${i === imageIndex ? "outline outline-2 outline-ink" : "opacity-70 hover:opacity-100"}`}
                >
                  <Image src={im.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Buy box */}
      <div>
        <Price price={variant.priceAgorot} compareAt={variant.compareAtAgorot} size="lg" />
        <p className="mt-1 text-sm text-steel">כולל מע״מ</p>

        {hasOptions &&
          product.options.map((opt) => (
            <fieldset key={opt.name} className="mt-8">
              <legend className="text-sm">
                {opt.name}: <span className="font-semibold">{variant.optionValues[opt.name]}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const selected = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => choose(v.id)}
                      aria-pressed={selected}
                      className={`relative min-h-11 rounded-[var(--radius-control)] border px-4 text-sm transition-colors ${selected ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"} ${v.isAvailable ? "" : "text-steel line-through decoration-1"}`}
                    >
                      {v.optionValues[opt.name] ?? v.title}
                      {!v.isAvailable && <span className="sr-only"> (אזל)</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

        <p className={`mt-8 flex items-center gap-2 text-sm font-medium ${variant.isAvailable ? "text-ok" : "text-signal"}`}>
          {variant.isAvailable ? (
            <>
              <CheckIcon size={18} /> במלאי, נשלח תוך 1–2 ימי עבודה
            </>
          ) : (
            "אזל במלאי"
          )}
        </p>

        <div className="mt-4 flex gap-3">
          <QuantityStepper label="כמות" value={Math.min(quantity, maxQ)} max={maxQ} onChange={setQuantity} disabled={!variant.isAvailable} />
          <Button
            variant="primary"
            size="lg"
            className="h-12 flex-1"
            disabled={!variant.isAvailable || pending}
            onClick={() => void add(variant.id, Math.min(quantity, maxQ))}
          >
            {variant.isAvailable ? (pending ? "מוסיף…" : "הוספה לסל") : "אזל במלאי"}
          </Button>
        </div>

        <a href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line text-sm font-medium hover:border-ink">
          <WhatsappIcon size={18} />
          לא בטוחים בהתאמה? שאלו אותנו
        </a>

        {isPartNumber(variant.sku) && hasOptions && <p className="mt-4 text-xs text-steel">מק״ט: <span className="ltr-isolate">{variant.sku}</span></p>}

        <ul className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-steel">
          <li>משלוח לכל הארץ. דמי המשלוח מחושבים בקופה, לפני התשלום.</li>
          <li>איסוף עצמי מ{site.address.street}, {site.address.city}, בתיאום מראש.</li>
          <li>החזרה תוך {site.returnsDays} יום, במוצר חדש באריזתו המקורית.</li>
        </ul>
      </div>

      {/* Phone: sticky add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-steel">{product.title}</p>
          <Price price={variant.priceAgorot} compareAt={variant.compareAtAgorot} size="sm" />
        </div>
        <Button variant="primary" size="md" disabled={!variant.isAvailable || pending} onClick={() => void add(variant.id, Math.min(quantity, maxQ))}>
          {variant.isAvailable ? "הוספה לסל" : "אזל"}
        </Button>
      </div>
    </div>
  );
}

/** `?variant=` from the address bar; null during server rendering and before hydration. */
function useUrlVariant(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("popstate", onChange);
      return () => window.removeEventListener("popstate", onChange);
    },
    () => new URLSearchParams(window.location.search).get("variant"),
    () => null,
  );
}
