"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowIcon } from "@/components/ui/icons";
import { reveal, revealItem } from "@/components/motion/reveal";
import type { AccordionCategory } from "./CategoryAccordion";

/**
 * Desktop accordion row (client island of CategoryAccordion). Hovering, focusing or clicking a
 * panel opens it; the open panel takes most of the row and shows its sub-categories.
 */
export function CategoryAccordionRow({ categories, copy }: { categories: AccordionCategory[]; copy: { open: string; all: string } }) {
  const base = useId();
  const [open, setOpen] = useState(0);
  return (
    <div {...reveal.cascade} className="mt-10 hidden h-[30rem] gap-3 lg:flex">
      {categories.map((c, i) => {
        const isOpen = i === open;
        const panelId = `${base}-panel-${i}`;
        return (
          <article
            key={c.slug}
            {...revealItem(i)}
            data-accordion-panel
            data-open={isOpen ? "" : undefined}
            onMouseEnter={() => setOpen(i)}
            style={{ flexGrow: isOpen ? 2.7 : 1, flexBasis: 0 }}
            className={`relative min-w-0 overflow-hidden rounded-[1.75rem] ${isOpen ? "bg-ink text-paper" : "bg-mist text-ink"}`}
          >
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${isOpen ? "bg-signal" : "bg-transparent"}`} />
            <h3 className="relative z-10">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                className="flex w-full flex-col items-start px-6 pt-7 text-start"
              >
                <span className="text-2xl font-black leading-tight">{c.name}</span>
                <span className={`mt-1.5 text-sm font-medium ${isOpen ? "text-fog" : "text-steel"}`}>
                  {c.count} מוצרים · {c.children.length} תחומים
                </span>
              </button>
            </h3>

            {/* Product photo on a white plate; larger when the panel is open. */}
            {c.image && (
              <div aria-hidden="true" className={`pointer-events-none absolute ${isOpen ? "bottom-6 end-6 h-44 w-44 xl:h-52 xl:w-52" : "inset-x-0 bottom-16 mx-auto h-32 w-32"}`}>
                <span className="absolute inset-0 rounded-[1.5rem] bg-paper shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)]" />
                <Image src={c.image.url} alt="" fill sizes="13rem" className="object-contain p-4" />
              </div>
            )}

            <div id={panelId} data-accordion-body inert={!isOpen} className="relative z-10 px-6 pt-6 xl:pe-60">
              <ul className="flex max-w-[34rem] flex-wrap gap-2">
                {c.children.map((ch) => (
                  <li key={ch.slug}>
                    <Link
                      href={`/categories/${ch.slug}`}
                      className="glass-dark inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-paper transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-[0.97]"
                    >
                      {ch.name}
                      <span className="tabular text-xs text-white/60">{ch.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/categories/${c.slug}`} className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-signal-bright underline-offset-4 hover:underline">
                {copy.all.replace("{name}", c.name)}
                <ArrowIcon size={16} />
              </Link>
            </div>

            {!isOpen && <p aria-hidden="true" className="absolute inset-x-0 bottom-7 text-center text-xs font-black text-signal-deep">{copy.open}</p>}
          </article>
        );
      })}
    </div>
  );
}
