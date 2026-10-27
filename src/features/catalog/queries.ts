import "server-only";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db/client";
import {
  brands,
  categories,
  fitments,
  productCategories,
  productImages,
  productVariants,
  products,
  productSlugHistory,
  vehicleMakes,
  vehicleModels,
} from "@/lib/db/schema";
import { normalizeForSearch } from "@/lib/text/search-normalize";
import { isVariantAvailable, maxPurchasable, variantAvailableSql } from "./availability";
import type {
  BreadcrumbItem,
  CategoryNode,
  ImageData,
  ProductCardData,
  ProductDetailData,
  ProductFilters,
} from "./types";

export const PAGE_SIZE = 24;

// ── Categories ───────────────────────────────────────────────────────────

/** Full active category tree with product counts (a product counts toward every ancestor). */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      parentId: categories.parentId,
      direct: sql<number>`(select count(*)::int from ${productCategories} pc join ${products} p on p.id = pc.product_id where pc.category_id = ${categories.id} and p.status = 'ACTIVE')`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));

  const nodes = new Map<string, CategoryNode & { direct: number }>(
    rows.map((r) => [r.id, { ...r, productCount: 0, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  // Distinct product counts per subtree.
  const subtreeIds = (n: CategoryNode): string[] => [n.id, ...n.children.flatMap(subtreeIds)];
  const counts = await db
    .select({ categoryId: productCategories.categoryId, productId: productCategories.productId })
    .from(productCategories)
    .innerJoin(products, and(eq(products.id, productCategories.productId), eq(products.status, "ACTIVE")));
  const byCategory = new Map<string, Set<string>>();
  for (const c of counts) (byCategory.get(c.categoryId) ?? byCategory.set(c.categoryId, new Set()).get(c.categoryId)!).add(c.productId);
  const fill = (n: CategoryNode) => {
    const set = new Set<string>();
    for (const id of subtreeIds(n)) for (const p of byCategory.get(id) ?? []) set.add(p);
    n.productCount = set.size;
    n.children.forEach(fill);
  };
  roots.forEach(fill);
  return roots;
});

export async function getCategoryBySlug(slug: string) {
  const tree = await getCategoryTree();
  const path: CategoryNode[] = [];
  const find = (nodes: CategoryNode[], trail: CategoryNode[]): boolean => {
    for (const n of nodes) {
      if (n.slug === slug) {
        path.push(...trail, n);
        return true;
      }
      if (find(n.children, [...trail, n])) return true;
    }
    return false;
  };
  if (!find(tree, [])) return null;
  const node = path[path.length - 1]!;
  const row = await db.query.categories.findFirst({ where: eq(categories.id, node.id), columns: { seoTitle: true, seoDescription: true } });
  return {
    node,
    parent: path.length > 1 ? path[path.length - 2]! : null,
    breadcrumbs: [
      { name: "קטגוריות", href: "/categories" },
      ...path.map((p) => ({ name: p.name, href: `/categories/${p.slug}` })),
    ] satisfies BreadcrumbItem[],
    seoTitle: row?.seoTitle ?? null,
    seoDescription: row?.seoDescription ?? null,
  };
}

function descendantIds(tree: CategoryNode[], slug: string): string[] {
  const walk = (nodes: CategoryNode[]): CategoryNode | null => {
    for (const n of nodes) {
      if (n.slug === slug) return n;
      const hit = walk(n.children);
      if (hit) return hit;
    }
    return null;
  };
  const root = walk(tree);
  if (!root) return [];
  const ids: string[] = [];
  const collect = (n: CategoryNode) => {
    ids.push(n.id);
    n.children.forEach(collect);
  };
  collect(root);
  return ids;
}

// ── Product listing ──────────────────────────────────────────────────────

/**
 * The one product-listing query used by category pages, brand pages, deals,
 * vehicle pages and search. Filters compose; results are paginated.
 */
export async function findProducts(filters: ProductFilters): Promise<{ items: ProductCardData[]; total: number; page: number; pageCount: number }> {
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const where: SQL[] = [eq(products.status, "ACTIVE")];

  if (filters.categorySlug) {
    const ids = descendantIds(await getCategoryTree(), filters.categorySlug);
    if (!ids.length) return { items: [], total: 0, page, pageCount: 0 };
    where.push(sql`exists (select 1 from ${productCategories} pc where pc.product_id = ${products.id} and pc.category_id in ${ids})`);
  }
  if (filters.brandSlug) {
    where.push(sql`${products.brandId} = (select id from ${brands} where slug = ${filters.brandSlug})`);
  }
  if (filters.modelId) {
    const year = filters.year ?? null;
    where.push(sql`exists (select 1 from ${fitments} f where f.product_id = ${products.id} and f.model_id = ${filters.modelId}
      and (${year}::int is null or ((f.year_from is null or f.year_from <= ${year}::int) and (f.year_to is null or f.year_to >= ${year}::int))))`);
  }

  let rank: SQL = sql`0`;
  const tokens = filters.query ? normalizeForSearch(filters.query).split(" ").filter((t) => t.length > 0).slice(0, 8) : [];
  if (filters.query && tokens.length === 0) return { items: [], total: 0, page, pageCount: 0 };
  if (tokens.length) {
    // Every token must appear (substring) or fuzzily match a word (typo tolerance via pg_trgm).
    for (const t of tokens) {
      const like = `%${t.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      where.push(sql`(${products.searchText} ilike ${like} or (char_length(${t}) >= 3 and word_similarity(${t}, ${products.searchText}) >= 0.5))`);
    }
    rank = sql.join(tokens.map((t) => sql`word_similarity(${t}, ${products.searchText})`), sql` + `);
  }

  const having: SQL[] = [];
  if (filters.onlyAvailable) having.push(sql`bool_or(${variantAvailableSql})`);
  if (filters.onSale) having.push(sql`bool_or(${productVariants.compareAtAgorot} is not null)`);
  if (filters.minPrice !== undefined) having.push(sql`min(${productVariants.priceAgorot}) >= ${filters.minPrice}`);
  if (filters.maxPrice !== undefined) having.push(sql`min(${productVariants.priceAgorot}) <= ${filters.maxPrice}`);

  const minPrice = sql`min(${productVariants.priceAgorot})`;
  const available = sql`bool_or(${variantAvailableSql})`;
  const order: SQL =
    filters.sort === "price-asc" ? sql`${minPrice} asc, ${products.title} asc`
    : filters.sort === "price-desc" ? sql`${minPrice} desc, ${products.title} asc`
    : filters.sort === "newest" ? sql`${products.publishedAt} desc nulls last, ${products.title} asc`
    : tokens.length ? sql`${available} desc, ${rank} desc, ${products.title} asc`
    : sql`${available} desc, bool_or(${productVariants.compareAtAgorot} is not null) desc, ${products.publishedAt} desc nulls last, ${products.title} asc`;

  const rows = await db
    .select({ id: products.id, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(...where))
    .groupBy(products.id)
    .having(having.length ? and(...having) : undefined)
    .orderBy(order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = rows[0]?.total ?? 0;
  return { items: await loadCards(rows.map((r) => r.id)), total, page, pageCount: Math.ceil(total / pageSize) };
}

/** Loads card data for the given ids, preserving order. */
export async function loadCards(ids: string[]): Promise<ProductCardData[]> {
  if (!ids.length) return [];
  const rows = await db.query.products.findMany({
    where: inArray(products.id, ids),
    columns: { id: true, slug: true, title: true, origin: true },
    with: {
      brand: { columns: { name: true } },
      variants: { columns: { priceAgorot: true, compareAtAgorot: true, isAvailable: true, inventoryTracked: true, stockQuantity: true } },
      images: { columns: { url: true, alt: true, width: true, height: true }, orderBy: asc(productImages.position), limit: 2 },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => {
      const prices = r.variants.map((v) => v.priceAgorot);
      const cheapest = [...r.variants].sort((a, b) => a.priceAgorot - b.priceAgorot)[0];
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        brandName: r.brand?.name ?? null,
        image: (r.images[0] as ImageData | undefined) ?? null,
        hoverImage: (r.images[1] as ImageData | undefined) ?? null,
        priceFrom: Math.min(...prices),
        priceTo: Math.max(...prices),
        compareAt: cheapest?.compareAtAgorot ?? null,
        isAvailable: r.variants.some(isVariantAvailable),
        variantCount: r.variants.length,
        origin: r.origin,
      };
    });
}

// ── Product detail ───────────────────────────────────────────────────────

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetailData | null> => {
  const p = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "ACTIVE")),
    with: {
      brand: { columns: { slug: true, name: true } },
      primaryCategory: { columns: { id: true, slug: true, name: true } },
      images: { orderBy: asc(productImages.position) },
      options: true,
      variants: { orderBy: asc(productVariants.position) },
      fitments: { with: { model: { with: { make: true } } } },
    },
  });
  if (!p) return null;

  const breadcrumbs: BreadcrumbItem[] = [{ name: "קטגוריות", href: "/categories" }];
  if (p.primaryCategory) {
    const cat = await getCategoryBySlug(p.primaryCategory.slug);
    if (cat) breadcrumbs.splice(0, breadcrumbs.length, ...cat.breadcrumbs);
  }
  breadcrumbs.push({ name: p.title, href: `/products/${p.slug}` });

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    descriptionHtml: p.descriptionHtml,
    brand: p.brand,
    origin: p.origin,
    condition: p.condition,
    specs: p.specs,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || p.title, width: i.width, height: i.height })),
    options: [...p.options].sort((a, b) => a.position - b.position).map((o) => ({ name: o.name, values: o.values })),
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      optionValues: v.optionValues,
      priceAgorot: v.priceAgorot,
      compareAtAgorot: v.compareAtAgorot,
      isAvailable: isVariantAvailable(v),
      maxQuantity: maxPurchasable(v),
      imageId: v.imageId,
    })),
    fitments: p.fitments
      .map((f) => ({
        makeSlug: f.model.make.slug,
        makeName: f.model.make.name,
        modelSlug: f.model.slug,
        modelName: f.model.name,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
        status: f.status,
        evidence: f.evidence,
      }))
      .sort((a, b) => a.makeName.localeCompare(b.makeName) || a.modelName.localeCompare(b.modelName)),
    breadcrumbs,
    primaryCategory: p.primaryCategory ? { slug: p.primaryCategory.slug, name: p.primaryCategory.name } : null,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    updatedAt: p.updatedAt,
  };
});

/** Old slug (renamed product) → current slug. */
export async function resolveRenamedSlug(slug: string): Promise<string | null> {
  const row = await db
    .select({ slug: products.slug })
    .from(productSlugHistory)
    .innerJoin(products, eq(products.id, productSlugHistory.productId))
    .where(eq(productSlugHistory.oldSlug, slug))
    .limit(1);
  return row[0]?.slug ?? null;
}

/** Same primary category first, then products sharing a fitted model. */
export async function getRelatedProducts(productId: string, limit = 8): Promise<ProductCardData[]> {
  const rows = await db.execute<{ id: string }>(sql`
    with me as (select primary_category_id as cat from ${products} where id = ${productId}),
    my_models as (select model_id from ${fitments} where product_id = ${productId})
    select p.id from ${products} p
    where p.status = 'ACTIVE' and p.id <> ${productId}
      and (p.primary_category_id = (select cat from me)
           or exists (select 1 from ${fitments} f where f.product_id = p.id and f.model_id in (select model_id from my_models)))
    order by (exists (select 1 from ${fitments} f where f.product_id = p.id and f.model_id in (select model_id from my_models))) desc,
             (p.primary_category_id = (select cat from me)) desc, p.published_at desc nulls last
    limit ${limit}`);
  return loadCards((rows as unknown as { id: string }[]).map((r) => r.id));
}

// ── Brands ───────────────────────────────────────────────────────────────

export async function getBrandsWithProducts() {
  return db
    .select({
      slug: brands.slug,
      name: brands.name,
      description: brands.description,
      count: sql<number>`count(${products.id})::int`,
    })
    .from(brands)
    .innerJoin(products, and(eq(products.brandId, brands.id), eq(products.status, "ACTIVE")))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id)
    .orderBy(asc(brands.name));
}

export async function getBrandBySlug(slug: string) {
  return (await db.query.brands.findFirst({ where: and(eq(brands.slug, slug), eq(brands.isActive, true)) })) ?? null;
}

// ── Vehicles ─────────────────────────────────────────────────────────────

export const getVehicleTree = cache(async () => {
  const makes = await db.query.vehicleMakes.findMany({
    orderBy: asc(vehicleMakes.sortOrder),
    with: { models: { orderBy: asc(vehicleModels.sortOrder) } },
  });
  const counts = await db
    .select({ modelId: fitments.modelId, n: sql<number>`count(distinct ${fitments.productId})::int` })
    .from(fitments)
    .innerJoin(products, and(eq(products.id, fitments.productId), eq(products.status, "ACTIVE")))
    .groupBy(fitments.modelId);
  const byModel = new Map(counts.map((c) => [c.modelId, c.n]));
  return makes.map((m) => ({
    slug: m.slug,
    name: m.name,
    nameHe: m.nameHe,
    models: m.models.map((md) => ({ id: md.id, slug: md.slug, name: md.name, yearFrom: md.yearFrom, yearTo: md.yearTo, productCount: byModel.get(md.id) ?? 0 })),
  }));
});

export type VehicleTree = Awaited<ReturnType<typeof getVehicleTree>>;

export async function findModel(makeSlug: string, modelSlug: string) {
  const tree = await getVehicleTree();
  const make = tree.find((m) => m.slug === makeSlug);
  const model = make?.models.find((m) => m.slug === modelSlug);
  return make && model ? { make, model } : null;
}

// ── Sitemap ──────────────────────────────────────────────────────────────

export async function getSitemapEntries() {
  const [prods, cats, brandRows] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "ACTIVE")),
    db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.isActive, true)),
    getBrandsWithProducts(),
  ]);
  return { products: prods, categories: cats, brands: brandRows };
}
