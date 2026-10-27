import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../src/lib/db/create";
import {
  brands,
  categories,
  fitments,
  productCategories,
  productImages,
  productOptions,
  productSlugHistory,
  productVariants,
  products,
  sourceRecords,
  vehicleMakes,
  vehicleModels,
} from "../../../src/lib/db/schema";
import type { CategoryDef } from "../config/categories";
import { VEHICLES } from "../config/vehicles";
import type { ImportPlan, PlannedProduct } from "./plan";

export type ApplyResult = { created: number; updated: number; skipped: number; sourceRecordsWritten: number };

const BRANDS = [
  { slug: "arai", name: "Arai", description: "קסדות יפניות בעבודת יד. MotoStar מחזיקה חלפים מקוריים לדגמי SZ-R VAS, RX-7V ו-RAM-X." },
  { slug: "motul", name: "Motul", description: "שמני מנוע לאופנועים וקטנועים." },
];

/**
 * Writes the plan to the database. Safe to run repeatedly:
 *  - a product is identified by its source record ids, never by name;
 *  - existing products are skipped unless `updateExisting` is set, so edits made
 *    in the admin are not overwritten by accident;
 *  - with `updateExisting`, only source-owned fields (text, prices, availability)
 *    are refreshed, matched by source variant id. Nothing the admin added is deleted.
 */
export async function applyPlan(db: Database, plan: ImportPlan, opts: { updateExisting: boolean }): Promise<ApplyResult> {
  const result: ApplyResult = { created: 0, updated: 0, skipped: 0, sourceRecordsWritten: 0 };

  await db.transaction(async (tx) => {
    const categoryIds = await upsertCategories(tx as unknown as Database, plan.categories);
    const brandIds = new Map<string, string>();
    for (const b of BRANDS) {
      const [row] = await tx.insert(brands).values(b).onConflictDoUpdate({ target: brands.slug, set: { slug: b.slug } }).returning({ id: brands.id });
      brandIds.set(b.slug, row!.id);
    }
    const modelIds = await upsertVehicles(tx as unknown as Database);

    for (const planned of plan.products) {
      const sourceIds = planned.sources.map((s) => s.sourceProductId);
      const existing = await tx
        .select({ productId: sourceRecords.productId })
        .from(sourceRecords)
        .where(and(eq(sourceRecords.source, "shopify"), inArray(sourceRecords.sourceProductId, sourceIds)));
      const existingProductId = existing.find((e) => e.productId)?.productId ?? null;

      if (existingProductId && !opts.updateExisting) {
        await rememberOldHandles(tx as unknown as Database, existingProductId, planned);
        result.skipped++;
        continue;
      }

      const productId = existingProductId
        ? await updateProduct(tx as unknown as Database, existingProductId, planned, brandIds)
        : await createProduct(tx as unknown as Database, planned, brandIds, categoryIds, modelIds);
      if (existingProductId) result.updated++;
      else result.created++;
      await rememberOldHandles(tx as unknown as Database, productId, planned);

      for (const s of planned.sources) {
        await tx
          .insert(sourceRecords)
          .values({
            source: "shopify",
            sourceProductId: s.sourceProductId,
            sourceHandle: s.handle,
            sourceUrl: s.url,
            sourceTitle: s.title,
            productId,
            resolution: s.resolution,
            contentHash: s.contentHash,
            raw: s.raw,
          })
          .onConflictDoUpdate({
            target: [sourceRecords.source, sourceRecords.sourceProductId],
            set: { contentHash: s.contentHash, raw: s.raw, sourceTitle: s.title, importedAt: new Date() },
          });
        result.sourceRecordsWritten++;
      }
    }
  });

  return result;
}

