import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const productCondition = pgEnum("product_condition", ["NEW", "USED"]);
export const partOrigin = pgEnum("part_origin", ["ORIGINAL", "AFTERMARKET", "UNSPECIFIED"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").notNull().default(true),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [uniqueIndex("brands_slug_uq").on(t.slug)],
);

export type ProductSpec = { label: string; value: string };

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    /** Sanitized HTML. Always sanitize before writing (see lib/security/sanitize). */
    descriptionHtml: text("description_html"),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    primaryCategoryId: uuid("primary_category_id").references(() => categories.id, { onDelete: "set null" }),
    status: productStatus("status").notNull().default("DRAFT"),
    condition: productCondition("condition").notNull().default("NEW"),
    origin: partOrigin("origin").notNull().default("UNSPECIFIED"),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Normalized text used by search (title, SKUs, brand, synonyms). Maintained by the app. */
    searchText: text("search_text").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Set by the importer when a human should check the record. */
    needsReview: boolean("needs_review").notNull().default(false),
    reviewNotes: text("review_notes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_brand_idx").on(t.brandId),
    index("products_search_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("product_categories_category_idx").on(t.categoryId)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Original URL the image was imported from (kept for audit / re-mirroring). */
    sourceUrl: text("source_url"),
    sourceImageId: bigint("source_image_id", { mode: "number" }),
    alt: text("alt").notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    values: text("values").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [uniqueIndex("product_options_product_name_uq").on(t.productId, t.name)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Not globally unique: the source store reused SKUs for different products (see import report). */
    sku: text("sku"),
    barcode: text("barcode"),
    /** e.g. { "צבע": "שחור מט" } — keys match product_options.name */
    optionValues: jsonb("option_values").$type<Record<string, string>>().notNull().default({}),
    /** All money values are integer agorot (1 ₪ = 100). */
    priceAgorot: integer("price_agorot").notNull(),
    compareAtAgorot: integer("compare_at_agorot"),
    /**
     * When false, stock is not counted and availability is controlled by `isAvailable`.
     * Imported products start untracked because the source exposed no quantities.
     */
    inventoryTracked: boolean("inventory_tracked").notNull().default(false),
    stockQuantity: integer("stock_quantity"),
    isAvailable: boolean("is_available").notNull().default(true),
    weightGrams: integer("weight_grams"),
    imageId: uuid("image_id").references(() => productImages.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    /** Variant id in the original store (null for variants created in the admin). */
    sourceVariantId: bigint("source_variant_id", { mode: "number" }),
    ...timestamps,
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    index("product_variants_sku_idx").on(t.sku),
    uniqueIndex("product_variants_source_uq").on(t.sourceVariantId),
  ],
);

/** Old product slugs → current product, so renamed products keep working links. */
export const productSlugHistory = pgTable(
  "product_slug_history",
  {
    oldSlug: text("old_slug").primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const sourceResolution = pgEnum("source_resolution", ["CREATED", "MERGED_AS_VARIANT", "DUPLICATE_OF"]);

/** One row per record in the original store. Makes imports idempotent and auditable. */
export const sourceRecords = pgTable(
  "source_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    sourceProductId: bigint("source_product_id", { mode: "number" }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceTitle: text("source_title").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    resolution: sourceResolution("resolution").notNull(),
    contentHash: text("content_hash").notNull(),
    raw: jsonb("raw").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("source_records_source_id_uq").on(t.source, t.sourceProductId)],
);
