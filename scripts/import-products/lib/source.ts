import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/**
 * Source format: the original Shopify store's public product feed (/products.json),
 * captured on 2026-10-26 and compacted to short keys (see docs/catalog-migration.md).
 * Each file was verified against a SHA-256 computed in the browser at capture time.
 */
export const SHOPIFY_CDN_PREFIX = "https://cdn.shopify.com/s/files/1/0731/8876/9846/";
export const SOURCE_STORE_URL = "https://motostar.co.il";

const sourceVariant = z.object({
  id: z.number(),
  t: z.string(),
  o: z.array(z.string()),
  s: z.string().nullable(),
  a: z.boolean(),
  p: z.string().regex(/^\d+(\.\d{1,2})?$/),
  c: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  g: z.number(),
  fi: z.number().nullable(),
});

const sourceImage = z.object({
  id: z.number(),
  s: z.string(),
  w: z.number().nullable(),
  h: z.number().nullable(),
  vi: z.array(z.number()),
});

export const sourceProduct = z.object({
  id: z.number(),
  t: z.string().min(1),
  h: z.string().min(1),
  b: z.string(),
  pub: z.string(),
  v: z.string(),
  pt: z.string(),
  tg: z.array(z.string()),
  o: z.array(z.object({ n: z.string(), v: z.array(z.string()) })),
  vr: z.array(sourceVariant).min(1),
  im: z.array(sourceImage),
});

export const sourceCollection = z.object({
  id: z.number(),
  handle: z.string(),
  title: z.string(),
  desc: z.string(),
  img: z.string().nullable(),
  n: z.number(),
  ids: z.array(z.number()),
});

export type SourceProduct = z.infer<typeof sourceProduct>;
export type SourceVariant = z.infer<typeof sourceVariant>;
export type SourceImage = z.infer<typeof sourceImage>;
export type SourceCollection = z.infer<typeof sourceCollection>;

export type SourceData = { products: SourceProduct[]; collections: SourceCollection[]; errors: string[] };

export function loadSource(dir: string): SourceData {
  const errors: string[] = [];
  const products: SourceProduct[] = [];
  const files = readdirSync(dir).filter((f) => /^products-\d+\.json$/.test(f)).sort();
  for (const file of files) {
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (!Array.isArray(raw)) {
      errors.push(`${file}: expected an array`);
      continue;
    }
    raw.forEach((item, i) => {
      const parsed = sourceProduct.safeParse(item);
      if (parsed.success) products.push(parsed.data);
      else errors.push(`${file}[${i}]: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    });
  }
  const collections = z.array(sourceCollection).parse(JSON.parse(readFileSync(join(dir, "collections.json"), "utf8")));
  return { products, collections, errors };
}

export const imageUrl = (img: SourceImage) => (img.s.startsWith("http") ? img.s : SHOPIFY_CDN_PREFIX + img.s);
export const sourceProductUrl = (handle: string) => `${SOURCE_STORE_URL}/products/${encodeURIComponent(handle)}`;
