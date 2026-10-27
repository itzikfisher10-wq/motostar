import { site } from "@/config/site";
import type { BreadcrumbItem, ProductCardData, ProductDetailData } from "@/features/catalog/types";
import { agorotToDecimal } from "@/lib/format/money";
import { stripTags } from "@/lib/security/sanitize";
import { siteUrl } from "./metadata";

/**
 * Schema.org structured data. Only real data goes in: no ratings or reviews
 * (the store has none), and shipping details are omitted until real shipping
 * rates are configured by the owner.
 */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["OnlineStore", "AutoPartsStore"],
    "@id": siteUrl("/#organization"),
    name: site.name,
    alternateName: site.nameHe,
    url: siteUrl("/"),
    description: site.description,
    telephone: site.phoneE164,
    email: site.email,
    address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.city, addressCountry: site.address.country },
    openingHoursSpecification: site.hours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.schemaDays, opens: h.open, closes: h.close })),
    sameAs: [site.instagram],
    currenciesAccepted: "ILS",
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IL",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: site.returnsDays,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    name: site.name,
    url: siteUrl("/"),
    inLanguage: "he-IL",
    publisher: { "@id": siteUrl("/#organization") },
    potentialAction: { "@type": "SearchAction", target: `${siteUrl("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "דף הבית", href: "/" }, ...items].map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: siteUrl(item.href) })),
  };
}

export function productJsonLd(p: ProductDetailData) {
  const url = siteUrl(`/products/${p.slug}`);
  const images = p.images.map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url)));
  const offers = p.variants.map((v) => ({
    "@type": "Offer",
    url: p.variants.length > 1 ? `${url}?variant=${v.id}` : url,
    sku: v.sku ?? undefined,
    priceCurrency: "ILS",
    price: agorotToDecimal(v.priceAgorot),
    availability: v.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: p.condition === "USED" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    seller: { "@id": siteUrl("/#organization") },
  }));
  const base = {
    name: p.title,
    description: p.shortDescription ?? stripTags(p.descriptionHtml).slice(0, 500),
    image: images,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    category: p.primaryCategory?.name,
  };
  if (p.variants.length > 1) {
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${url}#product`,
      url,
      ...base,
      productGroupID: p.id,
      variesBy: p.options.map((o) => (o.name === "צבע" ? "https://schema.org/color" : o.name)),
      hasVariant: p.variants.map((v, i) => ({
        "@type": "Product",
        name: `${p.title} – ${v.title}`,
        sku: v.sku ?? undefined,
        color: v.optionValues["צבע"],
        image: images[0],
        offers: offers[i],
      })),
    };
  }
  return { "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`, url, ...base, sku: p.variants[0]?.sku ?? undefined, offers: offers[0] };
}

export function itemListJsonLd(name: string, items: ProductCardData[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/products/${encodeURIComponent(p.slug)}`), name: p.title })),
  };
}
