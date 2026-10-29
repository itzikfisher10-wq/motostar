"use client";

import { useEffect, useState } from "react";

/**
 * The red line under the headline. It plays through the phrases once on load, in under five
 * seconds, and rests on the last one (WCAG 2.2.2: nothing moves on its own for longer than that).
 * Only the resting phrase is exposed to assistive tech and search engines; the rest are decoration.
 * A hand-drawn underline is redrawn under each phrase.
 */
const PHRASE_MS = 1150;

export function RotatingPhrase({ phrases }: { phrases: readonly string[] }) {
  const last = phrases.length - 1;
  // The first and the last phrase are the same, so the line starts and rests on it.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || phrases.length < 2) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setIndex(i);
      if (i >= last) window.clearInterval(timer);
    }, PHRASE_MS);
    return () => window.clearInterval(timer);
  }, [phrases.length, last]);

  return (
    <span className="relative grid justify-items-center overflow-hidden pb-[0.18em] text-signal-bright lg:justify-items-start">
      <span className="sr-only">{phrases[last]}</span>
      {phrases.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          data-state={i === index ? "in" : i < index ? "out" : "wait"}
          className="hero-phrase relative col-start-1 row-start-1 whitespace-nowrap"
        >
          {p}
          <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="hero-underline absolute -bottom-[0.14em] start-0 h-[0.2em] w-full" aria-hidden="true">
            <path d="M3 11 C 60 3, 120 4, 170 8 S 260 13, 297 5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" pathLength={1} />
          </svg>
        </span>
      ))}
    </span>
  );
}
