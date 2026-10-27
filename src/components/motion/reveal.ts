import type { CSSProperties } from "react";

/**
 * Typed opt-ins for the motion in src/styles/motion.css.
 * Spread them onto an element: <h2 {...reveal.wipe}>. Works in server components.
 * Entrances (focus, panel, wipe, grid, cascade) are triggered by RevealObserver (store layout)
 * and run in every browser; drift, depth and close follow the scroll where supported.
 * Reduced-motion users, and visitors without JS, see the final state.
 */
export const reveal = {
  /** Heading or text block: soft-focus rise as it enters. */
  focus: { "data-reveal": "focus" },
  /** Large panel or box: grows into place. */
  panel: { "data-reveal": "panel" },
  /** Image wrapper inside an overflow-hidden frame: parallax drift while on screen. */
  drift: { "data-drift": "" },
  /** Grid of cards (2/3/4 columns): cards rise row by row, columns staggered. Put on the <ul>. */
  grid: { "data-reveal": "grid" },
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
