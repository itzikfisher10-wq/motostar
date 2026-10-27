import type { MetadataRoute } from "next";
import { isIndexableSite, siteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  // Temporary *.vercel.app address: keep search engines out entirely (see isIndexableSite).
  if (!isIndexableSite()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/order/", "/search"] }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}
