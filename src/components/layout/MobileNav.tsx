"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouteScopedOpen } from "@/hooks/use-route-scoped-open";
import { site, whatsappLink } from "@/config/site";
import type { CategoryNode } from "@/features/catalog/types";
import { ChevronIcon, CloseIcon, MenuIcon, PhoneIcon, WhatsappIcon } from "@/components/ui/icons";

/** Phone navigation drawer. Large tap targets, reachable with one thumb. */
export function MobileNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useRouteScopedOpen();
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="-ms-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-graphite lg:hidden" aria-label="פתיחת תפריט" aria-expanded={open}>
        <MenuIcon />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="תפריט" className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/60 animate-fade-in" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav aria-label="ניווט באתר" className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-ink text-paper">
            <div className="flex items-center justify-between border-b border-line-dark px-4 py-3">
              <span className="font-display text-[1.75rem]">תפריט</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-graphite" aria-label="סגירת התפריט">
                <CloseIcon />
              </button>
            </div>
            <ul className="divide-y divide-line-dark">
              <li>
                <Link href="/vehicles" className="flex h-14 items-center px-4 text-lg">האופנוע שלי</Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button type="button" onClick={() => setExpanded(expanded === cat.id ? null : cat.id)} aria-expanded={expanded === cat.id} className="flex h-14 w-full items-center justify-between px-4 text-lg">
                    {cat.name}
                    <ChevronIcon size={18} className={`transition-transform ${expanded === cat.id ? "-rotate-90" : ""}`} />
                  </button>
                  {expanded === cat.id && (
                    <ul className="bg-graphite/40 pb-2">
                      <li>
                        <Link href={`/categories/${cat.slug}`} className="flex h-12 items-center px-6 font-medium">כל {cat.name}</Link>
                      </li>
                      {cat.children.filter((c) => c.productCount > 0).map((c) => (
                        <li key={c.id}>
                          <Link href={`/categories/${c.slug}`} className="flex h-12 items-center justify-between px-6 text-fog">
                            {c.name}
                            <span className="tabular text-sm text-steel">{c.productCount}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link href="/brands/arai" className="flex h-14 items-center px-4 text-lg">Arai</Link>
              </li>
              <li>
                <Link href="/deals" className="flex h-14 items-center px-4 text-lg">מבצעים</Link>
              </li>
            </ul>
            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-line-dark p-4">
              <a href={`tel:${site.phoneE164}`} className="flex h-12 items-center justify-center gap-2 rounded-md bg-graphite">
                <PhoneIcon size={18} /> חיוג
              </a>
              <a href={whatsappLink("היי, הגעתי מהאתר של Moto Star")} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-md bg-graphite">
                <WhatsappIcon size={18} /> וואטסאפ
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
