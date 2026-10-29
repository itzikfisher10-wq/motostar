"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRouteScopedOpen } from "@/hooks/use-route-scoped-open";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestions } from "@/features/search/suggest";
import { formatPrice } from "@/lib/format/money";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";

const POPULAR = ["Arai", "Motul", "Xmax 300", "מצבר", "קיט טיפול", "Tmax"];

export function SearchButton() {
  const [open, setOpen] = useRouteScopedOpen();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-95" aria-label="חיפוש מוצרים">
        <SearchIcon />
      </button>
      {open && <SearchOverlay onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [fetched, setData] = useState<Suggestions | null>(null);
  // Suggestions only apply while the query is long enough; shorter queries show the "popular" list.
  const data = q.trim().length >= 2 ? fetched : null;
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  useEffect(() => {
    input.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        if (res.ok) {
          setData((await res.json()) as Suggestions);
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const items = data?.products ?? [];
  const submit = (term = q) => {
    const t = term.trim();
    if (!t) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 text-ink" role="dialog" aria-modal="true" aria-label="חיפוש מוצרים">
      <div className="absolute inset-0 bg-ink/60 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative mx-auto mt-0 w-full max-w-3xl bg-paper shadow-2xl sm:mt-16 sm:rounded-[var(--radius-panel)]">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && items[active]) {
              router.push(`/products/${items[active]!.slug}`);
              onClose();
            } else submit();
          }}
          className="flex items-center gap-3 border-b border-line px-5"
        >
          <SearchIcon className="shrink-0 text-steel" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              }
            }}
            type="search"
            enterKeyHint="search"
            placeholder="חלק, דגם או מק״ט. למשל: דיסק Xmax 300"
            aria-label="חיפוש"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-steel"
          />
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist" aria-label="סגירת החיפוש">
            <CloseIcon />
          </button>
        </form>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {!data && (
            <div>
              <p className="text-sm text-steel">חיפושים פופולריים</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {POPULAR.map((term) => (
                  <li key={term}>
                    <button type="button" onClick={() => submit(term)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data && items.length === 0 && data.categories.length === 0 && (
            <p className="py-6 text-center text-steel">
              לא מצאנו תוצאות ל״{q}״. נסו שם דגם (Xmax, Joyride) או סוג חלק (דיסק, מצבר).
            </p>
          )}
          {data && data.categories.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {data.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} onClick={onClose} className="rounded-full bg-mist px-4 py-2 text-sm hover:bg-line">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <ul id={listId} role="listbox" aria-label="הצעות" className="divide-y divide-line">
              {items.map((p, i) => (
                <li key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                  <Link href={`/products/${p.slug}`} onClick={onClose} className={`flex items-center gap-4 rounded-md px-2 py-3 ${active === i ? "bg-mist" : "hover:bg-mist"}`}>
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-mist">
                      {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-contain p-1" />}
                    </span>
                    <span className="flex-1 text-sm">{p.title}</span>
                    <span className="text-sm font-semibold tabular">{p.available ? formatPrice(p.price) : "אזל"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <button type="button" onClick={() => submit()} className="mt-4 w-full rounded-md bg-ink py-3 text-sm font-semibold text-paper hover:bg-graphite">
              לכל התוצאות עבור ״{q}״
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
