import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { heebo } from "@/styles/fonts";
import { site } from "@/config/site";
import { isIndexableSite, siteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: { default: `חלקי חילוף לאופנועים וקטנועים בחולון | ${site.name}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
  // Pages that do not set their own robots inherit this (temporary *.vercel.app: noindex).
  robots: isIndexableSite() ? undefined : { index: false, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
