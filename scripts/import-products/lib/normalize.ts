import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import type { ProductSpec } from "../../../src/lib/db/schema/catalog";
import type { SourceProduct } from "./source";

/** "120.00" → 12000 (agorot). Integer math only. */
export function toAgorot(price: string): number {
  const [shekels, fraction = ""] = price.split(".");
  return Number(shekels) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

export function contentHash(p: SourceProduct): string {
  return createHash("sha256").update(JSON.stringify(p)).digest("hex");
}

const WHATSAPP_BLOCK = /<div> ?<a href="https:\/\/wa\.me[^"]*">.*?<\/a> ?<\/div>/g;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

export type CleanDescription = {
  /** Sanitized HTML for the product page. */
  html: string;
  /** One-line summary (the source's "⚡" line), or null. */
  short: string | null;
  /** Lines that were removed because the site shows them globally (shipping blurb, WhatsApp CTA). */
  removedBoilerplate: string[];
};

/**
 * Turns the source description into clean product-page HTML:
 *  - removes the WhatsApp button (the new product page has its own),
 *  - removes the store-wide "📦 מידע נוסף" shipping blurb and "לא בטוחים בהתאמה?" line
 *    (both are shown site-wide on every product page instead),
 *  - lifts the "⚡" line out as the short description,
 *  - strips decorative emoji and all attributes.
 * The untouched original is kept in source_records.raw.
 */
export function cleanDescription(rawHtml: string): CleanDescription {
  const removedBoilerplate: string[] = [];
  let html = rawHtml.replace(WHATSAPP_BLOCK, () => {
    removedBoilerplate.push("כפתור וואטסאפ");
    return "";
  });

  html = sanitizeHtml(html, {
    allowedTags: ["p", "ul", "ol", "li", "strong", "em", "h3", "h4", "br", "div"],
    allowedAttributes: {},
  });

  // Store-wide shipping blurb: heading "מידע נוסף" + following list.
  html = html.replace(/<(h3|p)>\s*📦?\s*מידע נוסף\s*<\/\1>\s*<ul>[\s\S]*?<\/ul>/g, (m) => {
    removedBoilerplate.push(textOf(m));
    return "";
  });
  html = html.replace(/<div>\s*לא בטוחים[\s\S]*?<\/div>/g, (m) => {
    removedBoilerplate.push(textOf(m));
    return "";
  });

  let short: string | null = null;
  html = html.replace(/<div>\s*⚡\s*([\s\S]*?)<\/div>/, (_m, inner: string) => {
    const text = textOf(inner).replace(/^למה לבחור בנו\?\s*/, "").trim();
    short = text || null;
    // Long "why" paragraphs stay in the body as well; short taglines don't need repeating.
    return text.length > 140 ? `<p>${escapeHtml(text)}</p>` : "";
  });

  html = html
    .replace(/<h3>\s*✔️?\s*פרטי המוצר\s*<\/h3>/g, "")
    .replace(/<p>\s*✔️?\s*פרטי המוצר\s*<\/p>/g, "")
    .replace(/<p>\s*🔧\s*([^<]+)<\/p>/g, "<h3>$1</h3>")
    .replace(EMOJI, "")
    .replace(/<div>/g, "<p>")
    .replace(/<\/div>/g, "</p>")
    .replace(/&nbsp;/g, " ")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<p>\s*(<(?:ul|h3|p)>)/g, "$1")
    .replace(/(<\/(?:ul|h3|p)>)\s*<\/p>/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

  // Second sanitize pass guarantees well-formed, attribute-free output after the regex edits.
  html = sanitizeHtml(html, { allowedTags: ["p", "ul", "ol", "li", "strong", "em", "h3", "h4", "br"], allowedAttributes: {} });

  return { html, short, removedBoilerplate };
}

export function textOf(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(EMOJI, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SPEC_LABELS: Record<string, string> = {
  'מק"ט': "מק״ט יצרן",
  "דגם": "דגם",
  "עובי": "עובי",
  "צבע": "צבע",
  "נפח": "נפח",
};

/** Pulls "label: value" facts out of description list items. */
export function extractSpecs(rawHtml: string): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const seen = new Set<string>();
  for (const m of rawHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const text = textOf(m[1]!);
    const kv = text.match(/^([^:]{1,20}):\s*(.+)$/);
    if (!kv) continue;
    const label = SPEC_LABELS[kv[1]!.trim()];
    if (label && !seen.has(label)) {
      seen.add(label);
      specs.push({ label, value: kv[2]!.trim() });
    }
  }
  return specs;
}

/** ORIGINAL / AFTERMARKET from explicit wording only; otherwise UNSPECIFIED. */
export function detectOrigin(title: string, rawHtml: string): "ORIGINAL" | "AFTERMARKET" | "UNSPECIFIED" {
  const t = title;
  const body = textOf(rawHtml);
  // On Arai helmet parts the seller writes "חליפי/ים" meaning "replacement part", not
  // "non-original", so the word is ignored for Arai and only "מקורי" counts.
  const isArai = /arai/i.test(t);
  if (!isArai && /חליפי|תואם/.test(t)) return "AFTERMARKET";
  if (/מקורי/.test(t)) return "ORIGINAL";
  if (!isArai && /חליפי|תואם למקור|זהים? (?:לחלק )?(?:ה)?מקורי|זהים למקור/.test(body)) return "AFTERMARKET";
  if (/מקורי/.test(body) && !/חליפי/.test(body)) return "ORIGINAL";
  return "UNSPECIFIED";
}

/** Brand only when the product names it explicitly. */
export function detectBrand(title: string): "arai" | "motul" | null {
  if (/arai/i.test(title)) return "arai";
  if (/motul|מוטול/i.test(title)) return "motul";
  return null;
}

/** Shopify's `sku` field was used for free-text names. Real part numbers look like codes. */
export function looksLikePartNumber(sku: string | null): boolean {
  return !!sku && /^[A-Z0-9][A-Z0-9\-\/.]{2,}$/i.test(sku) && !/\s/.test(sku);
}
