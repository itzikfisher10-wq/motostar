import localFont from "next/font/local";

/**
 * Self-hosted Heebo (Hebrew + Latin in one file per weight; built by
 * scripts/fonts/build_fonts.py from @fontsource/heebo). One family for the whole site:
 * 400/500 for reading, 700 for UI and emphasis, 900 for headlines.
 * next/font preloads the files and generates a size-matched fallback, so text does not jump
 * when the web font arrives. Change weights here and in globals.css (@theme).
 */
export const heebo = localFont({
  src: [
    { path: "./fonts/heebo-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/heebo-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/heebo-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/heebo-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-heebo",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
