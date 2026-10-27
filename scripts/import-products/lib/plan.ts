import type { ProductSpec } from "../../../src/lib/db/schema/catalog";
import { normalizeForSearch } from "../../../src/lib/text/search-normalize";
import { slugify, uniqueSlug } from "../../../src/lib/text/slug";
import {
  CATEGORY_OVERRIDES,
  CATEGORY_TREE,
  COLLECTION_REDIRECTS,
  COLLECTION_TO_CATEGORY,
  NON_CATEGORY_COLLECTIONS,
  PAGE_REDIRECTS,
  type CategoryDef,
} from "../config/categories";
import { FITMENTS, HELMET_COMPATIBILITY, type FitmentDef } from "../config/fitments";
import { DUPLICATES, VARIANT_MERGE_GROUPS } from "../config/merge-groups";
import { VEHICLES } from "../config/vehicles";
import { detectFindings, detectQualityIssues, type Finding, type QualityIssue } from "./dedupe";
import {
  cleanDescription,
  cleanTitle,
  contentHash,
  detectBrand,
  detectOrigin,
  extractSpecs,
  looksLikePartNumber,
  toAgorot,
} from "./normalize";
import { imageUrl, sourceProductUrl, type SourceData, type SourceProduct } from "./source";

export type PlannedImage = { sourceImageId: number; url: string; alt: string; width: number | null; height: number | null; position: number };
export type PlannedVariant = {
  sourceVariantId: number;
  title: string;
  sku: string | null;
  optionValues: Record<string, string>;
  priceAgorot: number;
  compareAtAgorot: number | null;
  isAvailable: boolean;
  sourceImageId: number | null;
  position: number;
};
export type PlannedSource = {
  sourceProductId: number;
  handle: string;
  url: string;
  title: string;
  resolution: "CREATED" | "MERGED_AS_VARIANT" | "DUPLICATE_OF";
  contentHash: string;
  raw: SourceProduct;
};
export type PlannedFitment = { make: string; model: string; yearFrom: number | null; yearTo: number | null; evidence: string; note: string | null };

export type PlannedProduct = {
  key: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  descriptionHtml: string;
  brandSlug: "arai" | "motul" | null;
  origin: "ORIGINAL" | "AFTERMARKET" | "UNSPECIFIED";
  specs: ProductSpec[];
  tags: string[];
  categorySlugs: string[];
  primaryCategorySlug: string | null;
  options: { name: string; values: string[] }[];
  images: PlannedImage[];
  variants: PlannedVariant[];
  fitments: PlannedFitment[];
  sources: PlannedSource[];
  needsReview: boolean;
  reviewNotes: string[];
  publishedAt: string;
  searchText: string;
};

export type ImportPlan = {
  products: PlannedProduct[];
  categories: CategoryDef[];
  redirects: { from: string; to: string }[];
  findings: Finding[];
  quality: QualityIssue[];
  collectionHints: { productId: number; title: string; collections: string[]; note: string }[];
  stats: {
    sourceRecords: number;
    sourceVariants: number;
    uniqueProducts: number;
    variants: number;
    mergedAsVariants: number;
    duplicatesMerged: number;
    needsReview: number;
    withoutImages: number;
    withoutCategory: number;
    collectionCountMismatch: { handle: string; title: string; reported: number; visible: number }[];
  };
};

/** Most specific category wins when a product sits in several. */
const PRIMARY_PRIORITY = [
  "helmets-accessories", "batteries", "starters", "belts", "filters", "service-kits", "brakes",
  "engine-oils", "mirrors", "windshields", "exhaust-guards", "backrests-racks", "electrical-lighting",
  "engine", "bodywork", "accessories", "replacement-parts",
];

const BRAND_NAMES = { arai: "Arai", motul: "Motul" } as const;

