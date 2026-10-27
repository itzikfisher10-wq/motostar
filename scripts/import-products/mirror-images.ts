/**
 * Downloads every product image still hosted on the old Shopify CDN into
 * public/images/products/<product-slug>/ and points the database at the local copy.
 * Run once from a machine with normal internet access (the store must not depend
 * on Shopify after launch):
 *
 *   npm run catalog:mirror-images
 *
 * Safe to re-run: already-mirrored images are skipped. The original URL stays in
 * product_images.source_url. Images already present in public/images/products (committed
 * to the repository) are linked without downloading, so a fresh database needs no network.
 *
 *   npm run catalog:mirror-images -- --from-bundle <file.json>
 *
 * uses a JSON bundle { "<shopify url>": { data: <base64 webp>, w, h } } instead of
 * downloading — e.g. produced in a browser when this machine cannot reach the CDN.
 * Every image is still validated and re-encoded with sharp.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { join } from "node:path";
import { eq, like } from "drizzle-orm";
import { createDb } from "../../src/lib/db/create";
import { productImages, products } from "../../src/lib/db/schema";
import { loadScriptEnv } from "../lib/env";

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const MAX_BYTES = 15 * 1024 * 1024;

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });

const rows = await db
  .select({ id: productImages.id, url: productImages.url, slug: products.slug })
  .from(productImages)
  .innerJoin(products, eq(products.id, productImages.productId))
  .where(like(productImages.url, "https://cdn.shopify.com/%"));

const bundleArg = process.argv.indexOf("--from-bundle");
const bundle: Record<string, { data: string }> | null = bundleArg > -1 ? JSON.parse(readFileSync(process.argv[bundleArg + 1]!, "utf8")) : null;

/** Validates and normalizes an image to WebP (max 2000px), dropping metadata. */
async function toWebp(buf: Buffer) {
  const { data, info } = await sharp(buf, { limitInputPixels: 40_000_000, failOn: "error" })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

let ok = 0;
let failed = 0;
for (const row of rows) {
  try {
    const name = `${createHash("sha1").update(row.url).digest("hex").slice(0, 12)}.webp`;
    // Folder names use a hash of the slug: Hebrew folder names are awkward on some hosts.
    const dirName = createHash("sha1").update(row.slug).digest("hex").slice(0, 10);
    const dir = join("public", "images", "products", dirName);
    const file = join(dir, name);
    let size: { width: number; height: number };
    if (existsSync(file)) {
      const meta = await sharp(file).metadata();
      size = { width: meta.width!, height: meta.height! };
    } else {
      let input: Buffer;
      if (bundle) {
        const entry = bundle[row.url];
        if (!entry) throw new Error("not in bundle");
        input = Buffer.from(entry.data, "base64");
      } else {
        const res = await fetch(row.url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
        if (!ALLOWED.has(type)) throw new Error(`unexpected content-type ${type}`);
        input = Buffer.from(await res.arrayBuffer());
      }
      if (input.byteLength > MAX_BYTES) throw new Error("file too large");
      const out = await toWebp(input);
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, out.data);
      size = { width: out.width, height: out.height };
    }
    await db.update(productImages).set({ url: `/images/products/${dirName}/${name}`, width: size.width, height: size.height }).where(eq(productImages.id, row.id));
    ok++;
    process.stdout.write(".");
  } catch (err) {
    failed++;
    console.error(`\n✗ ${row.url}: ${(err as Error).message}`);
  }
}
await client.end();
console.info(`\nMirrored ${ok} image(s), ${failed} failed, ${rows.length} total.`);
if (failed) process.exit(1);
