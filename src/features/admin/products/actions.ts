"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/features/admin/audit";
import { fail, fieldErrorsOf, success, type ActionState } from "@/features/admin/forms";
import { revalidateStorefront } from "@/lib/cache/revalidate";
import { requireUser } from "@/features/auth/guard";
import { rebuildSearchText } from "@/features/catalog/search-index";
import { invalidateSlugRedirects } from "@/features/catalog/slug-redirects";
import { db } from "@/lib/db/client";
import { fitments, orderItems, productCategories, productImages, productOptions, productSlugHistory, productVariants, products } from "@/lib/db/schema";
import { processUploadedImage } from "@/lib/media/process-image";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { getStorage } from "@/lib/storage";
import { slugify, uniqueSlug } from "@/lib/text/slug";
import { slugTaken } from "./queries";
import { createProductSchema, fitmentSchema, productDetailsSchema, variantsPayloadSchema } from "./schema";

const isUuid = (v: string) => /^[0-9a-f-]{36}$/.test(v);

// ── Create ──────────────────────────────────────────────────────────────

export async function createProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  const parsed = createProductSchema.safeParse({ title: fd.get("title"), price: fd.get("price"), categoryId: fd.get("categoryId") ?? "" });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));

  const base = slugify(parsed.data.title) || "מוצר";
  const existing = await db.select({ slug: products.slug }).from(products).where(sql`${products.slug} like ${base + "%"}`);
  const slug = uniqueSlug(base, new Set(existing.map((r) => r.slug)));

  const id = await db.transaction(async (tx) => {
    const [p] = await tx.insert(products).values({ title: parsed.data.title, slug, status: "DRAFT", primaryCategoryId: parsed.data.categoryId }).returning({ id: products.id });
    await tx.insert(productVariants).values({ productId: p!.id, title: "ברירת מחדל", priceAgorot: parsed.data.price, isAvailable: true });
    if (parsed.data.categoryId) await tx.insert(productCategories).values({ productId: p!.id, categoryId: parsed.data.categoryId });
    await rebuildSearchText(tx, p!.id);
    return p!.id;
  });
  await logAudit(user.id, "create", "product", id, { title: parsed.data.title });
  redirect(`/admin/products/${id}?created=1`);
}

// ── Details, categories, SEO, review flag ───────────────────────────────

export async function updateProductDetailsAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  if (!isUuid(productId)) return fail("מוצר לא נמצא.");

  const labels = fd.getAll("specLabel").map(String);
  const values = fd.getAll("specValue").map(String);
  const parsed = productDetailsSchema.safeParse({
    title: fd.get("title"),
    slug: fd.get("slug"),
    status: fd.get("status"),
    condition: fd.get("condition"),
    origin: fd.get("origin"),
    brandId: fd.get("brandId") ?? "",
    primaryCategoryId: fd.get("primaryCategoryId") ?? "",
    categoryIds: fd.getAll("categoryIds").map(String),
    shortDescription: fd.get("shortDescription") ?? "",
    descriptionHtml: fd.get("descriptionHtml") ?? "",
    specs: labels.map((label, i) => ({ label, value: values[i] ?? "" })).filter((s) => s.label.trim() || s.value.trim()),
    seoTitle: fd.get("seoTitle") ?? "",
    seoDescription: fd.get("seoDescription") ?? "",
    needsReview: fd.get("needsReview"),
    reviewNotes: fd.get("reviewNotes") ?? "",
  });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const d = parsed.data;

  const current = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!current) return fail("מוצר לא נמצא.");
  if (d.slug !== current.slug && (await slugTaken(d.slug, productId))) return fail("הכתובת תפוסה על ידי מוצר אחר.", { slug: "הכתובת תפוסה" });
  if (d.status === "ACTIVE") {
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(productVariants).where(eq(productVariants.productId, productId));
    if (!n) return fail("אי אפשר לפרסם מוצר ללא וריאציה עם מחיר.");
  }

  const categoryIds = [...new Set([...(d.primaryCategoryId ? [d.primaryCategoryId] : []), ...d.categoryIds])];

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        title: d.title,
        slug: d.slug,
        status: d.status,
        condition: d.condition,
        origin: d.origin,
        brandId: d.brandId,
        primaryCategoryId: d.primaryCategoryId,
        shortDescription: d.shortDescription ?? null,
        descriptionHtml: d.descriptionHtml ? sanitizeRichText(d.descriptionHtml) : null,
        specs: d.specs,
        seoTitle: d.seoTitle ?? null,
        seoDescription: d.seoDescription ?? null,
        needsReview: d.needsReview,
        reviewNotes: d.reviewNotes ?? null,
        publishedAt: d.status === "ACTIVE" && !current.publishedAt ? new Date() : current.publishedAt,
      })
      .where(eq(products.id, productId));

    if (d.slug !== current.slug) {
      // The old URL keeps working (301 → new URL). A slug reused later wins over history.
      await tx.delete(productSlugHistory).where(eq(productSlugHistory.oldSlug, d.slug));
      await tx.insert(productSlugHistory).values({ oldSlug: current.slug, productId }).onConflictDoUpdate({ target: productSlugHistory.oldSlug, set: { productId } });
    }

    await tx.delete(productCategories).where(eq(productCategories.productId, productId));
    if (categoryIds.length) await tx.insert(productCategories).values(categoryIds.map((categoryId) => ({ productId, categoryId })));
    await rebuildSearchText(tx, productId);
  });

  if (d.slug !== current.slug || d.status !== current.status) invalidateSlugRedirects();
  await logAudit(user.id, "update", "product", productId, { fields: Object.keys(d), slugChanged: d.slug !== current.slug, status: d.status });
  revalidateStorefront();
  return success("השינויים נשמרו.");
}

