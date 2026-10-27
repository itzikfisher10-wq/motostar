/**
 * Prepares a clean database for the end-to-end suite (never the development DB),
 * then adds test-only fixtures. Run by playwright.config.ts before the server starts.
 * Target: E2E_DATABASE_URL (default postgres://postgres:postgres@localhost:5432/motostar_e2e).
 */
import { eq } from "drizzle-orm";
import { createDb } from "../../src/lib/db/create";
import { shippingMethods, users } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/security/password";
import { resetDatabase } from "../support/reset-db";
import { E2E } from "./fixtures/constants";

await resetDatabase(E2E.databaseUrl);

// Test-only fixtures. These values exist only in the e2e database.
const { db, client } = createDb(E2E.databaseUrl, { max: 1 });
try {
  await db.update(shippingMethods).set({ isActive: true, priceAgorot: E2E.deliveryPriceAgorot, freeOverAgorot: E2E.freeShippingOverAgorot }).where(eq(shippingMethods.code, "standard"));
  await db.insert(users).values({ email: E2E.admin.email, name: "E2E Owner", passwordHash: await hashPassword(E2E.admin.password), role: "OWNER" });
  await db.insert(users).values({ email: E2E.staff.email, name: "E2E Staff", passwordHash: await hashPassword(E2E.staff.password), role: "STAFF" });
  console.info("✓ E2E database ready");
} finally {
  await client.end();
}
