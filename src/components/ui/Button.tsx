import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Buttons are capsules. They answer on press, not on release (scale 0.97 while held), and the
 * glass variants are translucent materials over whatever is behind them (globals.css → Materials).
 * glass: on dark or photo backgrounds. glassLight: on white / light grey.
 */
type Variant = "primary" | "dark" | "light" | "outline" | "ghost" | "glass" | "glassLight";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold leading-none whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quart)] active:scale-[0.97] active:duration-75 disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-signal text-paper shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_24px_-8px_rgb(225_18_26/0.6)] hover:bg-signal-deep",
  dark: "bg-ink text-paper shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-graphite-2",
  light: "bg-paper text-ink shadow-[0_0_0_1px_rgb(10_10_10/0.1)] hover:bg-mist",
  outline: "border border-current bg-transparent hover:bg-ink hover:text-paper hover:border-ink",
  ghost: "bg-transparent hover:bg-mist",
  glass: "glass-dark text-paper hover:bg-white/[0.16]",
  glassLight: "glass-light text-ink hover:bg-white/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-[3.25rem] px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant, size, className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