export function buildPlan(source: SourceData): ImportPlan {
  const byId = new Map(source.products.map((p) => [p.id, p]));
  const collectionsOf = new Map<number, string[]>();
  for (const c of source.collections) for (const id of c.ids) (collectionsOf.get(id) ?? collectionsOf.set(id, []).get(id)!).push(c.handle);

  const takenSlugs = new Set<string>();
  // A new slug must never reuse another source product's old handle: that old URL has to
  // keep redirecting to *its own* product (the source store had crossed handles, e.g. the
  // BTX14-BS battery lived at /products/מצבר-btx14 and the BTX14 at /products/מצבר-btx14-bs).
  const handleOwner = new Map(source.products.map((p) => [p.h, p.id]));
  const slugFor = (base: string, ownIds: number[]) => {
    const reserved = new Set(takenSlugs);
    for (const [handle, id] of handleOwner) if (!ownIds.includes(id)) reserved.add(handle);
    const slug = uniqueSlug(base, reserved);
    takenSlugs.add(slug);
    return slug;
  };
  const consumed = new Set<number>();
  const products: PlannedProduct[] = [];

  // 1. Declared color-variant merges.
  for (const group of VARIANT_MERGE_GROUPS) {
    const members = group.members.map((m) => {
      const p = byId.get(m.sourceId);
      if (!p) throw new Error(`Merge group ${group.key}: source product ${m.sourceId} not found`);
      if (p.vr.length !== 1) throw new Error(`Merge group ${group.key}: ${m.sourceId} already has ${p.vr.length} variants`);
      return { ...m, p };
    });
    const first = members[0]!.p;
    const desc = cleanDescription(first.b);
    const images: PlannedImage[] = [];
    const variants: PlannedVariant[] = members.map((m, i) => {
      const firstImage = m.p.im[0];
      for (const im of m.p.im) images.push(toImage(im, `${group.title} – ${m.value}`, images.length));
      const v = m.p.vr[0]!;
      return {
        sourceVariantId: v.id,
        title: m.value,
        sku: v.s,
        optionValues: { [group.optionName]: m.value },
        priceAgorot: toAgorot(v.p),
        compareAtAgorot: compareAt(v.p, v.c),
        isAvailable: v.a,
        sourceImageId: firstImage?.id ?? null,
        position: i,
      };
    });
    const planned = basePlanned({
      key: group.key,
      slug: slugFor(slugify(group.title), members.map((m) => m.p.id)),
      title: group.title,
      desc: { ...desc, html: stripColorLines(desc.html) },
      rawForSpecs: first.b,
      sources: members.map((m, i) => toSource(m.p, i === 0 ? "CREATED" : "MERGED_AS_VARIANT")),
      collectionHandles: unique(members.flatMap((m) => collectionsOf.get(m.p.id) ?? [])),
      memberIds: members.map((m) => m.p.id),
      options: [{ name: group.optionName, values: members.map((m) => m.value) }],
      images,
      variants,
    });
    planned.specs = planned.specs.filter((s) => s.label !== "צבע");
    planned.reviewNotes.push(`אוחד מ-${members.length} רשומות מקור כווריאציות צבע: ${group.reason}`);
    products.push(planned);
    members.forEach((m) => consumed.add(m.p.id));
  }

  // 2. Everything else, one product per source record (duplicates folded in below).
  const duplicateOf = new Map(DUPLICATES.map((d) => [d.duplicateId, d]));
  for (const p of source.products) {
    if (consumed.has(p.id) || duplicateOf.has(p.id)) continue;
    const desc = cleanDescription(p.b);
    const isSingle = p.vr.length === 1 && p.o.length === 1 && p.o[0]!.n === "Title";
    const images = p.im.map((im, i) => toImage(im, cleanTitle(p.t), i));
    const variants: PlannedVariant[] = p.vr.map((v, i) => ({
      sourceVariantId: v.id,
      title: isSingle ? "סטנדרטי" : v.t,
      sku: v.s,
      optionValues: isSingle ? {} : Object.fromEntries(p.o.map((o, oi) => [o.n, v.o[oi] ?? ""])),
      priceAgorot: toAgorot(v.p),
      compareAtAgorot: compareAt(v.p, v.c),
      isAvailable: v.a,
      sourceImageId: v.fi,
      position: i,
    }));
    const planned = basePlanned({
      key: `src-${p.id}`,
      slug: slugFor(slugify(cleanTitle(p.t)), [p.id, ...DUPLICATES.filter((d) => d.canonicalId === p.id).map((d) => d.duplicateId)]),
      title: cleanTitle(p.t),
      desc,
      rawForSpecs: p.b,
      sources: [toSource(p, "CREATED")],
      collectionHandles: collectionsOf.get(p.id) ?? [],
      memberIds: [p.id],
      options: isSingle ? [] : p.o.map((o) => ({ name: o.n, values: o.v })),
      images,
      variants,
    });
    // Variant images: label alt text with the option value.
    for (const v of planned.variants) {
      const img = planned.images.find((im) => im.sourceImageId === v.sourceImageId);
      if (img && Object.keys(v.optionValues).length) img.alt = `${planned.title} – ${v.title}`;
    }
    products.push(planned);
  }

  // 3. Exact duplicates: attach to the canonical product.
  for (const d of DUPLICATES) {
    const dup = byId.get(d.duplicateId);
    const target = products.find((p) => p.sources.some((s) => s.sourceProductId === d.canonicalId));
    if (!dup || !target) throw new Error(`Duplicate decision ${d.duplicateId}→${d.canonicalId}: record not found`);
    target.sources.push(toSource(dup, "DUPLICATE_OF"));
    for (const im of dup.im) target.images.push(toImage(im, target.title, target.images.length));
    target.needsReview = true;
    target.reviewNotes.push(`רשומת מקור ${d.duplicateId} זוהתה ככפילות ואוחדה: ${d.reason} ${d.confirmNote}`);
  }

  // 3b. Taglines the source reused on many products say nothing about the product.
  const taglineCount = new Map<string, number>();
  for (const p of products) if (p.shortDescription) taglineCount.set(p.shortDescription, (taglineCount.get(p.shortDescription) ?? 0) + 1);
  for (const p of products) if (p.shortDescription && (taglineCount.get(p.shortDescription) ?? 0) > 3) p.shortDescription = null;

  // 4. Redirects for collection and info-page URLs. Old *product* URLs are not listed here:
  //    the importer stores them as slug history (lib/apply.ts), so the product page redirects
  //    them in one hop to the product's current slug, even after renames in the admin.
  const redirects: { from: string; to: string }[] = [];
  for (const c of source.collections) {
    const cat = COLLECTION_TO_CATEGORY[c.handle];
    const to = cat ? `/categories/${cat}` : COLLECTION_REDIRECTS[c.handle];
    if (to) redirects.push({ from: `/collections/${c.handle}`, to });
  }
  redirects.push({ from: "/collections/all", to: "/products" }, { from: "/collections", to: "/categories" });
  for (const [page, to] of Object.entries(PAGE_REDIRECTS)) redirects.push({ from: `/pages/${page}`, to });

  // 5. Review flags from automatic findings.
  const findings = detectFindings(source.products);
  const quality = detectQualityIssues(source.products);
  const productOf = (id: number) => products.find((p) => p.sources.some((s) => s.sourceProductId === id));
  for (const f of findings) {
    if (f.kind === "SKU_COLLISION") {
      const owners = unique(f.ids.map((id) => productOf(id)?.key));
      if (owners.length > 1) for (const id of f.ids) flag(productOf(id), `ה-SKU "${f.sku}" משותף למוצרים שונים במקור — יש לתת SKU ייחודי`);
    }
    if (f.kind === "SIZE_VARIANT_CANDIDATE") for (const id of f.ids) flag(productOf(id), "מועמד לאיחוד כמוצר אחד עם בחירת נפח — לא אוחד, להחלטת בעל העסק");
  }
  for (const q of quality) if (q.issue.startsWith("הכותרת אומרת")) flag(productOf(q.id), q.issue);

  // 6. Vehicle-brand collection membership vs. stated fitment.
  const brandCollections = ["sym", "yamaha", "kymco", "honda", "kawasaki", "ktm", "can-am", "polaris"];
  const collectionHints: ImportPlan["collectionHints"] = [];
  for (const p of source.products) {
    const makes = (collectionsOf.get(p.id) ?? []).filter((h) => brandCollections.includes(h));
    if (!makes.length) continue;
    const stated = (FITMENTS[p.id] ?? []).map((f) => f.make);
    const missing = makes.filter((m) => !stated.includes(m));
    if (missing.length) collectionHints.push({ productId: p.id, title: p.t, collections: missing, note: "המוצר שויך במקור לקולקציית יצרן, אבל התיאור לא מציין דגם — לא נוצרה התאמה לרכב" });
  }

  const visible = new Set(source.products.map((p) => p.id));
  const collectionCountMismatch = source.collections
    .filter((c) => c.n !== c.ids.filter((id) => visible.has(id)).length)
    .map((c) => ({ handle: c.handle, title: c.title, reported: c.n, visible: c.ids.length }));

  const stats: ImportPlan["stats"] = {
    sourceRecords: source.products.length,
    sourceVariants: source.products.reduce((n, p) => n + p.vr.length, 0),
    uniqueProducts: products.length,
    variants: products.reduce((n, p) => n + p.variants.length, 0),
    mergedAsVariants: products.reduce((n, p) => n + p.sources.filter((s) => s.resolution === "MERGED_AS_VARIANT").length, 0),
    duplicatesMerged: products.reduce((n, p) => n + p.sources.filter((s) => s.resolution === "DUPLICATE_OF").length, 0),
    needsReview: products.filter((p) => p.needsReview).length,
    withoutImages: products.filter((p) => p.images.length === 0).length,
    withoutCategory: products.filter((p) => p.categorySlugs.length === 0).length,
    collectionCountMismatch,
  };

  const finalRedirects = dedupeRedirects(redirects);
  assertRedirectsSafe(finalRedirects, products.map((p) => `/products/${p.slug}`));
  return { products, categories: CATEGORY_TREE, redirects: finalRedirects, findings, quality, collectionHints, stats };
}

