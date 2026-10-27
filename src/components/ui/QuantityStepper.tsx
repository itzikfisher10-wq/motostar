"use client";

import { MinusIcon, PlusIcon } from "./icons";

export function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-9" : "w-11";
  return (
    <div role="group" aria-label={label} className={`inline-flex items-stretch rounded-[var(--radius-control)] border border-line bg-paper ${h}`}>
      <button
        type="button"
        className={`${w} flex items-center justify-center text-ink hover:bg-mist disabled:opacity-30`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="הוספת יחידה"
      >
        <PlusIcon size={18} />
      </button>
      <output aria-live="polite" className="flex min-w-9 items-center justify-center px-1 font-semibold tabular">
        {value}
      </output>
      <button
        type="button"
        className={`${w} flex items-center justify-center text-ink hover:bg-mist disabled:opacity-30`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="הפחתת יחידה"
      >
        <MinusIcon size={18} />
      </button>
    </div>
  );
}
