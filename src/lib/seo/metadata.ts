import type { Metadata } from "next";
import { site } from "@/config/site";

export function siteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Truncates at a word boundary for meta descriptions (~155 chars). */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.:;\-–]$/, "")}…`;
}

type Args = {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width?: number | null; height?: number | null; alt?: string } | null;
  noindex?: boolean;
  type?: "website" | "article";
};

/**
 * Every page builds its metadata through this function so titles, canonicals and
 * Open Graph stay consistent. `title` is the page-specific part; the brand suffix
 * comes from the root layout's title template.
 */
export function buildMetadata({ title, description, path, image, noindex, type = "website" }: Args): Metadata {
  const url = siteUrl(path);
  const images = image
    ? [{ url: image.url.startsWith("http") ? image.url : siteUrl(image.url), width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt ?? title }]
    : undefined;
  return {
    title,
    description: metaDescription(description),
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: { type, url, title: `${title} | ${site.name}`, description: metaDescription(description), siteName: site.name, locale: site.locale, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: `${title} | ${site.name}`, description: metaDescription(description) },
  };
}
