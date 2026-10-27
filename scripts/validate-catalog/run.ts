/**
 * Catalog integrity check against the database. Exits non-zero on errors.
 *   npm run catalog:validate
 */
import { sql } from "drizzle-orm";
import { createDb } from "../../src/lib/db/create";
import { loadScriptEnv } from "../lib/env";

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });

type Check = { name: string; level: "error" | "warning"; query: ReturnType<typeof sql> };

const checks: Check[] = [
  { name: "Active products without variants", level: "error", query: sql`select p.slug from products p where p.status='ACTIVE' and not exists (select 1 from product_variants v where v.product_id=p.id)` },
  { name: "Variants with non-positive price", level: "error", query: sql`select p.slug || ' / ' || v.title from product_variants v join products p on p.id=v.product_id where v.price_agorot <= 0` },
  { name: "Compare-at price not above price", level: "error", query: sql`select p.slug || ' / ' || v.title from product_variants v join products p on p.id=v.product_id where v.compare_at_agorot is not null and v.compare_at_agorot <= v.price_agorot` },
  { name: "Tracked inventory without quantity", level: "error", query: sql`select p.slug || ' / ' || v.title from product_variants v join products p on p.id=v.product_id where v.inventory_tracked and v.stock_quantity is null` },
  { name: "Active products without images", level: "warning", query: sql`select p.slug from products p where p.status='ACTIVE' and not exists (select 1 from product_images i where i.product_id=p.id)` },
  { name: "Active products without category", level: "warning", query: sql`select p.slug from products p where p.status='ACTIVE' and not exists (select 1 from product_categories c where c.product_id=p.id)` },
  { name: "Images still served from the old Shopify CDN", level: "warning", query: sql`select p.slug from product_images i join products p on p.id=i.product_id where i.url like 'https://cdn.shopify.com/%' group by p.slug` },
  { name: "Duplicate SKUs across different products", level: "warning", query: sql`select v.sku from product_variants v where v.sku is not null group by v.sku having count(distinct v.product_id) > 1` },
  { name: "Products flagged for review", level: "warning", query: sql`select slug from products where needs_review` },
  { name: "Source records without product", level: "error", query: sql`select source_product_id::text from source_records where product_id is null` },
];

let errors = 0;
for (const c of checks) {
  const rows = (await db.execute(c.query)) as unknown as Record<string, string>[];
  const values = rows.map((r) => Object.values(r)[0]);
  const icon = values.length === 0 ? "✓" : c.level === "error" ? "✗" : "!";
  console.info(`${icon} ${c.name}: ${values.length}`);
  if (values.length && c.level === "error") errors += values.length;
  for (const v of values.slice(0, 15)) console.info(`    ${v}`);
  if (values.length > 15) console.info(`    … and ${values.length - 15} more`);
}
await client.end();
if (errors) {
  console.error(`\n✗ ${errors} error(s)`);
  process.exit(1);
}
console.info("\n✓ No blocking errors");
