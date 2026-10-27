import localFont from "next/font/local";

/**
 * Self-hosted fonts (Hebrew + Latin in one file per weight; built by
 * scripts/fonts/build_fonts.py from the @fontsource packages).
 * next/font preloads them and generates a size-matched fallback, so text does not
 * jump when the web font arrives. Lighthouse-tested on mobile (see docs/performance.md). Change families/weights here and in globals.css (@theme).
 */
export const plex = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-hebrew-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-hebrew-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-hebrew-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  // Preloaded: without it the fallback→web font swap measurably shifted layout on product pages.
  // 700 is not shipped: bold text (<strong> in descriptions) uses 600.
  preload: true,
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const karantina = localFont({
  src: [
    { path: "./fonts/karantina-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/karantina-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-karantina",
  display: "swap",
  // Headlines are the largest text on most pages (LCP), so this font is preloaded.
  preload: true,
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
