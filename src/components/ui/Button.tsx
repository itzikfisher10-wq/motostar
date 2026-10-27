import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "dark" | "light" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-control)] transition-[background-color,color,border-color,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-paper hover:bg-signal-deep",
  dark: "bg-ink text-paper hover:bg-graphite",
  light: "bg-paper text-ink hover:bg-mist",
  outline: "border border-current bg-transparent hover:bg-ink hover:text-paper hover:border-ink",
  ghost: "bg-transparent hover:bg-mist",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
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
