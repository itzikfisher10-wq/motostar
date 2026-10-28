"use client";

import { useEffect, type RefObject } from "react";
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type ScrollSceneTools = { gsap: typeof GsapType; ScrollTrigger: typeof ScrollTriggerType; headerHeight: () => number; priority: number };

/**
 * Builds a GSAP ScrollTrigger scene for a pinned / scrubbed section, the shared way:
 * - gsap + ScrollTrigger load on demand, when the section is within about one screen
 *   (they are not in the first-load bundle and never run during page load for sections below);
 * - reduced motion: the scene is never built, the section stays in its static layout;
 * - everything the scene creates is reverted on unmount (gsap.context).
 * `onArmed` runs right before the scene is built, so a component can switch its markup from
 * the static layout to the animated one only when the animation will really run.
 *
 * Pinned scenes must be measured top to bottom (each pin pushes everything below it down), but
 * these scenes load asynchronously and in any order. So every trigger gets `refreshPriority`
 * from its position on the page (pass `tools.priority`), and all triggers are re-sorted and
 * re-measured each time a scene is added.
 */
export function useScrollScene(root: RefObject<HTMLElement | null>, build: (el: HTMLElement, tools: ScrollSceneTools) => void, onArmed?: () => void) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    // Build when the section is within about one screen: GSAP and its measuring stay out of
    // the page load, and the pin spacer is inserted while the section is still off screen.
    const cancelNear = whenNear(el, () => void start());
    const start = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      onArmed?.();
      // Let the armed markup lay out before ScrollTrigger measures it.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      ctx = gsap.context(() => build(el, { gsap, ScrollTrigger, headerHeight, priority: scenePriority(el) }), el);
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };
    return () => {
      cancelled = true;
      cancelNear();
      ctx?.revert();
    };
    // The scene is built once per mount; `build` and `onArmed` are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Height of the sticky store header, so pinned scenes start below it. */
export function headerHeight() {
  return document.querySelector<HTMLElement>("body > header, header.sticky")?.offsetHeight ?? 0;
}

/**
 * refreshPriority for a scene: higher for scenes higher on the page, so they are measured first.
 * Uses document order (not pixel offsets, which pins change), counted among all sections.
 */
export function scenePriority(el: Element) {
  const sections = Array.from(document.querySelectorAll("main section, main [data-scene]"));
  const host = el.closest("section") ?? el;
  const i = sections.indexOf(host);
  return 1000 - (i < 0 ? 999 : i);
}

/** Runs `cb` once, when `el` comes within about one screen of the viewport. Returns a canceller. */
export function whenNear(el: Element, cb: () => void) {
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      cb();
    },
    { rootMargin: "100% 0px 100% 0px" },
  );
  io.observe(el);
  return () => io.disconnect();
}
