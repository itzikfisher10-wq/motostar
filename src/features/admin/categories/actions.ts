"use server";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { checkbox, fail, fieldErrorsOf, optionalText, slugField, success, type ActionState } from "@/features/admin/forms";
import { revalidateStorefront } from "@/lib/cache/revalidate";
import { requireUser } from "@/features/auth/guard";
import { db } from "@/lib/db/client";
import { categories, productCategories } from "@/lib/db/schema";

const base = {
  name: z.string().trim().min(2, "שם קצר מדי").max(80),
  parentId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  description: optionalText(2000),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  isActive: checkbox,
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
};
const createSchema = z.object({ ...base, slug: slugField });
const updateSchema = z.object(base);

const read = (fd: FormData) => ({
  name: fd.get("name"),
  slug: fd.get("slug"),
  parentId: fd.get("parentId") ?? "",
  description: fd.get("description") ?? "",
  sortOrder: fd.get("sortOrder") || "0",
  isActive: fd.get("isActive"),
  seoTitle: fd.get("seoTitle") ?? "",
  seoDescription: fd.get("seoDescription") ?? "",
});

/** Two levels only (group → category), matching the storefront navigation. */
async function validParent(parentId: string | null, selfId?: string): Promise<string | null> {
  if (!parentId) return null;
  if (parentId === selfId) return "קטגוריה לא יכולה להיות האב של עצמה.";
  const parent = await db.query.categories.findFirst({ where: eq(categories.id, parentId), columns: { parentId: true } });
  if (!parent) return "קטגוריית האב לא נמצאה.";
  if (parent.parentId) return "אפשר לשייך רק לקטגוריה ראשית (שתי רמות בלבד).";
  if (selfId) {
    const [children] = await db.select({ n: count() }).from(categories).where(eq(categories.parentId, selfId));
    if (children?.n) return "לקטגוריה הזו יש תתי־קטגוריות, ולכן היא חייבת להישאר ראשית.";
  }
  return null;
}

export async function createCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  const parsed = createSchema.safeParse(read(fd));
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;
  const parentError = await validParent(d.parentId);
  if (parentError) return fail(parentError, { parentId: parentError });
  const taken = await db.query.categories.findFirst({ where: eq(categories.slug, d.slug), columns: { id: true } });
  if (taken) return fail("הכתובת תפוסה.", { slug: "הכתובת תפוסה" });

  const [row] = await db
    .insert(categories)
    .values({ name: d.name, slug: d.slug, parentId: d.parentId, description: d.description ?? null, sortOrder: d.sortOrder, isActive: d.isActive, seoTitle: d.seoTitle ?? null, seoDescription: d.seoDescription ?? null })
    .returning({ id: categories.id });
  await logAudit(user.id, "create", "category", row!.id, { name: d.name, slug: d.slug });
  revalidateStorefront();
  redirect(`/admin/categories/${row!.id}?created=1`);
}

export async function updateCategoryAction(categoryId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  const parsed = updateSchema.safeParse(read(fd));
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;
  const parentError = await validParent(d.parentId, categoryId);
  if (parentError) return fail(parentError, { parentId: parentError });

  await db
    .update(categories)
    .set({ name: d.name, parentId: d.parentId, description: d.description ?? null, sortOrder: d.sortOrder, isActive: d.isActive, seoTitle: d.seoTitle ?? null, seoDescription: d.seoDescription ?? null })
    .where(eq(categories.id, categoryId));
  await logAudit(user.id, "update", "category", categoryId, { fields: Object.keys(d) });
  revalidateStorefront();
  return success("השינויים נשמרו.");
}

/** Only empty categories can be deleted (no products, no sub-categories). Otherwise: deactivate. */
export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  const [[products], [children]] = await Promise.all([
    db.select({ n: count() }).from(productCategories).where(eq(productCategories.categoryId, categoryId)),
    db.select({ n: count() }).from(categories).where(eq(categories.parentId, categoryId)),
  ]);
  if (products?.n || children?.n) return fail(`אי אפשר למחוק: בקטגוריה ${products?.n ?? 0} מוצרים ו-${children?.n ?? 0} תתי־קטגוריות. אפשר להסתיר אותה במקום.`);
  const [row] = await db.delete(categories).where(eq(categories.id, categoryId)).returning({ name: categories.name, slug: categories.slug });
  if (!row) return fail("הקטגוריה לא נמצאה.");
  await logAudit(user.id, "delete", "category", categoryId, row);
  revalidateStorefront();
  redirect("/admin/categories?deleted=1");
}