// ── helpers ──────────────────────────────────────────────────────────────

function basePlanned(args: {
  key: string;
  slug: string;
  title: string;
  desc: ReturnType<typeof cleanDescription>;
  rawForSpecs: string;
  sources: PlannedSource[];
  collectionHandles: string[];
  memberIds: number[];
  options: PlannedProduct["options"];
  images: PlannedImage[];
  variants: PlannedVariant[];
}): PlannedProduct {
  const specs = extractSpecs(args.rawForSpecs);
  const helmet = args.memberIds.map((id) => HELMET_COMPATIBILITY[id]).find(Boolean);
  if (helmet) specs.unshift({ label: "מתאים לקסדה", value: helmet });
  // Product-level part number only for single-variant products; otherwise it belongs to one variant.
  const onlySku = args.variants.length === 1 ? args.variants[0]!.sku : null;
  if (looksLikePartNumber(onlySku) && !specs.some((s) => s.label === "מק״ט יצרן")) specs.push({ label: "מק״ט", value: onlySku! });

  const categorySlugs = mapCategories(args.collectionHandles, args.memberIds);
  const fitments = args.memberIds.flatMap((id) => FITMENTS[id] ?? []).flatMap(expandFitment);
  const brandSlug = detectBrand(args.title);
  const origin = detectOrigin(args.title, args.rawForSpecs);
  const onSale = args.variants.some((v) => v.compareAtAgorot !== null);
  const reviewNotes: string[] = [];
  const fitNotes = fitments.map((f) => f.note).filter(Boolean) as string[];
  reviewNotes.push(...unique(fitNotes));
  if (categorySlugs.length === 0) reviewNotes.push("לא נמצאה קטגוריה במקור");
  for (const id of args.memberIds) if (CATEGORY_OVERRIDES[id]) reviewNotes.push(`תיקון קטגוריה: ${CATEGORY_OVERRIDES[id]!.reason}`);

  const searchText = normalizeForSearch(
    [
      args.title,
      ...args.variants.map((v) => `${v.sku ?? ""} ${v.title}`),
      brandSlug ? BRAND_NAMES[brandSlug] : "",
      ...specs.map((s) => s.value),
      ...fitments.map((f) => `${f.make} ${modelName(f.make, f.model)}`),
    ].join(" "),
  );

  return {
    key: args.key,
    slug: args.slug,
    title: args.title,
    shortDescription: args.desc.short,
    descriptionHtml: args.desc.html,
    brandSlug,
    origin,
    specs,
    tags: onSale ? ["sale"] : [],
    categorySlugs,
    primaryCategorySlug: [...categorySlugs].sort((a, b) => rank(a) - rank(b))[0] ?? null,
    options: args.options,
    images: args.images,
    variants: args.variants,
    fitments,
    sources: args.sources,
    needsReview: reviewNotes.length > 0 || fitNotes.length > 0,
    reviewNotes,
    publishedAt: args.sources[0]!.raw.pub,
    searchText,
  };

  function rank(slug: string) {
    const i = PRIMARY_PRIORITY.indexOf(slug);
    return i === -1 ? 999 : i;
  }
}

