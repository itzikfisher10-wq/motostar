/**
 * Seeds reference data that is not part of the product catalog. Safe to re-run:
 * existing rows are never overwritten (prices you set in the admin are kept).
 *
 *   npm run db:seed
 *
 * Shipping: only self-pickup is activated. The original store's delivery prices
 * were not available in the captured data, so delivery methods are created
 * INACTIVE with price 0 — set the real prices in Admin → Shipping, then activate.
 */
import { createDb } from "../../src/lib/db/create";
import { shippingMethods } from "../../src/lib/db/schema";
import { loadScriptEnv } from "../lib/env";

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });

const methods: (typeof shippingMethods.$inferInsert)[] = [
  {
    code: "pickup",
    name: "איסוף עצמי מהחנות בחולון",
    description: "אליהו קראוזה 43, חולון. נעדכן אתכם כשההזמנה מוכנה לאיסוף.",
    etaText: "מוכן לאיסוף בדרך כלל תוך יום עסקים",
    priceAgorot: 0,
    freeOverAgorot: null,
    requiresAddress: false,
    isActive: true,
    sortOrder: 0,
  },
  {
    code: "standard",
    name: "משלוח עד הבית",
    description: "שליח עד הבית.",
    etaText: "3–5 ימי עבודה",
    priceAgorot: 0,
    freeOverAgorot: null,
    requiresAddress: true,
    isActive: false,
    sortOrder: 1,
  },
  {
    code: "express",
    name: "משלוח מהיר",
    description: "שליח עד הבית בעדיפות.",
    etaText: "1–3 ימי עבודה",
    priceAgorot: 0,
    freeOverAgorot: null,
    requiresAddress: true,
    isActive: false,
    sortOrder: 2,
  },
];

try {
  const inserted = await db.insert(shippingMethods).values(methods).onConflictDoNothing({ target: shippingMethods.code }).returning({ code: shippingMethods.code });
  console.info(`✓ Shipping methods: ${inserted.length} created, ${methods.length - inserted.length} already existed`);
} finally {
  await client.end();
}