// ── Options & variants ──────────────────────────────────────────────────

export async function saveVariantsAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  if (!isUuid(productId)) return fail("מוצר לא נמצא.");
  let json: unknown;
  try {
    json = JSON.parse(String(fd.get("payload") ?? ""));
  } catch {
    return fail("בקשה לא תקינה.");
  }
  const parsed = variantsPayloadSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "יש לתקן את הנתונים.", fieldErrorsOf(parsed.error));
  const { options, variants } = parsed.data;

  const imageIds = variants.map((v) => v.imageId).filter((x): x is string => !!x);
  if (imageIds.length) {
    const own = await db.select({ id: productImages.id }).from(productImages).where(and(eq(productImages.productId, productId), inArray(productImages.id, imageIds)));
    if (own.length !== new Set(imageIds).size) return fail("תמונה שנבחרה לא שייכת למוצר.");
  }

  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, productId));
    const existingIds = new Set(existing.map((e) => e.id));
    const keepIds = variants.map((v) => v.id).filter((id): id is string => !!id && existingIds.has(id));

    // Variants removed in the editor. Past orders keep their snapshots; carts drop the line.
    await tx.delete(productVariants).where(keepIds.length ? and(eq(productVariants.productId, productId), notInArray(productVariants.id, keepIds)) : eq(productVariants.productId, productId));

    for (const [position, v] of variants.entries()) {
      const optionValues = Object.fromEntries(options.map((name) => [name, v.optionValues[name]!]));
      const values = {
        title: options.length ? options.map((n) => optionValues[n]).join(" / ") : "ברירת מחדל",
        optionValues,
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        priceAgorot: v.price,
        compareAtAgorot: v.compareAt,
        isAvailable: v.isAvailable,
        inventoryTracked: v.inventoryTracked,
        stockQuantity: v.inventoryTracked ? v.stockQuantity : null,
        weightGrams: v.weightGrams,
        imageId: v.imageId,
        position,
      };
      if (v.id && existingIds.has(v.id)) await tx.update(productVariants).set(values).where(eq(productVariants.id, v.id));
      else await tx.insert(productVariants).values({ ...values, productId });
    }

    await tx.delete(productOptions).where(eq(productOptions.productId, productId));
    if (options.length) {
      await tx.insert(productOptions).values(options.map((name, position) => ({ productId, name, position, values: [...new Set(variants.map((v) => v.optionValues[name]!))] })));
    }
    // Sale tag mirrors the importer: a product is "on sale" when any variant has a compare-at price.
    const onSale = variants.some((v) => v.compareAt !== null);
    await tx.update(products).set({ tags: onSale ? sql`array(select distinct unnest(array_append(${products.tags}, 'sale')))` : sql`array_remove(${products.tags}, 'sale')` }).where(eq(products.id, productId));
    await rebuildSearchText(tx, productId);
  });

  await logAudit(user.id, "update_variants", "product", productId, { count: variants.length, options });
  revalidateStorefront();
  return success("הווריאציות נשמרו.");
}

// ── Images ──────────────────────────────────────────────────────────────

export async function uploadImagesAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  if (!isUuid(productId)) return fail("מוצר לא נמצא.");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return fail("לא נבחרו קבצים.");
  if (files.length > 12) return fail("אפשר להעלות עד 12 תמונות בכל פעם.");
  const alt = z.string().trim().max(200).catch("").parse(fd.get("alt") ?? "");

  const product = await db.query.products.findFirst({ where: eq(products.id, productId), columns: { slug: true, title: true } });
  if (!product) return fail("מוצר לא נמצא.");

  const [{ max } = { max: -1 }] = await db.select({ max: sql<number>`coalesce(max(${productImages.position}), -1)::int` }).from(productImages).where(eq(productImages.productId, productId));
  const storage = getStorage();
  const errors: string[] = [];
  let position = max + 1;
  for (const file of files) {
    const processed = await processUploadedImage(file);
    if ("error" in processed) {
      errors.push(`${file.name.slice(0, 60)}: ${processed.error}`);
      continue;
    }
    const { url } = await storage.put(`products/${randomUUID()}.webp`, processed.body, processed.contentType);
    await db.insert(productImages).values({ productId, url, alt: alt || product.title, width: processed.width, height: processed.height, position: position++ });
  }
  const uploaded = files.length - errors.length;
  if (uploaded) {
    await logAudit(user.id, "upload_images", "product", productId, { count: uploaded });
    revalidateStorefront();
  }
  return errors.length ? fail(`הועלו ${uploaded} מתוך ${files.length}. ${errors.join(" · ")}`) : success(`הועלו ${uploaded} תמונות.`);
}

