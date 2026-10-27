import type { CSSProperties } from "react";

/**
 * Typed opt-ins for the scroll-driven motion in src/styles/motion.css.
 * Spread them onto an element: <h2 {...reveal.wipe}>. Works in server components (no JS runs).
 * Browsers without scroll-driven animations, and reduced-motion users, see the final state.
 */
export const reveal = {
  /** Typographic wipe from the reading start. For large display type. */
  wipe: { "data-reveal": "wipe" },
  /** Group whose items rise one after another; mark items with revealItem(i). */
  cascade: { "data-reveal": "cascade" },
  /** Closing element that rises into place at the end of the page. */
  close: { "data-reveal": "close" },
  /** Section that drives depth planes (hero). */
  depthScope: { "data-depth-scope": "" },
  /** Foreground copy plane: lifts and fades as its scope scrolls away. */
  depthCopy: { "data-depth": "copy" },
  /** Background light plane: drifts slower than the subject. */
  depthLight: { "data-depth": "light" },
} as const;

/** Item inside a reveal.cascade group. Delay is capped so long lists don't lag behind. */
export function revealItem(index: number): { "data-reveal-item": ""; style: CSSProperties } {
  return { "data-reveal-item": "", style: { ["--reveal-i" as string]: Math.min(index, 5) } };
}