function mapCategories(handles: string[], memberIds: number[]): string[] {
  let slugs = unique(handles.filter((h) => !NON_CATEGORY_COLLECTIONS.has(h)).map((h) => COLLECTION_TO_CATEGORY[h]).filter(Boolean) as string[]);
  for (const id of memberIds) {
    const o = CATEGORY_OVERRIDES[id];
    if (!o) continue;
    if (o.remove) slugs = slugs.filter((s) => !o.remove!.includes(s));
    if (o.add) slugs = unique([...slugs, ...o.add]);
  }
  return slugs;
}

function expandFitment(f: FitmentDef): PlannedFitment[] {
  return f.models.map((model) => ({ make: f.make, model, yearFrom: f.yearFrom ?? null, yearTo: f.yearTo ?? null, evidence: f.evidence, note: f.note ?? null }));
}

function modelName(make: string, model: string) {
  return VEHICLES.find((m) => m.slug === make)?.models.find((x) => x.slug === model)?.name ?? model;
}

function toImage(im: SourceProduct["im"][number], alt: string, position: number): PlannedImage {
  return { sourceImageId: im.id, url: imageUrl(im), alt, width: im.w, height: im.h, position };
}

function toSource(p: SourceProduct, resolution: PlannedSource["resolution"]): PlannedSource {
  return { sourceProductId: p.id, handle: p.h, url: sourceProductUrl(p.h), title: p.t, resolution, contentHash: contentHash(p), raw: p };
}

