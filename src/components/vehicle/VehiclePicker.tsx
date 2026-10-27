"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { VehicleTree } from "@/features/catalog/queries";
import { buttonClass } from "@/components/ui/Button";
import { myBikeHref, saveMyBike, useMyBike } from "./my-bike-storage";

/**
 * "בחירת האופנוע שלי": make → model → year (only when the model has known years).
 * Works without JavaScript too: the form submits to /vehicles with query params.
 */
export function VehiclePicker({ tree, tone = "dark", compact = false }: { tree: VehicleTree; tone?: "dark" | "light"; compact?: boolean }) {
  const router = useRouter();
  const id = useId();
  // Until the visitor picks something, the form shows their saved bike (if it is in the tree).
  const saved = useMyBike();
  const [choice, setChoice] = useState<{ make: string; model: string; year: string } | null>(null);
  const fallback = saved && tree.some((m) => m.slug === saved.makeSlug) ? { make: saved.makeSlug, model: saved.modelSlug, year: saved.year ? String(saved.year) : "" } : { make: "", model: "", year: "" };
  const { make, model, year } = choice ?? fallback;
  const pick = (next: Partial<{ make: string; model: string; year: string }>) => setChoice({ make, model, year, ...next });

  const makes = tree.filter((m) => m.models.length > 0);
  const selectedMake = tree.find((m) => m.slug === make);
  const selectedModel = selectedMake?.models.find((m) => m.slug === model);
  const years = selectedModel?.yearFrom && selectedModel?.yearTo
    ? Array.from({ length: selectedModel.yearTo - selectedModel.yearFrom + 1 }, (_, i) => selectedModel.yearTo! - i)
    : [];

  const field =
    tone === "dark"
      ? "h-14 w-full appearance-none rounded-[var(--radius-control)] border border-line-dark bg-graphite px-4 text-paper disabled:opacity-40"
      : "h-14 w-full appearance-none rounded-[var(--radius-control)] border border-line bg-paper px-4 text-ink disabled:opacity-40";

  return (
    <form
      action="/vehicles"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selectedMake || !selectedModel) return;
        const bike = { makeSlug: selectedMake.slug, makeName: selectedMake.name, modelSlug: selectedModel.slug, modelName: selectedModel.name, year: year ? Number(year) : undefined };
        saveMyBike(bike);
        router.push(myBikeHref(bike));
      }}
      className={`grid gap-3 ${compact ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_0.7fr_auto]"}`}
    >
      <label className="block">
        <span className="sr-only">יצרן</span>
        <select id={`${id}-make`} name="make" value={make} onChange={(e) => pick({ make: e.target.value, model: "", year: "" })} className={field} required>
          <option value="">יצרן</option>
          {makes.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">דגם</span>
        <select name="model" value={model} onChange={(e) => pick({ model: e.target.value, year: "" })} className={field} disabled={!selectedMake} required>
          <option value="">דגם</option>
          {selectedMake?.models.map((m) => (
            <option key={m.slug} value={m.slug} disabled={m.productCount === 0}>
              {m.name}{m.productCount === 0 ? " (אין חלקים כרגע)" : ""}
            </option>
          ))}
        </select>
      </label>
      {!compact && (
        <label className="block">
          <span className="sr-only">שנת ייצור</span>
          <select name="year" value={year} onChange={(e) => pick({ year: e.target.value })} className={field} disabled={years.length === 0}>
            <option value="">{years.length ? "שנה (לא חובה)" : "שנה"}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className={buttonClass("primary", "lg", "h-14 w-full sm:w-auto")} disabled={!selectedModel}>
        הצגת חלקים מתאימים
      </button>
    </form>
  );
}
