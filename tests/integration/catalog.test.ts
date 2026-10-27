import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getProductBySlug, resolveRenamedSlug } from "@/features/catalog/queries";
import { db } from "@/lib/db/client";
import { products, sourceRecords } from "@/lib/db/schema";

/** The imported catalog in a real database (tests/support/global-setup.ts runs the importer). */
afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
});

describe("imported catalog", () => {
  it("has every source record attached to a product", async () => {
    const rows = await db.select({ productId: sourceRecords.productId }).from(sourceRecords);
    expect(rows).toHaveLength(79);
    expect(rows.every((r) => r.productId)).toBe(true);
    expect(await db.$count(products)).toBe(71);
  });

  it("resolves every old Shopify product URL to the product that owned it", async () => {
    const rows = await db.select({ handle: sourceRecords.sourceHandle, slug: products.slug }).from(sourceRecords).innerJoin(products, eq(products.id, sourceRecords.productId));
    for (const r of rows) {
      const resolved = r.handle === r.slug ? r.slug : await resolveRenamedSlug(r.handle);
      expect(resolved, r.handle).toBe(r.slug);
      expect(await getProductBySlug(r.handle) === null || r.handle === r.slug, `${r.handle} must not serve another product`).toBe(true);
    }
  });
});
