import "server-only";
import { del, put } from "@vercel/blob";
import { SAFE_KEY, type StorageAdapter } from "./types";

/** Vercel Blob (public store). Requires BLOB_READ_WRITE_TOKEN. */
export class VercelBlobStorage implements StorageAdapter {
  constructor(private readonly token: string) {}

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    if (!SAFE_KEY.test(key)) throw new Error("Invalid storage key");
    const blob = await put(key, body, { access: "public", contentType, token: this.token, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return { url: blob.url };
  }

  async delete(url: string): Promise<void> {
    if (!/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(url)) return;
    await del(url, { token: this.token }).catch(() => undefined);
  }
}
