import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const MAX_EDGE = 2000;

export type ProcessedImage = { body: Buffer; width: number; height: number; contentType: "image/webp" };
export type ImageError = { error: string };

/**
 * Validates and re-encodes an uploaded image. The file type is detected from its
 * bytes (not its name or MIME header), EXIF/GPS metadata is dropped, oversized
 * images are scaled down, and the result is always WebP. Re-encoding also means
 * a disguised file (HTML/SVG/script with an image extension) can never be served.
 */
export async function processUploadedImage(file: File): Promise<ProcessedImage | ImageError> {
  if (file.size === 0) return { error: "הקובץ ריק." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "הקובץ גדול מ-10MB." };
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" });
    const meta = await image.metadata();
    if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) return { error: "פורמט לא נתמך. אפשר להעלות JPG, PNG, WebP או AVIF." };
    const { data, info } = await image
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
    return { body: data, width: info.width, height: info.height, contentType: "image/webp" };
  } catch {
    return { error: "לא ניתן לקרוא את הקובץ כתמונה." };
  }
}