function compareAt(price: string, compare: string | null): number | null {
  if (!compare) return null;
  const c = toAgorot(compare);
  return c > toAgorot(price) ? c : null;
}

/** Color-specific lines don't belong in a merged product's shared description. */
function stripColorLines(html: string) {
  return html.replace(/<li>[^<]*צבע[^<]*<\/li>/g, "");
}

function flag(p: PlannedProduct | undefined, note: string) {
  if (!p) return;
  p.needsReview = true;
  if (!p.reviewNotes.includes(note)) p.reviewNotes.push(note);
}

function unique<T>(arr: (T | undefined | null)[]): T[] {
  return [...new Set(arr.filter((x): x is T => x !== undefined && x !== null))];
}

/** A redirect may never start at a live product URL, point to another redirect (chain) or loop. */
export function assertRedirectsSafe(list: { from: string; to: string }[], livePaths: string[]) {
  const live = new Set(livePaths);
  const sources = new Set(list.map((r) => r.from));
  for (const r of list) {
    if (live.has(r.from)) throw new Error(`Redirect from a live product URL: ${r.from} → ${r.to}`);
    if (sources.has(r.to)) throw new Error(`Redirect chain or loop: ${r.from} → ${r.to}`);
  }
}

function dedupeRedirects(list: { from: string; to: string }[]) {
  const map = new Map<string, string>();
  for (const r of list) if (r.from !== r.to) map.set(r.from, r.to);
  return [...map].map(([from, to]) => ({ from, to }));
}