export async function updateImageAltAction(imageId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("catalog:write");
  if (!isUuid(imageId)) return fail("תמונה לא נמצאה.");
  const alt = z.string().trim().max(200, "עד 200 תווים").safeParse(fd.get("alt") ?? "");
  if (!alt.success) return fail(alt.error.issues[0]!.message);
  await db.update(productImages).set({ alt: alt.data }).where(eq(productImages.id, imageId));
  revalidateStorefront();
  return success("נשמר.");
}

export async function moveImageAction(imageId: string, direction: "up" | "down"): Promise<void> {
  await requireUser("catalog:write");
  if (!isUuid(imageId)) return;
  await db.transaction(async (tx) => {
    const [img] = await tx.select().from(productImages).where(eq(productImages.id, imageId));
    if (!img) return;
    const all = await tx.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, img.productId)).orderBy(asc(productImages.position), asc(productImages.createdAt));
    const i = all.findIndex((x) => x.id === imageId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j]!, all[i]!];
    for (const [position, row] of all.entries()) await tx.update(productImages).set({ position }).where(eq(productImages.id, row.id));
  });
  revalidateStorefront();
}

export async function deleteImageAction(imageId: string): Promise<void> {
  const user = await requireUser("catalog:write");
  if (!isUuid(imageId)) return;
  const [img] = await db.delete(productImages).where(eq(productImages.id, imageId)).returning();
  if (!img) return;
  // Keep the file if a past order still shows it.
  const [used] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.imageUrl, img.url)).limit(1);
  if (!used) await getStorage().delete(img.url);
  await logAudit(user.id, "delete_image", "product", img.productId, { imageId });
  revalidateStorefront();
}

// ── Fitment ─────────────────────────────────────────────────────────────

export async function addFitmentAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  if (!isUuid(productId)) return fail("מוצר לא נמצא.");
  const parsed = fitmentSchema.safeParse({ modelId: fd.get("modelId"), yearFrom: fd.get("yearFrom") ?? "", yearTo: fd.get("yearTo") ?? "", status: fd.get("status"), note: fd.get("note") ?? "" });
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  const f = parsed.data;
  await db.transaction(async (tx) => {
    await tx
      .insert(fitments)
      .values({ productId, modelId: f.modelId, yearFrom: f.yearFrom, yearTo: f.yearTo, status: f.status, note: f.note ?? null, evidence: f.status === "VERIFIED" ? `אומת בממשק הניהול` : null })
      .onConflictDoUpdate({ target: [fitments.productId, fitments.modelId], set: { yearFrom: f.yearFrom, yearTo: f.yearTo, status: f.status, note: f.note ?? null } });
    await rebuildSearchText(tx, productId);
  });
  await logAudit(user.id, "upsert_fitment", "product", productId, { modelId: f.modelId, status: f.status });
  revalidateStorefront();
  return success("התאמה נשמרה.");
}

export async function deleteFitmentAction(fitmentId: string): Promise<void> {
  const user = await requireUser("catalog:write");
  if (!isUuid(fitmentId)) return;
  const [row] = await db.delete(fitments).where(eq(fitments.id, fitmentId)).returning({ productId: fitments.productId });
  if (!row) return;
  await rebuildSearchText(db, row.productId);
  await logAudit(user.id, "delete_fitment", "product", row.productId, { fitmentId });
  revalidateStorefront();
}

// ── Delete ──────────────────────────────────────────────────────────────

/** Permanent delete. The admin must type the product's slug to confirm. Archiving is usually better. */
export async function deleteProductAction(productId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("catalog:write");
  if (!isUuid(productId)) return fail("מוצר לא נמצא.");
  const product = await db.query.products.findFirst({ where: eq(products.id, productId), columns: { slug: true, title: true } });
  if (!product) return fail("מוצר לא נמצא.");
  if (String(fd.get("confirm") ?? "").trim() !== product.slug) return fail("כדי למחוק יש להקליד את כתובת המוצר בדיוק.", { confirm: "לא תואם" });

  const images = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  const storage = getStorage();
  for (const img of images) {
    const [used] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.imageUrl, img.url)).limit(1);
    if (!used) await storage.delete(img.url);
  }
  await logAudit(user.id, "delete", "product", productId, { title: product.title, slug: product.slug });
  revalidateStorefront();
  redirect("/admin/products?deleted=1");
}
