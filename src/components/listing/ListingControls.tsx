"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SORT_LABELS } from "@/features/catalog/sort-labels";
import type { ProductSort } from "@/features/catalog/types";

/**
 * Sort + filter bar. State lives in the URL (shareable, crawlable, back-button safe).
 * Without JavaScript it is a plain GET form.
 */
export function ListingControls({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  return (
    <form action={pathname} method="get" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-line py-3 text-sm" aria-busy={pending}>
      {search.get("q") && <input type="hidden" name="q" value={search.get("q")!} />}
      <p className="me-auto text-steel tabular" role="status" aria-live="polite">
        {total === 1 ? "מוצר אחד" : `${total} מוצרים`}
      </p>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="available" value="1" defaultChecked={search.get("available") === "1"} onChange={(e) => set("available", e.target.checked ? "1" : null)} className="h-4 w-4 accent-ink" />
        במלאי בלבד
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="sale" value="1" defaultChecked={search.get("sale") === "1"} onChange={(e) => set("sale", e.target.checked ? "1" : null)} className="h-4 w-4 accent-ink" />
        במבצע
      </label>
      <label className="flex items-center gap-2">
        <span className="text-steel">מיון</span>
        <select name="sort" defaultValue={search.get("sort") ?? "featured"} onChange={(e) => set("sort", e.target.value === "featured" ? null : e.target.value)} className="h-9 rounded-[var(--radius-control)] border border-line bg-paper px-2">
          {(Object.keys(SORT_LABELS) as ProductSort[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="h-9 rounded-[var(--radius-control)] bg-ink px-3 text-paper">החלה</button>
      </noscript>
    </form>
  );
}
