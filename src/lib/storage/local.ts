import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { SAFE_KEY, type StorageAdapter } from "./types";

export const LOCAL_URL_PREFIX = "/uploads/";

/** Files on local disk. Served by src/app/uploads/[...path]/route.ts. */
export class LocalStorage implements StorageAdapter {
  private readonly root: string;
  constructor(dir: string) {
    // Runtime-configured folder (UPLOAD_DIR); excluded from build-time file tracing.
    this.root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir);
  }

  resolve(key: string): string | null {
    if (!SAFE_KEY.test(key)) return null;
    const full = path.resolve(this.root, key);
    return full.startsWith(this.root + path.sep) ? full : null;
  }

  async put(key: string, body: Buffer): Promise<{ url: string }> {
    const full = this.resolve(key);
    if (!full) throw new Error("Invalid storage key");
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, { flag: "wx" });
    return { url: `${LOCAL_URL_PREFIX}${key}` };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(LOCAL_URL_PREFIX)) return;
    const full = this.resolve(url.slice(LOCAL_URL_PREFIX.length));
    if (full) await unlink(full).catch(() => undefined);
  }
}
