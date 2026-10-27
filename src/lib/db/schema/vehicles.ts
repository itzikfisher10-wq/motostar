import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { products } from "./catalog";

export const vehicleMakes = pgTable(
  "vehicle_makes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameHe: text("name_he"),
    logoUrl: text("logo_url"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("vehicle_makes_slug_uq").on(t.slug)],
);

export const vehicleModels = pgTable(
  "vehicle_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    makeId: uuid("make_id")
      .notNull()
      .references(() => vehicleMakes.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Production years, when known. Used to offer a year picker. */
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("vehicle_models_make_slug_uq").on(t.makeId, t.slug)],
);

/**
 * VERIFIED      – confirmed by the store (part number / physical check).
 * SELLER_STATED – compatibility written in the product description by the seller; not independently verified.
 */
export const fitmentStatus = pgEnum("fitment_status", ["VERIFIED", "SELLER_STATED"]);

export const fitments = pgTable(
  "fitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "cascade" }),
    /** Inclusive year range; null = not specified by the source. */
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    status: fitmentStatus("status").notNull().default("SELLER_STATED"),
    /** Exact text from the source that supports this fitment. */
    evidence: text("evidence"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fitments_product_model_uq").on(t.productId, t.modelId),
    index("fitments_model_idx").on(t.modelId),
  ],
);
