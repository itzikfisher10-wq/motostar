import sanitizeHtml from "sanitize-html";

/**
 * The only HTML allowed in product/category descriptions. No attributes, no links,
 * no images, no scripts. Used when saving (import + admin) and again when rendering.
 */
const POLICY: sanitizeHtml.IOptions = {
  allowedTags: ["p", "ul", "ol", "li", "strong", "em", "h3", "h4", "br"],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, POLICY).trim();
}

export function stripTags(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
