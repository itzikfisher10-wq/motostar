import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productCategories, products } from "@/lib/db/schema";

/** All categories (active and hidden) as a two-level list with direct product counts. */
export async function listAdminCategories() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: sql<number>`(select count(*)::int from ${productCategories} pc join ${products} p on p.id = pc.product_id where pc.category_id = ${categories.id} and p.status = 'ACTIVE')`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const roots = rows.filter((r) => !r.parentId);
  return roots.map((r) => ({ ...r, children: rows.filter((c) => c.parentId === r.id) }));
}

export async function getAdminCategory(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return (await db.query.categories.findFirst({ where: eq(categories.id, id) })) ?? null;
}

export async function listRootCategories() {
  return db.select({ id: categories.id, name: categories.name }).from(categories).where(sql`${categories.parentId} is null`).orderBy(asc(categories.sortOrder));
}
