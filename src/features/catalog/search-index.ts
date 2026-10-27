import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { brands, fitments, productVariants, products, vehicleMakes, vehicleModels } from "@/lib/db/schema";
import { normalizeForSearch } from "@/lib/text/search-normalize";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0] | Database;

/**
 * Rebuilds products.search_text from the current data: title, SKUs, variant titles,
 * brand, spec values and fitment make/model names. Same recipe as the importer
 * (scripts/import-products/lib/plan.ts). Call after any admin change to these fields.
 */
export async function rebuildSearchText(tx: Tx, productId: string): Promise<void> {
  const [product] = await tx.select({ title: products.title, specs: products.specs, brand: brands.name }).from(products).leftJoin(brands, eq(brands.id, products.brandId)).where(eq(products.id, productId));
  if (!product) return;
  const variants = await tx.select({ sku: productVariants.sku, title: productVariants.title }).from(productVariants).where(eq(productVariants.productId, productId));
  const fits = await tx
    .select({ make: vehicleMakes.name, model: vehicleModels.name })
    .from(fitments)
    .innerJoin(vehicleModels, eq(vehicleModels.id, fitments.modelId))
    .innerJoin(vehicleMakes, eq(vehicleMakes.id, vehicleModels.makeId))
    .where(eq(fitments.productId, productId));

  const searchText = normalizeForSearch(
    [product.title, ...variants.map((v) => `${v.sku ?? ""} ${v.title}`), product.brand ?? "", ...product.specs.map((s) => s.value), ...fits.map((f) => `${f.make} ${f.model}`)].join(" "),
  );
  await tx.update(products).set({ searchText }).where(eq(products.id, productId));
}