async function createProduct(
  db: Database,
  p: PlannedProduct,
  brandIds: Map<string, string>,
  categoryIds: Map<string, string>,
  modelIds: Map<string, string>,
): Promise<string> {
  const [row] = await db
    .insert(products)
    .values({
      slug: p.slug,
      title: p.title,
      shortDescription: p.shortDescription,
      descriptionHtml: p.descriptionHtml,
      brandId: p.brandSlug ? brandIds.get(p.brandSlug) : null,
      primaryCategoryId: p.primaryCategorySlug ? categoryIds.get(p.primaryCategorySlug) : null,
      status: "ACTIVE",
      condition: "NEW",
      origin: p.origin,
      specs: p.specs,
      tags: p.tags,
      searchText: p.searchText,
      needsReview: p.needsReview,
      reviewNotes: p.reviewNotes.join("\n") || null,
      publishedAt: new Date(p.publishedAt),
    })
    .returning({ id: products.id });
  const productId = row!.id;

  const imageIdBySource = new Map<number, string>();
  for (const im of p.images) {
    const [img] = await db
      .insert(productImages)
      .values({ productId, url: im.url, sourceUrl: im.url, sourceImageId: im.sourceImageId, alt: im.alt, width: im.width, height: im.height, position: im.position })
      .returning({ id: productImages.id });
    if (!imageIdBySource.has(im.sourceImageId)) imageIdBySource.set(im.sourceImageId, img!.id);
  }

  for (const [i, o] of p.options.entries()) await db.insert(productOptions).values({ productId, name: o.name, values: o.values, position: i });

  for (const v of p.variants) {
    await db.insert(productVariants).values({
      productId,
      title: v.title,
      sku: v.sku,
      optionValues: v.optionValues,
      priceAgorot: v.priceAgorot,
      compareAtAgorot: v.compareAtAgorot,
      inventoryTracked: false,
      stockQuantity: null,
      isAvailable: v.isAvailable,
      weightGrams: null,
      imageId: v.sourceImageId ? imageIdBySource.get(v.sourceImageId) ?? null : null,
      position: v.position,
      sourceVariantId: v.sourceVariantId,
    });
  }

  const catIds = p.categorySlugs.map((s) => categoryIds.get(s)).filter(Boolean) as string[];
  if (catIds.length) await db.insert(productCategories).values(catIds.map((categoryId) => ({ productId, categoryId }))).onConflictDoNothing();

  for (const f of p.fitments) {
    const modelId = modelIds.get(`${f.make}/${f.model}`);
    if (!modelId) throw new Error(`Unknown vehicle model ${f.make}/${f.model} (product ${p.slug})`);
    await db
      .insert(fitments)
      .values({ productId, modelId, yearFrom: f.yearFrom, yearTo: f.yearTo, status: "SELLER_STATED", evidence: f.evidence, note: f.note })
      .onConflictDoNothing();
  }
  return productId;
}

async function updateProduct(db: Database, productId: string, p: PlannedProduct, brandIds: Map<string, string>): Promise<string> {
  await db
    .update(products)
    .set({
      title: p.title,
      shortDescription: p.shortDescription,
      descriptionHtml: p.descriptionHtml,
      brandId: p.brandSlug ? brandIds.get(p.brandSlug) : null,
      searchText: p.searchText,
    })
    .where(eq(products.id, productId));

  const known = new Set(
    (await db.select({ s: productImages.sourceImageId }).from(productImages).where(eq(productImages.productId, productId))).map((r) => r.s),
  );
  for (const im of p.images) {
    if (known.has(im.sourceImageId)) continue;
    await db.insert(productImages).values({ productId, url: im.url, sourceUrl: im.url, sourceImageId: im.sourceImageId, alt: im.alt, width: im.width, height: im.height, position: im.position });
  }

  for (const v of p.variants) {
    await db
      .update(productVariants)
      .set({ priceAgorot: v.priceAgorot, compareAtAgorot: v.compareAtAgorot, isAvailable: v.isAvailable, sku: v.sku })
      .where(eq(productVariants.sourceVariantId, v.sourceVariantId));
  }
  return productId;
}

async function upsertCategories(db: Database, tree: CategoryDef[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const walk = async (defs: CategoryDef[], parentId: string | null) => {
    for (const [i, c] of defs.entries()) {
      const [row] = await db
        .insert(categories)
        .values({ slug: c.slug, name: c.name, description: c.description ?? null, parentId, sortOrder: i })
        .onConflictDoUpdate({ target: categories.slug, set: { slug: c.slug } })
        .returning({ id: categories.id });
      ids.set(c.slug, row!.id);
      if (c.children) await walk(c.children, row!.id);
    }
  };
  await walk(tree, null);
  return ids;
}

async function upsertVehicles(db: Database): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [i, make] of VEHICLES.entries()) {
    const [m] = await db
      .insert(vehicleMakes)
      .values({ slug: make.slug, name: make.name, nameHe: make.nameHe, sortOrder: i })
      .onConflictDoUpdate({ target: vehicleMakes.slug, set: { slug: make.slug } })
      .returning({ id: vehicleMakes.id });
    for (const [j, model] of make.models.entries()) {
      const [row] = await db
        .insert(vehicleModels)
        .values({ makeId: m!.id, slug: model.slug, name: model.name, sortOrder: j })
        .onConflictDoUpdate({ target: [vehicleModels.makeId, vehicleModels.slug], set: { name: model.name } })
        .returning({ id: vehicleModels.id });
      ids.set(`${make.slug}/${model.slug}`, row!.id);
    }
  }
  return ids;
}

/**
 * Old Shopify product URLs → slug history. The product page then answers an old URL
 * with ONE permanent redirect to the product's *current* slug, even after it is
 * renamed in the admin (a static redirect list would go stale and chain).
 */
async function rememberOldHandles(db: Database, productId: string, planned: PlannedProduct) {
  const old = [...new Set(planned.sources.map((s) => s.handle))].filter((h) => h !== planned.slug);
  if (!old.length) return;
  await db
    .insert(productSlugHistory)
    .values(old.map((oldSlug) => ({ oldSlug, productId })))
    .onConflictDoNothing({ target: productSlugHistory.oldSlug });
}
