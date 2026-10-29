"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowIcon } from "@/components/ui/icons";
import { reveal } from "@/components/motion/reveal";

/**
 * Horizontal product rail. Touch and trackpads scroll it natively (with snap points); on desktop
 * two glass buttons page through it. In RTL the rail runs to the left, so "next" scrolls left.
 * Buttons hide at the ends.
 */
export function ScrollRail({ children, label, tone = "light" }: { children: ReactNode; label: string; tone?: "light" | "dark" }) {
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setEdges({ start: x < 8, end: x > max - 8 });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: -dir * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };

  const btn = `${tone === "dark" ? "glass-dark text-paper hover:bg-white/15" : "glass-light text-ink hover:bg-white"} grid h-12 w-12 place-items-center rounded-full transition-[opacity,transform,background-color] duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-0`;

  return (
    <div className="relative">
      <ul ref={rail} aria-label={label} {...reveal.cascade} className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-2 sm:gap-4 sm:px-6 lg:gap-5 lg:px-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))]">
        {children}
      </ul>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] hidden justify-between px-4 lg:flex lg:px-6">
        <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label="הקודמים" className={`${btn} pointer-events-auto`}>
          <ArrowIcon size={20} className="rotate-180" />
        </button>
        <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label="הבאים" className={`${btn} pointer-events-auto`}>
          <ArrowIcon size={20} />
        </button>
      </div>
    </div>
  );
}
