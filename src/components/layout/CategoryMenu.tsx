"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { useRouteScopedOpen } from "@/hooks/use-route-scoped-open";
import type { CategoryNode } from "@/features/catalog/types";
import { Container } from "@/components/ui/Container";

/** Desktop mega-menu: every top category with its sub-categories, one click away. */
export function CategoryMenu({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useRouteScopedOpen();
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, setOpen]);

  return (
    <div ref={wrap}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={`rounded-md px-3 py-2 hover:bg-graphite ${open ? "bg-graphite" : ""}`}
      >
        קטגוריות
      </button>
      <div id={id} hidden={!open} className="absolute inset-x-0 top-full border-t border-line-dark bg-ink pb-10 pt-8 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
        <Container className="grid grid-cols-5 gap-8">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Link href={`/categories/${cat.slug}`} className="font-display text-[2rem] leading-none hover:text-signal">
                {cat.name}
              </Link>
              <ul className="mt-3 space-y-0.5 text-sm text-fog">
                {cat.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/categories/${c.slug}`} className={`flex justify-between gap-2 py-1 hover:text-paper ${c.productCount === 0 ? "opacity-60" : ""}`}>
                      <span>{c.name}</span>
                      {c.productCount > 0 && <span className="tabular text-steel">{c.productCount}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Container>
      </div>
    </div>
  );
}
