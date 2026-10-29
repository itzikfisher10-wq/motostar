"use client";

import Link from "next/link";
import { useState } from "react";
import type { VehicleTree } from "@/features/catalog/queries";
import { ArrowIcon } from "@/components/ui/icons";
import { reveal, revealItem } from "@/components/motion/reveal";
import { useMyBike } from "@/components/vehicle/my-bike-storage";

type Copy = { eyebrow: string; title: string; body: string; pick: string; all: string };

/**
 * "What do you ride?": a dark pit panel with one tile per make that has parts. Choosing a make
 * opens its models (with the real number of compatible parts) right under the tiles.
 * Every tile and chip is a plain link or button, so it works by keyboard and without motion.
 */
export function VehicleFinder({ tree, copy }: { tree: VehicleTree; copy: Copy }) {
  const makes = tree
    .map((make) => ({ ...make, models: make.models.filter((m) => m.productCount > 0) }))
    .filter((m) => m.models.length > 0);
  const saved = useMyBike();
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? (saved && makes.some((m) => m.slug === saved.makeSlug) ? saved.makeSlug : makes[0]?.slug ?? null);
  const make = makes.find((m) => m.slug === active);
  if (!makes.length) return null;

  return (
    <section data-sheet aria-labelledby="vehicle-finder-title" className="bg-paper pb-20 pt-16 lg:pb-28 lg:pt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div {...reveal.focus} className="text-center">
          <p className="text-sm font-black tracking-wide text-signal-deep">{copy.eyebrow}</p>
          <h2 id="vehicle-finder-title" className="mt-2 font-display text-display-lg">
            {copy.title}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg text-steel">{copy.body}</p>
        </div>

        {/* The pit panel: a dark plate with a red line along the top, tiles on it. */}
        <div {...reveal.panel} className="relative mt-10 overflow-hidden rounded-[2rem] bg-ink p-3 shadow-[0_30px_60px_-30px_rgb(10_10_10/0.6)] sm:p-5 lg:mt-14 lg:p-6">
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-[3px] rounded-full bg-gradient-to-l from-transparent via-signal to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,#25272b,transparent_70%)]" />

          <p id="vehicle-finder-pick" className="relative mb-3 text-center text-xs font-bold tracking-widest text-white/50">{copy.pick}</p>
          <div {...reveal.cascade} role="group" aria-labelledby="vehicle-finder-pick" className={`relative grid gap-2.5 sm:gap-4 ${makes.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            {makes.map((m, i) => {
              const on = m.slug === active;
              return (
                <button
                  key={m.slug}
                  type="button"
                  {...revealItem(i)}
                  aria-pressed={on}
                  aria-controls="vehicle-finder-models"
                  onClick={() => setPicked(m.slug)}
                  className={`group relative rounded-2xl bg-paper px-2 py-5 text-center text-ink shadow-[0_10px_24px_-10px_rgb(0_0_0/0.6)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-quart)] active:scale-[0.97] sm:py-8 [@media(hover:hover)]:hover:-translate-y-1 ${
                    on ? "shadow-[0_0_0_3px_var(--color-signal),0_16px_32px_-12px_rgb(225_18_26/0.55)]" : ""
                  }`}
                >
                  <span className="block text-[clamp(1.35rem,0.9rem+2.2vw,2.6rem)] font-black leading-none tracking-[-0.03em] ltr-isolate">{m.name}</span>
                  {m.nameHe && m.nameHe !== m.name && <span className="mt-1.5 block text-xs font-bold text-steel sm:text-sm">{m.nameHe}</span>}
                  <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold leading-none sm:text-xs ${on ? "bg-signal text-paper" : "bg-mist text-steel"}`}>
                    {m.models.length} דגמים
                  </span>
                </button>
              );
            })}
          </div>

          {make && (
            <div key={make.slug} id="vehicle-finder-models" aria-live="polite" className="relative mt-4 rounded-2xl p-1 motion-safe:animate-[sheet-in_520ms_var(--ease-out-quart)_both] sm:mt-5">
              <ul className="flex flex-wrap justify-center gap-2">
                {make.models.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/vehicles/${make.slug}/${m.slug}`}
                      className="glass-dark inline-flex h-11 items-center gap-2.5 rounded-full px-4 text-sm font-bold text-paper transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-[0.97]"
                    >
                      <span className="ltr-isolate">{m.name}</span>
                      <span className="rounded-full bg-white/12 px-2 py-0.5 text-xs tabular text-white/75">{m.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center">
                <Link href={`/vehicles/${make.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 underline-offset-4 hover:text-paper hover:underline">
                  {copy.all.replace("{make}", make.name)}
                  <ArrowIcon size={16} />
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
