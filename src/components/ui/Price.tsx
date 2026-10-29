import { discountPercent, formatPrice } from "@/lib/format/money";

type Props = {
  price: number;
  compareAt?: number | null;
  /** Show "החל מ-" when variants have different prices. */
  from?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Surface the price sits on; sale red is adjusted to keep 4.5:1 contrast. */
  tone?: "light" | "dark";
};

const sizes = { sm: "text-[0.95rem]", md: "text-lg", lg: "text-[1.75rem]" };

export function Price({ price, compareAt, from, size = "md", className = "", tone = "light" }: Props) {
  const off = discountPercent(price, compareAt ?? null);
  const muted = tone === "dark" ? "text-fog" : "text-steel";
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 tabular ${className}`}>
      {from && <span className={`text-sm ${muted}`}>החל מ-</span>}
      <span className={`${sizes[size]} font-black ${off ? (tone === "dark" ? "text-signal-bright" : "text-signal-deep") : ""}`}>{formatPrice(price)}</span>
      {off && (
        <>
          <span className={`text-sm ${muted} line-through decoration-1`}>
            <span className="sr-only">במקום </span>
            {formatPrice(compareAt!)}
          </span>
          <span className="sr-only">הנחה של {off}%</span>
        </>
      )}
    </p>
  );
}
