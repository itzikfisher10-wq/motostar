import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { shippingMethods } from "@/lib/db/schema";

/** All shipping methods (active and inactive) for the admin. */
export async function listShippingMethods() {
  return db.select().from(shippingMethods).orderBy(asc(shippingMethods.sortOrder));
}
