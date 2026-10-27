import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands, categories, fitments, productCategories, productImages, productOptions, productVariants, products, sourceRecords, vehicleMakes, vehicleModels } from "@/lib/db/schema";

export const ADMIN_PAGE_SIZE = 30;

export type AdminProductFilters = { q?: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED"; review?: boolean; page?: number };

export async function listAdminProducts(f: AdminProductFilters) {
  const where: SQL[] = [];
  if (f.status) where.push(eq(products.status, f.status));
  if (f.review) where.push(eq(products.needsReview, true));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(products.title, like), ilike(products.slug, like), sql`exists (select 1 from ${productVariants} v where v.product_id = ${products.id} and (v.sku ilike ${like} or v.barcode ilike ${like}))`)!);
  }
  const cond = where.length ? and(...where) : undefined;
  const page = Math.max(1, f.page ?? 1);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        status: products.status,
        needsReview: products.needsReview,
        updatedAt: products.updatedAt,
        priceMin: sql<number>`(select min(price_agorot) from ${productVariants} v where v.product_id = ${products.id})`,
        priceMax: sql<number>`(select max(price_agorot) from ${productVariants} v where v.product_id = ${products.id})`,
        variantCount: sql<number>`(select count(*)::int from ${productVariants} v where v.product_id = ${products.id})`,
        availableCount: sql<number>`(select count(*)::int from ${productVariants} v where v.product_id = ${products.id} and v.is_available and (not v.inventory_tracked or coalesce(v.stock_quantity, 0) > 0))`,
        onSale: sql<boolean>`exists (select 1 from ${productVariants} v where v.product_id = ${products.id} and v.compare_at_agorot > v.price_agorot)`,
        imageUrl: sql<string | null>`(select url from ${productImages} i where i.product_id = ${products.id} order by position limit 1)`,
      })
      .from(products)
      .where(cond)
      .orderBy(desc(products.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ n: count() }).from(products).where(cond),
  ]);
  return { rows, total: total?.n ?? 0, page, pageCount: Math.max(1, Math.ceil((total?.n ?? 0) / ADMIN_PAGE_SIZE)) };
}

export async function getAdminProduct(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return null;
  const [images, options, variants, cats, fits, sources] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position)),
    db.select().from(productOptions).where(eq(productOptions.productId, id)).orderBy(asc(productOptions.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.position)),
    db.select({ categoryId: productCategories.categoryId }).from(productCategories).where(eq(productCategories.productId, id)),
    db
      .select({ id: fitments.id, modelId: fitments.modelId, yearFrom: fitments.yearFrom, yearTo: fitments.yearTo, status: fitments.status, evidence: fitments.evidence, note: fitments.note, model: vehicleModels.name, make: vehicleMakes.name })
      .from(fitments)
      .innerJoin(vehicleModels, eq(vehicleModels.id, fitments.modelId))
      .innerJoin(vehicleMakes, eq(vehicleMakes.id, vehicleModels.makeId))
      .where(eq(fitments.productId, id))
      .orderBy(asc(vehicleMakes.name), asc(vehicleModels.name)),
    db.select({ sourceProductId: sourceRecords.sourceProductId, sourceUrl: sourceRecords.sourceUrl, resolution: sourceRecords.resolution }).from(sourceRecords).where(eq(sourceRecords.productId, id)),
  ]);
  return { product, images, options, variants, categoryIds: cats.map((c) => c.categoryId), fitments: fits, sources };
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

/** Lookups for the product form (brands, categories, vehicle models). */
export async function getProductFormLookups() {
  const [brandRows, categoryRows, models] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name, parentId: categories.parentId, sortOrder: categories.sortOrder }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ id: vehicleModels.id, name: vehicleModels.name, make: vehicleMakes.name })
      .from(vehicleModels)
      .innerJoin(vehicleMakes, eq(vehicleMakes.id, vehicleModels.makeId))
      .orderBy(asc(vehicleMakes.sortOrder), asc(vehicleMakes.name), asc(vehicleModels.sortOrder), asc(vehicleModels.name)),
  ]);
  // Parents first, children indented under them.
  const parents = categoryRows.filter((c) => !c.parentId);
  const tree = parents.flatMap((p) => [{ ...p, depth: 0 }, ...categoryRows.filter((c) => c.parentId === p.id).map((c) => ({ ...c, depth: 1 }))]);
  return { brands: brandRows, categories: tree, models };
}

export async function slugTaken(slug: string, exceptProductId?: string) {
  const rows = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
  return rows.some((r) => r.id !== exceptProductId);
}
