import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { LocalStorage } from "@/lib/storage/local";

/**
 * Serves admin-uploaded files when STORAGE_PROVIDER=local. (Files written at runtime
 * into /public are not served by Next.js, so uploads live outside it.)
 * Only app-generated keys are accepted; everything is served as an image, never as HTML.
 */
const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png", avif: "image/avif" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (env().STORAGE_PROVIDER !== "local") return new NextResponse(null, { status: 404 });
  const key = (await params).path.join("/");
  const full = new LocalStorage(env().UPLOAD_DIR).resolve(key);
  if (!full) return new NextResponse(null, { status: 404 });
  try {
    const body = await readFile(full);
    return new NextResponse(body, {
      headers: {
        "Content-Type": TYPES[key.split(".").pop()!] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
