"use client";

import { useRef } from "react";
import { useScrollScene } from "@/components/motion/useScrollScene";

/**
 * Two lines of model names at poster scale, sliding in opposite directions as the band scrolls
 * past (a `drift` act). Decorative: the same models are listed as links right below it.
 * Model names come from the catalog (models that have parts), so the band never lists a bike
 * the store has nothing for. Static under reduced motion.
 */
export function ModelsMarquee({ models }: { models: string[] }) {
  const root = useRef<HTMLDivElement>(null);

  useScrollScene(root, (el, { gsap, priority }) => {
    const [a, b] = Array.from(el.querySelectorAll<HTMLElement>("[data-line]"));
    const trigger = { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.5, refreshPriority: priority };
    if (a) gsap.fromTo(a, { xPercent: -6 }, { xPercent: 18, ease: "none", scrollTrigger: trigger });
    if (b) gsap.fromTo(b, { xPercent: 12 }, { xPercent: -12, ease: "none", scrollTrigger: { ...trigger } });
  });

  if (!models.length) return null;
  const half = Math.ceil(models.length / 2);
  const rows = [models.slice(0, half), models.slice(half)];

  return (
    <div ref={root} aria-hidden="true" className="select-none overflow-hidden py-4" dir="ltr">
      {rows.map((row, r) => (
        <div key={r} data-line className={`flex w-max items-center gap-[0.35em] whitespace-nowrap font-display text-[clamp(2.6rem,1.4rem+5.5vw,6.5rem)] leading-[1.05] ${r ? "text-[#8a8f97]" : "text-paper"}`}>
          {[...row, ...row, ...row].map((m, i) => (
            <span key={i} className="flex items-center gap-[0.35em]">
              <span>{m}</span>
              <svg viewBox="0 0 20 20" className="h-[0.32em] w-[0.32em] text-signal" aria-hidden="true">
                <path fill="currentColor" d="M10 0l2.6 6.8L20 7.6l-5.6 4.9L16.2 20 10 16l-6.2 4 1.8-7.5L0 7.6l7.4-.8z" />
              </svg>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
