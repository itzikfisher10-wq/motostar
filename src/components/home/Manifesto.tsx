"use client";

import { useRef, useState } from "react";
import { useScrollScene } from "@/components/motion/useScrollScene";

type Props = { title: string; lines: readonly string[] };

/** Scroll span of the pinned statement, in viewport heights. The page's peak gets the most room. */
const SPAN_DESKTOP = 2.6;
const SPAN_MOBILE = 2.0;

/**
 * The statement, read under a headlight beam (the home page's signature move; docs/home-brief.md).
 * The stage pins; a soft beam crosses it from the reading start, and every word the beam passes
 * lights from dark grey to white. The last word lights in signal red.
 * Without JS, or with reduced motion, every word is simply lit and nothing pins.
 */
export function Manifesto({ title, lines }: Props) {
  const root = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  useScrollScene(
    root,
    (el, { gsap, headerHeight, priority }) => {
      const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
      const beam = el.querySelector<HTMLElement>("[data-beam]");
      const stage = el.querySelector<HTMLElement>("[data-stage]");
      if (!stage || !beam || !words.length) return;
      const span = () => window.innerHeight * (window.matchMedia("(min-width: 768px)").matches ? SPAN_DESKTOP : SPAN_MOBILE);
      let lit = -1;
      const light = (count: number) => {
        if (count === lit) return;
        lit = count;
        words.forEach((w, i) => w.toggleAttribute("data-lit", i < count));
      };
      // The beam travels from the right edge (reading start in Hebrew) to past the left edge.
      gsap.fromTo(
        beam,
        { xPercent: 70 },
        {
          xPercent: -170,
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: () => `top ${headerHeight()}px`,
            end: () => `+=${span()}`,
            pin: true,
            scrub: 0.4,
            refreshPriority: priority,
            onUpdate: (self) => light(Math.round(self.progress * (words.length + 1))),
            onLeave: () => light(words.length),
            onLeaveBack: () => light(0),
          },
        },
      );
    },
    () => setArmed(true),
  );

  let index = 0;
  const total = lines.reduce((n, l) => n + l.split(" ").length, 0);

  return (
    <section ref={root} aria-labelledby="manifesto-title" data-armed={armed ? "" : undefined} className="relative bg-ink text-paper">
      <h2 id="manifesto-title" className="sr-only">
        {title}
      </h2>
      <div data-stage className="relative flex min-h-[calc(100svh-6rem)] items-center overflow-hidden">
        {/* The headlight: a soft elliptical light, wider than tall, crossing the text. */}
        <div
          data-beam
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-[-20%] start-0 w-[70vw] bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),rgba(255,255,255,0.05)_55%,transparent)] blur-2xl ${armed ? "" : "hidden"}`}
        />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 py-24 sm:px-6 lg:px-10">
          <p className="max-w-[30ch] text-[clamp(1.75rem,0.9rem+3.3vw,4.25rem)] font-semibold leading-[1.18] tracking-[-0.01em]">
            {lines.map((line, li) => (
              <span key={li} className="block [&:not(:first-child)]:mt-[0.35em]">
                {line.split(" ").map((word, wi) => {
                  const last = ++index === total;
                  return (
                    <span key={wi}>
                      <span data-word className={`manifesto-word ${last ? "manifesto-word--last" : ""}`}>
                        {word}
                      </span>{" "}
                    </span>
                  );
                })}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
