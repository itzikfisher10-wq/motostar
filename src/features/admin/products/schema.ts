import { z } from "zod";
import { checkbox, optionalShekels, optionalText, shekels, slugField } from "@/features/admin/forms";

const uuid = z.uuid();

export const createProductSchema = z.object({
  title: z.string().trim().min(2, "שם המוצר קצר מדי").max(200),
  price: shekels(),
  categoryId: z.union([uuid, z.literal("")]).transform((v) => v || null),
});

export const productDetailsSchema = z.object({
  title: z.string().trim().min(2, "שם המוצר קצר מדי").max(200),
  slug: slugField,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  condition: z.enum(["NEW", "USED"]),
  origin: z.enum(["ORIGINAL", "AFTERMARKET", "UNSPECIFIED"]),
  brandId: z.union([uuid, z.literal("")]).transform((v) => v || null),
  primaryCategoryId: z.union([uuid, z.literal("")]).transform((v) => v || null),
  categoryIds: z.array(uuid).max(20),
  shortDescription: optionalText(300),
  descriptionHtml: optionalText(20_000),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(30),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  needsReview: checkbox,
  reviewNotes: optionalText(2000),
});

/** One variant row from the variants editor (sent as JSON). */
export const variantRowSchema = z
  .object({
    id: uuid.optional(),
    optionValues: z.record(z.string().max(40), z.string().trim().min(1, "יש למלא ערך לכל אפשרות").max(60)),
    sku: optionalText(80),
    barcode: optionalText(40),
    price: shekels(),
    compareAt: optionalShekels("מחיר לפני הנחה"),
    isAvailable: z.boolean(),
    inventoryTracked: z.boolean(),
    stockQuantity: z.number().int().min(0).max(100_000).nullable(),
    weightGrams: z.number().int().min(0).max(1_000_000).nullable(),
    imageId: uuid.nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.compareAt !== null && v.compareAt <= v.price) ctx.addIssue({ code: "custom", path: ["compareAt"], message: "המחיר לפני הנחה חייב להיות גבוה מהמחיר" });
    if (v.inventoryTracked && v.stockQuantity === null) ctx.addIssue({ code: "custom", path: ["stockQuantity"], message: "יש להזין כמות במלאי" });
  });

export const variantsPayloadSchema = z
  .object({
    options: z.array(z.string().trim().min(1, "שם אפשרות חסר").max(40)).max(3),
    variants: z.array(variantRowSchema).min(1, "למוצר חייבת להיות לפחות וריאציה אחת").max(100),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.options).size !== p.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "שמות האפשרויות חייבים להיות שונים" });
    const combos = new Set<string>();
    p.variants.forEach((v, i) => {
      for (const name of p.options) if (!v.optionValues[name]) ctx.addIssue({ code: "custom", path: ["variants", i, "optionValues"], message: `חסר ערך עבור "${name}"` });
      const key = p.options.map((n) => v.optionValues[n] ?? "").join("\u0000");
      if (p.options.length && combos.has(key)) ctx.addIssue({ code: "custom", path: ["variants", i, "optionValues"], message: "שתי וריאציות עם אותם ערכים" });
      combos.add(key);
    });
    if (!p.options.length && p.variants.length > 1) ctx.addIssue({ code: "custom", path: ["options"], message: "כדי להגדיר כמה וריאציות יש להוסיף אפשרות (למשל צבע)" });
  });

export type VariantsPayload = z.input<typeof variantsPayloadSchema>;

export const fitmentSchema = z
  .object({
    modelId: uuid,
    yearFrom: z.union([z.coerce.number().int().min(1950).max(2100), z.literal("")]).transform((v) => (v === "" ? null : v)),
    yearTo: z.union([z.coerce.number().int().min(1950).max(2100), z.literal("")]).transform((v) => (v === "" ? null : v)),
    status: z.enum(["VERIFIED", "SELLER_STATED"]),
    note: optionalText(300),
  })
  .refine((f) => f.yearFrom === null || f.yearTo === null || f.yearFrom <= f.yearTo, { path: ["yearTo"], message: "שנת סיום לפני שנת התחלה" });
